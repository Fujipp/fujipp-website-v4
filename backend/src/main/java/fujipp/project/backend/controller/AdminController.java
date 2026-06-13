package fujipp.project.backend.controller;

import fujipp.project.backend.dto.AdminUpdateUserRequest;
import fujipp.project.backend.dto.ProfileResponse;
import fujipp.project.backend.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Admin user directory. Role is enforced in the service (AdminAccessService). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService users;

    @GetMapping("/users")
    public ResponseEntity<List<ProfileResponse>> listUsers(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "q", required = false) String q) {
        return ResponseEntity.ok(users.listUsers(UUID.fromString(jwt.getSubject()), q));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ProfileResponse> getUser(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        return ResponseEntity.ok(users.getUser(UUID.fromString(jwt.getSubject()), userId));
    }

    @PatchMapping("/users/{userId}")
    public ResponseEntity<ProfileResponse> updateUser(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID userId,
            @RequestBody @Valid AdminUpdateUserRequest request) {
        return ResponseEntity.ok(users.updateUser(UUID.fromString(jwt.getSubject()), userId, request));
    }
}
