import { NextRequest, NextResponse } from "next/server";
import {
  getOrInitGradesMatrix,
  saveSubjectGrades,
  saveFullGradesMatrix,
  addSubjectToGradeMatrix,
  removeSubjectFromGradeMatrix,
} from "@/lib/googleSheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheetId");
    const className = searchParams.get("class") || "";
    const month = searchParams.get("month") || "តុលា";

    if (!sheetId) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ជាក់ Google Sheet ID" },
        { status: 400 }
      );
    }

    if (!className) {
      return NextResponse.json({
        success: true,
        data: {
          sheetTitle: "ពិន្ទុ",
          className: "",
          month,
          subjects: [],
          students: [],
          subjectStats: {},
        },
      });
    }

    const data = await getOrInitGradesMatrix(sheetId, className, month);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error in GET /api/grades:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetId, className, month, action } = body;

    if (!sheetId || !className || !month) {
      return NextResponse.json(
        { success: false, error: "សូមផ្ដល់ព័ត៌មាន sheetId, className និង month ឱ្យបានគ្រប់គ្រាន់" },
        { status: 400 }
      );
    }

    if (action === "add_subject") {
      const { subject } = body;
      if (!subject || typeof subject !== "string" || !subject.trim()) {
        return NextResponse.json(
          { success: false, error: "សូមផ្ដល់ឈ្មោះមុខវិជ្ជា" },
          { status: 400 }
        );
      }
      const data = await addSubjectToGradeMatrix(sheetId, className, month, subject.trim());
      return NextResponse.json({ success: true, data });
    }

    if (action === "remove_subject") {
      const { subject } = body;
      if (!subject || typeof subject !== "string" || !subject.trim()) {
        return NextResponse.json(
          { success: false, error: "សូមផ្ដល់ឈ្មោះមុខវិជ្ជាដែលត្រូវលុប" },
          { status: 400 }
        );
      }
      const data = await removeSubjectFromGradeMatrix(sheetId, className, month, subject.trim());
      return NextResponse.json({ success: true, data });
    }

    if (action === "save_subject") {
      const { subject, scores } = body;
      if (!subject || !scores) {
        return NextResponse.json(
          { success: false, error: "សូមផ្ដល់ subject និង scores" },
          { status: 400 }
        );
      }
      const data = await saveSubjectGrades(sheetId, className, month, subject, scores);
      return NextResponse.json({ success: true, data });
    }

    if (action === "save_matrix") {
      const { subjects, students } = body;
      if (!subjects || !students) {
        return NextResponse.json(
          { success: false, error: "សូមផ្ដល់ subjects និង students" },
          { status: 400 }
        );
      }
      const data = await saveFullGradesMatrix(sheetId, className, month, subjects, students);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: "សកម្មភាព (action) មិនត្រឹមត្រូវឡើយ" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error in POST /api/grades:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
