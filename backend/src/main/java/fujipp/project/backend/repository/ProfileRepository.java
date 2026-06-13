package fujipp.project.backend.repository;

import fujipp.project.backend.model.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findByUsername(String username);

    boolean existsByUsername(String username);

    /**
     * Admin user search. A blank query returns the most recent profiles; otherwise
     * matches a case-insensitive substring on email, username, or display name.
     */
    @Query("""
        SELECT p FROM Profile p
        WHERE :q IS NULL OR :q = ''
           OR LOWER(p.email)       LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(p.username)    LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(p.displayName) LIKE LOWER(CONCAT('%', :q, '%'))
        ORDER BY p.createdAt DESC
        """)
    List<Profile> searchProfiles(@Param("q") String q, Pageable pageable);
}
