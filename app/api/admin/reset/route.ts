import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import seedPromotions from "@/config/promotions.seed.json";
import type { PromotionConfig } from "@/lib/models/types";
import { migrateLegacyPromotion } from "@/lib/models/migration";

export async function POST() {
  try {
    const storage = getStorage();

    // Clear all data
    await storage.reset();

    // Load seed promotions (migrate if needed)
    for (const promo of seedPromotions as any[]) {
      const migrated = migrateLegacyPromotion(promo);
      await storage.savePromotion(migrated);
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

