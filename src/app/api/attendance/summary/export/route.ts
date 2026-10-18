import { NextRequest, NextResponse } from "next/server";
import { exportAbsenceSummaryToSheet } from "@/lib/googleSheets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetId, className, month } = body;

    if (!sheetId) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ជាក់ Google Sheet ID" },
        { status: 400 }
      );
    }

    const result = await exportAbsenceSummaryToSheet(
      sheetId,
      className || "all",
      month || "all"
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error in POST /api/attendance/summary/export:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
