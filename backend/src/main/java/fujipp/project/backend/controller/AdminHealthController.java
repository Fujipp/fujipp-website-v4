package fujipp.project.backend.controller;

import fujipp.project.backend.dto.VpsMetricsResponse;
import fujipp.project.backend.service.HealthMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Admin-only detailed host/VPS metrics + history. Role enforced in the service. */
@RestController
@RequestMapping("/api/admin/health")
@RequiredArgsConstructor
public class AdminHealthController {

    private final HealthMonitorService health;

    @GetMapping("/vps")
    public ResponseEntity<VpsMetricsResponse> vps(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(health.vpsMetrics(UUID.fromString(jwt.getSubject())));
    }
}
