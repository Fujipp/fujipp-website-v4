package fujipp.project.backend.billing;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

/**
 * Validates an uploaded slip image BEFORE it is sent to SlipOK — to block abuse
 * and avoid wasting SlipOK quota. Checks real magic bytes (not the filename),
 * size, and sane dimensions.
 */
public final class SlipFileValidator {

    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final int MIN_DIM = 100;
    private static final int MAX_DIM = 10_000;

    private SlipFileValidator() {}

    public static void validate(MultipartFile file) {
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                "Slip image must be 5MB or smaller");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read slip image");
        }
        if (bytes.length < 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slip image is empty or corrupt");
        }

        boolean jpeg = isJpeg(bytes);
        boolean png = isPng(bytes);
        boolean webp = isWebp(bytes);
        if (!jpeg && !png && !webp) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Only JPG, PNG or WEBP slip images are allowed");
        }

        // ImageIO can't always decode WEBP without a plugin — magic + size suffice there.
        if (jpeg || png) {
            BufferedImage img;
            try {
                img = ImageIO.read(new ByteArrayInputStream(bytes));
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image file");
            }
            if (img == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image file");
            }
            int w = img.getWidth();
            int h = img.getHeight();
            if (w < MIN_DIM || h < MIN_DIM || w > MAX_DIM || h > MAX_DIM) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slip image dimensions look invalid");
            }
        }
    }

    private static boolean isJpeg(byte[] b) { // also covers JFIF
        return (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] b) {
        return (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
            && (b[4] & 0xFF) == 0x0D && (b[5] & 0xFF) == 0x0A && (b[6] & 0xFF) == 0x1A && (b[7] & 0xFF) == 0x0A;
    }

    private static boolean isWebp(byte[] b) {
        return b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
    }
}
