package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AdminBotTransferRequest;
import fujipp.project.billing.service.AdminBotTransferService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Internal admin endpoint to move a bot's billing rows to a new owner. */
@RestController
@RequestMapping("/api/billing/admin/bots")
@RequiredArgsConstructor
public class AdminBotTransferController {

    private final AdminBotTransferService transfer;

    @PostMapping("/{subjectId}/transfer")
    public ResponseEntity<Map<String, Object>> transferBot(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable String subjectId,
            @RequestBody AdminBotTransferRequest request) {
        return ResponseEntity.ok(transfer.transfer(adminId, subjectId, request.newUserId()));
    }
}
