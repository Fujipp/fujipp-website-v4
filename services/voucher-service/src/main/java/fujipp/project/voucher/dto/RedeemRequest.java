package fujipp.project.voucher.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /v1/redeem. Mirrors the legacy redeem.dto.ts contract. */
public class RedeemRequest {

    @NotBlank
    @Pattern(regexp = "^0\\d{8,9}$", message = "phone must be 0 followed by 8-9 digits")
    private String phone;

    @NotBlank
    @JsonProperty("gift_url")
    @Pattern(
            regexp = "^https://gift\\.truemoney\\.com/campaign/\\?v=[A-Za-z0-9_-]+$",
            message = "gift_url must be a truemoney campaign link")
    private String giftUrl;

    @Size(max = 64)
    private String idempotencyKey;

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getGiftUrl() {
        return giftUrl;
    }

    public void setGiftUrl(String giftUrl) {
        this.giftUrl = giftUrl;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
