package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.AdminDashboardResponse;
import fujipp.project.backend.model.VpsNode;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.repository.ProfileRepository;
import fujipp.project.backend.repository.VpsNodeRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Assembles the admin dashboard from platform counts + billing-service money metrics. */
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final Logger log = LoggerFactory.getLogger(AdminDashboardService.class);

    private final AdminAccessService adminAccess;
    private final ProfileRepository profiles;
    private final BotInstanceRepository bots;
    private final VpsNodeRepository vpsNodes;
    private final BillingClient billing;

    @Transactional(readOnly = true)
    public AdminDashboardResponse dashboard(UUID adminId) {
        adminAccess.requireAdmin(adminId);

        long totalUsers = profiles.count();
        long adminUsers = profiles.countByRole("ADMIN");
        long totalBots = bots.count();
        long runningBots = bots.countByStatus("RUNNING");

        List<VpsNode> nodes = vpsNodes.findAll();
        long slotsTotal = nodes.stream().mapToLong(VpsNode::getMaxSlots).sum();

        // Used seats = seats held by an active runtime (billing's occupancy), so this card
        // matches the VPS view's per-node free count. Best-effort: if billing is down, fall
        // back to the placed-bot count rather than failing the whole dashboard.
        long slotsUsed;
        try {
            slotsUsed = billing.occupiedSlotIds().size();
        } catch (RuntimeException e) {
            log.warn("Dashboard: occupied-slot count unavailable, using placed-bot count", e);
            slotsUsed = bots.countByVpsNodeIdNotNull();
        }

        // Billing metrics are best-effort — a dashboard should still render if billing is down.
        long revenue30d = 0;
        long salesRevenue30d = 0;
        long totalBalance = 0;
        long walletCount = 0;
        long packagesSold = 0;
        long totalSales = 0;
        List<BillingClient.AuditEntry> recentAudit = List.of();
        try {
            BillingClient.AdminMetrics m = billing.adminMetrics();
            revenue30d = m.topupRevenueSatang30d();
            salesRevenue30d = m.salesRevenueSatang30d();
            totalBalance = m.totalWalletBalanceSatang();
            walletCount = m.walletCount();
            packagesSold = m.packagesSold();
            totalSales = m.totalSalesSatang();
            if (m.recentAudit() != null) recentAudit = m.recentAudit();
        } catch (RuntimeException e) {
            log.warn("Dashboard: billing metrics unavailable", e);
        }

        return new AdminDashboardResponse(
            totalUsers, adminUsers, totalBots, runningBots,
            nodes.size(), slotsUsed, slotsTotal,
            revenue30d, salesRevenue30d, totalBalance, walletCount, packagesSold, totalSales, recentAudit);
    }
}
