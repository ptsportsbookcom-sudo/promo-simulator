import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import type { PromotionConfig } from "@/lib/models/types";

export async function GET() {
  try {
    const storage = getStorage();
    const promotions = await storage.getAllPromotions();
    return NextResponse.json({ promotions });
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
    const promotion: PromotionConfig = body;

    // Basic validation
    if (!promotion.id || !promotion.name || !promotion.type) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, type" },
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

