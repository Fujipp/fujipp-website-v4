package fujipp.project.backend.billing;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

/**
 * Calls the internal billing-service. Every request carries the shared
 * X-Service-Token; user-scoped calls also forward the authenticated user's id.
 *
 * Creates its own RestClient because this backend does not expose a shared
 * RestClient.Builder bean.
 */
@Component
public class BillingClient {

    public record WalletView(
        long balanceSatang,
        String currency
    ) {}

    private final RestClient http;
    private final String serviceToken;

    public BillingClient(
            @Value("${billing.base-url}") String baseUrl,
            @Value("${billing.service-token}") String serviceToken) {
        this.http = RestClient.builder().baseUrl(baseUrl).build();
        this.serviceToken = serviceToken;
    }

    public BillingPaymentView createTopup(UUID userId, long amountSatang) {
        return http.post().uri("/api/wallet/topup")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("amountSatang", amountSatang))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(BillingPaymentView.class);
    }

    public WalletView getWallet(UUID userId) {
        return http.get().uri("/api/wallet")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(WalletView.class);
    }

    public BillingPaymentView getPayment(String reference) {
        return http.get().uri("/api/payments/{reference}", reference)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(BillingPaymentView.class);
    }

    public void confirmTopup(String reference, String transRef, long paidAmountSatang) {
        http.post().uri("/api/payments/confirm")
            .header("X-Service-Token", serviceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of(
                "reference", reference,
                "providerPaymentId", transRef,
                "paidAmountSatang", paidAmountSatang))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .toBodilessEntity();
    }

    private void raise(HttpStatusCode status) {
        // Surface billing-service's status to the caller (e.g. 409 slip already used).
        throw new ResponseStatusException(status, "Billing service rejected the request");
    }
}
