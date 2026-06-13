package fujipp.project.backend.service;

import fujipp.project.backend.model.Profile;
import fujipp.project.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Central gate for admin-only operations. The role lives on {@code public.profiles}
 * ({@code role == "ADMIN"}); JWT auth only proves identity, not privilege, so every
 * admin entry point resolves the profile and checks the role here.
 */
@Service
@RequiredArgsConstructor
public class AdminAccessService {

    public static final String ROLE_ADMIN = "ADMIN";

    private final ProfileRepository profiles;

    /** Throws 403 unless the given user id belongs to an ADMIN profile. Returns the profile. */
    @Transactional(readOnly = true)
    public Profile requireAdmin(UUID userId) {
        Profile profile = profiles.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required"));
        if (!ROLE_ADMIN.equals(profile.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
        return profile;
    }
}
