package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.billing.BillingPaymentView;
import fujipp.project.backend.billing.PromptPayQr;
import fujipp.project.backend.billing.SlipData;
import fujipp.project.backend.billing.SlipFileValidator;
import fujipp.project.backend.billing.SlipOkClient;
import fujipp.project.backend.billing.SlipVerificationException;
import fujipp.project.backend.dto.TopupInitResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Top-up orchestration (public side):
 *   1. open a PENDING top-up in billing-service + build a PromptPay QR;
 *   2. verify the customer's slip with SlipOK, then tell billing-service to credit.
 *
 * billing-service stays provider-agnostic; SlipOK and PromptPay live here.
 */
@Service
@RequiredArgsConstructor
public class TopupService {

    private final BillingClient billing;
    private final SlipOkClient slipOk;

    @Value("${promptpay.id}")
    private String promptpayId;

    public TopupInitResponse initTopup(UUID userId, long amountSatang) {
        BillingPaymentView payment = billing.createTopup(userId, amountSatang);
        String payload = PromptPayQr.payload(promptpayId, payment.amountSatang());
        return new TopupInitResponse(payment.reference(), payment.amountSatang(), payload);
    }

    public BillingClient.WalletView getWallet(UUID userId) {
        return billing.getWallet(userId);
    }

    public void verifyAndCredit(UUID userId, String reference, String qrData, MultipartFile file) {
        BillingPaymentView payment = billing.getPayment(reference);

        // Ownership: the reference must belong to the caller (404 to avoid leaking others').
        if (payment.userId() == null || !payment.userId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Top-up not found");
        }
        if (!"PENDING".equals(payment.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This top-up is already " + payment.status().toLowerCase());
        }
        if (payment.expiresAt() != null && OffsetDateTime.now().isAfter(payment.expiresAt())) {
            throw new ResponseStatusException(HttpStatus.GONE,
                "This top-up QR has expired — please start a new top-up");
        }

        boolean hasFile = file != null && !file.isEmpty();
        boolean hasData = qrData != null && !qrData.isBlank();
        if (hasFile == hasData) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Provide exactly one of: slip image (file) or QR data");
        }
        if (hasFile) {
            SlipFileValidator.validate(file); // size / magic bytes / dimensions
        }

        SlipData slip;
        try {
            slip = hasFile
                ? slipOk.verifyByFile(file, payment.amountSatang())
                : slipOk.verifyByData(qrData, payment.amountSatang());
        } catch (SlipVerificationException e) {
            // SlipOK rejected the slip (wrong amount/receiver, duplicate, delay, ...)
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read slip image");
        }

        long paidSatang = Math.round(slip.amount() * 100);
        billing.confirmTopup(reference, slip.transRef(), paidSatang);
    }
}
