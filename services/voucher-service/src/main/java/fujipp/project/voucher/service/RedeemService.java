package fujipp.project.voucher.service;

import fujipp.project.voucher.adapter.VoucherAdapter;
import fujipp.project.voucher.adapter.VoucherException;
import fujipp.project.voucher.dto.RedeemRequest;
import fujipp.project.voucher.model.Redeem;
import fujipp.project.voucher.model.RedeemStatus;
import fujipp.project.voucher.repository.RedeemRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Ported from redeem.service.ts: idempotency guard, then verify → redeem, recording
 * the outcome in voucher.redeem. The redeem row is created (and committed) before the
 * upstream call so a retried idempotent request is a no-op.
 */
@Service
public class RedeemService {

    private final RedeemRepository repo;
    private final VoucherAdapter adapter;

    public RedeemService(RedeemRepository repo, VoucherAdapter adapter) {
        this.repo = repo;
        this.adapter = adapter;
    }

    public Redeem redeem(String clientId, RedeemRequest body) {
        if (body.getIdempotencyKey() != null && !body.getIdempotencyKey().isBlank()) {
            var existing = repo.findByClientIdAndIdempotencyKey(clientId, body.getIdempotencyKey());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        Redeem job = new Redeem();
        job.setClientId(clientId);
        job.setPhone(body.getPhone());
        job.setGiftUrlHash(sha256Hex(body.getGiftUrl()));
        job.setStatus(RedeemStatus.CREATED);
        job.setIdempotencyKey(body.getIdempotencyKey());
        job = repo.save(job);

        try {
            VoucherAdapter.RedeemOutcome out = adapter.redeem(body.getPhone(), body.getGiftUrl());
            job.setStatus(RedeemStatus.SUCCEEDED);
            job.setAmountSatang(toSatang(out.amountBaht()));
            job.setCurrency(out.currency());
            job.setIssuer(out.issuer());
            job.setReference(out.reference());
            return repo.save(job);
        } catch (VoucherException e) {
            job.setStatus("VOUCHER_INVALID".equals(e.getCode())
                    ? RedeemStatus.VERIFY_FAILED : RedeemStatus.REDEEM_FAILED);
            job.setFailCode(e.getCode());
            job.setFailReason(e.getMessage());
            return repo.save(job);
        } catch (RuntimeException e) {
            job.setStatus(RedeemStatus.REDEEM_FAILED);
            job.setFailCode("UPSTREAM");
            job.setFailReason(String.valueOf(e.getMessage()));
            return repo.save(job);
        }
    }

    private static long toSatang(BigDecimal baht) {
        return baht == null ? 0L : baht.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
