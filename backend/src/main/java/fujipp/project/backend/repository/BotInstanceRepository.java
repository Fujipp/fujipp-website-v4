package fujipp.project.backend.repository;

import fujipp.project.backend.model.BotInstance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BotInstanceRepository extends JpaRepository<BotInstance, UUID> {

    List<BotInstance> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<BotInstance> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndName(UUID userId, String name);
}
