package fujipp.project.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Audit row for one automation sweep — what it charged / marked / suspended. Maps
 * billing.automation_runs. Important because the sweep moves real money unattended.
 */
@Entity
@Table(name = "automation_runs", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class AutomationRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "run_type", nullable = false)
    private String runType;

    /** RUNNING | SUCCESS | FAILED */
    @Column(name = "status", nullable = false)
    private String status = "RUNNING";

    @Column(name = "renewals_charged", nullable = false)
    private int renewalsCharged = 0;

    @Column(name = "marked_past_due", nullable = false)
    private int markedPastDue = 0;

    @Column(name = "feature_canceled", nullable = false)
    private int featureCanceled = 0;

    @Column(name = "runtime_suspended", nullable = false)
    private int runtimeSuspended = 0;

    @Column(name = "notifications_created", nullable = false)
    private int notificationsCreated = 0;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "started_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime startedAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;
}
