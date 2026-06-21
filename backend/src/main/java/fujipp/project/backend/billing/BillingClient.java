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

    /** The user's permanent bot-slot standing (free allowance + paid extras + price). */
    public record BotSlotView(
        int freeCount,
        int paidSlots,
        long priceSatang
    ) {}

    /** Money-side dashboard metrics from billing-service. */
    public record AdminMetrics(
        long topupRevenueSatang30d,
        long totalWalletBalanceSatang,
        long walletCount,
        java.util.List<AuditEntry> recentAudit
    ) {}

    public record AuditEntry(
        java.util.UUID id,
        java.util.UUID actorId,
        String action,
        java.util.UUID targetUserId,
        String targetType,
        String targetId,
        java.time.OffsetDateTime createdAt
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

    /** The user's permanent bot-slot standing (free + paid + price), for the create-bot cap. */
    public BotSlotView getBotSlots(UUID userId) {
        return http.get().uri("/api/billing/bot-slots")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(BotSlotView.class);
    }

    /**
     * Buy one permanent bot slot from wallet credit. Charges + grants in billing's
     * own transaction; surfaces billing's reason on failure (e.g. insufficient
     * credit). Returns the user's updated bot-slot standing.
     */
    public BotSlotView purchaseBotSlot(UUID userId, String idempotencyKey) {
        return http.post().uri("/api/billing/bot-slots/purchase")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("idempotencyKey", idempotencyKey))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(BotSlotView.class);
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

    // ── runtime seats / server cabinet (user-scoped) ────────────────────────────

    /** Raw JSON list of VPS cabinets + seats with live occupancy for this user. */
    public String listVps(UUID userId) {
        return http.get().uri("/api/billing/runtime/vps")
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Buy runtime for a seat. {@code body} is the PurchaseRuntimeSlotRequest JSON. Surfaces billing's reason. */
    public String purchaseRuntimeSlot(UUID userId, UUID slotId, String body) {
        return http.post().uri("/api/billing/runtime/slots/{slotId}/purchase", slotId)
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Assign / move / unassign a runtime. {@code body} is the AssignRuntimeRequest JSON. */
    public String assignRuntime(UUID userId, UUID runtimeId, String body) {
        return http.post().uri("/api/billing/runtime/{runtimeId}/assign", runtimeId)
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
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

    /** Toggle auto-renew on a runtime subscription. Returns the updated subscription JSON. */
    public String setRuntimeAutoRenew(UUID userId, UUID id, boolean autoRenew) {
        return http.patch().uri("/api/billing/subscriptions/runtime/{id}/auto-renew", id)
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("autoRenew", autoRenew))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Renew a runtime subscription now (charges the wallet). Surfaces billing's reason on failure. */
    public String renewRuntimeSubscription(UUID userId, UUID id) {
        return http.post().uri("/api/billing/subscriptions/runtime/{id}/renew", id)
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Toggle auto-renew on a feature subscription. Returns the updated subscription JSON. */
    public String setFeatureAutoRenew(UUID userId, UUID id, boolean autoRenew) {
        return http.patch().uri("/api/billing/subscriptions/features/{id}/auto-renew", id)
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("autoRenew", autoRenew))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Renew a feature subscription now (charges the wallet). Surfaces billing's reason on failure. */
    public String renewFeatureSubscription(UUID userId, UUID id) {
        return http.post().uri("/api/billing/subscriptions/features/{id}/renew", id)
            .header("X-Service-Token", serviceToken)
            .header("X-User-Id", userId.toString())
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
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

    // ── admin catalog pricing (service token + acting admin id) ─────────────────

    /** Raw JSON list of all runtime plans (incl. inactive) for the admin editor. */
    public String adminListRuntimePlans() {
        return http.get().uri("/api/billing/admin/catalog/runtime-plans")
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Partial-update a runtime plan. {@code body} is the UpdateRuntimePlanRequest JSON. */
    public String adminUpdateRuntimePlan(UUID adminId, UUID planId, String body) {
        return http.patch().uri("/api/billing/admin/catalog/runtime-plans/{id}", planId)
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Raw JSON list of all feature prices (incl. inactive) for the admin editor. */
    public String adminListFeaturePrices() {
        return http.get().uri("/api/billing/admin/catalog/feature-prices")
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Partial-update a feature price. {@code body} is the UpdateFeaturePriceRequest JSON. */
    public String adminUpdateFeaturePrice(UUID adminId, UUID priceId, String body) {
        return http.patch().uri("/api/billing/admin/catalog/feature-prices/{id}", priceId)
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Create a new feature price (SKU). {@code body} is the CreateFeaturePriceRequest JSON. */
    public String adminCreateFeaturePrice(UUID adminId, String body) {
        return http.post().uri("/api/billing/admin/catalog/feature-prices")
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    // ── admin subscription overrides (service token + acting admin id) ──────────

    /** Raw JSON of one user's runtime + feature subscriptions for the admin panel. */
    public String adminListUserSubscriptions(UUID userId) {
        return http.get().uri("/api/billing/admin/subscriptions?userId={userId}", userId)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Grant runtime to a bot (subject) for free, on behalf of its owner. */
    public String adminGrantRuntime(UUID adminId, UUID userId, String subjectId, UUID runtimePlanId) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("userId", userId == null ? null : userId.toString());
        body.put("subjectId", subjectId);
        body.put("runtimePlanId", runtimePlanId == null ? null : runtimePlanId.toString());
        return http.post().uri("/api/billing/admin/subscriptions/runtime")
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Grant a feature to a bot (subject) for free, on behalf of its owner. */
    public String adminGrantFeature(UUID adminId, UUID userId, String subjectId,
                                    UUID featureId, UUID priceId, String billingType) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("userId", userId == null ? null : userId.toString());
        body.put("subjectId", subjectId);
        body.put("featureId", featureId == null ? null : featureId.toString());
        body.put("priceId", priceId == null ? null : priceId.toString());
        body.put("billingType", billingType);
        return http.post().uri("/api/billing/admin/subscriptions/features")
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Override a runtime subscription. {@code body} is the AdminUpdateRuntimeSubscriptionRequest JSON. */
    public String adminUpdateRuntimeSubscription(UUID adminId, UUID subId, String body) {
        return http.patch().uri("/api/billing/admin/subscriptions/runtime/{id}", subId)
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Override a feature subscription. {@code body} is the AdminUpdateFeatureSubscriptionRequest JSON. */
    public String adminUpdateFeatureSubscription(UUID adminId, UUID subId, String body) {
        return http.patch().uri("/api/billing/admin/subscriptions/features/{id}", subId)
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    // ── admin wallet (service token + acting admin id) ──────────────────────────

    /** Raw JSON of a user's wallet balance for the admin panel. */
    public String adminGetWallet(UUID userId) {
        return http.get().uri("/api/billing/admin/wallet/{userId}", userId)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Raw JSON of a user's recent wallet ledger for the admin panel. */
    public String adminWalletTransactions(UUID userId) {
        return http.get().uri("/api/billing/admin/wallet/{userId}/transactions", userId)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    /** Adjust a user's balance up/down. {@code body} is the AdminWalletAdjustRequest JSON. */
    public String adminAdjustWallet(UUID adminId, UUID userId, String body) {
        return http.post().uri("/api/billing/admin/wallet/{userId}/adjust", userId)
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /**
     * Append to the admin audit trail for an action that happens in this backend
     * (e.g. a profile/role edit) rather than inside billing. Best-effort context only;
     * {@code payload} entries with null values are dropped (the JSON map forbids them).
     */
    public void recordAudit(UUID adminId, String action, UUID targetUserId,
                            String targetType, String targetId, Map<String, Object> payload) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("action", action);
        if (targetUserId != null) body.put("targetUserId", targetUserId.toString());
        if (targetType != null) body.put("targetType", targetType);
        if (targetId != null) body.put("targetId", targetId);
        if (payload != null) body.put("payload", payload);
        http.post().uri("/api/billing/admin/audit")
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .toBodilessEntity();
    }

    /** Money-side dashboard metrics (top-up revenue, total balances, recent audit). */
    public AdminMetrics adminMetrics() {
        return http.get().uri("/api/billing/admin/metrics")
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(AdminMetrics.class);
    }

    /** Move a bot's billing rows (subscriptions + config) to a new owner. */
    public String adminTransferBotSubject(UUID adminId, String subjectId, UUID newUserId) {
        return http.post().uri("/api/billing/admin/bots/{subjectId}/transfer", subjectId)
            .header("X-Service-Token", serviceToken)
            .header("X-Admin-Id", adminId.toString())
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("newUserId", newUserId.toString()))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raiseWithReason(res))
            .body(String.class);
    }

    /** Trigger the daily renewal/expiry sweep. Returns which subjects were suspended. */
    public SweepResult runAutomation() {
        return http.post().uri("/api/billing/automation/run")
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(SweepResult.class);
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
