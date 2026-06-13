package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AdminAuditRecordRequest;
import fujipp.project.billing.service.AdminAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Lets the main backend append to the admin audit trail for actions that happen
 * outside billing (e.g. profile/role edits). Service-token guarded; acting admin
 * id from {@code X-Admin-Id}.
 */
@RestController
@RequestMapping("/api/billing/admin/audit")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AdminAuditService audit;

    @PostMapping
    public ResponseEntity<Void> record(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @RequestBody AdminAuditRecordRequest request) {
        audit.record(adminId, request.action(), request.targetUserId(),
            request.targetType(), request.targetId(), request.payload());
        return ResponseEntity.noContent().build();
    }
}
