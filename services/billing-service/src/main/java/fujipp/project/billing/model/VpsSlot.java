package fujipp.project.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * One seat on a VPS (bots.vps_slots). A runtime occupies a seat via
 * runtime_subscriptions.vps_slot_id. {@code status} is the admin-set availability
 * (FREE/RESERVED/MAINTENANCE); whether a FREE seat is actually taken is derived
 * from an active runtime pointing at it. billing locks this row when selling a seat.
 */
@Entity
@Table(name = "vps_slots", schema = "bots")
@Getter
@Setter
@NoArgsConstructor
public class VpsSlot {

    @Id
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "node_id", columnDefinition = "uuid", nullable = false)
    private UUID nodeId;

    @Column(name = "slot_index", nullable = false)
    private int slotIndex;

    /** FREE | RESERVED | MAINTENANCE */
    @Column(name = "status", nullable = false)
    private String status;
}
