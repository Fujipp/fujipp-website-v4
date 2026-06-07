package fujipp.project.voucher.model;

/** Lifecycle of a redeem attempt; persisted as text in voucher.redeem.status. */
public enum RedeemStatus {
    CREATED,
    VERIFYING,
    VERIFY_FAILED,
    REDEEMING,
    REDEEM_FAILED,
    SUCCEEDED
}
