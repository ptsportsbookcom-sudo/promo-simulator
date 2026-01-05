import type { Event, PromotionConfig, PlayerPromotionState } from "@/lib/models/types";

/**
 * Check if an event is eligible for a promotion based on filters and timing
 */
export function isEligible(
  event: Event,
  promotion: PromotionConfig,
  playerState: PlayerPromotionState | null
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check if promotion is enabled
  if (!promotion.enabled) {
    reasons.push("Promotion is disabled");
    return { eligible: false, reasons };
  }

  // Check time window
  const now = new Date();
  const startAt = new Date(promotion.startAt);
  const endAt = new Date(promotion.endAt);

  if (now < startAt) {
    reasons.push(`Promotion starts at ${startAt.toISOString()}`);
    return { eligible: false, reasons };
  }

  if (now > endAt) {
    reasons.push(`Promotion ended at ${endAt.toISOString()}`);
    return { eligible: false, reasons };
  }

  // Check opt-in requirement
  if (promotion.requiresOptIn) {
    if (!playerState || !playerState.joined) {
      reasons.push("Player has not joined this opt-in promotion");
      return { eligible: false, reasons };
    }
  }

  // Check game filters
  if (promotion.includeGames && promotion.includeGames.length > 0) {
    if (!promotion.includeGames.includes(event.gameId)) {
      reasons.push(`Game ${event.gameId} not in include list`);
      return { eligible: false, reasons };
    }
  }

  if (promotion.excludeGames && promotion.excludeGames.includes(event.gameId)) {
    reasons.push(`Game ${event.gameId} is excluded`);
    return { eligible: false, reasons };
  }

  // Check provider filters
  if (promotion.includeProviders && promotion.includeProviders.length > 0) {
    if (!promotion.includeProviders.includes(event.providerId)) {
      reasons.push(`Provider ${event.providerId} not in include list`);
      return { eligible: false, reasons };
    }
  }

  if (promotion.excludeProviders && promotion.excludeProviders.includes(event.providerId)) {
    reasons.push(`Provider ${event.providerId} is excluded`);
    return { eligible: false, reasons };
  }

  // Check vertical filters
  if (promotion.includeVerticals && promotion.includeVerticals.length > 0) {
    if (!promotion.includeVerticals.includes(event.vertical)) {
      reasons.push(`Vertical ${event.vertical} not in include list`);
      return { eligible: false, reasons };
    }
  }

  if (promotion.excludeVerticals && promotion.excludeVerticals.includes(event.vertical)) {
    reasons.push(`Vertical ${event.vertical} is excluded`);
    return { eligible: false, reasons };
  }

  reasons.push("Event is eligible");
  return { eligible: true, reasons };
}

