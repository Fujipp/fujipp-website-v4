package fujipp.project.billing.service;

import fujipp.project.billing.model.Wallet;
import fujipp.project.billing.model.WalletTransaction;
import fujipp.project.billing.repository.WalletRepository;
import fujipp.project.billing.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Credit wallet — the money spine of the billing service.
 *
 * Real money only enters via {@link #credit} with type TOPUP (after a payment is
 * confirmed). Every purchase/renewal/refund is a credit or debit here. The wallet
 * row is the cache; {@code wallet_transactions} is the append-only ledger.
 *
 * credit() and debit() lock the wallet row with SELECT ... FOR UPDATE so concurrent
 * calls for the same user serialize and the balance can never go negative (the DB
 * also enforces balance >= 0 as a final guard).
 */
@Service
@RequiredArgsConstructor
public class WalletService {

    public static final String DIRECTION_CREDIT = "CREDIT";
    public static final String DIRECTION_DEBIT  = "DEBIT";

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public Wallet getWallet(UUID userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUserId(userId);
            w.setBalanceSatang(0L);
            w.setCurrency("THB");
            return w; // unsaved view-only default; created lazily on first credit
        });
    }

    @Transactional(readOnly = true)
    public List<WalletTransaction> recentTransactions(UUID userId) {
        return transactionRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }

    /** Adds funds (TOPUP / REFUND / UPGRADE_CREDIT / BONUS / ADJUSTMENT). */
    @Transactional
    public WalletTransaction credit(UUID userId, long amountSatang, String type,
                                    String referenceType, UUID referenceId,
                                    String note, UUID createdBy) {
        requirePositive(amountSatang);
        Wallet wallet = lockOrCreate(userId);
        long newBalance = wallet.getBalanceSatang() + amountSatang;
        wallet.setBalanceSatang(newBalance);
        return writeLedger(wallet, DIRECTION_CREDIT, type, amountSatang, newBalance,
            referenceType, referenceId, note, createdBy);
    }

    /** Removes funds (PURCHASE / RENEWAL / ADJUSTMENT). 402 if balance is insufficient. */
    @Transactional
    public WalletTransaction debit(UUID userId, long amountSatang, String type,
                                   String referenceType, UUID referenceId, String note) {
        requirePositive(amountSatang);
        Wallet wallet = lockOrCreate(userId);
        if (wallet.getBalanceSatang() < amountSatang) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                "Insufficient credit — please top up");
        }
        long newBalance = wallet.getBalanceSatang() - amountSatang;
        wallet.setBalanceSatang(newBalance);
        return writeLedger(wallet, DIRECTION_DEBIT, type, amountSatang, newBalance,
            referenceType, referenceId, note, null);
    }

    // ── internals ───────────────────────────────────────────────────────────

    private Wallet lockOrCreate(UUID userId) {
        if (walletRepository.findByUserId(userId).isEmpty()) {
            Wallet w = new Wallet();
            w.setUserId(userId);
            w.setBalanceSatang(0L);
            w.setCurrency("THB");
            walletRepository.saveAndFlush(w);
        }
        return walletRepository.findByUserIdForUpdate(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Wallet could not be locked"));
    }

    private WalletTransaction writeLedger(Wallet wallet, String direction, String type,
                                          long amountSatang, long balanceAfter,
                                          String referenceType, UUID referenceId,
                                          String note, UUID createdBy) {
        walletRepository.save(wallet);
        WalletTransaction tx = new WalletTransaction();
        tx.setWalletId(wallet.getId());
        tx.setUserId(wallet.getUserId());
        tx.setDirection(direction);
        tx.setType(type);
        tx.setAmountSatang(amountSatang);
        tx.setBalanceAfterSatang(balanceAfter);
        tx.setReferenceType(referenceType);
        tx.setReferenceId(referenceId);
        tx.setNote(note);
        tx.setCreatedBy(createdBy);
        return transactionRepository.save(tx);
    }

    private void requirePositive(long amountSatang) {
        if (amountSatang <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be positive");
        }
    }
}
