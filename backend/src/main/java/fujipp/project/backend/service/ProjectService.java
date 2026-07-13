package fujipp.project.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import fujipp.project.backend.dto.ProjectRequest;
import fujipp.project.backend.dto.ProjectResponse;
import fujipp.project.backend.model.Profile;
import fujipp.project.backend.model.Project;
import fujipp.project.backend.repository.ProfileRepository;
import fujipp.project.backend.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private static final List<String> LOCALES = List.of("en", "th");
    private static final List<String> STACK_GROUPS = List.of(
        "language", "frontend", "backend", "database", "external_service", "devops"
    );
    private static final long PUBLIC_CACHE_TTL_NANOS = TimeUnit.MINUTES.toNanos(5);

    private final JdbcTemplate jdbcTemplate;
    private final ProfileRepository profileRepository;
    private final ProjectRepository projectRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Object publicCacheLock = new Object();
    private final ConcurrentMap<UUID, CachedProject> projectCache = new ConcurrentHashMap<>();
    private volatile CachedProjects projectsCache;

    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjects() {
        long now = System.nanoTime();
        CachedProjects cached = projectsCache;

        if (cached != null && cached.expiresAtNanos() > now) {
            return cached.projects();
        }

        synchronized (publicCacheLock) {
            cached = projectsCache;
            now = System.nanoTime();

            if (cached != null && cached.expiresAtNanos() > now) {
                return cached.projects();
            }

            List<ProjectResponse> projects = loadProjects();
            projectsCache = new CachedProjects(projects, now + PUBLIC_CACHE_TTL_NANOS);
            projects.forEach(project -> projectCache.put(
                project.id(),
                new CachedProject(project, now + PUBLIC_CACHE_TTL_NANOS)
            ));
            return projects;
        }
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID projectId) {
        long now = System.nanoTime();
        CachedProject cached = projectCache.get(projectId);

        if (cached != null && cached.expiresAtNanos() > now) {
            return cached.project();
        }

        ProjectResponse project = toResponse(findProject(projectId));
        projectCache.put(projectId, new CachedProject(project, now + PUBLIC_CACHE_TTL_NANOS));
        return project;
    }

    @Transactional
    public ProjectResponse createProject(UUID userId, ProjectRequest request) {
        requireAdmin(userId);

        if (projectRepository.existsBySlug(request.slug())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project slug already exists");
        }

        Project project = new Project();
        project.setDisplayOrder(projectRepository.findMaxDisplayOrder() + 1);
        applyMainProject(project, request);
        project = projectRepository.saveAndFlush(project);
        replaceChildren(project.getId(), request);
        ProjectResponse response = toResponse(project);
        invalidatePublicCacheAfterCommit();
        return response;
    }

    @Transactional
    public ProjectResponse updateProject(UUID userId, UUID projectId, ProjectRequest request) {
        requireAdmin(userId);

        if (projectRepository.existsBySlugAndIdNot(request.slug(), projectId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project slug already exists");
        }

        Project project = findProject(projectId);
        applyMainProject(project, request);
        project = projectRepository.saveAndFlush(project);
        replaceChildren(projectId, request);
        ProjectResponse response = toResponse(project);
        invalidatePublicCacheAfterCommit();
        return response;
    }

    @Transactional
    public List<ProjectResponse> updateFeaturedProjects(UUID userId, List<UUID> projectIds) {
        requireAdmin(userId);

        if (projectIds == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Featured project list is required");
        }

        if (projectIds.size() > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Featured projects are limited to 3 items");
        }

        if (projectIds.stream().anyMatch(id -> id == null) || new HashSet<>(projectIds).size() != projectIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Featured project ids must be unique");
        }

        Set<UUID> requestedIds = new HashSet<>(projectIds);
        List<Project> projects = projectRepository.findAll();

        if (!projectIds.isEmpty()
                && projects.stream().filter(project -> requestedIds.contains(project.getId())).count() != projectIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Featured project not found");
        }

        projects.forEach(project -> {
            project.setFeatured(false);
            project.setFeaturedOrder(null);
        });

        for (int index = 0; index < projectIds.size(); index++) {
            UUID projectId = projectIds.get(index);
            int featuredOrder = index + 1;

            projects.stream()
                .filter(project -> project.getId().equals(projectId))
                .findFirst()
                .ifPresent(project -> {
                    project.setFeatured(true);
                    project.setFeaturedOrder(featuredOrder);
                });
        }

        projectRepository.saveAllAndFlush(projects);
        invalidatePublicCacheAfterCommit();
        return loadProjects();
    }

    @Transactional
    public void deleteProject(UUID userId, UUID projectId) {
        requireAdmin(userId);
        projectRepository.delete(findProject(projectId));
        invalidatePublicCacheAfterCommit();
    }

    private List<ProjectResponse> loadProjects() {
        return projectRepository.findAllByPublishedTrueOrderByDisplayOrderAsc().stream()
            .map(this::toResponse)
            .toList();
    }

    private void invalidatePublicCache() {
        projectsCache = null;
        projectCache.clear();
    }

    private void invalidatePublicCacheAfterCommit() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            invalidatePublicCache();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                invalidatePublicCache();
            }
        });
    }

    private Project findProject(UUID projectId) {
        return projectRepository.findById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private record CachedProjects(List<ProjectResponse> projects, long expiresAtNanos) {}

    private record CachedProject(ProjectResponse project, long expiresAtNanos) {}

    private void requireAdmin(UUID userId) {
        Profile profile = profileRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required"));

        if (!"ADMIN".equals(profile.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
    }

    private void applyMainProject(Project project, ProjectRequest request) {
        JsonNode english = request.content().path("en");
        JsonNode overview = request.overview();
        JsonNode gallery = request.gallery();
        JsonNode timeline = request.timeline();

        project.setSlug(request.slug());
        project.setProjectName(text(english, "projectName"));
        project.setDescriptionShort(text(english, "descriptionShort"));
        project.setDescription(textOrNull(english, "description"));
        project.setCategory(request.category());
        project.setStatus(request.status());
        project.setFeatured(request.featured());
        project.setFeaturedOrder(request.featured() ? request.featuredOrder() : null);
        project.setThumbnailPath(gallery.isArray() && !gallery.isEmpty() ? gallery.get(0).asText() : null);
        project.setArchitectureImagePath(request.architectureImage());
        project.setTimelineStartDate(textOrNull(timeline, "startDate"));
        project.setTimelineEndDate(textOrNull(timeline, "endDate"));
        project.setTimelineStatus(textOrDefault(timeline, "status", "Completed"));
        project.setOverviewCoreRoles(integer(overview, "coreRoles"));
        project.setOverviewChallengeAreas(integer(overview, "challengeAreas"));
        project.setOverviewStackGroup(integer(overview, "stackGroup"));
        project.setOverviewTargetUsers(textOrNull(english, "targetUsers"));
        project.setOverviewFeasibility(textOrNull(english, "feasibility"));
        project.setChallenges(firstStructuredContent(english.path("challenges")));
        project.setPublished(true);
    }

    private void replaceChildren(UUID projectId, ProjectRequest request) {
        deleteChildren(projectId);
        insertTranslations(projectId, request.content());
        insertRoles(projectId, request.roles());
        insertTechStack(projectId, request.techStack());
        insertGallery(projectId, request.gallery());
        insertLinks(projectId, request.links());
        insertTimelineMilestones(projectId, request.timeline().path("milestones"));
    }

    private void deleteChildren(UUID projectId) {
        jdbcTemplate.update("DELETE FROM public.project_feature_translations WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_learning_translations WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_challenge_translations WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_roles WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_translations WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_tech_stack WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_gallery WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_links WHERE project_id = ?", projectId);
        jdbcTemplate.update("DELETE FROM public.project_timeline_milestones WHERE project_id = ?", projectId);
    }

    private void insertTranslations(UUID projectId, JsonNode content) {
        for (String locale : LOCALES) {
            JsonNode localized = content.path(locale);

            jdbcTemplate.update("""
                INSERT INTO public.project_translations (
                    project_id, locale, project_name, description_short, description,
                    overview_target_users, overview_feasibility, challenges
                ) VALUES (?, ?::project_locale, ?, ?, ?, ?, ?, ?)
                """,
                projectId,
                locale,
                text(localized, "projectName"),
                text(localized, "descriptionShort"),
                textOrNull(localized, "description"),
                textOrNull(localized, "targetUsers"),
                textOrNull(localized, "feasibility"),
                firstStructuredContent(localized.path("challenges"))
            );

            insertOrderedText(
                "project_feature_translations",
                "feature",
                projectId,
                locale,
                localized.path("features")
            );
            insertStructuredText(
                "project_learning_translations",
                "learning",
                projectId,
                locale,
                localized.path("whatILearned")
            );
            insertStructuredText(
                "project_challenge_translations",
                "content",
                projectId,
                locale,
                localized.path("challenges")
            );
        }
    }

    private void insertStructuredText(
            String table,
            String contentColumn,
            UUID projectId,
            String locale,
            JsonNode values) {
        if (!values.isArray()) {
            return;
        }

        for (int index = 0; index < values.size(); index++) {
            JsonNode value = values.get(index);
            String title = textOrNull(value, "title");
            String content = text(value, "content");

            if (!content.isBlank()) {
                jdbcTemplate.update(
                    "INSERT INTO public." + table
                        + " (project_id, locale, sort_order, title, " + contentColumn
                        + ") VALUES (?, ?::project_locale, ?, ?, ?)",
                    projectId,
                    locale,
                    index + 1,
                    title == null ? "" : title,
                    content
                );
            }
        }
    }

    private void insertRoles(UUID projectId, JsonNode roles) {
        if (!roles.isArray()) {
            return;
        }

        for (int index = 0; index < roles.size(); index++) {
            String role = roles.get(index).asText("").trim();

            if (!role.isEmpty()) {
                jdbcTemplate.update("""
                    INSERT INTO public.project_roles (project_id, role, sort_order)
                    VALUES (?, ?, ?)
                    """,
                    projectId,
                    role,
                    index
                );
            }
        }
    }

    private void insertOrderedText(String table, String column, UUID projectId, String locale, JsonNode values) {
        if (!values.isArray()) {
            return;
        }

        for (int index = 0; index < values.size(); index++) {
            String value = values.get(index).asText("").trim();

            if (!value.isEmpty()) {
                jdbcTemplate.update(
                    "INSERT INTO public." + table
                        + " (project_id, locale, sort_order, " + column + ") VALUES (?, ?::project_locale, ?, ?)",
                    projectId,
                    locale,
                    index + 1,
                    value
                );
            }
        }
    }

    private void insertTechStack(UUID projectId, JsonNode techStack) {
        for (String group : STACK_GROUPS) {
            JsonNode values = techStack.path(toCamelCase(group));

            if (!values.isArray()) {
                continue;
            }

            for (int index = 0; index < values.size(); index++) {
                jdbcTemplate.update("""
                    INSERT INTO public.project_tech_stack (project_id, stack_group, name, sort_order)
                    VALUES (?, ?::project_tech_stack_group, ?, ?)
                    """,
                    projectId,
                    group,
                    values.get(index).asText(),
                    index + 1
                );
            }
        }
    }

    private void insertGallery(UUID projectId, JsonNode gallery) {
        if (!gallery.isArray()) {
            return;
        }

        for (int index = 0; index < gallery.size(); index++) {
            jdbcTemplate.update("""
                INSERT INTO public.project_gallery (project_id, sort_order, image_path)
                VALUES (?, ?, ?)
                """,
                projectId,
                index,
                gallery.get(index).asText()
            );
        }
    }

    private void insertLinks(UUID projectId, JsonNode links) {
        if (!links.isArray()) {
            return;
        }

        for (JsonNode link : links) {
            jdbcTemplate.update("""
                INSERT INTO public.project_links (project_id, link_type, url)
                VALUES (?, ?, ?)
                """,
                projectId,
                text(link, "type"),
                text(link, "url")
            );
        }
    }

    private void insertTimelineMilestones(UUID projectId, JsonNode milestones) {
        if (!milestones.isArray()) {
            return;
        }

        for (int index = 0; index < milestones.size(); index++) {
            JsonNode milestone = milestones.get(index);
            String date = textOrNull(milestone, "date");
            String title = textOrNull(milestone, "title");

            if (date != null && title != null) {
                jdbcTemplate.update("""
                    INSERT INTO public.project_timeline_milestones (
                        project_id, sort_order, date, title, description
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    projectId,
                    index,
                    date,
                    title,
                    textOrDefault(milestone, "description", "")
                );
            }
        }
    }

    private ProjectResponse toResponse(Project project) {
        ObjectNode content = readContent(project);
        ObjectNode techStack = readTechStack(project.getId());
        ArrayNode roles = readRoles(project.getId());
        ArrayNode gallery = readGallery(project);
        ArrayNode links = readLinks(project.getId());
        ArrayNode stack = objectMapper.createArrayNode();
        ArrayNode stackGroups = objectMapper.createArrayNode();
        ObjectNode timeline = readTimeline(project);

        for (String group : List.of("frontend", "backend", "database")) {
            JsonNode values = techStack.path(toCamelCase(group));
            stackGroups.add(group);

            if (values.isArray() && !values.isEmpty()) {
                stack.add(values.get(0).asText());
            }
        }

        ObjectNode overview = objectMapper.createObjectNode();
        overview.put("coreRoles", valueOrZero(project.getOverviewCoreRoles()));
        overview.put("challengeAreas", valueOrZero(project.getOverviewChallengeAreas()));
        overview.put("stackGroup", valueOrZero(project.getOverviewStackGroup()));

        return new ProjectResponse(
            project.getId(),
            project.getSlug(),
            project.getCategory(),
            project.getStatus(),
            project.isFeatured(),
            project.getFeaturedOrder(),
            project.getArchitectureImagePath(),
            content,
            overview,
            roles,
            techStack,
            gallery,
            links,
            stack,
            stackGroups,
            timeline,
            project.getCreatedAt(),
            project.getUpdatedAt()
        );
    }

    private ObjectNode readTimeline(Project project) {
        ObjectNode timeline = objectMapper.createObjectNode();
        ArrayNode milestones = objectMapper.createArrayNode();

        timeline.put("startDate", nullable(project.getTimelineStartDate()));
        timeline.put("endDate", nullable(project.getTimelineEndDate()));
        timeline.put("status", project.getTimelineStatus() == null ? "Completed" : project.getTimelineStatus());

        jdbcTemplate.query("""
            SELECT date, title, description
            FROM public.project_timeline_milestones
            WHERE project_id = ?
            ORDER BY sort_order
            """,
            row -> {
                ObjectNode milestone = objectMapper.createObjectNode();
                milestone.put("date", row.getString(1));
                milestone.put("title", row.getString(2));
                milestone.put("description", nullable(row.getString(3)));
                milestones.add(milestone);
            },
            project.getId()
        );

        timeline.set("milestones", milestones);
        return timeline;
    }

    private ObjectNode readContent(Project project) {
        ObjectNode content = objectMapper.createObjectNode();
        Map<String, ObjectNode> localizedContent = new LinkedHashMap<>();

        for (String locale : LOCALES) {
            ObjectNode localized = objectMapper.createObjectNode();
            localized.put("projectName", project.getProjectName());
            localized.put("descriptionShort", project.getDescriptionShort());
            localized.put("description", nullable(project.getDescription()));
            localized.put("targetUsers", nullable(project.getOverviewTargetUsers()));
            localized.put("feasibility", nullable(project.getOverviewFeasibility()));
            localized.set("challenges", objectMapper.createArrayNode());
            localized.set("features", objectMapper.createArrayNode());
            localized.set("whatILearned", objectMapper.createArrayNode());
            localizedContent.put(locale, localized);
            content.set(locale, localized);
        }

        jdbcTemplate.query("""
            SELECT locale::text, project_name, description_short, description,
                   overview_target_users, overview_feasibility, challenges
            FROM public.project_translations
            WHERE project_id = ?
            """,
            row -> {
                ObjectNode localized = localizedContent.get(row.getString(1));

                if (localized != null) {
                    localized.put("projectName", row.getString(2));
                    localized.put("descriptionShort", row.getString(3));
                    localized.put("description", nullable(row.getString(4)));
                    localized.put("targetUsers", nullable(row.getString(5)));
                    localized.put("feasibility", nullable(row.getString(6)));
                }
            },
            project.getId()
        );

        readLocalizedList(project.getId(), "project_feature_translations", "feature", localizedContent, "features");
        readStructuredList(project.getId(), "project_learning_translations", "learning", localizedContent, "whatILearned");
        readStructuredList(project.getId(), "project_challenge_translations", "content", localizedContent, "challenges");

        if (!localizedContent.get("en").path("challenges").isEmpty() || project.getChallenges() == null) {
            return content;
        }

        ObjectNode fallback = objectMapper.createObjectNode();
        fallback.put("title", "");
        fallback.put("content", project.getChallenges());
        ((ArrayNode) localizedContent.get("en").path("challenges")).add(fallback);
        return content;
    }

    private void readLocalizedList(
            UUID projectId,
            String table,
            String column,
            Map<String, ObjectNode> localizedContent,
            String targetField) {
        jdbcTemplate.query(
            "SELECT locale::text, " + column + " FROM public." + table
                + " WHERE project_id = ? ORDER BY locale, sort_order",
            row -> {
                ObjectNode localized = localizedContent.get(row.getString(1));

                if (localized != null) {
                    ((ArrayNode) localized.path(targetField)).add(row.getString(2));
                }
            },
            projectId
        );
    }

    private void readStructuredList(
            UUID projectId,
            String table,
            String contentColumn,
            Map<String, ObjectNode> localizedContent,
            String targetField) {
        jdbcTemplate.query(
            "SELECT locale::text, title, " + contentColumn + " FROM public." + table
                + " WHERE project_id = ? ORDER BY locale, sort_order",
            row -> {
                ObjectNode localized = localizedContent.get(row.getString(1));

                if (localized != null) {
                    ObjectNode item = objectMapper.createObjectNode();
                    item.put("title", nullable(row.getString(2)));
                    item.put("content", row.getString(3));
                    ((ArrayNode) localized.path(targetField)).add(item);
                }
            },
            projectId
        );
    }

    private ArrayNode readRoles(UUID projectId) {
        ArrayNode roles = objectMapper.createArrayNode();
        jdbcTemplate.query("""
            SELECT role
            FROM public.project_roles
            WHERE project_id = ?
            ORDER BY sort_order
            """,
            row -> {
                roles.add(row.getString(1));
            },
            projectId
        );
        return roles;
    }

    private ObjectNode readTechStack(UUID projectId) {
        ObjectNode techStack = objectMapper.createObjectNode();

        for (String group : STACK_GROUPS) {
            techStack.set(toCamelCase(group), objectMapper.createArrayNode());
        }

        jdbcTemplate.query("""
            SELECT stack_group::text, name
            FROM public.project_tech_stack
            WHERE project_id = ?
            ORDER BY stack_group, sort_order
            """,
            row -> {
                ((ArrayNode) techStack.path(toCamelCase(row.getString(1)))).add(row.getString(2));
            },
            projectId
        );

        return techStack;
    }

    private ArrayNode readGallery(Project project) {
        ArrayNode gallery = objectMapper.createArrayNode();
        jdbcTemplate.query("""
            SELECT image_path
            FROM public.project_gallery
            WHERE project_id = ?
            ORDER BY sort_order
            """,
            row -> {
                gallery.add(row.getString(1));
            },
            project.getId()
        );

        if (gallery.isEmpty() && project.getThumbnailPath() != null) {
            gallery.add(project.getThumbnailPath());
        }

        return gallery;
    }

    private ArrayNode readLinks(UUID projectId) {
        ArrayNode links = objectMapper.createArrayNode();
        jdbcTemplate.query("""
            SELECT link_type, url
            FROM public.project_links
            WHERE project_id = ?
            ORDER BY link_type
            """,
            row -> {
                ObjectNode link = objectMapper.createObjectNode();
                link.put("type", row.getString(1));
                link.put("url", row.getString(2));
                links.add(link);
            },
            projectId
        );
        return links;
    }

    private String text(JsonNode node, String field) {
        String value = node.path(field).asText("").trim();

        if (value.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        }

        return value;
    }

    private String textOrNull(JsonNode node, String field) {
        String value = node.path(field).asText("").trim();
        return value.isEmpty() ? null : value;
    }

    private String textOrDefault(JsonNode node, String field, String fallback) {
        String value = node.path(field).asText("").trim();
        return value.isEmpty() ? fallback : value;
    }

    private Integer integer(JsonNode node, String field) {
        return node.path(field).asInt(0);
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String nullable(String value) {
        return value == null ? "" : value;
    }

    private String firstStructuredContent(JsonNode values) {
        if (!values.isArray()) {
            return null;
        }

        for (JsonNode value : values) {
            String content = textOrNull(value, "content");

            if (content != null) {
                return content;
            }
        }

        return null;
    }

    private String toCamelCase(String value) {
        return "external_service".equals(value) ? "externalService" : value;
    }
}
