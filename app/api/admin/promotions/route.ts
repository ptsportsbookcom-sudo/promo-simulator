import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import type { PromotionConfig } from "@/lib/models/types";
import { migrateLegacyPromotion } from "@/lib/models/migration";

export async function GET() {
  try {
    const storage = getStorage();
    const promotions = await storage.getAllPromotions();
    // Migrate any legacy promotions
    const migrated = promotions.map((p) => {
      if ((p as any).type && !("trigger" in p)) {
        return migrateLegacyPromotion(p as any);
      }
      return p;
    });
    return NextResponse.json({ promotions: migrated });
  } catch (error: any) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let promotion: PromotionConfig = body;

    // Migrate if legacy format
    if ((promotion as any).type && !("trigger" in promotion)) {
      promotion = migrateLegacyPromotion(promotion as any);
    }

    // Basic validation
    if (!promotion.id || !promotion.name || !promotion.trigger) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, trigger" },
        { status: 400 }
      );
    }

    const storage = getStorage();
    await storage.savePromotion(promotion);

    return NextResponse.json({ success: true, promotion });
  } catch (error: any) {
    console.error("Error creating promotion:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

