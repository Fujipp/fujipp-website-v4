package fujipp.project.billing.controller;

import fujipp.project.billing.dto.SourceDownloadResponse;
import fujipp.project.billing.dto.SourceEntitlementResponse;
import fujipp.project.billing.service.SourceCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing/source")
@RequiredArgsConstructor
public class SourceController {

    private final SourceCodeService sourceCodeService;

    @GetMapping
    public ResponseEntity<List<SourceEntitlementResponse>> owned(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(sourceCodeService.listOwned(userId));
    }

    @PostMapping("/{id}/download")
    public ResponseEntity<SourceDownloadResponse> download(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(sourceCodeService.requestDownload(userId, id));
    }
}
