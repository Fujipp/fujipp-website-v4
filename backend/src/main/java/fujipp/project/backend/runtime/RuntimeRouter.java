package fujipp.project.backend.runtime;

import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.model.VpsNode;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.repository.VpsNodeRepository;
import fujipp.project.backend.security.SecretCipher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Resolves which orchestrator a bot's runtime lives on. A bot placed on a VPS node
 * with its own url/token is reached there; otherwise (no node, or the node leaves
 * url/token NULL — like the primary shared VPS) the backend's default runtime.* env
 * config is used.
 */
@Component
public class RuntimeRouter {

    private final BotInstanceRepository bots;
    private final VpsNodeRepository nodes;
    private final SecretCipher cipher;
    private final String defaultBaseUrl;
    private final String defaultToken;

    public RuntimeRouter(
            BotInstanceRepository bots,
            VpsNodeRepository nodes,
            SecretCipher cipher,
            @Value("${runtime.base-url}") String defaultBaseUrl,
            @Value("${runtime.service-token}") String defaultToken) {
        this.bots = bots;
        this.nodes = nodes;
        this.cipher = cipher;
        this.defaultBaseUrl = stripTrailingSlash(defaultBaseUrl);
        this.defaultToken = defaultToken;
    }

    public RuntimeTarget targetFor(UUID botId) {
        BotInstance bot = bots.findById(botId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
        if (bot.getVpsNodeId() == null) {
            return defaultTarget();
        }
        VpsNode node = nodes.findById(bot.getVpsNodeId()).orElse(null);
        if (node == null) {
            return defaultTarget();
        }
        String baseUrl = (node.getOrchestratorUrl() == null || node.getOrchestratorUrl().isBlank())
            ? defaultBaseUrl
            : stripTrailingSlash(node.getOrchestratorUrl());
        String token = (node.getServiceTokenCipher() == null || node.getServiceTokenCipher().isBlank())
            ? defaultToken
            : cipher.decrypt(node.getServiceTokenCipher());
        return new RuntimeTarget(baseUrl, token);
    }

    private RuntimeTarget defaultTarget() {
        return new RuntimeTarget(defaultBaseUrl, defaultToken);
    }

    private static String stripTrailingSlash(String url) {
        if (url == null) return null;
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
