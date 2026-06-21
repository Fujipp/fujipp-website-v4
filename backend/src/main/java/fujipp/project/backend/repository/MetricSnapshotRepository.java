package fujipp.project.backend.repository;

import fujipp.project.backend.model.MetricSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface MetricSnapshotRepository extends JpaRepository<MetricSnapshot, UUID> {

    /** Latest N samples for one series (e.g. "system"), newest first. */
    List<MetricSnapshot> findByServiceOrderByCapturedAtDesc(String service, org.springframework.data.domain.Pageable pageable);

    /** Housekeeping: drop samples older than the retention window. */
    long deleteByCapturedAtBefore(OffsetDateTime cutoff);
}
