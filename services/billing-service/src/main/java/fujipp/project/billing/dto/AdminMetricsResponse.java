package fujipp.project.billing.dto;

import java.util.List;

/** Money-side metrics for the admin dashboard. */
public record AdminMetricsResponse(
    long topupRevenueSatang30d,
    long totalWalletBalanceSatang,
    long walletCount,
    List<AdminAuditEntryResponse> recentAudit
) {}
