package fujipp.project.billing.dto;

import fujipp.project.billing.model.Wallet;

public record WalletResponse(
    long balanceSatang,
    String currency
) {
    public static WalletResponse from(Wallet wallet) {
        return new WalletResponse(wallet.getBalanceSatang(), wallet.getCurrency());
    }
}
