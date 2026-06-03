package fujipp.project.billing.controller;

import fujipp.project.billing.dto.WalletResponse;
import fujipp.project.billing.dto.WalletTransactionResponse;
import fujipp.project.billing.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<WalletResponse> getWallet(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(WalletResponse.from(walletService.getWallet(userId)));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<WalletTransactionResponse>> getTransactions(
            @RequestHeader("X-User-Id") UUID userId) {
        List<WalletTransactionResponse> items = walletService.recentTransactions(userId).stream()
            .map(WalletTransactionResponse::from)
            .toList();
        return ResponseEntity.ok(items);
    }
}
