package fujipp.project.billing.controller;

import fujipp.project.billing.dto.SweepResult;
import fujipp.project.billing.service.AutomationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal automation trigger — called by the backend's daily scheduler (protected
 * by the service-token filter). Returns which subjects were suspended so the backend
 * can stop those bots on the orchestrator.
 */
@RestController
@RequestMapping("/api/billing/automation")
@RequiredArgsConstructor
public class AutomationController {

    private final AutomationService automationService;

    @PostMapping("/run")
    public ResponseEntity<SweepResult> run() {
        return ResponseEntity.ok(automationService.runDailySweep());
    }
}
