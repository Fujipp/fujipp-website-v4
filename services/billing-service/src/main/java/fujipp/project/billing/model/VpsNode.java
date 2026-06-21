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
 * A VPS host (bots.vps_nodes). billing reads this to render the "server cabinet"
 * and to know a node's total/reserved capacity. The platform backend owns writes;
 * billing only reads it here.
 */
@Entity
@Table(name = "vps_nodes", schema = "bots")
@Getter
@Setter
@NoArgsConstructor
public class VpsNode {

    @Id
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "label")
    private String label;

    @Column(name = "region")
    private String region;

    @Column(name = "max_slots", nullable = false)
    private int maxSlots;

    @Column(name = "reserved_slots", nullable = false)
    private int reservedSlots;

    /** ACTIVE | DRAINING | OFFLINE */
    @Column(name = "status", nullable = false)
    private String status;
}
