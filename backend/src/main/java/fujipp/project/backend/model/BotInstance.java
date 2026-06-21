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
 * A customer bot (the "subject"). Maps the bots.bot_instances registry. The Discord
 * token is stored encrypted (AES-256-GCM) in discord_token_cipher — never plaintext.
 */
@Entity
@Table(name = "bot_instances", schema = "bots")
@Getter
@Setter
@NoArgsConstructor
public class BotInstance {

    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "discord_application_id")
    private String discordApplicationId;

    @Column(name = "discord_guild_id")
    private String discordGuildId;

    @Column(name = "discord_token_cipher")
    private String discordTokenCipher;

    @Column(name = "discord_public_key")
    private String discordPublicKey;

    @Column(name = "discord_client_secret_cipher")
    private String discordClientSecretCipher;

    @Column(name = "discord_avatar_url")
    private String discordAvatarUrl;

    @Column(name = "status", nullable = false)
    private String status = "CREATED";

    // Which VPS host this bot is placed on (a consumed slot). NULL until placed.
    @Column(name = "vps_node_id", columnDefinition = "uuid")
    private UUID vpsNodeId;

    // Orchestrator-managed lifecycle timestamps (read-only here).
    @Column(name = "last_started_at", insertable = false, updatable = false)
    private OffsetDateTime lastStartedAt;

    @Column(name = "last_stopped_at", insertable = false, updatable = false)
    private OffsetDateTime lastStoppedAt;

    // DB sets these automatically — never write from JPA.
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
