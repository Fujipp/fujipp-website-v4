package fujipp.project.backend.service;

import fujipp.project.backend.dto.AdminBotResponse;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.model.Profile;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Admin bot directory — every bot across all users, with its owner. */
@Service
@RequiredArgsConstructor
public class AdminBotService {

    private final AdminAccessService adminAccess;
    private final BotInstanceRepository bots;
    private final ProfileRepository profiles;

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
}
