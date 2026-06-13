package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AdminWalletAdjustRequest;
import fujipp.project.billing.dto.WalletResponse;
import fujipp.project.billing.dto.WalletTransactionResponse;
import fujipp.project.billing.service.AdminWalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Internal admin wallet API. Service-token guarded; the acting admin id arrives in
 * {@code X-Admin-Id} (recorded as the ledger {@code created_by} and audit actor).
 */
@RestController
@RequestMapping("/api/billing/admin/wallet")
@RequiredArgsConstructor
public class AdminWalletController {

    private final AdminWalletService wallet;

    @GetMapping("/{userId}")
    public ResponseEntity<WalletResponse> getWallet(@PathVariable UUID userId) {
        return ResponseEntity.ok(wallet.getWallet(userId));
    }

    @GetMapping("/{userId}/transactions")
    public ResponseEntity<List<WalletTransactionResponse>> transactions(@PathVariable UUID userId) {
        return ResponseEntity.ok(wallet.transactions(userId));
    }

    @PostMapping("/{userId}/adjust")
    public ResponseEntity<WalletResponse> adjust(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable UUID userId,
            @RequestBody @Valid AdminWalletAdjustRequest request) {
        return ResponseEntity.ok(
            wallet.adjust(adminId, userId, request.direction(), request.amountSatang(), request.note()));
    }
}
