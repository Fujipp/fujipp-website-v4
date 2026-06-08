package fujipp.project.backend.runtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/**
 * Calls the internal bot-runtime-service (orchestrator). Every request carries the
 * shared X-Service-Token. Responses are forwarded as raw JSON.
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
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    private String post(String subjectId, String action) {
        return http.post().uri("/bots/{id}/{action}", subjectId, action)
            .header("X-Service-Token", serviceToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> raise(res.getStatusCode()))
            .body(String.class);
    }

    private void raise(HttpStatusCode status) {
        throw new ResponseStatusException(status, "Runtime service rejected the request");
    }
}
