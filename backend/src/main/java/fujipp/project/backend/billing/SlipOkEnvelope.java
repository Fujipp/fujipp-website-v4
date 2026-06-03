package fujipp.project.backend.billing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * SlipOK response wrapper. On success: {success:true, data:{...}}.
 * On error: {code, message, data?}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SlipOkEnvelope(
    Boolean success,
    SlipData data,
    Integer code,
    String message
) {}
