package fujipp.project.billing.dto;

import java.util.UUID;

/** Reassign a bot's billing rows (subscriptions + config) to a new owner. */
public record AdminBotTransferRequest(UUID newUserId) {}
