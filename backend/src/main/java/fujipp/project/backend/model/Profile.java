package fujipp.project.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "profiles", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class Profile {

    @Id
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "email")
    private String email;

    @Column(name = "username", unique = true)
    private String username;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "provider")
    private String provider;

    @Column(name = "provider_id")
    private String providerId;

    @Column(name = "role", nullable = false)
    private String role = "USER";

    @Column(name = "bio")
    private String bio;

    @Column(name = "website")
    private String website;

    @Column(name = "github_url")
    private String githubUrl;

    // DB sets these automatically — never write from JPA
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
