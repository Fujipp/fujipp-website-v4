package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Buy features/runtime from wallet credit, and list past orders. The authenticated
 * user's id (from the JWT) is forwarded to billing-service; the request/response
 * JSON is passed through unchanged.
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final BillingClient billing;

    @PostMapping
    public ResponseEntity<String> purchase(@AuthenticationPrincipal Jwt jwt, @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(billing.purchase(userId, body));
    }

    @GetMapping
    public ResponseEntity<String> list(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(billing.listOrders(userId));
    }
}
