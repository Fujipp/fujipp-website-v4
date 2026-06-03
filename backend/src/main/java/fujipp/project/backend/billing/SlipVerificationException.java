package fujipp.project.backend.billing;

/**
 * Thrown when SlipOK rejects a slip. {@code code} is SlipOK's error code, e.g.
 * 1012 repeated slip, 1013 wrong amount, 1014 wrong receiver, 1010 bank delay.
 */
public class SlipVerificationException extends RuntimeException {

    private final int code;

    public SlipVerificationException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
