import { NextRequest, NextResponse } from "next/server";
import { verifyAndInitSheet } from "@/lib/googleSheets";

export async function POST(req: NextRequest) {
  try {
    const { sheetUrl } = await req.json();
    if (!sheetUrl) {
      return NextResponse.json(
        { error: "សូមបញ្ចូល Google Sheet URL ឬ ID" },
        { status: 400 }
      );
    }

    const info = await verifyAndInitSheet(sheetUrl);
    return NextResponse.json({ success: true, sheet: info });
  } catch (error: any) {
    console.error("Error in /api/sheet/verify:", error);
    return NextResponse.json(
      { error: error.message || "មានបញ្ហាក្នុងការភ្ជាប់ Google Sheet" },
      { status: 500 }
    );
  }
}
