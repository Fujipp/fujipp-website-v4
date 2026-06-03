package fujipp.project.billing.service;

import fujipp.project.billing.dto.SourceDownloadResponse;
import fujipp.project.billing.dto.SourceEntitlementResponse;
import fujipp.project.billing.model.SourceCodeEntitlement;
import fujipp.project.billing.model.SourceCodeRelease;
import fujipp.project.billing.repository.SourceCodeEntitlementRepository;
import fujipp.project.billing.repository.SourceCodeReleaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Source-code ownership and downloads. Owners always get the latest release
 * (free updates). A download mints a short-lived link against the latest release
 * and counts against an optional quota.
 */
@Service
@RequiredArgsConstructor
public class SourceCodeService {

    private static final int LINK_TTL_MINUTES = 15;

    private final SourceCodeEntitlementRepository entitlementRepository;
    private final SourceCodeReleaseRepository releaseRepository;

    @Transactional(readOnly = true)
    public List<SourceEntitlementResponse> listOwned(UUID userId) {
        return entitlementRepository.findByUserId(userId).stream()
            .map(e -> SourceEntitlementResponse.from(e, latestVersion(e.getFeatureId())))
            .toList();
    }

    @Transactional
    public SourceDownloadResponse requestDownload(UUID userId, UUID entitlementId) {
        SourceCodeEntitlement ent = entitlementRepository.findById(entitlementId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entitlement not found"));
        if (!ent.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entitlement not found");
        }
        if ("REVOKED".equals(ent.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This entitlement has been revoked");
        }
        if (ent.getMaxDownloads() != null && ent.getDownloadCount() >= ent.getMaxDownloads()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Download limit reached");
        }

        SourceCodeRelease release = releaseRepository.findByFeatureIdAndLatestTrue(ent.getFeatureId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "No source release is available yet"));

        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(LINK_TTL_MINUTES);
        ent.setDownloadUrl(release.getFileUrl());
        ent.setDownloadExpiresAt(expiresAt);
        ent.setDownloadCount(ent.getDownloadCount() + 1);
        if (!"READY".equals(ent.getStatus())) {
            ent.setStatus("READY");
        }
        entitlementRepository.save(ent);

        return new SourceDownloadResponse(release.getVersion(), release.getFileUrl(), expiresAt);
    }

    private String latestVersion(UUID featureId) {
        return releaseRepository.findByFeatureIdAndLatestTrue(featureId)
            .map(SourceCodeRelease::getVersion)
            .orElse(null);
    }
}
