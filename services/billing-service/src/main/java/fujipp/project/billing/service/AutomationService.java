package fujipp.project.billing.service;

import fujipp.project.billing.dto.SweepResult;
import fujipp.project.billing.model.AutomationRun;
import fujipp.project.billing.model.CustomerNotification;
import fujipp.project.billing.model.RuntimeSubscription;
import fujipp.project.billing.repository.AutomationRunRepository;
import fujipp.project.billing.repository.CustomerNotificationRepository;
import fujipp.project.billing.repository.RuntimeSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Daily renewal/expiry sweep. For every runtime subscription at its period end:
 *   - auto-renew ON  → charge the wallet and extend; on insufficient credit keep it
 *     PAST_DUE (bot keeps running) and retry next run, until the grace window passes
 *     → CANCELED and its VPS seat returns to the sale inventory.
 *   - auto-renew OFF → CANCELED at expiry and its VPS seat returns to inventory.
 *
 * Each subscription is processed in its OWN transaction (via SubscriptionService),
 * so a failure on one never rolls back the others. This service holds no transaction.
 * Money moves here unattended, so every run is logged to billing.automation_runs and
 * the customer is notified.
 */
@Service
@RequiredArgsConstructor
public class AutomationService {

    private static final Logger log = LoggerFactory.getLogger(AutomationService.class);
    private static final ZoneId TZ = ZoneId.of("Asia/Bangkok");

    private final RuntimeSubscriptionRepository runtimeSubs;
    private final SubscriptionService subscriptionService;
    private final CustomerNotificationRepository notifications;
    private final AutomationRunRepository runs;

    @Value("${automation.runtime-grace-days:1}")
    private int graceDays;

    public SweepResult runDailySweep() {
        LocalDate today = LocalDate.now(TZ);
        AutomationRun run = new AutomationRun();
        run.setRunType("DAILY_SWEEP");
        run = runs.save(run);

        int renewed = 0, pastDue = 0, released = 0, notified = 0;
        List<String> releasedSubjects = new ArrayList<>();

        try {
            // 1) auto-renew due (ACTIVE + already PAST_DUE), period ended on/before today.
            List<RuntimeSubscription> due = new ArrayList<>();
            due.addAll(runtimeSubs.findByStatusAndAutoRenewTrueAndCurrentPeriodEndLessThanEqual("ACTIVE", today));
            due.addAll(runtimeSubs.findByStatusAndAutoRenewTrueAndCurrentPeriodEndLessThanEqual("PAST_DUE", today));

            for (RuntimeSubscription sub : due) {
                boolean wasActive = "ACTIVE".equals(sub.getStatus());
                try {
                    subscriptionService.renewRuntime(sub);
                    renewed++;
                    notify(sub, "RENEWAL_SUCCESS", "ต่ออายุ Runtime แล้ว",
                        "ระบบตัดเครดิตและต่ออายุบอทให้อัตโนมัติแล้ว"); notified++;
                } catch (RuntimeException e) {
                    long overdue = ChronoUnit.DAYS.between(sub.getCurrentPeriodEnd(), today);
                    if (overdue >= graceDays) {
                        releasedSubjects.add(subscriptionService.releaseRuntime(sub.getId()));
                        released++;
                        notify(sub, "RUNTIME_RELEASED", "Runtime หมดอายุแล้ว",
                            "ต่ออายุไม่สำเร็จภายใน " + graceDays + " วัน ระบบจึงคืนช่อง VPS เข้าสู่รายการขายแล้ว"); notified++;
                    } else {
                        subscriptionService.setRuntimeStatus(sub.getId(), "PAST_DUE");
                        if (wasActive) pastDue++;
                        notify(sub, "RENEWAL_FAILED", "ต่ออายุไม่สำเร็จ — เครดิตไม่พอ",
                            "บอทยังทำงานต่ออีก " + (graceDays - overdue) + " วัน กรุณาเติมเครดิต"); notified++;
                    }
                }
            }

            // 2) auto-renew OFF and expired → release the seat now (customer opted out).
            for (RuntimeSubscription sub : runtimeSubs.findByStatusAndCurrentPeriodEndLessThan("ACTIVE", today)) {
                if (sub.isAutoRenew()) continue;
                releasedSubjects.add(subscriptionService.releaseRuntime(sub.getId()));
                released++;
                notify(sub, "RUNTIME_RELEASED", "Runtime หมดอายุแล้ว",
                    "คุณปิดการต่ออายุอัตโนมัติไว้ ระบบจึงคืนช่อง VPS เข้าสู่รายการขายแล้ว"); notified++;
            }

            run.setStatus("SUCCESS");
        } catch (RuntimeException e) {
            run.setStatus("FAILED");
            run.setErrorMessage(e.getMessage());
            log.error("Automation sweep failed", e);
        } finally {
            run.setRenewalsCharged(renewed);
            run.setMarkedPastDue(pastDue);
            run.setRuntimeSuspended(released);
            run.setNotificationsCreated(notified);
            run.setFinishedAt(OffsetDateTime.now());
            runs.save(run);
        }

        log.info("Automation sweep: renewed={} pastDue={} released={}", renewed, pastDue, released);
        return new SweepResult(renewed, pastDue, released, releasedSubjects.stream()
            .filter(java.util.Objects::nonNull).toList());
    }

    /** Best-effort customer notification — never let a notification failure abort the sweep. */
    private void notify(RuntimeSubscription sub, String type, String title, String message) {
        try {
            notifications.save(CustomerNotification.of(sub.getUserId(), sub.getExternalSubjectId(), type, title, message));
        } catch (RuntimeException e) {
            log.warn("Failed to write {} notification for subject {}", type, sub.getExternalSubjectId(), e);
        }
    }
}
