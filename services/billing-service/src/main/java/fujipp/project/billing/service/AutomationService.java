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
 * Daily renewal/expiry sweep. For every runtime subscription past its period end:
 *   - auto-renew ON  → charge the wallet and extend; on insufficient credit keep it
 *     PAST_DUE (bot keeps running) and retry next run, until the grace window passes
 *     → SUSPENDED.
 *   - auto-renew OFF → SUSPENDED at expiry (customer chose not to continue).
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

    @Value("${automation.runtime-grace-days:3}")
    private int graceDays;

    public SweepResult runDailySweep() {
        LocalDate today = LocalDate.now(TZ);
        AutomationRun run = new AutomationRun();
        run.setRunType("DAILY_SWEEP");
        run = runs.save(run);

        int renewed = 0, pastDue = 0, suspended = 0, notified = 0;
        List<String> suspendedSubjects = new ArrayList<>();

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
                        subscriptionService.setRuntimeStatus(sub.getId(), "SUSPENDED");
                        suspended++; suspendedSubjects.add(sub.getExternalSubjectId());
                        notify(sub, "RUNTIME_SUSPENDED", "บอทถูกระงับ",
                            "ต่ออายุไม่สำเร็จภายใน " + graceDays + " วัน — เติมเครดิตแล้วต่ออายุเพื่อเปิดบอทอีกครั้ง"); notified++;
                    } else {
                        subscriptionService.setRuntimeStatus(sub.getId(), "PAST_DUE");
                        if (wasActive) pastDue++;
                        notify(sub, "RENEWAL_FAILED", "ต่ออายุไม่สำเร็จ — เครดิตไม่พอ",
                            "บอทยังทำงานต่ออีก " + (graceDays - overdue) + " วัน กรุณาเติมเครดิต"); notified++;
                    }
                }
            }

            // 2) auto-renew OFF and expired → suspend now (customer opted out).
            for (RuntimeSubscription sub : runtimeSubs.findByStatusAndCurrentPeriodEndLessThan("ACTIVE", today)) {
                if (sub.isAutoRenew()) continue;
                subscriptionService.setRuntimeStatus(sub.getId(), "SUSPENDED");
                suspended++; suspendedSubjects.add(sub.getExternalSubjectId());
                notify(sub, "RUNTIME_SUSPENDED", "บอทหยุดทำงาน",
                    "Runtime หมดอายุและปิดต่ออัตโนมัติไว้ — ซื้อ runtime ใหม่เพื่อเปิดบอทอีกครั้ง"); notified++;
            }

            run.setStatus("SUCCESS");
        } catch (RuntimeException e) {
            run.setStatus("FAILED");
            run.setErrorMessage(e.getMessage());
            log.error("Automation sweep failed", e);
        } finally {
            run.setRenewalsCharged(renewed);
            run.setMarkedPastDue(pastDue);
            run.setRuntimeSuspended(suspended);
            run.setNotificationsCreated(notified);
            run.setFinishedAt(OffsetDateTime.now());
            runs.save(run);
        }

        log.info("Automation sweep: renewed={} pastDue={} suspended={}", renewed, pastDue, suspended);
        return new SweepResult(renewed, pastDue, suspended, suspendedSubjects);
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
