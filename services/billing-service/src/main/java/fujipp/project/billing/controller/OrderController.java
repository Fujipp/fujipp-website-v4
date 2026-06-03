package fujipp.project.billing.controller;

import fujipp.project.billing.dto.OrderResponse;
import fujipp.project.billing.dto.PurchaseRequest;
import fujipp.project.billing.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** Buy features/source/runtime from wallet credit. */
    @PostMapping
    public ResponseEntity<OrderResponse> purchase(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid PurchaseRequest request) {
        return ResponseEntity.ok(orderService.purchase(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> history(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(orderService.listOrders(userId));
    }
}
