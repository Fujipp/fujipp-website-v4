package fujipp.project.billing.controller;

import fujipp.project.billing.dto.FeatureConfigResponse;
import fujipp.project.billing.dto.UpdateConfigRequest;
import fujipp.project.billing.service.BotConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Per-bot feature config. Internal: ownership is checked by the main backend before
 * it proxies here (this service is reached only with the X-Service-Token).
 */
@RestController
@RequestMapping("/api/billing/bots")
@RequiredArgsConstructor
public class BotConfigController {

    private final BotConfigService botConfigService;

    @GetMapping("/{subjectId}/config")
    public ResponseEntity<FeatureConfigResponse> get(@PathVariable String subjectId) {
        return ResponseEntity.ok(botConfigService.getConfig(subjectId));
    }

    @PutMapping("/{subjectId}/config")
    public ResponseEntity<FeatureConfigResponse> update(
            @PathVariable String subjectId,
            @RequestBody UpdateConfigRequest request) {
        return ResponseEntity.ok(botConfigService.updateConfig(subjectId, request.values()));
    }
}
