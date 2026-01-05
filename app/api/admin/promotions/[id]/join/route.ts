import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

// Endpoint for players to join/leave opt-in promotions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await params;
    const body = await request.json();
    const { playerId, action }: { playerId: string; action: "join" | "leave" } = body;

    if (!playerId || !action) {
      return NextResponse.json(
        { error: "Missing playerId or action" },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const promotion = await storage.getPromotion(promotionId);

    if (!promotion) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    if (!promotion.requiresOptIn) {
      return NextResponse.json(
        { error: "Promotion does not require opt-in" },
        { status: 400 }
      );
    }

    const playerState = await storage.getPlayerState(playerId) || {
      playerId,
      promotions: {},
    };

    const promoState = playerState.promotions[promotionId] || {
      promotionId,
      joined: false,
      progress: {
        collectedItems: [],
        triggerCount: 0,
      },
      rewards: [],
      dailyRewardCount: 0,
      totalRewardCount: 0,
      lastUpdated: new Date().toISOString(),
    };

    if (action === "join") {
      promoState.joined = true;
    } else if (action === "leave") {
      promoState.joined = false;
    }

    promoState.lastUpdated = new Date().toISOString();
    playerState.promotions[promotionId] = promoState;

    await storage.savePlayerState(playerState);

    return NextResponse.json({
      success: true,
      playerState,
    });
  } catch (error: any) {
    console.error("Error joining/leaving promotion:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

