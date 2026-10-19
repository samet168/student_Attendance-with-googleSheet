import { NextRequest, NextResponse } from "next/server";
import {
  getStudentsList,
  getAttendanceByDate,
  saveAttendanceRecords,
  syncSubjectSheet,
  getSubjectSheetData,
  dateToKhmerMonth,
  getSubjectTabName,
  exportAbsenceSummaryToSheet,
} from "@/lib/googleSheets";

// GET /api/attendance/monitor?sheetId=...&class=12A&subject=គណិតវិទ្យា&date=2026-10-19&month=តុលា
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheetId");
    const className = searchParams.get("class") || "";
    const subject = searchParams.get("subject") || "គណិតវិទ្យា";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const month = searchParams.get("month") || dateToKhmerMonth(date);

    if (!sheetId) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ជាក់ Google Sheet ID" },
        { status: 400 }
      );
    }

    if (!className) {
      return NextResponse.json({
        success: true,
        className: "",
        subject,
        month,
        date,
        tabName: "",
        students: [],
        attendanceMap: {},
        subjectSheet: null,
      });
    }

    // 1. Get students for this class
    const allStudents = await getStudentsList(sheetId);
    const classStudents = allStudents.filter(
      (s) => s.className.trim().toLowerCase() === className.trim().toLowerCase()
    );

    // 2. Get existing attendance for this date & subject
    const attendanceMap = await getAttendanceByDate(sheetId, date, subject);

    // 3. Get subject sheet summary
    let subjectSheet = null;
    try {
      subjectSheet = await getSubjectSheetData(sheetId, className, month, subject);
    } catch (sheetErr) {
      console.warn("Could not load subject sheet data:", sheetErr);
    }

    return NextResponse.json({
      success: true,
      className,
      subject,
      month,
      date,
      tabName: getSubjectTabName(subject, className, month),
      students: classStudents,
      attendanceMap,
      subjectSheet,
    });
  } catch (error: any) {
    console.error("Error in GET /api/attendance/monitor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "មិនអាចទាញយកទិន្នន័យវត្តមានបានឡើយ" },
      { status: 500 }
    );
  }
}

// POST /api/attendance/monitor (Save attendance & sync dedicated subject sheet)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetId, className, subject, month, date, records } = body;

    if (!sheetId || !className || !subject || !date || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: "ទិន្នន័យមិនពេញលេញ (Missing required fields)" },
        { status: 400 }
      );
    }

    const cleanMonth = month || dateToKhmerMonth(date);

    // 1. Save attendance records to central Attendance tab
    const formattedRecords = records.map((r: any) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      className: r.className || className,
      status: r.status || "present",
      note: r.note || "",
      subject: subject,
    }));

    await saveAttendanceRecords(sheetId, date, formattedRecords);

    // 2. Sync dedicated subject sheet (e.g. គណិតវិទ្យា_12A_តុលា)
    const syncRes = await syncSubjectSheet(sheetId, className, cleanMonth, subject);

    // 3. Auto-sync master sheet 'អវត្តមានទាំងអស់' (User request: auto sync ទាំងsheet វត្តមានតាមមុខវិជ្ជានិងអវត្តមានall)
    try {
      await exportAbsenceSummaryToSheet(sheetId, "all", "all");
    } catch (syncAllErr) {
      console.warn("Auto-sync អវត្តមានទាំងអស់ failed:", syncAllErr);
    }

    return NextResponse.json({
      success: true,
      message: `រក្សាទុកវត្តមានមុខវិជ្ជា «${subject}» និងធ្វើបច្ចុប្បន្នភាព Sheet [${syncRes.tabName}] និង [អវត្តមានទាំងអស់] បានជោគជ័យ!`,
      tabName: syncRes.tabName,
      updatedRows: syncRes.updatedRows,
    });
  } catch (error: any) {
    console.error("Error in POST /api/attendance/monitor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "បរាជ័យក្នុងការរក្សាទុកវត្តមាន" },
      { status: 500 }
    );
  }
}
