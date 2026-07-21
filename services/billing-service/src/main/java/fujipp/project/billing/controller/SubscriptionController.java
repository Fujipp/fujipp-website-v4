package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AutoRenewRequest;
import fujipp.project.billing.dto.FeatureSubscriptionResponse;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.model.CustomerNotification;
import fujipp.project.billing.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/billing/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public record NotificationResponse(UUID id, String externalSubjectId, String type, String title,
                                       String message, boolean isRead, OffsetDateTime createdAt) {
        static NotificationResponse from(CustomerNotification value) {
            return new NotificationResponse(value.getId(), value.getExternalSubjectId(), value.getType(),
                value.getTitle(), value.getMessage(), value.isRead(), value.getCreatedAt());
        }
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationResponse>> notifications(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(subscriptionService.listNotifications(userId).stream()
            .map(NotificationResponse::from).toList());
    }

    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<NotificationResponse> readNotification(
            @RequestHeader("X-User-Id") UUID userId, @PathVariable UUID id) {
        return ResponseEntity.ok(NotificationResponse.from(subscriptionService.markNotificationRead(userId, id)));
    }

    @GetMapping("/features")
    public ResponseEntity<List<FeatureSubscriptionResponse>> features(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(subscriptionService.listFeatureSubscriptions(userId));
    }

    @GetMapping("/runtime")
    public ResponseEntity<List<RuntimeSubscriptionResponse>> runtime(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(subscriptionService.listRuntimeSubscriptions(userId));
    }

    @PatchMapping("/features/{id}/auto-renew")
    public ResponseEntity<FeatureSubscriptionResponse> featureAutoRenew(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID id,
            @RequestBody AutoRenewRequest request) {
        return ResponseEntity.ok(subscriptionService.setFeatureAutoRenew(userId, id, request.autoRenew()));
    }

    @PatchMapping("/runtime/{id}/auto-renew")
    public ResponseEntity<RuntimeSubscriptionResponse> runtimeAutoRenew(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID id,
            @RequestBody AutoRenewRequest request) {
        return ResponseEntity.ok(subscriptionService.setRuntimeAutoRenew(userId, id, request.autoRenew()));
    }

    /** Assign / move / unassign a BOT-scoped feature. Body externalSubjectId null = unassign. */
    @PostMapping("/features/{id}/assign")
    public ResponseEntity<FeatureSubscriptionResponse> assignFeature(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID id,
            @RequestBody AssignFeatureRequest request) {
        return ResponseEntity.ok(subscriptionService.assignFeature(userId, id, request.externalSubjectId()));
    }

    public record AssignFeatureRequest(String externalSubjectId) {}

    @PostMapping("/features/{id}/renew")
    public ResponseEntity<FeatureSubscriptionResponse> renewFeature(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(subscriptionService.renewFeatureById(userId, id));
    }

    @PostMapping("/runtime/{id}/renew")
    public ResponseEntity<RuntimeSubscriptionResponse> renewRuntime(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(subscriptionService.renewRuntimeById(userId, id));
    }
}
