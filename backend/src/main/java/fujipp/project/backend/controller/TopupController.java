package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient.WalletView;
import fujipp.project.backend.dto.CreateTopupRequest;
import fujipp.project.backend.dto.TopupInitResponse;
import fujipp.project.backend.service.TopupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Public top-up endpoints. The authenticated user's id (from the JWT) is forwarded
 * to billing-service; the customer pays via PromptPay then submits the slip here.
 */
@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class TopupController {

    private final TopupService topupService;

    /** Return the authenticated user's wallet balance from billing-service. */
    @GetMapping
    public ResponseEntity<WalletView> wallet(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(topupService.getWallet(userId));
    }

    /** Open a top-up and get the PromptPay QR payload to display. */
    @PostMapping("/topup")
    public ResponseEntity<TopupInitResponse> init(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid CreateTopupRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(topupService.initTopup(userId, request.amountSatang()));
    }

    /**
     * Submit the payment slip (image file or QR data string) for verification.
     * On success the wallet is credited.
     */
    @PostMapping(value = "/topup/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> verify(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String reference,
            @RequestParam(required = false) String qrData,
            @RequestParam(required = false) MultipartFile file) {
        UUID userId = UUID.fromString(jwt.getSubject());
        topupService.verifyAndCredit(userId, reference, qrData, file);
        return ResponseEntity.ok().build();
    }
}
