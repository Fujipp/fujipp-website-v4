package fujipp.project.voucher.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * This service is internal: the bots call it over host loopback. Every request must
 * carry the shared secret in {@code x-api-key} (the same header the legacy bot already
 * sends) matching {@code voucher.service-token}. The caller identifies itself with
 * {@code X-Client-Id} (e.g. {@code kanom-001}) purely for attribution.
 *
 * The actuator health endpoint is left open so the container healthcheck works.
 */
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    public static final String API_KEY_HEADER = "x-api-key";
    public static final String CLIENT_ID_HEADER = "X-Client-Id";
    public static final String CLIENT_ID_ATTR = "voucher.clientId";
    public static final String DEFAULT_CLIENT_ID = "kanom-001";

    @Value("${voucher.service-token:}")
    private String serviceToken;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/actuator/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String provided = request.getHeader(API_KEY_HEADER);
        if (serviceToken == null || serviceToken.isBlank() || !serviceToken.equals(provided)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid or missing x-api-key\"}");
            return;
        }

        String clientId = request.getHeader(CLIENT_ID_HEADER);
        request.setAttribute(CLIENT_ID_ATTR,
                (clientId == null || clientId.isBlank()) ? DEFAULT_CLIENT_ID : clientId.trim());

        filterChain.doFilter(request, response);
    }
}
