package fujipp.project.billing.dto;

import java.time.OffsetDateTime;

public record SourceDownloadResponse(
    String version,
    String downloadUrl,
    OffsetDateTime expiresAt
) {}
