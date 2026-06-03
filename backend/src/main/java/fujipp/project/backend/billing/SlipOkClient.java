package fujipp.project.backend.billing;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Verifies bank-transfer slips against SlipOK. With {@code log:true} SlipOK also
 * checks the receiver account and flags duplicates; we pass {@code amount} so the
 * slip amount is cross-checked too.
 *
 * Error code 1012 (slip already sent to SlipOK) is treated as a valid slip and
 * returned — our own provider_payment_id UNIQUE is the authoritative dedupe, so a
 * payment that failed downstream can still be recovered.
 */
@Component
public class SlipOkClient {

    private static final int CODE_REPEATED_SLIP = 1012;

    private final RestClient http;
    private final String apiKey;
    private final String branchId;

    public SlipOkClient(
            @Value("${slipok.base-url:https://api.slipok.com}") String baseUrl,
            @Value("${slipok.branch-id}") String branchId,
            @Value("${slipok.api-key}") String apiKey) {
        this.http = RestClient.builder().baseUrl(baseUrl).build();
        this.branchId = branchId;
        this.apiKey = apiKey;
    }

    public SlipData verifyByData(String qrData, long expectedAmountSatang) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("data", qrData);
        body.put("log", true);
        body.put("amount", expectedAmountSatang / 100.0);
        return send(req -> req.contentType(MediaType.APPLICATION_JSON).body(body));
    }

    public SlipData verifyByFile(MultipartFile file, long expectedAmountSatang) throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("files", file.getResource());
        builder.part("log", "true");
        builder.part("amount", String.valueOf(expectedAmountSatang / 100.0));
        var parts = builder.build();
        return send(req -> req.contentType(MediaType.MULTIPART_FORM_DATA).body(parts));
    }

    private SlipData send(Function<RestClient.RequestBodySpec, RestClient.RequestBodySpec> bodyConfig) {
        RestClient.RequestBodySpec spec = http.post()
            .uri("/api/line/apikey/{branch}", branchId)
            .header("x-authorization", apiKey);
        return bodyConfig.apply(spec).exchange((request, response) -> {
            SlipOkEnvelope env = response.bodyTo(SlipOkEnvelope.class);
            boolean valid = env != null && env.data() != null && env.data().success();
            boolean accepted = valid
                && (response.getStatusCode().is2xxSuccessful()
                    || (env.code() != null && env.code() == CODE_REPEATED_SLIP));
            if (accepted) {
                return env.data();
            }
            int code = (env != null && env.code() != null) ? env.code() : 0;
            String message = (env != null && env.message() != null)
                ? env.message() : "Slip verification failed";
            throw new SlipVerificationException(code, message);
        });
    }
}
