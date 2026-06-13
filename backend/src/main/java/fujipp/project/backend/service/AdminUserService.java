package fujipp.project.backend.service;

import fujipp.project.backend.dto.ProfileResponse;
import fujipp.project.backend.model.Profile;
import fujipp.project.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/** Admin user directory — list/search profiles and read a single user. */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final int MAX_RESULTS = 100;

    private final AdminAccessService adminAccess;
    private final ProfileRepository profiles;

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
}
