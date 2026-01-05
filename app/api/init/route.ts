import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import seedPromotions from "@/config/promotions.seed.json";
import type { PromotionConfig } from "@/lib/models/types";

// Initialize seed data if storage is empty
export async function GET() {
  try {
    const storage = getStorage();
    const existing = await storage.getAllPromotions();

    if (existing.length === 0) {
      // Load seed promotions
      for (const promo of seedPromotions as PromotionConfig[]) {
        await storage.savePromotion(promo);
      }
      return NextResponse.json({
        success: true,
        message: "Seed data initialized",
        count: seedPromotions.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Storage already initialized",
      count: existing.length,
    });
  } catch (error: any) {
    console.error("Error initializing:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

