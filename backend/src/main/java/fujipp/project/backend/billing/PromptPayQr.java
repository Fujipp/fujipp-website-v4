package fujipp.project.backend.billing;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Generates an EMVCo PromptPay payload string (the text encoded into the QR).
 * The frontend renders it as a QR image. Supports a mobile number, national id,
 * or e-wallet id as the PromptPay target, with a fixed amount (dynamic QR).
 */
public final class PromptPayQr {

    private static final String AID = "A000000677010111"; // PromptPay application id

    private PromptPayQr() {}

    public static String payload(String promptpayId, long amountSatang) {
        String amount = String.format(Locale.US, "%.2f", amountSatang / 100.0);
        String sanitized = promptpayId.replaceAll("[^0-9]", "");
        String targetType = sanitized.length() >= 15 ? "03" : sanitized.length() >= 13 ? "02" : "01";
        String target = formatTarget(sanitized, targetType);

        String merchant = field("29", field("00", AID) + field(targetType, target));
        String body = field("00", "01")        // payload format indicator
            + field("01", "12")                  // dynamic (amount present)
            + merchant
            + field("53", "764")                 // currency THB
            + field("54", amount)
            + field("58", "TH");                 // country

        String withCrcTag = body + "63" + "04";
        return withCrcTag + crc16(withCrcTag);
    }

    private static String field(String id, String value) {
        return id + String.format("%02d", value.length()) + value;
    }

    private static String formatTarget(String sanitized, String type) {
        if (!"01".equals(type)) return sanitized; // national id / e-wallet used as-is
        String t = sanitized.startsWith("0") ? "66" + sanitized.substring(1) : sanitized;
        String padded = "0000000000000" + t;
        return padded.substring(padded.length() - 13);
    }

    private static String crc16(String s) {
        int crc = 0xFFFF;
        for (byte b : s.getBytes(StandardCharsets.US_ASCII)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = ((crc & 0x8000) != 0) ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xFFFF;
            }
        }
        return String.format("%04X", crc);
    }
}
