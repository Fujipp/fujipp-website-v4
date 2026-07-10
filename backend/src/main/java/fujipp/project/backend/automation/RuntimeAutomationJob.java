package fujipp.project.backend.automation;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.billing.SweepResult;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.runtime.RuntimeRouter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Daily at 03:00 Asia/Bangkok: ask billing to run the renewal/expiry sweep, then
 * stop every bot whose Runtime billing just released and reflect that on the bot registry.
 *
 * Enabled by default so recurring billing and released-seat inventory stay in
 * sync. It can be paused only for a deliberate maintenance window. The sweep can
 * still be triggered manually via billing's POST /api/billing/automation/run.
 */
@Component
@RequiredArgsConstructor
public class RuntimeAutomationJob {

    private static final Logger log = LoggerFactory.getLogger(RuntimeAutomationJob.class);

    private final BillingClient billing;
    private final RuntimeRouter runtimeRouter;
    private final RuntimeClient runtime;
    private final BotInstanceRepository bots;

    @Value("${runtime.automation.enabled:false}")
    private boolean enabled;

    @Scheduled(cron = "${runtime.automation.cron:0 0 3 * * *}", zone = "Asia/Bangkok")
    public void runDailySweep() {
        if (!enabled) {
            log.debug("Runtime automation disabled — skipping daily sweep");
            return;
        }

        SweepResult result;
        try {
            result = billing.runAutomation();
        } catch (RuntimeException e) {
            log.error("Daily sweep: billing automation call failed", e);
            return;
        }

        log.info("Daily sweep: renewed={} pastDue={} released={}",
            result.renewalsCharged(), result.markedPastDue(), result.runtimeReleased());

        for (String subjectId : result.releasedSubjectIds()) {
            stopReleasedBot(subjectId);
        }
    }

    /** Mark the bot SUSPENDED and best-effort stop it; never let one failure abort the rest. */
    private void stopReleasedBot(String subjectId) {
        UUID botId;
        try {
            botId = UUID.fromString(subjectId);
        } catch (IllegalArgumentException e) {
            log.warn("Released subject '{}' is not a bot id — skipping stop", subjectId);
            return;
        }

        bots.findById(botId).ifPresent(bot -> {
            bot.setStatus("SUSPENDED");
            bots.save(bot);
        });

        try {
            runtime.stop(runtimeRouter.targetFor(botId), subjectId);
        } catch (RuntimeException e) {
            log.warn("Failed to stop released bot {} on the orchestrator", subjectId, e);
        }
    }
}
