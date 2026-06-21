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
 * Read-only handle on bots.bot_instances — just enough to verify a bot belongs to
 * the user before assigning runtime to it. The platform backend owns the full row;
 * billing maps only id + owner here.
 */
@Entity
@Table(name = "bot_instances", schema = "bots")
@Getter
@Setter
@NoArgsConstructor
public class BotRef {

    @Id
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;
}
