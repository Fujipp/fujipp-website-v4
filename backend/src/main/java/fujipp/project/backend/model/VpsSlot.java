package fujipp.project.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One seat on a VPS (bots.vps_slots). The platform backend owns the seat inventory:
 * it regenerates seats when a node's capacity/reservation changes and flips a seat
 * to MAINTENANCE. Whether a FREE seat is actually taken is derived from an active
 * runtime in billing pointing at it.
 */
@Entity
@Table(name = "vps_slots", schema = "bots")
@Getter
@Setter
@NoArgsConstructor
public class VpsSlot {

    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "node_id", columnDefinition = "uuid", nullable = false)
    private UUID nodeId;

    @Column(name = "slot_index", nullable = false)
    private int slotIndex;

    /** FREE | RESERVED | MAINTENANCE */
    @Column(name = "status", nullable = false)
    private String status = "FREE";

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
