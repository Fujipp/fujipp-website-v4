package fujipp.project.billing.controller;

import fujipp.project.billing.dto.PaymentConfirmRequest;
import fujipp.project.billing.dto.PaymentResponse;
import fujipp.project.billing.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Called by the main backend once its payment provider confirms a top-up.
 * Already protected by the service-token filter; idempotent in PaymentService.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentInternalController {

    private final PaymentService paymentService;

    @PostMapping("/confirm")
    public ResponseEntity<PaymentResponse> confirm(@RequestBody @Valid PaymentConfirmRequest request) {
        return ResponseEntity.ok(
            PaymentResponse.from(paymentService.confirmPaid(request.reference(), request.providerPaymentId())));
    }
}
