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

    // ── catalog (listing; service token only) ───────────────────────────────────

    /** Raw JSON list of purchasable features (with their price SKUs). */
    public String listFeatures() {
        return http.get().uri("/api/billing/catalog/features")
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Raw JSON list of runtime hosting plans. */
    public String listRuntimePlans() {
        return http.get().uri("/api/billing/catalog/runtime-plans")
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    // ── orders (user-scoped) ────────────────────────────────────────────────────

    /**
     * Buy runtime for one bot from wallet credit. Used when a bot is created with a
     * plan (slot already reserved). Surfaces billing's reason on failure (e.g.
     * insufficient credit) so the customer sees why the charge was declined.
     */
    public void purchaseRuntime(UUID userId, UUID runtimePlanId, String subjectId, String idempotencyKey) {
        http.post().uri("/api/billing/orders")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of(
                "idempotencyKey", idempotencyKey,
                "items", java.util.List.of(Map.of(
                    "runtimePlanId", runtimePlanId.toString(),
                    "externalSubjectId", subjectId))))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .toBodilessEntity();
    }

    /** Buy features/runtime from wallet credit. {@code body} is the PurchaseRequest JSON. */
    public String purchase(UUID userId, String body) {
        return http.post().uri("/api/billing/orders")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Raw JSON list of the user's past orders. */
    public String listOrders(UUID userId) {
        return http.get().uri("/api/billing/orders")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    // ── subscriptions (user-scoped) ───────────────────────────────────────────────

    /** Raw JSON list of the user's feature subscriptions. */
    public String listFeatureSubscriptions(UUID userId) {
        return http.get().uri("/api/billing/subscriptions/features")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Raw JSON list of the user's runtime subscriptions. */
    public String listRuntimeSubscriptions(UUID userId) {
        return http.get().uri("/api/billing/subscriptions/runtime")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    // ── per-bot feature config (subject-scoped) ─────────────────────────────────

    /** Raw JSON config form (features + non-secret values) for a bot. */
    public String getBotConfig(String subjectId) {
        return http.get().uri("/api/billing/bots/{id}/config", subjectId)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Upsert config values for a bot. {@code body} is the UpdateConfigRequest JSON. */
    public String updateBotConfig(String subjectId, String body) {
        return http.put().uri("/api/billing/bots/{id}/config", subjectId)
            .header("X-Service-Token", serviceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    private void raise(HttpStatusCode status) {
        // Surface billing-service's status to the caller (e.g. 409 slip already used).
        throw new ResponseStatusException(status, "Billing service rejected the request");
    }

    /** Forward billing's status AND body so the customer sees the actual reason. */
    private void raiseWithReason(org.springframework.http.client.ClientHttpResponse res) throws java.io.IOException {
        String body = new String(res.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
        String reason = body.isEmpty() ? "Billing service rejected the request" : body;
        throw new ResponseStatusException(res.getStatusCode(), reason);
    }
}
