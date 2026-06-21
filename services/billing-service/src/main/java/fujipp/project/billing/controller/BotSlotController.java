package fujipp.project.billing.controller;

import fujipp.project.billing.dto.BotSlotResponse;
import fujipp.project.billing.dto.PurchaseBotSlotRequest;
import fujipp.project.billing.service.BotSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Permanent bot slots (free 3 + paid extras). Internal: backend forwards X-User-Id. */
@RestController
@RequestMapping("/api/billing/bot-slots")
@RequiredArgsConstructor
public class BotSlotController {

    private final BotSlotService botSlotService;

    @GetMapping
    public ResponseEntity<BotSlotResponse> view(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(botSlotService.view(userId));
    }

    @PostMapping("/purchase")
    public ResponseEntity<BotSlotResponse> purchase(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody(required = false) PurchaseBotSlotRequest request) {
        String idempotencyKey = request == null ? null : request.idempotencyKey();
        return ResponseEntity.ok(botSlotService.purchase(userId, idempotencyKey));
    }
}
