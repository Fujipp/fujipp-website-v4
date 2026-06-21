package fujipp.project.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * A key/value platform setting (billing.automation_settings). Reference data seeded
 * by migrations — e.g. {@code bot_slot.free_count}, {@code bot_slot.price_satang}.
 * Read here so prices/limits can change without a redeploy.
 */
@Entity
@Table(name = "automation_settings", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class AutomationSetting {

    @Id
    @Column(name = "setting_key", nullable = false, updatable = false)
    private String settingKey;

    @Column(name = "setting_value", nullable = false)
    private String settingValue;

    @Column(name = "description")
    private String description;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
