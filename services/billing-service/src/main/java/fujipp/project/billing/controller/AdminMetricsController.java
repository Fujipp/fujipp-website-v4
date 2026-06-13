package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AdminMetricsResponse;
import fujipp.project.billing.service.AdminMetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Internal admin dashboard metrics (money side). Service-token guarded. */
@RestController
@RequestMapping("/api/billing/admin/metrics")
@RequiredArgsConstructor
public class AdminMetricsController {

    private final AdminMetricsService metrics;

    @GetMapping
    public ResponseEntity<AdminMetricsResponse> metrics() {
        return ResponseEntity.ok(metrics.metrics());
    }
}
