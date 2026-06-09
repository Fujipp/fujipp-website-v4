package fujipp.project.backend.runtime;

/**
 * Where to reach the orchestrator for a given bot: the base URL of the VPS that
 * hosts it and the X-Service-Token that VPS expects.
 */
public record RuntimeTarget(String baseUrl, String serviceToken) {}
