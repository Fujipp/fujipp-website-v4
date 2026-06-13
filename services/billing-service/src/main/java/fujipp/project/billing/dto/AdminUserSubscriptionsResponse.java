package fujipp.project.billing.dto;

import java.util.List;

/** A user's owned subscriptions, for the admin override panel. */
public record AdminUserSubscriptionsResponse(
    List<RuntimeSubscriptionResponse> runtime,
    List<FeatureSubscriptionResponse> features
) {}
