package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.service.AdminAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Admin wallet management — read any user's balance/ledger and adjust it up or down.
 * Enforces ADMIN and forwards to billing-service with the acting admin id.
 */
@RestController
@RequestMapping("/api/admin/users/{userId}/wallet")
@RequiredArgsConstructor
public class AdminWalletController {

    private final AdminAccessService adminAccess;
    private final BillingClient billing;

    @GetMapping
    public ResponseEntity<String> wallet(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.adminGetWallet(userId));
    }

    @GetMapping("/transactions")
    public ResponseEntity<String> transactions(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.adminWalletTransactions(userId));
    }

    @PostMapping("/adjust")
    public ResponseEntity<String> adjust(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminAdjustWallet(adminId, userId, body));
    }

    private ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
