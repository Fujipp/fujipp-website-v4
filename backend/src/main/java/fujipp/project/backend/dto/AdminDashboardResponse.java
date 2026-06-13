package fujipp.project.backend.dto;

import fujipp.project.backend.billing.BillingClient;

import java.util.List;

/** Aggregated admin dashboard metrics across the platform and the billing module. */
public record AdminDashboardResponse(
    long totalUsers,
    long adminUsers,
    long totalBots,
    long runningBots,
    int vpsNodes,
    long vpsSlotsUsed,
    long vpsSlotsTotal,
    long topupRevenueSatang30d,
    long totalWalletBalanceSatang,
    long walletCount,
    List<BillingClient.AuditEntry> recentAudit
) {}
