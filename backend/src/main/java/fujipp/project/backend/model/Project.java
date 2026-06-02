package fujipp.project.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.ColumnTransformer;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "projects", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class Project {

    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "slug", nullable = false, unique = true)
    private String slug;

    @Column(name = "project_name", nullable = false)
    private String projectName;

    @Column(name = "description_short", nullable = false)
    private String descriptionShort;

    @Column(name = "description")
    private String description;

    @Column(name = "category", nullable = false)
    @ColumnTransformer(write = "?::project_category")
    private String category;

    @Column(name = "status", nullable = false)
    @ColumnTransformer(write = "?::project_status")
    private String status;

    @Column(name = "is_featured", nullable = false)
    private boolean featured;

    @Column(name = "featured_order")
    private Integer featuredOrder;

    @Column(name = "thumbnail_path")
    private String thumbnailPath;

    @Column(name = "architecture_image_path")
    private String architectureImagePath;

    @Column(name = "timeline_start_date")
    private String timelineStartDate;

    @Column(name = "timeline_end_date")
    private String timelineEndDate;

    @Column(name = "timeline_status", nullable = false)
    private String timelineStatus;

    @Column(name = "overview_core_roles")
    private Integer overviewCoreRoles;

    @Column(name = "overview_challenge_areas")
    private Integer overviewChallengeAreas;

    @Column(name = "overview_stack_group")
    private Integer overviewStackGroup;

    @Column(name = "overview_target_users")
    private String overviewTargetUsers;

    @Column(name = "overview_feasibility")
    private String overviewFeasibility;

    @Column(name = "challenges")
    private String challenges;

    @Column(name = "is_published", nullable = false)
    private boolean published = true;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
