package fujipp.project.backend.service;

import fujipp.project.backend.dto.CreateVpsNodeRequest;
import fujipp.project.backend.dto.UpdateVpsNodeRequest;
import fujipp.project.backend.dto.VpsNodeResponse;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.model.VpsNode;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.repository.VpsNodeRepository;
import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.runtime.RuntimeRouter;
import fujipp.project.backend.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Admin-only VPS host management and bot placement moves. */
@Service
@RequiredArgsConstructor
public class VpsNodeAdminService {

    private static final Logger log = LoggerFactory.getLogger(VpsNodeAdminService.class);
    private static final Set<String> STATUSES = Set.of("ACTIVE", "DRAINING", "OFFLINE");

    private final VpsNodeRepository nodes;
    private final BotInstanceRepository bots;
    private final AdminAccessService adminAccess;
    private final SecretCipher cipher;
    private final PlacementService placement;
    private final RuntimeRouter runtimeRouter;
    private final RuntimeClient runtime;

    @Transactional(readOnly = true)
    public List<VpsNodeResponse> listNodes(UUID adminId) {
        requireAdmin(adminId);
        return nodes.findAll().stream()
            .map(n -> VpsNodeResponse.from(n, bots.countByVpsNodeId(n.getId())))
            .toList();
    }

    @Transactional
    public VpsNodeResponse createNode(UUID adminId, CreateVpsNodeRequest req) {
        requireAdmin(adminId);
        if (nodes.existsByName(req.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A VPS with this name already exists");
        }
        VpsNode node = new VpsNode();
        node.setName(req.name());
        node.setLabel(blankToNull(req.label()));
        node.setRegion(blankToNull(req.region()));
        node.setOrchestratorUrl(blankToNull(req.orchestratorUrl()));
        if (req.serviceToken() != null && !req.serviceToken().isBlank()) {
            node.setServiceTokenCipher(cipher.encrypt(req.serviceToken()));
        }
        node.setMaxSlots(req.maxSlots());
        node.setStatus(normalizeStatus(req.status(), "ACTIVE"));
        node.setNotes(blankToNull(req.notes()));
        // An externally-registered host that is ACTIVE must be reachable, or placements
        // onto it would fail. Register it as OFFLINE first if the orchestrator isn't up yet.
        requireReachableIfActive(node);
        VpsNode saved = nodes.save(node);
        return VpsNodeResponse.from(saved, 0);
    }

    @Transactional
    public VpsNodeResponse updateNode(UUID adminId, UUID nodeId, UpdateVpsNodeRequest req) {
        requireAdmin(adminId);
        VpsNode node = nodes.findById(nodeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "VPS not found"));
        if (req.label() != null) node.setLabel(blankToNull(req.label()));
        if (req.region() != null) node.setRegion(blankToNull(req.region()));
        if (req.orchestratorUrl() != null) node.setOrchestratorUrl(blankToNull(req.orchestratorUrl()));
        if (req.serviceToken() != null && !req.serviceToken().isBlank()) {
            node.setServiceTokenCipher(cipher.encrypt(req.serviceToken()));
        }
        if (req.maxSlots() != null) {
            if (req.maxSlots() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxSlots must be >= 0");
            long used = bots.countByVpsNodeId(nodeId);
            if (req.maxSlots() < used) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "maxSlots (" + req.maxSlots() + ") is below the " + used + " bots already on this VPS");
            }
            node.setMaxSlots(req.maxSlots());
        }
        if (req.status() != null) node.setStatus(normalizeStatus(req.status(), node.getStatus()));
        if (req.notes() != null) node.setNotes(blankToNull(req.notes()));
        // Re-probe only when the change could affect reachability (endpoint/token swap,
        // or bringing the node ACTIVE) — an unrelated edit (e.g. notes) shouldn't be
        // blocked by a transient blip.
        if (req.orchestratorUrl() != null || req.serviceToken() != null
                || "ACTIVE".equalsIgnoreCase(req.status())) {
            requireReachableIfActive(node);
        }
        VpsNode saved = nodes.save(node);
        return VpsNodeResponse.from(saved, bots.countByVpsNodeId(nodeId));
    }

    /**
     * On-demand health + capacity probe for a node: is the orchestrator reachable, and
     * how many slots are free. Lets the admin verify a host before relying on it.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> checkNode(UUID adminId, UUID nodeId) {
        requireAdmin(adminId);
        VpsNode node = nodes.findById(nodeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "VPS not found"));
        long used = bots.countByVpsNodeId(nodeId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("reachable", runtime.isReachable(runtimeRouter.targetForNode(node)));
        result.put("status", node.getStatus());
        result.put("maxSlots", node.getMaxSlots());
        result.put("usedSlots", used);
        result.put("freeSlots", Math.max(0, node.getMaxSlots() - used));
        return result;
    }

    /**
     * Refuse to mark an externally-registered host ACTIVE unless its orchestrator answers
     * a health probe. Nodes with no orchestratorUrl use the backend's default runtime and
     * are not probed here (the default is the platform's own concern).
     */
    private void requireReachableIfActive(VpsNode node) {
        if (node.getOrchestratorUrl() == null || !"ACTIVE".equals(node.getStatus())) {
            return;
        }
        if (!runtime.isReachable(runtimeRouter.targetForNode(node))) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "VPS orchestrator at " + node.getOrchestratorUrl() + " is not reachable — "
                + "start it (or register the node as OFFLINE) before setting it ACTIVE");
        }
    }

    /**
     * Move a bot to another VPS: stop it on the current host, reassign the slot
     * (capacity-checked under a lock), then start it on the new host if it was running.
     * Not transactional — it performs cross-service HTTP side effects around the
     * transactional reassignment.
     */
    public void moveBot(UUID adminId, UUID botId, UUID targetNodeId) {
        requireAdmin(adminId);
        BotInstance bot = bots.findById(botId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
        boolean wasRunning = "RUNNING".equals(bot.getStatus());

        // Stop on the current host first (best effort — it may already be down).
        if (bot.getVpsNodeId() != null) {
            try {
                runtime.stop(runtimeRouter.targetFor(botId), botId.toString());
            } catch (RuntimeException e) {
                log.warn("Move: failed to stop bot {} on its current host", botId, e);
            }
        }

        placement.moveTo(botId, targetNodeId); // reassign vps_node_id (locked + capacity-checked)

        // Start on the new host (targetFor now resolves to the new node).
        if (wasRunning) {
            runtime.start(runtimeRouter.targetFor(botId), botId.toString());
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private void requireAdmin(UUID userId) {
        adminAccess.requireAdmin(userId);
    }

    private static String normalizeStatus(String status, String fallback) {
        if (status == null || status.isBlank()) return fallback;
        String upper = status.trim().toUpperCase();
        if (!STATUSES.contains(upper)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be ACTIVE, DRAINING, or OFFLINE");
        }
        return upper;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
