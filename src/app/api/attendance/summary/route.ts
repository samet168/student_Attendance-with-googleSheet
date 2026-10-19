import { NextRequest, NextResponse } from "next/server";
import { getSubjectAbsenceSummary } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheetId");
    const className = searchParams.get("class") || "all";
    const month = searchParams.get("month") || "all";

    if (!sheetId) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ជាក់ Google Sheet ID" },
        { status: 400 }
      );
    }

    const data = await getSubjectAbsenceSummary(sheetId, className, month);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error in GET /api/attendance/summary:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
