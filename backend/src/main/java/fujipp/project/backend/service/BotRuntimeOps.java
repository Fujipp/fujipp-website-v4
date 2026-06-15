package fujipp.project.backend.service;

import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.runtime.RuntimeRouter;
import fujipp.project.backend.runtime.RuntimeTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

/** Small runtime helpers shared by controllers (config save, review-credit recount). */
@Service
@RequiredArgsConstructor
public class BotRuntimeOps {

    private final RuntimeClient runtime;
    private final RuntimeRouter runtimeRouter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Restart the bot so freshly-changed config/state takes effect — but only when it is
     * online (a stopped bot stays stopped). Best-effort: an orchestrator hiccup is swallowed
     * so it never fails the caller's primary action.
     */
    public void restartIfRunning(UUID botId) {
        try {
            RuntimeTarget target = runtimeRouter.targetFor(botId);
            String statusJson = runtime.status(target, botId.toString());
            if (objectMapper.readTree(statusJson).path("state").asText("").equalsIgnoreCase("online")) {
                runtime.restart(target, botId.toString());
            }
        } catch (RuntimeException e) {
            // orchestrator unreachable / bot not placed — caller's action already succeeded
        }
    }
}
