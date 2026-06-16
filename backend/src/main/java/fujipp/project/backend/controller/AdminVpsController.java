package fujipp.project.backend.controller;

import fujipp.project.backend.dto.CreateVpsNodeRequest;
import fujipp.project.backend.dto.MoveBotRequest;
import fujipp.project.backend.dto.UpdateVpsNodeRequest;
import fujipp.project.backend.dto.VpsNodeResponse;
import fujipp.project.backend.service.VpsNodeAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    @PostMapping("/bots/{botId}/move")
    public ResponseEntity<Void> moveBot(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @RequestBody @Valid MoveBotRequest request) {
        admin.moveBot(UUID.fromString(jwt.getSubject()), botId, request.targetNodeId());
        return ResponseEntity.noContent().build();
    }
}
