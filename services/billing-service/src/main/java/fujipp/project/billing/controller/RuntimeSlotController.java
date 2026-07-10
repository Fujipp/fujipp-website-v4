package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AssignRuntimeRequest;
import fujipp.project.billing.dto.PurchaseRuntimeSlotRequest;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.dto.VpsNodeView;
import fujipp.project.billing.service.RuntimeSlotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** The server-cabinet: browse seats, buy a duration plan, then assign it to a bot later. */
@RestController
@RequestMapping("/api/billing/runtime")
@RequiredArgsConstructor
public class RuntimeSlotController {

    private final RuntimeSlotService runtimeSlotService;

    /** All cabinets (VPS nodes) with their seats and live occupancy for this user. */
    @GetMapping("/vps")
    public ResponseEntity<List<VpsNodeView>> vps(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(runtimeSlotService.listVps(userId));
    }

    /** Buy runtime for a seat. New runtime always starts unassigned. */
    @PostMapping("/slots/{slotId}/purchase")
    public ResponseEntity<RuntimeSubscriptionResponse> purchase(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID slotId,
            @RequestBody @Valid PurchaseRuntimeSlotRequest request) {
        return ResponseEntity.ok(runtimeSlotService.purchaseForSlot(
            userId, slotId, request.runtimePlanId(), request.idempotencyKey()));
    }

    /** Assign / move / unassign a runtime. Body externalSubjectId null = unassign. */
    @PostMapping("/{runtimeId}/assign")
    public ResponseEntity<RuntimeSubscriptionResponse> assign(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID runtimeId,
            @RequestBody AssignRuntimeRequest request) {
        return ResponseEntity.ok(runtimeSlotService.assign(userId, runtimeId, request.externalSubjectId()));
    }
}
