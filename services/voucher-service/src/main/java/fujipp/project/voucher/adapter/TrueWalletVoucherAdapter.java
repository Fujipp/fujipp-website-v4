package fujipp.project.voucher.adapter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Calls the TrueMoney gift-voucher upstream. Ported from the legacy
 * voucher.truewallet.ts: parse the {@code v} param, verify (optionally binding the
 * phone), then redeem; map HTTP/upstream errors to {@link VoucherException} codes.
 */
@Component
@ConditionalOnProperty(name = "voucher.adapter", havingValue = "truewallet", matchIfMissing = true)
public class TrueWalletVoucherAdapter implements VoucherAdapter {

    private static final String BASE = "https://gift.truemoney.com/campaign/vouchers";
    private static final List<MediaType> ACCEPT = MediaType.parseMediaTypes("application/json, text/plain, */*");

    private final RestClient http;
    private final ObjectMapper mapper;
    private final String userAgent;

    public TrueWalletVoucherAdapter(
            ObjectMapper mapper,
            @Value("${voucher.tw.user-agent:tmn-redeemer/1.0}") String userAgent,
            @Value("${voucher.tw.timeout-ms:12000}") long timeoutMs) {
        this.mapper = mapper;
        this.userAgent = userAgent;
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofMillis(timeoutMs));
        rf.setReadTimeout(Duration.ofMillis(timeoutMs));
        this.http = RestClient.builder().requestFactory(rf).build();
    }

    private static String parseLink(String giftUrl) {
        String v = UriComponentsBuilder.fromUriString(giftUrl).build().getQueryParams().getFirst("v");
        if (v == null || v.isBlank()) {
            throw new VoucherException("BAD_GIFT_URL", "Invalid gift_url: missing v param");
        }
        return v;
    }

    @Override
    public VoucherCheck checkVoucher(String giftUrl) {
        String link = parseLink(giftUrl);
        JsonNode j = request("GET", BASE + "/" + link + "/verify", null, false);
        JsonNode v = j.path("data").path("voucher");
        boolean valid = "SUCCESS".equals(j.path("status").path("code").asString(""))
                && "active".equals(v.path("status").asString(""));
        String issuer = text(j.path("data").path("owner_profile").path("full_name"));
        Integer remaining = v.has("available") && v.get("available").isNumber()
                ? v.get("available").asInt() : null;
        return new VoucherCheck(valid, issuer, remaining);
    }

    @Override
    public RedeemOutcome redeem(String phone, String giftUrl) {
        String link = parseLink(giftUrl);
        // phone is validated as ^0\d{8,9}$ upstream, so no extra encoding is needed.
        // 1) verify + bind the phone
        request("GET", BASE + "/" + link + "/verify?mobile=" + phone, null, true);
        // 2) redeem
        JsonNode j = request("POST", BASE + "/" + link + "/redeem", Map.of("mobile", phone), true);

        JsonNode v = j.path("data").path("voucher");
        JsonNode ticket = j.path("data").path("my_ticket");
        String amountStr = v.has("redeemed_amount_baht") ? v.get("redeemed_amount_baht").asString("")
                : v.has("amount_baht") ? v.get("amount_baht").asString("") : null;
        BigDecimal amount = amountStr == null || amountStr.isBlank() ? BigDecimal.ZERO : new BigDecimal(amountStr);
        String issuer = text(j.path("data").path("owner_profile").path("full_name"));
        String reference = v.has("voucher_id") ? v.get("voucher_id").asString("")
                : text(ticket.path("update_date"));
        return new RedeemOutcome(amount, "THB", issuer, reference == null ? "" : reference);
    }

    /**
     * Performs the call and returns the parsed JSON. Maps HTTP errors to VoucherException
     * codes; when {@code strict}, also requires the upstream {@code status.code == SUCCESS}.
     */
    private JsonNode request(String method, String url, Object body, boolean strict) {
        try {
            RestClient.RequestBodySpec spec = http.method(HttpMethod.valueOf(method))
                    .uri(url)
                    .headers(h -> {
                        h.set("User-Agent", userAgent);
                        h.setAccept(ACCEPT);
                    });
            RestClient.RequestHeadersSpec<?> finalSpec =
                    body != null ? spec.contentType(MediaType.APPLICATION_JSON).body(body) : spec;
            return finalSpec.exchange((request, response) -> {
                HttpStatusCode sc = response.getStatusCode();
                if (!sc.is2xxSuccessful()) {
                    if (sc.value() == 429) throw new VoucherException("UPSTREAM_RATE_LIMIT", "rate limited");
                    if (sc.value() == 401 || sc.value() == 403) throw new VoucherException("UPSTREAM_AUTH", "upstream auth");
                    throw new VoucherException("UPSTREAM", "UPSTREAM_" + sc.value());
                }
                byte[] bytes = response.getBody().readAllBytes();
                JsonNode j = bytes.length == 0 ? mapper.createObjectNode() : mapper.readTree(bytes);
                if (strict && !"SUCCESS".equals(j.path("status").path("code").asString(""))) {
                    String msg = text(j.path("status").path("message"));
                    throw new VoucherException("VOUCHER_INVALID", msg == null ? "VOUCHER_INVALID" : msg);
                }
                return j;
            });
        } catch (ResourceAccessException e) {
            throw new VoucherException("UPSTREAM_TIMEOUT", "upstream timeout");
        }
    }

    private static String text(JsonNode node) {
        return node != null && node.isTextual() ? node.asString() : null;
    }
}
