package fujipp.project.backend.repository;

import fujipp.project.backend.model.Incident;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    /** The currently-open incident for a service, if any (used to avoid duplicating an ongoing outage). */
    Optional<Incident> findFirstByServiceAndStatusOrderByStartedAtDesc(String service, String status);

    /** Recent incidents, newest first — drives the status-page incident log. */
    List<Incident> findAllByOrderByStartedAtDesc(Pageable pageable);
}
