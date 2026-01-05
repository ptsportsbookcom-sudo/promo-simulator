import type { PlayerPromotionState, RewardPayload } from "@/lib/models/types";

/**
 * Check if caps and cooldowns allow a reward
 */
export function checkCaps(
  playerState: PlayerPromotionState | null,
  promotion: { cooldownMinutes?: number; maxRewardsPerDay?: number; maxRewardsTotal?: number },
  reward: RewardPayload
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!playerState) {
    reasons.push("No player state - caps check passed");
    return { allowed: true, reasons };
  }

  // Check cooldown
  if (promotion.cooldownMinutes && playerState.lastRewardAt) {
    const lastRewardTime = new Date(playerState.lastRewardAt);
    const now = new Date();
    const minutesSince = (now.getTime() - lastRewardTime.getTime()) / (1000 * 60);

    if (minutesSince < promotion.cooldownMinutes) {
      reasons.push(
        `Cooldown active: ${Math.ceil(promotion.cooldownMinutes - minutesSince)} minutes remaining`
      );
      return { allowed: false, reasons };
    }
  }

  // Check daily cap
  if (promotion.maxRewardsPerDay) {
    // Reset daily count if last reward was yesterday
    const today = new Date().toDateString();
    const lastRewardDate = playerState.lastRewardAt
      ? new Date(playerState.lastRewardAt).toDateString()
      : null;

    let dailyCount = playerState.dailyRewardCount;
    if (lastRewardDate !== today) {
      dailyCount = 0; // Reset for new day
    }

    if (dailyCount >= promotion.maxRewardsPerDay) {
      reasons.push(`Daily cap reached: ${dailyCount}/${promotion.maxRewardsPerDay}`);
      return { allowed: false, reasons };
    }
  }

  // Check total cap
  if (promotion.maxRewardsTotal) {
    if (playerState.totalRewardCount >= promotion.maxRewardsTotal) {
      reasons.push(`Total cap reached: ${playerState.totalRewardCount}/${promotion.maxRewardsTotal}`);
      return { allowed: false, reasons };
    }
  }

  reasons.push("Caps check passed");
  return { allowed: true, reasons };
}

