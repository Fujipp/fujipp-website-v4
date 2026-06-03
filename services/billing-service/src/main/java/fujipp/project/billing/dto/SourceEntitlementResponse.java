package fujipp.project.billing.dto;

import fujipp.project.billing.model.SourceCodeEntitlement;

import java.util.UUID;

public record SourceEntitlementResponse(
    UUID id,
    UUID featureId,
    String status,
    String purchasedVersion,
    String latestVersion,
    String licenseKey,
    int downloadCount,
    Integer maxDownloads
) {
    public static SourceEntitlementResponse from(SourceCodeEntitlement e, String latestVersion) {
        return new SourceEntitlementResponse(
            e.getId(), e.getFeatureId(), e.getStatus(), e.getPurchasedVersion(),
            latestVersion, e.getLicenseKey(), e.getDownloadCount(), e.getMaxDownloads());
    }
}
