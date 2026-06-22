package fujipp.project.backend.controller;

import fujipp.project.backend.dto.CreateVpsNodeRequest;
import fujipp.project.backend.dto.MoveBotRequest;
import fujipp.project.backend.dto.UpdateSlotStatusRequest;
import fujipp.project.backend.dto.UpdateVpsNodeRequest;
import fujipp.project.backend.dto.VpsNodeResponse;
import fujipp.project.backend.dto.VpsSlotResponse;
import fujipp.project.backend.service.VpsNodeAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin-only VPS host management + bot placement moves (role checked in the service). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminVpsController {

    private final VpsNodeAdminService admin;

    @GetMapping("/vps-nodes")
    public ResponseEntity<List<VpsNodeResponse>> list(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(admin.listNodes(UUID.fromString(jwt.getSubject())));
    }

    @PostMapping("/vps-nodes")
    public ResponseEntity<VpsNodeResponse> create(
            @AuthenticationPrincipal Jwt jwt, @RequestBody @Valid CreateVpsNodeRequest request) {
        return ResponseEntity.ok(admin.createNode(UUID.fromString(jwt.getSubject()), request));
    }

    @PatchMapping("/vps-nodes/{nodeId}")
    public ResponseEntity<VpsNodeResponse> update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID nodeId, @RequestBody UpdateVpsNodeRequest request) {
        return ResponseEntity.ok(admin.updateNode(UUID.fromString(jwt.getSubject()), nodeId, request));
    }

    /** On-demand reachability + free-slot probe for a single VPS host. */
    @GetMapping("/vps-nodes/{nodeId}/health")
    public ResponseEntity<Map<String, Object>> health(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID nodeId) {
        return ResponseEntity.ok(admin.checkNode(UUID.fromString(jwt.getSubject()), nodeId));
    }

    /** The seats on a VPS with their status + live occupancy. */
    @GetMapping("/vps-nodes/{nodeId}/slots")
    public ResponseEntity<List<VpsSlotResponse>> slots(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID nodeId) {
        return ResponseEntity.ok(admin.listSlots(UUID.fromString(jwt.getSubject()), nodeId));
    }

    /** Flip a single seat between FREE and MAINTENANCE. */
    @PatchMapping("/vps-nodes/{nodeId}/slots/{slotId}")
    public ResponseEntity<VpsSlotResponse> updateSlot(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID nodeId, @PathVariable UUID slotId,
            @RequestBody @Valid UpdateSlotStatusRequest request) {
        return ResponseEntity.ok(
            admin.setSlotStatus(UUID.fromString(jwt.getSubject()), nodeId, slotId, request.status()));
    }

    @PostMapping("/bots/{botId}/move")
    public ResponseEntity<Void> moveBot(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @RequestBody @Valid MoveBotRequest request) {
        admin.moveBot(UUID.fromString(jwt.getSubject()), botId, request.targetNodeId());
        return ResponseEntity.noContent().build();
    }

    /** Every seat across the fleet with its occupant (owner/bot/runtime/expiry). */
    @GetMapping("/runtime/cabinet")
    public ResponseEntity<String> runtimeCabinet(@AuthenticationPrincipal Jwt jwt) {
        return json(admin.runtimeCabinet(UUID.fromString(jwt.getSubject())));
    }

    /** Active runtimes that hold no seat (legacy/orphan) — admin can re-seat them. */
    @GetMapping("/runtime/unseated")
    public ResponseEntity<String> unseatedRuntimes(@AuthenticationPrincipal Jwt jwt) {
        return json(admin.unseatedRuntimes(UUID.fromString(jwt.getSubject())));
    }

    /** Relocate a runtime to a different free seat (e.g. draining a problem VPS). */
    @PostMapping("/runtime/{runtimeId}/move-seat")
    public ResponseEntity<String> moveRuntimeSeat(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID runtimeId, @RequestBody String body) {
        return json(admin.moveRuntimeSeat(UUID.fromString(jwt.getSubject()), runtimeId, body));
    }

    private static ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
