package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.AdminBotResponse;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.model.Profile;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Admin bot directory — every bot across all users, with its owner; plus ownership transfer. */
@Service
@RequiredArgsConstructor
public class AdminBotService {

    private final AdminAccessService adminAccess;
    private final BotInstanceRepository bots;
    private final ProfileRepository profiles;
    private final BillingClient billing;

    @Transactional(readOnly = true)
    public List<AdminBotResponse> listBots(UUID adminId) {
        adminAccess.requireAdmin(adminId);
        List<BotInstance> all = bots.findAll();
        Map<UUID, Profile> owners = profiles.findAllById(
                all.stream().map(BotInstance::getUserId).distinct().toList()).stream()
            .collect(Collectors.toMap(Profile::getId, Function.identity()));
        return all.stream()
            .sorted(Comparator.comparing(BotInstance::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
            .map(bot -> AdminBotResponse.from(bot, owners.get(bot.getUserId())))
            .toList();
    }

    /** Admin-gate then return the bot's current owner id (used for per-bot billing actions). */
    @Transactional(readOnly = true)
    public UUID requireBotOwner(UUID adminId, UUID botId) {
        adminAccess.requireAdmin(adminId);
        return bots.findById(botId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"))
            .getUserId();
    }

    /**
     * Transfer a bot to another user: the bot row (here) plus its billing rows
     * (subscriptions + config, via billing-service). Wallets are not moved.
     */
    @Transactional
    public AdminBotResponse transferBot(UUID adminId, UUID botId, UUID newUserId) {
        adminAccess.requireAdmin(adminId);
        if (newUserId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "newUserId is required");
        }
        BotInstance bot = bots.findById(botId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
        if (newUserId.equals(bot.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bot is already owned by that user");
        }
        profiles.findById(newUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found"));
        if (bots.existsByUserIdAndName(newUserId, bot.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Target user already has a bot named '" + bot.getName() + "'");
        }

        bots.reassignOwner(botId, newUserId);
        // Move the billing side (atomic on billing's side; audited there). If this throws,
        // the bot-row change above rolls back with this transaction.
        billing.adminTransferBotSubject(adminId, botId.toString(), newUserId);

        BotInstance moved = bots.findById(botId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
        return AdminBotResponse.from(moved, profiles.findById(newUserId).orElse(null));
    }
}
