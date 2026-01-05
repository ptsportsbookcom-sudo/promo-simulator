import type {
  Event,
  PromotionConfig,
  PlayerState,
  PlayerPromotionState,
  EvaluationResult,
  RewardPayload,
} from "@/lib/models/types";
import { isEligible } from "./eligibility";
import { checkTrigger } from "./triggers";
import { checkCaps } from "./caps";
import { applyLadder, applyCollection, getCollectionItem } from "./mechanics";
import { createHybridPromotion } from "./adapter";

/**
 * Evaluate an event against a promotion and return evaluation result
 */
export function evaluateEvent(
  event: Event,
  promotion: PromotionConfig,
  playerState: PlayerState | null
): EvaluationResult {
  // Adapt promotion to work with existing evaluation logic
  const adaptedPromotion = createHybridPromotion(promotion);
  const result: EvaluationResult = {
    promotionId: promotion.id,
    eligible: false,
    fired: false,
    reasons: [],
  };

  const playerPromoState = playerState?.promotions[promotion.id] || null;

  // Step 1: Check eligibility
  const eligibility = isEligible(event, adaptedPromotion, playerPromoState);
  result.eligible = eligibility.eligible;
  result.reasons.push(...eligibility.reasons);

  if (!result.eligible) {
    return result;
  }

  // Step 2: Check trigger
  const trigger = checkTrigger(event, adaptedPromotion, playerPromoState);
  if (!trigger.triggered) {
    result.reasons.push(...trigger.reasons);
    return result;
  }

  result.reasons.push(...trigger.reasons);

  // Step 3: Apply mechanic and determine reward
  let reward: RewardPayload | null = null;
  let mechanicReasons: string[] = [];

  // High-range can have instant reward (check adapted promotion)
  const highRange = (adaptedPromotion as any).highRange;
  if ((adaptedPromotion as any).type === "high_range_outcome" && highRange?.instantReward) {
    reward = highRange.instantReward;
    mechanicReasons.push("High-range instant reward triggered");
  }

  // Apply ladder or collection mechanic (if alsoProgress is true for high-range, or for other types)
  const shouldApplyMechanic =
    (adaptedPromotion as any).type !== "high_range_outcome" ||
    highRange?.alsoProgress === true;

  if (shouldApplyMechanic) {
    if (promotion.mechanic.type === "ladder") {
      const ladderResult = applyLadder(promotion, playerPromoState, 1);
      if (ladderResult.reward) {
        // For high-range with instant reward, prefer instant reward, otherwise use ladder reward
        if ((adaptedPromotion as any).type !== "high_range_outcome" || !highRange?.instantReward) {
          reward = ladderResult.reward;
        }
      }
      mechanicReasons.push(...ladderResult.reasons);
    } else if (promotion.mechanic.type === "collection") {
      const collectionItem = getCollectionItem(event, promotion);
      if (collectionItem) {
        const collectionResult = applyCollection(promotion, playerPromoState, collectionItem);
        if (collectionResult.reward) {
          // For high-range with instant reward, prefer instant reward, otherwise use collection reward
          if ((adaptedPromotion as any).type !== "high_range_outcome" || !highRange?.instantReward) {
            reward = collectionResult.reward;
          }
        }
        mechanicReasons.push(...collectionResult.reasons);
      } else {
        mechanicReasons.push("Could not determine collection item from event");
      }
    }
  }

  result.reasons.push(...mechanicReasons);

  // Step 4: Check caps if reward would be given
  if (reward && reward.type !== "progress_only") {
    const caps = checkCaps(playerPromoState, promotion, reward);
    result.reasons.push(...caps.reasons);

    if (!caps.allowed) {
      // Still eligible and triggered, but reward blocked by caps
      result.reasons.push("Reward blocked by caps/cooldown");
      return result;
    }
  }

  // Step 5: Mark as fired if reward is given or progress is made
  if (reward) {
    result.fired = true;
    result.reward = reward;
    result.reasons.push(`Reward fired: ${reward.label} (${reward.type})`);
  } else if (mechanicReasons.some((r) => r.includes("progress") || r.includes("Collected"))) {
    result.fired = true; // Progress made even without reward
    result.reasons.push("Progress made (no reward at this stage)");
  }

  return result;
}

/**
 * Update player state based on evaluation result
 */
export function updatePlayerState(
  event: Event,
  promotion: PromotionConfig,
  evaluation: EvaluationResult,
  currentState: PlayerState | null
): PlayerState {
  const playerId = event.playerId;
  const now = new Date().toISOString();

  // Initialize player state if needed
  const state: PlayerState = currentState || {
    playerId,
    promotions: {},
    lastEventAt: now,
  };

  state.lastEventAt = now;

  // Get or create promotion state
  let promoState: PlayerPromotionState = state.promotions[promotion.id] || {
    promotionId: promotion.id,
    joined: false,
    progress: {
      collectedItems: [],
      triggerCount: 0,
    },
    rewards: [],
    dailyRewardCount: 0,
    totalRewardCount: 0,
    lastUpdated: now,
  };

  promoState.lastUpdated = now;

  // Update progress based on mechanic
  if (evaluation.fired) {
    const adaptedPromotion = createHybridPromotion(promotion);
    const highRange = (adaptedPromotion as any).highRange;
    const shouldApplyMechanic =
      (adaptedPromotion as any).type !== "high_range_outcome" ||
      highRange?.alsoProgress === true;

    if (shouldApplyMechanic) {
      if (promotion.mechanic.type === "ladder") {
        const ladderResult = applyLadder(promotion, promoState, 1);
        promoState.progress.currentLevel = ladderResult.newLevel;
        promoState.progress.triggerCount += 1;
      } else if (promotion.mechanic.type === "collection") {
        const collectionItem = getCollectionItem(event, promotion);
        if (collectionItem) {
          const collectionResult = applyCollection(promotion, promoState, collectionItem);
          if (!promoState.progress.collectedItems.includes(collectionItem)) {
            promoState.progress.collectedItems.push(collectionItem);
          }
        }
      }
    }

    // If reward was given, record it
    if (evaluation.reward && evaluation.reward.type !== "progress_only") {
      promoState.rewards.push({
        promotionId: promotion.id,
        reward: evaluation.reward,
        timestamp: now,
        reason: evaluation.reasons.join("; "),
      });

      promoState.lastRewardAt = now;

      // Update daily count (reset if new day)
      const today = new Date().toDateString();
      const lastRewardDate = promoState.lastRewardAt
        ? new Date(promoState.lastRewardAt).toDateString()
        : null;
      if (lastRewardDate !== today) {
        promoState.dailyRewardCount = 0;
      }
      promoState.dailyRewardCount += 1;
      promoState.totalRewardCount += 1;
    }
  }

  state.promotions[promotion.id] = promoState;
  return state;
}

