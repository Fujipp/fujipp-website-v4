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
 * carry the shared secret in {@code x-api-key} matching {@code voucher.service-token},
 * and identify itself with {@code X-Client-Id} — the bot's subject id (central-bot
 * sends {@code ctx.config.subjectId}).
 *
 * <p>When {@code voucher.client-check.enabled} is true (the default), redeem is locked
 * to <b>bots we run on the platform</b>: the {@code X-Client-Id} must be a real row in
 * {@code bots.bot_instances} (or an entry in the optional {@code voucher.allowed-client-ids}
 * escape hatch). So any shop that buys the top-up feature works automatically, while an
 * outside caller — even one holding the token — is rejected (403). Set the flag to false
 * for local/dev runs that have no bot rows.
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

    @Value("${voucher.client-check.enabled:true}")
    private boolean clientCheckEnabled;

    @Value("${voucher.allowed-client-ids:}")
    private String allowedClientIdsRaw;

    /** Optional always-allow ids (non-bot internal callers); additive to the platform check. */
    private Set<String> allowedClientIds = Set.of();

    private final PlatformClientValidator platformClients;

    public ApiKeyFilter(PlatformClientValidator platformClients) {
        this.platformClients = platformClients;
    }

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

        if (clientCheckEnabled) {
            // Lock to our own platform: the caller must be a bot we run (a row in
            // bots.bot_instances) or an explicitly allow-listed internal client. A
            // missing id is rejected, so the token alone is not enough.
            boolean allowed = clientId != null
                    && (allowedClientIds.contains(clientId) || platformClients.isPlatformBot(clientId));
            if (!allowed) {
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
