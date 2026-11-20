import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const facilityCodes = await prisma.facilityCode.findMany({
      orderBy: [{ code: "asc" }],
      select: { code: true, name: true },
    });
    return NextResponse.json({ success: true, facilityCodes });
  } catch (error) {
    console.error("FacilityCode lookup failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "دریافت انواع تسهیلات ناموفق بود." },
      { status: 500 },
    );
  }
}
