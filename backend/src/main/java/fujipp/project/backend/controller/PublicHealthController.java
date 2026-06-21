package fujipp.project.backend.controller;

import fujipp.project.backend.dto.IncidentResponse;
import fujipp.project.backend.dto.PublicHealthResponse;
import fujipp.project.backend.service.HealthMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public, unauthenticated platform status (under {@code /api/public/**}, permitted
 * in {@code SecurityConfig}). Returns only non-sensitive health: overall status,
 * backend uptime/latency/version, and shop service states — no server internals.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicHealthController {

    private final HealthMonitorService health;

    @GetMapping("/health")
    public ResponseEntity<PublicHealthResponse> health() {
        return ResponseEntity.ok(health.publicHealth());
    }

    @GetMapping("/incidents")
    public ResponseEntity<List<IncidentResponse>> incidents(
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        return ResponseEntity.ok(health.recentIncidents(limit));
    }
}
