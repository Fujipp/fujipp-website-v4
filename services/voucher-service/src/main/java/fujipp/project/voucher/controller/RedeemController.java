package fujipp.project.voucher.controller;

import fujipp.project.voucher.config.ApiKeyFilter;
import fujipp.project.voucher.dto.RedeemRequest;
import fujipp.project.voucher.dto.RedeemResponse;
import fujipp.project.voucher.service.RedeemService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class RedeemController {

    private final RedeemService service;

    public RedeemController(RedeemService service) {
        this.service = service;
    }

    @PostMapping("/redeem")
    public RedeemResponse redeem(@Valid @RequestBody RedeemRequest body, HttpServletRequest request) {
        String clientId = (String) request.getAttribute(ApiKeyFilter.CLIENT_ID_ATTR);
        if (clientId == null) {
            clientId = ApiKeyFilter.DEFAULT_CLIENT_ID;
        }
        return RedeemResponse.from(service.redeem(clientId, body));
    }
}
