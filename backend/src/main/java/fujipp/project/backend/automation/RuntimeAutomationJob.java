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
 * stop every bot that billing just suspended and reflect that on the bot registry.
 *
 * Gated OFF by default ({@code runtime.automation.enabled=false}) — this charges
 * customer wallets and stops live bots unattended, so it must be turned on
 * deliberately after review. The sweep itself can still be triggered manually via
 * billing's POST /api/billing/automation/run for testing.
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

        log.info("Daily sweep: renewed={} pastDue={} suspended={}",
            result.renewalsCharged(), result.markedPastDue(), result.runtimeSuspended());

        for (String subjectId : result.suspendedSubjectIds()) {
            stopSuspendedBot(subjectId);
        }
    }

    /** Mark the bot SUSPENDED and best-effort stop it; never let one failure abort the rest. */
    private void stopSuspendedBot(String subjectId) {
        UUID botId;
        try {
            botId = UUID.fromString(subjectId);
        } catch (IllegalArgumentException e) {
            log.warn("Suspended subject '{}' is not a bot id — skipping stop", subjectId);
            return;
        }

        bots.findById(botId).ifPresent(bot -> {
            bot.setStatus("SUSPENDED");
            bots.save(bot);
        });

        try {
            runtime.stop(runtimeRouter.targetFor(botId), subjectId);
        } catch (RuntimeException e) {
            log.warn("Failed to stop suspended bot {} on the orchestrator", subjectId, e);
        }
    }
}
