package fujipp.project.billing.dto;

import java.util.List;

/**
 * Outcome of one automation sweep. {@code suspendedSubjectIds} tells the caller
 * (the backend) which bots to stop on the orchestrator.
 */
public record SweepResult(
    int renewalsCharged,
    int markedPastDue,
    int runtimeSuspended,
    List<String> suspendedSubjectIds
) {}
