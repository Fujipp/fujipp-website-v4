package fujipp.project.backend.repository;

import fujipp.project.backend.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    List<Project> findAllByPublishedTrueOrderByDisplayOrderAsc();

    @Query("select coalesce(max(project.displayOrder), 0) from Project project")
    int findMaxDisplayOrder();
}
