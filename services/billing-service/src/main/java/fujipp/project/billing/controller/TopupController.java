package fujipp.project.billing.controller;

import fujipp.project.billing.dto.CreateTopupRequest;
import fujipp.project.billing.dto.PaymentResponse;
import fujipp.project.billing.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wallet/topup")
@RequiredArgsConstructor
public class TopupController {

    private final PaymentService paymentService;

    /** Opens a PENDING top-up payment and returns the reference/QR to pay. */
    @PostMapping
    public ResponseEntity<PaymentResponse> createTopup(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CreateTopupRequest request) {
        return ResponseEntity.ok(
            PaymentResponse.from(paymentService.createTopup(userId, request.amountSatang())));
    }

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> history(@RequestHeader("X-User-Id") UUID userId) {
        List<PaymentResponse> items = paymentService.history(userId).stream()
            .map(PaymentResponse::from)
            .toList();
        return ResponseEntity.ok(items);
    }
}
