package fujipp.project.billing.controller;

import fujipp.project.billing.service.RuntimeSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
}
