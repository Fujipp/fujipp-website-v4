package fujipp.project.billing.dto;

/**
 * Assign / move / unassign a runtime.
 *   externalSubjectId = a bot id → assign (or move from its current bot; the old
 *                       bot loses runtime and goes offline)
 *   externalSubjectId = null     → unassign (runtime keeps its seat but powers no bot)
 */
public record AssignRuntimeRequest(
    String externalSubjectId
) {}
