import type { Event, PromotionConfig, PlayerPromotionState } from "@/lib/models/types";

/**
 * Check if an event triggers a promotion based on trigger conditions
 */
export function checkTrigger(
  event: Event,
  promotion: PromotionConfig,
  playerState: PlayerPromotionState | null
): { triggered: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const triggers = promotion.triggers || {};

  // Type-specific trigger checks
  if (promotion.type === "game_provider_discovery") {
    if (triggers.first_win_on_game && event.winMultiplier > 0) {
      // Check if this is first win on this game for this player
      const hasWonOnGame = playerState?.progress.collectedItems.includes(event.gameId);
      if (!hasWonOnGame) {
        reasons.push(`First win on game ${event.gameId}`);
        return { triggered: true, reasons };
      }
    }

    if (triggers.first_win_on_provider && event.winMultiplier > 0) {
      const hasWonOnProvider = playerState?.progress.collectedItems.includes(event.providerId);
      if (!hasWonOnProvider) {
        reasons.push(`First win on provider ${event.providerId}`);
        return { triggered: true, reasons };
      }
    }

    if (triggers.first_bonus_trigger_on_provider && event.bonusTriggered) {
      const hasBonusOnProvider = playerState?.progress.collectedItems.includes(`bonus:${event.providerId}`);
      if (!hasBonusOnProvider) {
        reasons.push(`First bonus trigger on provider ${event.providerId}`);
        return { triggered: true, reasons };
      }
    }
  }

  if (promotion.type === "multi_game_chain") {
    if (triggers.win_on_distinct_game && event.winMultiplier > 0) {
      const collected = playerState?.progress.collectedItems || [];
      if (!collected.includes(event.gameId)) {
        reasons.push(`New distinct game: ${event.gameId}`);
        return { triggered: true, reasons };
      }
    }

    if (triggers.win_on_distinct_provider && event.winMultiplier > 0) {
      const collected = playerState?.progress.collectedItems || [];
      if (!collected.includes(event.providerId)) {
        reasons.push(`New distinct provider: ${event.providerId}`);
        return { triggered: true, reasons };
      }
    }

    if (triggers.win_on_distinct_vertical && event.winMultiplier > 0) {
      const collected = playerState?.progress.collectedItems || [];
      if (!collected.includes(event.vertical)) {
        reasons.push(`New distinct vertical: ${event.vertical}`);
        return { triggered: true, reasons };
      }
    }
  }

  if (promotion.type === "opt_in_outcome_challenge") {
    // For opt-in challenges, triggers are typically based on winMultiplier thresholds
    if (triggers.winMultiplier) {
      const min = triggers.winMultiplier.min ?? 0;
      const max = triggers.winMultiplier.max ?? Infinity;
      if (event.winMultiplier >= min && event.winMultiplier <= max) {
        reasons.push(`Win multiplier ${event.winMultiplier} within range [${min}, ${max}]`);
        return { triggered: true, reasons };
      }
    }
  }

  if (promotion.type === "high_range_outcome") {
    if (promotion.highRange) {
      const { min, max } = promotion.highRange;
      if (event.winMultiplier >= min && event.winMultiplier <= max) {
        reasons.push(`High-range outcome: ${event.winMultiplier}x (range: ${min}-${max})`);
        return { triggered: true, reasons };
      }
    }
  }

  reasons.push("No trigger conditions met");
  return { triggered: false, reasons };
}

