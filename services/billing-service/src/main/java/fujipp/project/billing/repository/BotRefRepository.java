package fujipp.project.billing.repository;

import fujipp.project.billing.model.BotRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BotRefRepository extends JpaRepository<BotRef, UUID> {
}
