package fujipp.project.voucher.config;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * This service is internal: the bots call it over host loopback. Every request must
 * carry the shared secret in {@code x-api-key} (the same header the legacy bot already
 * sends) matching {@code voucher.service-token}. The caller identifies itself with
 * {@code X-Client-Id} (e.g. a shop's subject id, or {@code kanom-001} for the legacy bot).
 *
 * <p>When {@code voucher.allowed-client-ids} is set, the service is locked to that
 * allowlist: only those client ids may redeem and a missing/unknown id is rejected
 * (403), so a leaked token alone can't be used by an outside shop. When the allowlist
 * is empty, any caller with a valid token is accepted and a missing id defaults to
 * {@code kanom-001} (the pre-allowlist behaviour).
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

    @Value("${voucher.allowed-client-ids:}")
    private String allowedClientIdsRaw;

    /** Empty = allowlist disabled (accept any client with a valid token). */
    private Set<String> allowedClientIds = Set.of();

    @PostConstruct
    void initAllowlist() {
        if (allowedClientIdsRaw != null && !allowedClientIdsRaw.isBlank()) {
            allowedClientIds = Arrays.stream(allowedClientIdsRaw.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toUnmodifiableSet());
        }
    }

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

        String header = request.getHeader(CLIENT_ID_HEADER);
        String clientId = (header == null || header.isBlank()) ? null : header.trim();

        if (!allowedClientIds.isEmpty()) {
            // Allowlist enforced: only known clients may redeem. A missing id is
            // rejected (no implicit default) so the token alone is not enough.
            if (clientId == null || !allowedClientIds.contains(clientId)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"client not allowed\"}");
                return;
            }
        } else if (clientId == null) {
            clientId = DEFAULT_CLIENT_ID;
        }

        request.setAttribute(CLIENT_ID_ATTR, clientId);
        filterChain.doFilter(request, response);
    }
}
