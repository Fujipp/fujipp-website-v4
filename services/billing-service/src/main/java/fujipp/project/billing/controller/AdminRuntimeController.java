package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AdminMoveSeatRequest;
import fujipp.project.billing.dto.AdminSeatView;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.service.RuntimeSlotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Admin-side runtime/seat queries. Admin authorization is enforced by the platform
 * backend before it calls here; the service token gates access at the edge.
 */
@RestController
@RequestMapping("/api/billing/admin/runtime")
@RequiredArgsConstructor
public class AdminRuntimeController {

    private final RuntimeSlotService runtimeSlotService;

    /** Seat ids that an active runtime currently occupies — for safe capacity edits. */
    @GetMapping("/occupied-slots")
    public ResponseEntity<List<UUID>> occupiedSlots() {
        return ResponseEntity.ok(runtimeSlotService.occupiedSlotIds());
    }

    /** Every seat across the fleet with its occupant — the admin cabinet table. */
    @GetMapping("/cabinet")
    public ResponseEntity<List<AdminSeatView>> cabinet() {
        return ResponseEntity.ok(runtimeSlotService.adminSeats());
    }

    /** Relocate a runtime to a different free seat (e.g. draining a problem VPS). */
    @PostMapping("/{runtimeId}/move-seat")
    public ResponseEntity<RuntimeSubscriptionResponse> moveSeat(
            @PathVariable UUID runtimeId, @RequestBody @Valid AdminMoveSeatRequest request) {
        return ResponseEntity.ok(runtimeSlotService.adminMoveSeat(runtimeId, request.vpsSlotId()));
    }
}
