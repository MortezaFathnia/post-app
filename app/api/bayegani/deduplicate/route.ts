import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const rows = await tx.bayeganiRecord.findMany({
        select: { id: true, archiveCode: true },
        orderBy: { id: "asc" },
      });

      const firstIdByCode = new Map<string, number>();
      const duplicateIds: number[] = [];

      for (const row of rows) {
        const code = row.archiveCode?.trim() ?? "";
        if (!code) continue;

        if (!firstIdByCode.has(code)) {
          firstIdByCode.set(code, row.id);
        } else {
          duplicateIds.push(row.id);
        }
      }

      if (duplicateIds.length === 0) {
        return { deletedCount: 0, duplicateGroups: 0, remainingRecords: rows.length };
      }

      // Keep the lowest-ID record for each code; delete only the later copies.
      await tx.bayeganiRecord.deleteMany({
        where: { id: { in: duplicateIds } },
      });

      return {
        deletedCount: duplicateIds.length,
        duplicateGroups: new Set(
          duplicateIds
            .map((id) => rows.find((row) => row.id === id)?.archiveCode?.trim())
            .filter((code): code is string => Boolean(code)),
        ).size,
        remainingRecords: rows.length - duplicateIds.length,
      };
    });

    return NextResponse.json({
      success: true,
      ...deleted,
      message: deleted.deletedCount
        ? `${deleted.deletedCount} رکورد تکراری حذف شد.`
        : "رکورد تکراری با کد بایگانی غیرخالی پیدا نشد.",
    });
  } catch (error) {
    console.error("Bayegani duplicate cleanup failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "پاک‌سازی رکوردهای تکراری ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
