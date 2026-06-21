package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * The server-cabinet runtime flow (proxied to billing-service): browse VPS seats,
 * buy runtime for a seat, and assign/move it between the user's bots. Ownership and
 * seat/bot conflict checks live in billing; this layer just forwards the JWT user.
 */
@RestController
@RequestMapping("/api/runtime")
@RequiredArgsConstructor
public class RuntimeController {

    private final BillingClient billing;

    @GetMapping("/vps")
    public ResponseEntity<String> vps(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return json(billing.listVps(userId));
    }

    @PostMapping("/slots/{slotId}/purchase")
    public ResponseEntity<String> purchase(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID slotId,
            @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return json(billing.purchaseRuntimeSlot(userId, slotId, body));
    }

    @PostMapping("/{runtimeId}/assign")
    public ResponseEntity<String> assign(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID runtimeId,
            @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return json(billing.assignRuntime(userId, runtimeId, body));
    }

    private static ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
