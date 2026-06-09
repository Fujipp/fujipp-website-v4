package fujipp.project.backend.runtime;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Calls the internal bot-runtime-service (orchestrator). The platform may run many
 * VPS hosts, each with its own orchestrator + X-Service-Token, so every call is
 * directed at a {@link RuntimeTarget} (the host that owns the bot). On error the
 * orchestrator's reason is forwarded so the customer sees why a bot did not start.
 */
@Component
public class RuntimeClient {

    private final RestClient http = RestClient.create();

    public String start(RuntimeTarget target, String subjectId) {
        return post(target, subjectId, "start");
    }

    public String stop(RuntimeTarget target, String subjectId) {
        return post(target, subjectId, "stop");
    }

    public String restart(RuntimeTarget target, String subjectId) {
        return post(target, subjectId, "restart");
    }

    public String status(RuntimeTarget target, String subjectId) {
        return http.get().uri(target.baseUrl() + "/bots/{id}/status", subjectId)
            .header("X-Service-Token", target.serviceToken())
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::raise)
            .body(String.class);
    }

    private String post(RuntimeTarget target, String subjectId, String action) {
        return http.post().uri(target.baseUrl() + "/bots/{id}/{action}", subjectId, action)
            .header("X-Service-Token", target.serviceToken())
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
