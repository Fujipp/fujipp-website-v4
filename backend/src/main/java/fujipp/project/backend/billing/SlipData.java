package fujipp.project.backend.billing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** The verified slip fields we use (SlipOK returns more; the rest is ignored). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SlipData(
    boolean success,
    String transRef,
    Double amount,
    String transTimestamp
) {}
