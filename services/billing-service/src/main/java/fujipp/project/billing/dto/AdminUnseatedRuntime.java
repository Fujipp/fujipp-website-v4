package fujipp.project.billing.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * An active runtime that holds no VPS seat (legacy/orphan). The admin can assign it
 * to a free seat via the move-seat endpoint so it shows up in the cabinet and counts
 * as occupied.
 */
public record AdminUnseatedRuntime(
    UUID runtimeId,
    String externalSubjectId,
    UUID ownerUserId,
    LocalDate expiresAt
) {}
