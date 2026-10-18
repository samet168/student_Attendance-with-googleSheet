import { NextRequest, NextResponse } from "next/server";
import { getStudentsList, registerNewStudent } from "@/lib/googleSheets";

// GET /api/students?sheetId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheetId");

    if (!sheetId) {
      return NextResponse.json({ error: "Missing sheetId" }, { status: 400 });
    }

    const students = await getStudentsList(sheetId);
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error("Error in GET /api/students:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load students" },
      { status: 500 }
    );
  }
}

// POST /api/students (Student Registration)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetId, name, gender, phone, className, note } = body;

    if (!sheetId) {
      return NextResponse.json({ error: "Missing sheetId" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "សូមបញ្ចូលឈ្មោះសិស្ស" }, { status: 400 });
    }
    if (!gender) {
      return NextResponse.json({ error: "សូមជ្រើសរើសភេទ" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "សូមបញ្ចូលលេខទូរស័ព្ទ" }, { status: 400 });
    }
    if (!className || !className.trim()) {
      return NextResponse.json({ error: "សូមបញ្ចូលថ្នាក់រៀន" }, { status: 400 });
    }

    const newStudent = await registerNewStudent(sheetId, {
      name,
      gender,
      phone,
      className,
      note,
    });

    return NextResponse.json({
      success: true,
      message: "ចុះឈ្មោះបានជោគជ័យ!",
      student: newStudent,
    });
  } catch (error: any) {
    console.error("Error in POST /api/students:", error);
    return NextResponse.json(
      { error: error.message || "បរាជ័យក្នុងការចុះឈ្មោះ" },
      { status: 500 }
    );
  }
}
