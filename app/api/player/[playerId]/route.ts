import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;

    if (!playerId) {
      return NextResponse.json(
        { error: "Missing playerId" },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const playerState = await storage.getPlayerState(playerId);
    const logs = await storage.getPlayerLogs(playerId, 20);
    const promotions = await storage.getAllPromotions();

    // Enrich player state with promotion details
    const activePromotions = promotions
      .filter((p) => p.enabled)
      .map((promo) => {
        const promoState = playerState?.promotions[promo.id];
        return {
          ...promo,
          playerState: promoState || null,
        };
      });

    return NextResponse.json({
      playerId,
      playerState: playerState || {
        playerId,
        promotions: {},
      },
      activePromotions,
      recentLogs: logs,
    });
  } catch (error: any) {
    console.error("Error fetching player state:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

