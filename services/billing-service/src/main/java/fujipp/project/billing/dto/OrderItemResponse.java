package fujipp.project.billing.dto;

import fujipp.project.billing.model.CreditOrderItem;

public record OrderItemResponse(
    String kind,
    String itemCode,
    String itemName,
    long amountSatang,
    String externalSubjectId
) {
    public static OrderItemResponse from(CreditOrderItem item) {
        return new OrderItemResponse(
            item.getKind(),
            item.getItemCode(),
            item.getItemName(),
            item.getAmountSatang(),
            item.getExternalSubjectId()
        );
    }
}
