package fujipp.project.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * AES-256-GCM for customer secrets (Discord tokens, etc.).
 *
 * Produces the SAME envelope the orchestrator (bot-runtime-service crypto.js)
 * decrypts:  v1.&lt;base64 iv&gt;.&lt;base64 authTag&gt;.&lt;base64 ciphertext&gt;
 * The key (bot.secret-key / BOT_SECRET_KEY) is 32 bytes given as 64-char hex or base64.
 */
@Component
public class SecretCipher {

    private static final String VERSION = "v1";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final int TAG_BYTES = TAG_BITS / 8;

    private final String rawKey;
    private volatile SecretKeySpec cachedKey;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(@Value("${bot.secret-key:}") String rawKey) {
        this.rawKey = rawKey;
    }

    /** Lazily decode the key so a missing BOT_SECRET_KEY doesn't crash app startup. */
    private SecretKeySpec key() {
        SecretKeySpec k = cachedKey;
        if (k == null) {
            synchronized (this) {
                k = cachedKey;
                if (k == null) cachedKey = k = new SecretKeySpec(decodeKey(rawKey), "AES");
            }
        }
        return k;
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] out = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Java appends the auth tag to the ciphertext; split it to match Node.
            byte[] ciphertext = Arrays.copyOfRange(out, 0, out.length - TAG_BYTES);
            byte[] tag = Arrays.copyOfRange(out, out.length - TAG_BYTES, out.length);

            Base64.Encoder b64 = Base64.getEncoder();
            return String.join(".", VERSION, b64.encodeToString(iv), b64.encodeToString(tag), b64.encodeToString(ciphertext));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt secret", e);
        }
    }

    private static byte[] decodeKey(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        byte[] bytes = trimmed.matches("[0-9a-fA-F]{64}")
            ? hexToBytes(trimmed)
            : Base64.getDecoder().decode(trimmed);
        if (bytes.length != 32) {
            throw new IllegalStateException("bot.secret-key must decode to 32 bytes (got " + bytes.length + ")");
        }
        return bytes;
    }

    private static byte[] hexToBytes(String hex) {
        byte[] out = new byte[hex.length() / 2];
        for (int i = 0; i < out.length; i++) {
            out[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return out;
    }
}
