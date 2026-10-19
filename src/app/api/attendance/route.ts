import { NextRequest, NextResponse } from "next/server";
import {
  getAttendanceByDate,
  saveAttendanceRecords,
  exportAbsenceSummaryToSheet,
} from "@/lib/googleSheets";

// GET /api/attendance?sheetId=...&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheetId");
    const date = searchParams.get("date");
    const subject = searchParams.get("subject") || undefined;

    if (!sheetId || !date) {
      return NextResponse.json(
        { error: "Missing sheetId or date parameter" },
        { status: 400 }
      );
    }

    const records = await getAttendanceByDate(sheetId, date, subject);
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error("Error in GET /api/attendance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load attendance" },
      { status: 500 }
    );
  }
}

// POST /api/attendance (Save attendance)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetId, date, records } = body;

    if (!sheetId || !date || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid attendance payload" },
        { status: 400 }
      );
    }

    const result = await saveAttendanceRecords(sheetId, date, records);

    // Auto-sync master sheet 'អវត្តមានទាំងអស់' (User request: auto sync ទាំងsheet វត្តមានតាមមុខវិជ្ជានិងអវត្តមានall)
    try {
      await exportAbsenceSummaryToSheet(sheetId, "all", "all");
    } catch (syncAllErr) {
      console.warn("Auto-sync អវត្តមានទាំងអស់ in /api/attendance failed:", syncAllErr);
    }

    return NextResponse.json({
      success: true,
      message: "រក្សាទុកវត្តមាន និងធ្វើបច្ចុប្បន្នភាព Sheet ស្វ័យប្រវត្តបានជោគជ័យ!",
      result,
    });
  } catch (error: any) {
    console.error("Error in POST /api/attendance:", error);
    return NextResponse.json(
      { error: error.message || "បរាជ័យក្នុងការរក្សាទុកវត្តមាន" },
      { status: 500 }
    );
  }
}
