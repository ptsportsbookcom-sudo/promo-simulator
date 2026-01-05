import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import type { PromotionConfig } from "@/lib/models/types";
import { migrateLegacyPromotion } from "@/lib/models/migration";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storage = getStorage();
    let promotion = await storage.getPromotion(id);

    if (!promotion) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    // Migrate if legacy format
    if ((promotion as any).type && !("trigger" in promotion)) {
      promotion = migrateLegacyPromotion(promotion as any);
    }

    return NextResponse.json({ promotion });
  } catch (error: any) {
    console.error("Error fetching promotion:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    let promotion: PromotionConfig = { ...body, id };

    // Migrate if legacy format
    if ((promotion as any).type && !("trigger" in promotion)) {
      promotion = migrateLegacyPromotion(promotion as any);
      promotion.id = id; // Ensure ID is preserved
    }

    const storage = getStorage();
    const existing = await storage.getPromotion(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    await storage.savePromotion(promotion);

    return NextResponse.json({ success: true, promotion });
  } catch (error: any) {
    console.error("Error updating promotion:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storage = getStorage();
    const existing = await storage.getPromotion(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    await storage.deletePromotion(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting promotion:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

