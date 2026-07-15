package fujipp.project.billing.service;

import fujipp.project.billing.dto.AdminAuditEntryResponse;
import fujipp.project.billing.dto.AdminMetricsResponse;
import fujipp.project.billing.repository.WalletRepository;
import fujipp.project.billing.repository.WalletTransactionRepository;
import fujipp.project.billing.repository.CreditOrderItemRepository;
import fujipp.project.billing.repository.CreditOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/** Money-side aggregates for the admin dashboard. */
@Service
@RequiredArgsConstructor
public class AdminMetricsService {

    private final WalletRepository wallets;
    private final WalletTransactionRepository transactions;
    private final CreditOrderRepository orders;
    private final CreditOrderItemRepository orderItems;
    private final AdminAuditService audit;

    @Transactional(readOnly = true)
    public AdminMetricsResponse metrics() {
        OffsetDateTime thirtyDaysAgo = OffsetDateTime.now().minusDays(30);
        long revenue30d = transactions.sumTopupsSince(thirtyDaysAgo);
        long totalBalance = wallets.sumAllBalances();
        long walletCount = wallets.count();
        long packagesSold = orderItems.countPaidFeatureItems();
        long totalSales = orders.sumPaidSalesSatang();
        long salesRevenue30d = orders.sumPaidSalesSince(thirtyDaysAgo);
        List<AdminAuditEntryResponse> recent = audit.recent().stream()
            .map(AdminAuditEntryResponse::from)
            .toList();
        return new AdminMetricsResponse(revenue30d, salesRevenue30d, totalBalance, walletCount, packagesSold, totalSales, recent);
    }
}
