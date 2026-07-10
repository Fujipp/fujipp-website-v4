package fujipp.project.billing.dto;

import java.util.List;

/** Outcome of one automation sweep. Released subjects must be stopped by the gateway. */
public record SweepResult(
    int renewalsCharged,
    int markedPastDue,
    int runtimeReleased,
    List<String> releasedSubjectIds
) {}
