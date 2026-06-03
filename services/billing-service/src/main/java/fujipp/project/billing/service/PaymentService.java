package fujipp.project.billing.service;

import fujipp.project.billing.model.Payment;
import fujipp.project.billing.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Top-up flow. {@link #createTopup} opens a PENDING payment; {@link #confirmPaid}
 * (called by the main backend after its provider webhook fires) credits the wallet
 * exactly once — it is idempotent so a retried confirmation never double-credits.
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final long MIN_TOPUP_SATANG = 5000L; // 50 THB
    private static final int EXPIRES_MINUTES = 30;

    private final PaymentRepository paymentRepository;
    private final WalletService walletService;

    @Transactional
    public Payment createTopup(UUID userId, long amountSatang) {
        if (amountSatang < MIN_TOPUP_SATANG) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Minimum top-up is " + MIN_TOPUP_SATANG + " satang (50 THB)");
        }
        Payment payment = new Payment();
        payment.setUserId(userId);
        payment.setPurpose("WALLET_TOPUP");
        payment.setProvider("MANUAL");
        payment.setStatus("PENDING");
        payment.setAmountSatang(amountSatang);
        payment.setCurrency("THB");
        payment.setReference("TOPUP-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        payment.setExpiresAt(OffsetDateTime.now().plusMinutes(EXPIRES_MINUTES));
        // qr_code_url is filled in once a real PromptPay/card provider is wired up.
        return paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public List<Payment> history(UUID userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Payment getByReference(String reference) {
        return paymentRepository.findByReference(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    /**
     * Marks a payment PAID and credits the wallet. Idempotent: a payment already
     * PAID is returned untouched, so confirmation retries are safe.
     *
     * @param paidAmountSatang  if non-null, must equal the pending amount (anti-tamper)
     * @param providerPaymentId SlipOK transRef; must be unique (blocks slip reuse)
     */
    @Transactional
    public Payment confirmPaid(String reference, String providerPaymentId, Long paidAmountSatang) {
        Payment payment = paymentRepository.findByReference(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        if ("PAID".equals(payment.getStatus())) {
            return payment; // already processed — do not credit again
        }
        if (!"PENDING".equals(payment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Payment is " + payment.getStatus() + " and cannot be paid");
        }
        if (paidAmountSatang != null && paidAmountSatang != payment.getAmountSatang()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Paid amount does not match the top-up amount");
        }
        if (providerPaymentId != null && paymentRepository.existsByProviderPaymentId(providerPaymentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This slip has already been used");
        }

        payment.setStatus("PAID");
        payment.setPaidAt(OffsetDateTime.now());
        payment.setProviderPaymentId(providerPaymentId);
        paymentRepository.save(payment);

        walletService.credit(
            payment.getUserId(), payment.getAmountSatang(), "TOPUP",
            "PAYMENT", payment.getId(), "Wallet top-up", null);

        return payment;
    }
}
