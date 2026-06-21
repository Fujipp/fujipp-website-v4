package fujipp.project.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Permanent bot slots a user has bought beyond the free allowance (bots.user_bot_slots).
 * The create-bot cap is {@code free_count + paid_slots}; paid_slots never expires.
 *
 * Lives in the {@code bots} schema (the platform owns the create-bot cap), but
 * billing-service writes it here inside the same transaction as the wallet charge,
 * so a purchase either grants the slot AND debits, or neither.
 */
@Entity
@Table(name = "user_bot_slots", schema = "bots")
@Getter
@Setter
@NoArgsConstructor
public class UserBotSlot {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "paid_slots", nullable = false)
    private int paidSlots = 0;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
