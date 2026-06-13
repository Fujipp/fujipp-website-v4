package fujipp.project.billing.service;

import fujipp.project.billing.dto.WalletResponse;
import fujipp.project.billing.dto.WalletTransactionResponse;
import fujipp.project.billing.model.WalletTransaction;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Admin wallet operations: read any user's balance + ledger, and manually adjust the
 * balance up or down. Adjustments reuse {@link WalletService} (locked + balance-guarded),
 * are tagged type {@code ADJUSTMENT} / reference {@code MANUAL} with the acting admin as
 * {@code createdBy}, and write an {@code admin_audit_log} row.
 */
@Service
@RequiredArgsConstructor
public class AdminWalletService {

    private static final Set<String> DIRECTIONS = Set.of("CREDIT", "DEBIT");

    private final WalletService walletService;
    private final AdminAuditService audit;

    @Transactional(readOnly = true)
    public WalletResponse getWallet(UUID userId) {
        return WalletResponse.from(walletService.getWallet(userId));
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> transactions(UUID userId) {
        return walletService.recentTransactions(userId).stream()
            .map(WalletTransactionResponse::from)
            .toList();
    }

    @Transactional
    public WalletResponse adjust(UUID adminId, UUID userId, String direction, long amountSatang, String note) {
        String dir = direction == null ? "" : direction.trim().toUpperCase();
        if (!DIRECTIONS.contains(dir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "direction must be CREDIT or DEBIT");
        }

        WalletTransaction tx = dir.equals("CREDIT")
            ? walletService.credit(userId, amountSatang, "ADJUSTMENT", "MANUAL", null, note, adminId)
            : walletService.debit(userId, amountSatang, "ADJUSTMENT", "MANUAL", null, note, adminId);

        Map<String, Object> payload = new HashMap<>();
        payload.put("direction", dir);
        payload.put("amountSatang", amountSatang);
        payload.put("note", note == null ? "" : note);
        payload.put("balanceAfterSatang", tx.getBalanceAfterSatang());
        audit.record(adminId, "WALLET_ADJUST", userId, "WALLET", userId.toString(), payload);

        return WalletResponse.from(walletService.getWallet(userId));
    }
}
