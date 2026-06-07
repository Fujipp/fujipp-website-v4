package fujipp.project.voucher.adapter;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** No-op upstream for local testing — never calls TrueMoney. Enabled by voucher.adapter=mock. */
@Component
@ConditionalOnProperty(name = "voucher.adapter", havingValue = "mock")
public class MockVoucherAdapter implements VoucherAdapter {

    @Override
    public VoucherCheck checkVoucher(String giftUrl) {
        return new VoucherCheck(true, "Mock Issuer", 1);
    }

    @Override
    public RedeemOutcome redeem(String phone, String giftUrl) {
        return new RedeemOutcome(new BigDecimal("50.00"), "THB", "Mock Issuer", "mock-ref");
    }
}
