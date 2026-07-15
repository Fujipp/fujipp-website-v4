package fujipp.project.billing.dto;

import java.util.List;

/** Money-side metrics for the admin dashboard. */
public record AdminMetricsResponse(
    long topupRevenueSatang30d,
    long salesRevenueSatang30d,
    long totalWalletBalanceSatang,
    long walletCount,
    long packagesSold,
    long totalSalesSatang,
    List<AdminAuditEntryResponse> recentAudit
) {}
