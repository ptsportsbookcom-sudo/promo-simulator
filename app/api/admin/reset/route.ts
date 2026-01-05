import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import seedPromotions from "@/config/promotions.seed.json";
import type { PromotionConfig } from "@/lib/models/types";

export async function POST() {
  try {
    const storage = getStorage();

    // Clear all data
    await storage.reset();

    // Load seed promotions
    for (const promo of seedPromotions as PromotionConfig[]) {
      await storage.savePromotion(promo);
    }

    return NextResponse.json({
      success: true,
      message: "Demo data reset and seed promotions loaded",
    });
  } catch (error: any) {
    console.error("Error resetting demo data:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

