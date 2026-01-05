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

  // Check game filters (support both new scope and legacy includeGames)
  const includeGames = (promotion as any).includeGames || promotion.scope?.games;
  const excludeGames = (promotion as any).excludeGames;
  
  if (includeGames && includeGames.length > 0) {
    if (!includeGames.includes(event.gameId)) {
      reasons.push(`Game ${event.gameId} not in include list`);
      return { eligible: false, reasons };
    }
  }

  if (excludeGames && excludeGames.includes(event.gameId)) {
    reasons.push(`Game ${event.gameId} is excluded`);
    return { eligible: false, reasons };
  }

  // Check provider filters (support both new scope and legacy includeProviders)
  const includeProviders = (promotion as any).includeProviders || promotion.scope?.providers;
  const excludeProviders = (promotion as any).excludeProviders;
  
  if (includeProviders && includeProviders.length > 0) {
    if (!includeProviders.includes(event.providerId)) {
      reasons.push(`Provider ${event.providerId} not in include list`);
      return { eligible: false, reasons };
    }
  }

  if (excludeProviders && excludeProviders.includes(event.providerId)) {
    reasons.push(`Provider ${event.providerId} is excluded`);
    return { eligible: false, reasons };
  }

  // Check vertical filters (support both new scope and legacy includeVerticals)
  const includeVerticals = (promotion as any).includeVerticals || promotion.scope?.verticals;
  const excludeVerticals = (promotion as any).excludeVerticals;
  
  if (includeVerticals && includeVerticals.length > 0) {
    if (!includeVerticals.includes(event.vertical)) {
      reasons.push(`Vertical ${event.vertical} not in include list`);
      return { eligible: false, reasons };
    }
  }

  if (excludeVerticals && excludeVerticals.includes(event.vertical)) {
    reasons.push(`Vertical ${event.vertical} is excluded`);
    return { eligible: false, reasons };
  }

  reasons.push("Event is eligible");
  return { eligible: true, reasons };
}

