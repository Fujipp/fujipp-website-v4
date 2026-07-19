package fujipp.project.billing.controller;

import fujipp.project.billing.dto.FeatureConfigResponse;
import fujipp.project.billing.dto.BotAccessRuleRequest;
import fujipp.project.billing.dto.BotAccessRuleResponse;
import fujipp.project.billing.dto.UpdateConfigRequest;
import fujipp.project.billing.service.BotAccessRuleService;
import fujipp.project.billing.service.BotConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Per-bot feature config. Internal: ownership is checked by the main backend before
 * it proxies here (this service is reached only with the X-Service-Token).
 */
@RestController
@RequestMapping("/api/billing/bots")
@RequiredArgsConstructor
public class BotConfigController {

    private final BotConfigService botConfigService;
    private final BotAccessRuleService accessRules;

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

    @GetMapping("/{subjectId}/access-rules")
    public ResponseEntity<List<BotAccessRuleResponse>> listAccessRules(@PathVariable UUID subjectId) {
        return ResponseEntity.ok(accessRules.list(subjectId));
    }

    @PostMapping("/{subjectId}/access-rules")
    public ResponseEntity<BotAccessRuleResponse> createAccessRule(
            @PathVariable UUID subjectId, @RequestBody @Valid BotAccessRuleRequest request) {
        return ResponseEntity.status(201).body(accessRules.create(subjectId, request));
    }

    @PutMapping("/{subjectId}/access-rules/{ruleId}")
    public ResponseEntity<BotAccessRuleResponse> updateAccessRule(
            @PathVariable UUID subjectId, @PathVariable UUID ruleId,
            @RequestBody @Valid BotAccessRuleRequest request) {
        return ResponseEntity.ok(accessRules.update(subjectId, ruleId, request));
    }

    @DeleteMapping("/{subjectId}/access-rules/{ruleId}")
    public ResponseEntity<Void> deleteAccessRule(
            @PathVariable UUID subjectId, @PathVariable UUID ruleId) {
        accessRules.delete(subjectId, ruleId);
        return ResponseEntity.noContent().build();
    }
}
