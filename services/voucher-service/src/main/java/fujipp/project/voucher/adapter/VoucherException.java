package fujipp.project.voucher.adapter;

/**
 * Upstream/voucher failure carrying a stable {@code code} the service maps onto a
 * redeem status (e.g. VOUCHER_INVALID, UPSTREAM_RATE_LIMIT, UPSTREAM_TIMEOUT, UPSTREAM_*).
 */
public class VoucherException extends RuntimeException {

    private final String code;

    public VoucherException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
