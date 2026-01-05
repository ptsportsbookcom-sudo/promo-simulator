import { NextRequest, NextResponse } from "next/server";
import type { Event, PlayerState } from "@/lib/models/types";
import { getStorage } from "@/lib/storage";
import { evaluateEvent, updatePlayerState } from "@/lib/engine";
import type { LogEntry } from "@/lib/models/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, event }: { playerId: string; event: Event } = body;

    if (!playerId || !event) {
      return NextResponse.json(
        { error: "Missing playerId or event" },
        { status: 400 }
      );
    }

    // Ensure event has playerId
    event.playerId = playerId;
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    const storage = getStorage();
    const promotions = await storage.getAllPromotions();
    const playerState = await storage.getPlayerState(playerId);

    const evaluations: Array<{
      promotionId: string;
      eligible: boolean;
      fired: boolean;
      reasons: string[];
      reward?: any;
    }> = [];

    let updatedState: PlayerState = playerState || {
      playerId,
      promotions: {},
      lastEventAt: new Date().toISOString(),
    };

    // Evaluate event against all enabled promotions
    for (const promotion of promotions) {
      if (!promotion.enabled) continue;

      const evaluation = evaluateEvent(event, promotion, updatedState);
      evaluations.push({
        promotionId: evaluation.promotionId,
        eligible: evaluation.eligible,
        fired: evaluation.fired,
        reasons: evaluation.reasons,
        reward: evaluation.reward,
      });

      // Update player state if evaluation fired
      if (evaluation.fired) {
        updatedState = updatePlayerState(event, promotion, evaluation, updatedState);
      }
    }

    // Save updated player state
    await storage.savePlayerState(updatedState);

    // Log the evaluation
    const logEntry: LogEntry = {
      playerId,
      event,
      timestamp: new Date().toISOString(),
      evaluations: evaluations.map((e) => ({
        promotionId: e.promotionId,
        eligible: e.eligible,
        fired: e.fired,
        reasons: e.reasons,
        reward: e.reward,
      })),
    };

    await storage.addLog(logEntry);

    return NextResponse.json({
      success: true,
      playerState: updatedState,
      evaluations,
    });
  } catch (error: any) {
    console.error("Error processing event:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

