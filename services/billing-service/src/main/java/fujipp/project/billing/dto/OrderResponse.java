package fujipp.project.billing.dto;

import fujipp.project.billing.model.CreditOrder;
import fujipp.project.billing.model.CreditOrderItem;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    String status,
    long totalSatang,
    String currency,
    List<OrderItemResponse> items,
    OffsetDateTime createdAt
) {
    public static OrderResponse from(CreditOrder order, List<CreditOrderItem> items) {
        return new OrderResponse(
            order.getId(),
            order.getStatus(),
            order.getTotalSatang(),
            order.getCurrency(),
            items.stream().map(OrderItemResponse::from).toList(),
            order.getCreatedAt()
        );
    }
}
