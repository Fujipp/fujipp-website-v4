package fujipp.project.backend.service;

import fujipp.project.backend.dto.UpdateProfileRequest;
import fujipp.project.backend.model.Profile;
import fujipp.project.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;

    @Transactional
    public Profile getOrCreateProfile(UUID userId, String email, String displayName,
                                      String avatarUrl, String provider) {
        return profileRepository.findById(userId).orElseGet(() -> {
            Profile profile = new Profile();
            profile.setId(userId);
            profile.setEmail(email);
            profile.setDisplayName(displayName);
            profile.setAvatarUrl(avatarUrl);
            profile.setProvider(provider);
            profile.setRole("USER");
            return profileRepository.save(profile);
        });
    }

    @Transactional
    public Profile updateProfile(UUID userId, UpdateProfileRequest request) {
        Profile profile = profileRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        if (request.username() != null && !request.username().equals(profile.getUsername())) {
            if (profileRepository.existsByUsername(request.username())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
            }
            profile.setUsername(request.username());
        }

        if (request.displayName() != null) profile.setDisplayName(request.displayName());
        if (request.bio() != null) profile.setBio(request.bio());
        if (request.website() != null) profile.setWebsite(request.website());
        if (request.githubUrl() != null) profile.setGithubUrl(request.githubUrl());

        return profileRepository.save(profile);
    }
}
