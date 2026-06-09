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
 * A VPS host that runs customer bots. Maps bots.vps_nodes. Capacity is max_slots;
 * a bot consumes a slot by pointing bot_instances.vps_node_id at this row.
 *
 * orchestratorUrl / serviceTokenCipher are optional — NULL means "use the backend's
 * default runtime.* env config" (the primary shared VPS uses that fallback).
 */
@Entity
@Table(name = "vps_nodes", schema = "bots")
@Getter
@Setter
@NoArgsConstructor
public class VpsNode {

    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false, updatable = false)
    private String name;

    @Column(name = "label")
    private String label;

    @Column(name = "region")
    private String region;

    @Column(name = "orchestrator_url")
    private String orchestratorUrl;

    @Column(name = "service_token_cipher")
    private String serviceTokenCipher;

    @Column(name = "max_slots", nullable = false)
    private int maxSlots;

    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
