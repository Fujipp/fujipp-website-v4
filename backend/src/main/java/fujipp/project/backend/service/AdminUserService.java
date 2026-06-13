package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.AdminUpdateUserRequest;
import fujipp.project.backend.dto.ProfileResponse;
import fujipp.project.backend.model.Profile;
import fujipp.project.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin user directory — list/search profiles, read, and edit (profile + role). */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final int MAX_RESULTS = 100;

    private final AdminAccessService adminAccess;
    private final ProfileRepository profiles;
    private final BillingClient billing;

    @Transactional(readOnly = true)
    public List<ProfileResponse> listUsers(UUID adminId, String query) {
        adminAccess.requireAdmin(adminId);
        String q = query == null ? null : query.trim();
        return profiles.searchProfiles(q, PageRequest.of(0, MAX_RESULTS)).stream()
            .map(ProfileResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public ProfileResponse getUser(UUID adminId, UUID userId) {
        adminAccess.requireAdmin(adminId);
        Profile profile = profiles.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ProfileResponse.from(profile);
    }

    @Transactional
    public ProfileResponse updateUser(UUID adminId, UUID userId, AdminUpdateUserRequest req) {
        adminAccess.requireAdmin(adminId);
        Profile profile = profiles.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Map<String, Object> changes = new LinkedHashMap<>();
        if (req.username() != null && !req.username().equals(profile.getUsername())) {
            if (profiles.existsByUsername(req.username())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
            }
            changes.put("username", java.util.Arrays.asList(profile.getUsername(), req.username()));
            profile.setUsername(req.username());
        }
        if (req.displayName() != null && !req.displayName().equals(profile.getDisplayName())) {
            changes.put("displayName", java.util.Arrays.asList(profile.getDisplayName(), req.displayName()));
            profile.setDisplayName(req.displayName());
        }
        if (req.bio() != null && !req.bio().equals(profile.getBio())) {
            profile.setBio(req.bio());
            changes.put("bio", "updated");
        }
        if (req.website() != null && !req.website().equals(profile.getWebsite())) {
            profile.setWebsite(req.website());
            changes.put("website", req.website());
        }
        if (req.githubUrl() != null && !req.githubUrl().equals(profile.getGithubUrl())) {
            profile.setGithubUrl(req.githubUrl());
            changes.put("githubUrl", req.githubUrl());
        }
        if (req.role() != null && !req.role().equals(profile.getRole())) {
            // Don't let an admin strip their own ADMIN role and lock themselves out.
            if (userId.equals(adminId) && !"ADMIN".equals(req.role())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot remove your own admin role");
            }
            changes.put("role", java.util.Arrays.asList(profile.getRole(), req.role()));
            profile.setRole(req.role());
        }

        Profile saved = profiles.save(profile);
        if (!changes.isEmpty()) {
            String action = changes.containsKey("role") ? "USER_ROLE_UPDATE" : "USER_UPDATE";
            try {
                billing.recordAudit(adminId, action, userId, "PROFILE", userId.toString(), changes);
            } catch (RuntimeException e) {
                // Auditing is best-effort — never fail the edit because the audit hop did.
            }
        }
        return ProfileResponse.from(saved);
    }
}
