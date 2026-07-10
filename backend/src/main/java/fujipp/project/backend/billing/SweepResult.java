package fujipp.project.backend.billing;

import java.util.List;

/** Result of a billing automation sweep — released runtimes whose bots need stopping. */
public record SweepResult(
    int renewalsCharged,
    int markedPastDue,
    int runtimeReleased,
    List<String> releasedSubjectIds
) {}
