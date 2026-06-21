package fujipp.project.backend.repository;

import fujipp.project.backend.model.BotInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BotInstanceRepository extends JpaRepository<BotInstance, UUID> {

    List<BotInstance> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<BotInstance> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndName(UUID userId, String name);

    /** How many bots a user owns — checked against their slot allowance on create. */
    long countByUserId(UUID userId);

    /** Reassign a bot to a new owner (user_id is updatable=false on the entity, so bulk-update it). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update BotInstance b set b.userId = :newUserId where b.id = :botId")
    int reassignOwner(@Param("botId") UUID botId, @Param("newUserId") UUID newUserId);

    /** Slots consumed on a node = bots currently placed on it. */
    long countByVpsNodeId(UUID vpsNodeId);

    long countByStatus(String status);

    /** Total slots consumed across all nodes = bots that have been placed. */
    long countByVpsNodeIdNotNull();

    /** Bots that have a token but no cached avatar yet — used to backfill avatars once. */
    List<BotInstance> findByDiscordAvatarUrlIsNullAndDiscordTokenCipherIsNotNull();
}
