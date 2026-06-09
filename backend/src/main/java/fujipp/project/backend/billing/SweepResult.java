package fujipp.project.backend.billing;

import java.util.List;

/** Result of a billing automation sweep — which bots were suspended and need stopping. */
public record SweepResult(
    int renewalsCharged,
    int markedPastDue,
    int runtimeSuspended,
    List<String> suspendedSubjectIds
) {}
