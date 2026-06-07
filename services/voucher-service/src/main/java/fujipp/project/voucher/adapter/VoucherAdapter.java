package fujipp.project.voucher.adapter;

import java.math.BigDecimal;

/** Abstraction over the TrueMoney gift-voucher upstream (real or mock). */
public interface VoucherAdapter {

    /** Verify a voucher without binding a phone. Throws {@link VoucherException} on upstream errors. */
    VoucherCheck checkVoucher(String giftUrl);

    /** Bind the phone and redeem. Throws {@link VoucherException} on upstream errors. */
    RedeemOutcome redeem(String phone, String giftUrl);

    record VoucherCheck(boolean valid, String issuer, Integer remaining) {
    }

    record RedeemOutcome(BigDecimal amountBaht, String currency, String issuer, String reference) {
    }
}
