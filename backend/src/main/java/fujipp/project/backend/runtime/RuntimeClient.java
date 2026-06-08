package fujipp.project.backend.runtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Calls the internal bot-runtime-service (orchestrator). Every request carries the
 * shared X-Service-Token. On error the orchestrator's reason is forwarded so the
 * customer sees why a bot did not start (e.g. "runtime is not active").
 */
@Component
public class RuntimeClient {

    private final RestClient http;
    private final String serviceToken;

    public RuntimeClient(
            @Value("${runtime.base-url}") String baseUrl,
            @Value("${runtime.service-token}") String serviceToken) {
        this.http = RestClient.builder().baseUrl(baseUrl).build();
        this.serviceToken = serviceToken;
    }

    public String start(String subjectId) {
        return post(subjectId, "start");
    }

    public String stop(String subjectId) {
        return post(subjectId, "stop");
    }

    public String restart(String subjectId) {
        return post(subjectId, "restart");
    }

    public String status(String subjectId) {
        return http.get().uri("/bots/{id}/status", subjectId)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::raise)
            .body(String.class);
    }

    private String post(String subjectId, String action) {
        return http.post().uri("/bots/{id}/{action}", subjectId, action)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::raise)
            .body(String.class);
    }

    /** Surface the orchestrator's status + reason to the caller. */
    private void raise(org.springframework.http.HttpRequest request, ClientHttpResponse response) throws IOException {
        String body = new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8).trim();
        String reason = body.isEmpty() ? "runtime service rejected the request" : body;
        throw new ResponseStatusException(response.getStatusCode(), reason);
    }
}
