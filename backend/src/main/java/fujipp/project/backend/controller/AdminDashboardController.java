package fujipp.project.backend.controller;

import fujipp.project.backend.dto.AdminDashboardResponse;
import fujipp.project.backend.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Admin dashboard metrics. Role enforced in the service. */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboard;

    @GetMapping
    public ResponseEntity<AdminDashboardResponse> dashboard(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(dashboard.dashboard(UUID.fromString(jwt.getSubject())));
    }
}
