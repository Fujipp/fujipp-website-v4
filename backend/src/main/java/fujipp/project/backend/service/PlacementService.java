package fujipp.project.backend.service;

import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.model.VpsNode;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.repository.VpsNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Decides which VPS a bot runs on. A bot consumes one slot on its node; placement
 * is checked against the node's max_slots under a row lock so two concurrent buyers
 * can't oversubscribe the same host.
 *
 * v1 strategy: pack onto the most-capacity ACTIVE node that still has a free slot.
 */
@Service
@RequiredArgsConstructor
public class PlacementService {

    private final VpsNodeRepository nodes;
    private final BotInstanceRepository bots;

    /**
     * Reserve a slot on an available node. Must run inside the caller's transaction
     * so the lock is held until the bot row that consumes the slot is committed.
     *
     * @return the node the bot was placed on
     * @throws ResponseStatusException 503 if every node is full / unavailable
     */
    @Transactional
    public VpsNode assignNode() {
        List<VpsNode> candidates = nodes.findByStatusOrderByMaxSlotsDesc("ACTIVE");
        for (VpsNode candidate : candidates) {
            // Lock the node row, then count under the lock so the check is accurate
            // against concurrent placements onto the same host.
            VpsNode locked = nodes.findByIdForUpdate(candidate.getId()).orElse(null);
            if (locked == null) continue;
            long used = bots.countByVpsNodeId(locked.getId());
            if (used < locked.getMaxSlots()) {
                return locked;
            }
        }
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "All bot hosts are full right now — no free slot available");
    }

    /**
     * Reserve a slot and persist the bot on it, atomically. The node row stays locked
     * until this transaction commits, so the reservation is real before the caller
     * charges the customer. Returns the saved bot (with vps_node_id set).
     */
    @Transactional
    public BotInstance placeAndPersist(BotInstance bot) {
        VpsNode node = assignNode();
        bot.setVpsNodeId(node.getId());
        return bots.save(bot);
    }

    /** Total free slots across ACTIVE nodes (for showing availability before purchase). */
    @Transactional(readOnly = true)
    public long availableSlots() {
        long free = 0;
        for (VpsNode node : nodes.findByStatusOrderByMaxSlotsDesc("ACTIVE")) {
            free += Math.max(0, node.getMaxSlots() - bots.countByVpsNodeId(node.getId()));
        }
        return free;
    }
}
