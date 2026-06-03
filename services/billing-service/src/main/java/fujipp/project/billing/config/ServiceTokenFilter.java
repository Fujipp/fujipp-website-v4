package fujipp.project.billing.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * This service is internal: only the main backend may call it. Every request must
 * carry a shared secret in {@code X-Service-Token} that matches {@code billing.service-token}.
 * The backend (which authenticates the end user via JWT) forwards the user id in
 * {@code X-User-Id} on user-scoped calls.
 *
 * If the token is unset or mismatched, the request is rejected with 401.
 */
@Component
public class ServiceTokenFilter extends OncePerRequestFilter {

    public static final String SERVICE_TOKEN_HEADER = "X-Service-Token";

    @Value("${billing.service-token:}")
    private String serviceToken;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String provided = request.getHeader(SERVICE_TOKEN_HEADER);
        if (serviceToken == null || serviceToken.isBlank() || !serviceToken.equals(provided)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid or missing service token\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
