import { google } from "googleapis";

export function formatPrivateKey(rawKey: string): string {
  if (!rawKey) return "";
  let str = rawKey.trim();
  // Strip outer quotes
  str = str.replace(/^["']+|["']+$/g, "");
  // Unescape \\n and \n
  str = str.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");

  // Extract body between BEGIN and END
  const match = str.match(/-----BEGIN[^-]+-----([\s\S]*?)-----END[^-]+-----/);
  if (match && match[1]) {
    // Remove all whitespace and newlines from the base64 content
    const base64Body = match[1].replace(/\s+/g, "");
    // Split into standard PEM chunks of 64 characters
    const chunks = base64Body.match(/.{1,64}/g) || [];
    return "-----BEGIN PRIVATE KEY-----\n" + chunks.join("\n") + "\n-----END PRIVATE KEY-----\n";
  }
  return str;
}

export function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google Service Account credentials not found. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local or environment variables."
    );
  }

  const formattedKey = formatPrivateKey(privateKey);

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: formattedKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
}

export function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: "v4", auth });
}

// Extract Sheet ID from URL or return raw ID
export function extractSheetId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/{SHEET_ID}/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise assume it's already the ID
  return trimmed;
}

export interface SheetInfo {
  id: string;
  title: string;
  botEmail: string;
}

export interface Student {
  id: string;
  name: string;
  gender: string;
  phone: string;
  className: string;
  registeredAt: string;
  note?: string;
}

export interface AttendanceRecord {
  date: string;
  studentId: string;
  studentName: string;
  className: string;
  status: "present" | "permission" | "absent";
  note?: string;
  recordedAt: string;
}

// Verify access and initialize "Students" and "Attendance" tabs if not present
export async function verifyAndInitSheet(sheetIdOrUrl: string): Promise<SheetInfo> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  if (!sheetId) {
    throw new Error("Google Sheet ID មិនត្រឹមត្រូវឡើយ។ សូមពិនិត្យមើល Link ម្តងទៀត។");
  }

  const sheets = getSheetsClient();
  const botEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.NEXT_PUBLIC_BOT_EMAIL || "";

  let spreadsheet;
  try {
    const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    spreadsheet = res.data;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes("403") || errorMessage.includes("permission") || errorMessage.includes("not found")) {
      throw new Error(
        `មិនអាចចូលទៅកាន់ Sheet នេះបានទេ។ សូមប្រាកដថាអ្នកបានចុច Share Sheet ទៅកាន់អ៊ីមែល Bot៖ ${botEmail} ជា "Editor" រួចរាល់ហើយ។`
      );
    }
    throw new Error(`បរាជ័យក្នុងការភ្ជាប់ Google Sheet: ${errorMessage}`);
  }

  const existingSheets = spreadsheet.sheets?.map((s) => s.properties?.title || "") || [];
  const requests: any[] = [];

  // Create Students sheet if missing
  const hasStudents = existingSheets.includes("Students");
  if (!hasStudents) {
    requests.push({
      addSheet: {
        properties: {
          title: "Students",
          gridProperties: { rowCount: 100, columnCount: 10, frozenRowCount: 1 },
        },
      },
    });
  }

  // Create Attendance sheet if missing
  const hasAttendance = existingSheets.includes("Attendance");
  if (!hasAttendance) {
    requests.push({
      addSheet: {
        properties: {
          title: "Attendance",
          gridProperties: { rowCount: 500, columnCount: 10, frozenRowCount: 1 },
        },
      },
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests },
    });
  }

  // Add headers if missing
  if (!hasStudents) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Students!A1:G1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["ID សិស្ស", "ឈ្មោះពេញ", "ភេទ", "លេខទូរស័ព្ទ", "ថ្នាក់/ជំនាញ", "កាលបរិច្ឆេទចុះឈ្មោះ", "ចំណាំ"],
        ],
      },
    });
  }

  if (!hasAttendance) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Attendance!A1:H1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "កាលបរិច្ឆេទ",
            "ID សិស្ស",
            "ឈ្មោះសិស្ស",
            "ថ្នាក់",
            "មុខវិជ្ជា",
            "ស្ថានភាពវត្តមាន",
            "ចំណាំ",
            "ម៉ោងកត់ត្រា",
          ],
        ],
      },
    });
  }

  return {
    id: sheetId,
    title: spreadsheet.properties?.title || "Google Sheet សិស្ស",
    botEmail,
  };
}

// Get all registered students
export async function getStudentsList(sheetIdOrUrl: string): Promise<Student[]> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Students!A2:G",
    });

    const rows = res.data.values || [];
    return rows
      .filter((row) => row && row[0]) // Filter out empty rows
      .map((row) => ({
        id: row[0] || "",
        name: row[1] || "",
        gender: row[2] || "",
        phone: row[3] || "",
        className: row[4] || "",
        registeredAt: row[5] || "",
        note: row[6] || "",
      }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`មិនអាចទាញទិន្នន័យសិស្សបានទេ: ${msg}`);
  }
}

// Register a new student
export async function registerNewStudent(
  sheetIdOrUrl: string,
  data: { name: string; gender: string; phone: string; className: string; note?: string }
): Promise<Student> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();

  // Get current students to calculate next ID
  const existing = await getStudentsList(sheetId);
  const nextNumber = existing.length + 1;
  const studentId = `STU-${String(nextNumber).padStart(3, "0")}`;
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });

  const newRow = [
    studentId,
    data.name.trim(),
    data.gender.trim(),
    data.phone.trim(),
    data.className.trim(),
    now,
    data.note ? data.note.trim() : "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Students!A:G",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [newRow],
    },
  });

  // Sync to class-specific tab (e.g. ថ្នាក់_12A)
  const cleanClass = data.className.trim();
  const classTabName = `ថ្នាក់_${cleanClass}`.replace(/[:\\/?*\[\]]/g, "_").slice(0, 100);

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingTitles = meta.data.sheets?.map((s) => s.properties?.title || "") || [];

    if (!existingTitles.includes(classTabName)) {
      // Create new tab for this class
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: classTabName,
                  gridProperties: { rowCount: 100, columnCount: 10, frozenRowCount: 1 },
                },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${classTabName}'!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            ["ID សិស្ស", "ឈ្មោះពេញ", "ភេទ", "លេខទូរស័ព្ទ", "កាលបរិច្ឆេទចុះឈ្មោះ", "ចំណាំ"],
          ],
        },
      });
    }

    // Append student to class-specific tab
    const classRow = [
      studentId,
      data.name.trim(),
      data.gender.trim(),
      data.phone.trim(),
      now,
      data.note ? data.note.trim() : "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${classTabName}'!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [classRow],
      },
    });
  } catch (classSyncErr) {
    console.error("Error syncing to class tab:", classSyncErr);
  }

  return {
    id: studentId,
    name: data.name.trim(),
    gender: data.gender.trim(),
    phone: data.phone.trim(),
    className: data.className.trim(),
    registeredAt: now,
    note: data.note,
  };
}

export function toKhmerStatus(status: string): string {
  if (!status) return "វត្តមាន";
  const s = status.trim().toLowerCase();
  if (s === "permission" || s === "ច្បាប់") return "ច្បាប់";
  if (s === "absent" || s === "អវត្តមាន") return "អវត្តមាន";
  return "វត្តមាន";
}

export function toEnglishStatus(status: string): "present" | "permission" | "absent" {
  if (!status) return "present";
  const s = status.trim().toLowerCase();
  if (s === "permission" || s === "ច្បាប់") return "permission";
  if (s === "absent" || s === "អវត្តមាន") return "absent";
  return "present";
}

// Get attendance for a specific date and optional subject
export async function getAttendanceByDate(
  sheetIdOrUrl: string,
  date: string,
  subject?: string
): Promise<Record<string, { status: "present" | "permission" | "absent"; note?: string }>> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Attendance!A1:ZZ",
    });

    const rows = res.data.values || [];
    if (rows.length < 2) return {};

    const header = rows[0] || [];
    const hasSubjectCol = header.length >= 8 && String(header[4] || "").includes("មុខវិជ្ជា");

    const recordMap: Record<string, { status: "present" | "permission" | "absent"; note?: string }> = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0] || !row[1]) continue;

      if (row[0] === date) {
        let rowSubject = "";
        let rowStatus: "present" | "permission" | "absent" = "present";
        let rowNote = "";

        if (hasSubjectCol) {
          // 8-column layout:
          // A: date, B: id, C: name, D: class, E: subject, F: status, G: note, H: time
          rowSubject = String(row[4] || "").trim();
          rowStatus = toEnglishStatus(String(row[5] || ""));
          rowNote = String(row[6] || "").trim();
        } else {
          // Legacy 7-column layout:
          // A: date, B: id, C: name, D: class, E: status, F: note, G: time
          rowStatus = toEnglishStatus(String(row[4] || ""));
          const rawNote = String(row[5] || "");
          const match = rawNote.match(/\[មុខវិជ្ជា:\s*([^\]]+)\]/);
          rowSubject = match ? match[1].trim() : "វត្តមានទូទៅ";
          rowNote = rawNote.replace(/\[មុខវិជ្ជា:\s*[^\]]+\]\s*/, "").trim();
        }

        const targetSubject = subject ? subject.trim() : "វត្តមានទូទៅ";
        const isMatch = subject
          ? rowSubject.toLowerCase() === targetSubject.toLowerCase()
          : rowSubject === "" || rowSubject === "វត្តមានទូទៅ" || rowSubject === "ទូទៅ";

        if (isMatch) {
          recordMap[row[1]] = {
            status: rowStatus,
            note: rowNote,
          };
        }
      }
    }

    return recordMap;
  } catch {
    return {};
  }
}

// Save or update attendance records for a given date and optional subject
export async function saveAttendanceRecords(
  sheetIdOrUrl: string,
  date: string,
  records: Array<{
    studentId: string;
    studentName: string;
    className: string;
    status: "present" | "permission" | "absent" | string;
    note?: string;
    subject?: string;
  }>
) {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });

  // Read existing Attendance rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Attendance!A1:ZZ",
  });

  const allRows = res.data.values || [];
  const header = allRows[0] || [];
  const hasSubjectCol = header.length >= 8 && String(header[4] || "").includes("មុខវិជ្ជា");

  const standardHeaders = [
    "កាលបរិច្ឆេទ",
    "ID សិស្ស",
    "ឈ្មោះសិស្ស",
    "ថ្នាក់",
    "មុខវិជ្ជា",
    "ស្ថានភាពវត្តមាន",
    "ចំណាំ",
    "ម៉ោងកត់ត្រា",
  ];

  // Auto-upgrade header to 8 columns if needed
  if (!hasSubjectCol) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Attendance!A1:H1",
      valueInputOption: "RAW",
      requestBody: {
        values: [standardHeaders],
      },
    });
  }

  // Create a map of existing row indices (1-indexed for sheets: rowIndex = idx + 1)
  const existingMap = new Map<string, number>();

  for (let idx = 1; idx < allRows.length; idx++) {
    const row = allRows[idx];
    if (row && row[0] === date && row[1]) {
      let rowSubject = "";
      if (hasSubjectCol) {
        rowSubject = String(row[4] || "វត្តមានទូទៅ").trim().toLowerCase();
      } else {
        const rawNote = String(row[5] || "");
        const match = rawNote.match(/\[មុខវិជ្ជា:\s*([^\]]+)\]/);
        rowSubject = match ? match[1].trim().toLowerCase() : "វត្តមានទូទៅ";
      }
      const key = `${row[1]}_${rowSubject}`;
      existingMap.set(key, idx + 1);
    }
  }

  const updateRequests: { range: string; values: any[][] }[] = [];
  const appendRows: any[][] = [];

  for (const rec of records) {
    const cleanSub = (rec.subject || "វត្តមានទូទៅ").trim();
    const statusKhmer = toKhmerStatus(rec.status);
    const cleanNote = (rec.note || "").trim();

    const rowValues = [
      date,
      rec.studentId,
      rec.studentName,
      rec.className,
      cleanSub,
      statusKhmer,
      cleanNote,
      now,
    ];

    const key = `${rec.studentId}_${cleanSub.toLowerCase()}`;

    if (existingMap.has(key)) {
      const rowNum = existingMap.get(key)!;
      updateRequests.push({
        range: `Attendance!A${rowNum}:H${rowNum}`,
        values: [rowValues],
      });
    } else {
      appendRows.push(rowValues);
    }
  }

  // Execute batch updates
  if (updateRequests.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: updateRequests,
      },
    });
  }

  // Execute append for new records
  if (appendRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Attendance!A:H",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: appendRows,
      },
    });
  }

  return { success: true, count: records.length };
}

import {
  type SubjectConfig,
  DEFAULT_GRADE_SUBJECTS,
  type StudentGradeRow,
  type GradesMatrixData,
} from "@/types/grades";

import {
  type SubjectAbsenceSummaryData,
  type StudentSubjectAbsence,
} from "@/types/attendance";

export {
  type SubjectConfig,
  DEFAULT_GRADE_SUBJECTS,
  type StudentGradeRow,
  type GradesMatrixData,
};

export function sanitizeTabName(name: string): string {
  return name.replace(/[:\\/?*\[\]]/g, "_").slice(0, 100);
}

export function getGradeTabName(className: string, month: string): string {
  const cleanClass = className.trim() || "ទូទៅ";
  const cleanMonth = month.trim() || "ប្រចាំខែ";
  return sanitizeTabName(`ពិន្ទុ_${cleanClass}_${cleanMonth}`);
}

export function computeMention(average: number): string {
  if (average >= 42.5) return "និទ្ទេស A";
  if (average >= 37.5) return "និទ្ទេស B";
  if (average >= 32.5) return "និទ្ទេស C";
  if (average >= 27.5) return "និទ្ទេស D";
  if (average >= 25.0) return "និទ្ទេស E";
  if (average > 0) return "និទ្ទេស F";
  return "-";
}

export function calculateRankAndTotals(
  rows: Array<{
    studentId: string;
    studentName: string;
    gender: string;
    scores: Record<string, number | "">;
  }>,
  subjects: string[]
): StudentGradeRow[] {
  // First pass: compute totals and averages
  const computed = rows.map((r) => {
    let sum = 0;
    let hasAnyScore = false;

    for (const sub of subjects) {
      const val = r.scores[sub];
      if (val !== undefined && val !== "" && !isNaN(Number(val))) {
        sum += Number(val);
        hasAnyScore = true;
      }
    }

    const avg = subjects.length > 0 && hasAnyScore
      ? parseFloat((sum / subjects.length).toFixed(2))
      : 0;

    return {
      studentId: r.studentId,
      studentName: r.studentName,
      gender: r.gender,
      scores: r.scores,
      total: parseFloat(sum.toFixed(2)),
      average: avg,
      hasScore: hasAnyScore,
      rank: "-" as number | "-",
      mention: hasAnyScore ? computeMention(avg) : "-",
    };
  });

  // Second pass: standard competition ranking by Total score descending
  const scored = computed
    .filter((s) => s.hasScore)
    .sort((a, b) => b.total - a.total);

  let currentRank = 1;
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].total < scored[i - 1].total) {
      currentRank = i + 1;
    }
    scored[i].rank = currentRank;
  }

  const rankMap = new Map<string, number | "-">();
  scored.forEach((s) => rankMap.set(s.studentId, s.rank));

  return computed.map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    gender: s.gender,
    scores: s.scores,
    total: s.total,
    average: s.average,
    rank: rankMap.get(s.studentId) ?? "-",
    mention: s.mention,
  }));
}

// Get or initialize grade matrix for a given class and month
export async function getOrInitGradesMatrix(
  sheetIdOrUrl: string,
  className: string,
  month: string,
  customSubjects?: string[]
): Promise<GradesMatrixData> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();
  const tabName = getGradeTabName(className, month);

  // 1. Get all registered students in this class
  const allStudents = await getStudentsList(sheetId);
  const classStudents = allStudents.filter(
    (s) => s.className.trim().toLowerCase() === className.trim().toLowerCase()
  );

  // 2. Check existing sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingSheets = meta.data.sheets?.map((s) => s.properties?.title || "") || [];
  const tabExists = existingSheets.includes(tabName);

  const defaultSubjects = (customSubjects && customSubjects.length > 0)
    ? customSubjects
    : DEFAULT_GRADE_SUBJECTS.map((s) => s.name);

  if (!tabExists) {
    // Create new tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
                gridProperties: {
                  rowCount: Math.max(100, classStudents.length + 10),
                  columnCount: defaultSubjects.length + 10,
                  frozenRowCount: 1,
                  frozenColumnCount: 3,
                },
              },
            },
          },
        ],
      },
    });

    // Write header
    const headers = [
      "ID សិស្ស",
      "ឈ្មោះពេញ",
      "ភេទ",
      ...defaultSubjects,
      "ពិន្ទុសរុប",
      "មធ្យមភាគ",
      "ចំណាត់ថ្នាក់",
      "និទ្ទេស",
      "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព",
    ];

    const initialRows = classStudents.map((s) => {
      const emptyScores = defaultSubjects.map(() => "");
      return [s.id, s.name, s.gender, ...emptyScores, "", "", "", "", ""];
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers, ...initialRows],
      },
    });

    const students: StudentGradeRow[] = classStudents.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      gender: s.gender,
      scores: {},
      total: 0,
      average: 0,
      rank: "-",
      mention: "-",
    }));

    const subjectStats: Record<string, { submittedCount: number; totalCount: number }> = {};
    for (const sub of defaultSubjects) {
      subjectStats[sub] = { submittedCount: 0, totalCount: classStudents.length };
    }

    return {
      sheetTitle: meta.data.properties?.title || "Sheet",
      className,
      month,
      subjects: defaultSubjects,
      students,
      subjectStats,
    };
  }

  // If tab exists, read all data
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A1:ZZ`,
  });

  const allRows = res.data.values || [];
  if (allRows.length === 0) {
    throw new Error("ទិន្នន័យក្នុង Sheet ទទេ");
  }

  const headerRow = allRows[0] || [];
  // Fixed prefix: 0: ID, 1: ឈ្មោះ, 2: ភេទ
  // Fixed suffix: "ពិន្ទុសរុប", "មធ្យមភាគ", "ចំណាត់ថ្នាក់", "និទ្ទេស", "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព"
  const suffixHeaders = ["ពិន្ទុសរុប", "មធ្យមភាគ", "ចំណាត់ថ្នាក់", "និទ្ទេស", "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព"];
  
  let subjects: string[] = [];
  const subjectEndIdx = headerRow.findIndex((h) => suffixHeaders.includes(String(h).trim()));
  if (subjectEndIdx > 3) {
    subjects = headerRow.slice(3, subjectEndIdx).map((h) => String(h).trim());
  } else {
    // If suffixes not found, take until end or use default
    subjects = headerRow.slice(3).map((h) => String(h).trim()).filter((h) => !suffixHeaders.includes(h));
    if (subjects.length === 0) subjects = defaultSubjects;
  }

  const existingStudentIds = new Set<string>();
  const rawRows: Array<{
    studentId: string;
    studentName: string;
    gender: string;
    scores: Record<string, number | "">;
  }> = [];

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || !row[0]) continue;
    const studentId = String(row[0]).trim();
    const studentName = String(row[1] || "").trim();
    const gender = String(row[2] || "").trim();
    existingStudentIds.add(studentId);

    const scores: Record<string, number | ""> = {};
    subjects.forEach((sub, sIdx) => {
      const cellVal = row[3 + sIdx];
      if (cellVal !== undefined && cellVal !== "" && !isNaN(Number(cellVal))) {
        scores[sub] = Number(cellVal);
      } else {
        scores[sub] = "";
      }
    });

    rawRows.push({ studentId, studentName, gender, scores });
  }

  // Check if there are newly enrolled students in this class missing from tab
  const missingStudents = classStudents.filter((s) => !existingStudentIds.has(s.id));
  if (missingStudents.length > 0) {
    for (const m of missingStudents) {
      const scores: Record<string, number | ""> = {};
      subjects.forEach((sub) => (scores[sub] = ""));
      rawRows.push({
        studentId: m.id,
        studentName: m.name,
        gender: m.gender,
        scores,
      });
    }

    // Append newly missing students to sheet
    const appendValues = missingStudents.map((m) => [
      m.id,
      m.name,
      m.gender,
      ...subjects.map(() => ""),
      "",
      "",
      "",
      "",
      "",
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A:ZZ`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: appendValues },
    });
  }

  // Re-rank and calculate totals
  const students = calculateRankAndTotals(rawRows, subjects);

  // Subject statistics
  const subjectStats: Record<string, { submittedCount: number; totalCount: number }> = {};
  for (const sub of subjects) {
    let count = 0;
    for (const st of students) {
      if (st.scores[sub] !== undefined && st.scores[sub] !== "") count++;
    }
    subjectStats[sub] = { submittedCount: count, totalCount: students.length };
  }

  return {
    sheetTitle: meta.data.properties?.title || "Sheet",
    className,
    month,
    subjects,
    students,
    subjectStats,
  };
}

// Save scores for a specific subject (used by Subject Teacher via Direct Link)
export async function saveSubjectGrades(
  sheetIdOrUrl: string,
  className: string,
  month: string,
  subjectName: string,
  scores: Record<string, number | "">
): Promise<GradesMatrixData> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();
  const tabName = getGradeTabName(className, month);

  // Ensure matrix is initialized
  const matrix = await getOrInitGradesMatrix(sheetId, className, month);

  // Check if subject exists in matrix, if not, add it
  let subjects = [...matrix.subjects];
  let subjectColIdx = subjects.indexOf(subjectName);

  if (subjectColIdx === -1) {
    subjects.push(subjectName);
    subjectColIdx = subjects.length - 1;
  }

  // Update in-memory student rows with new scores
  const updatedRawRows = matrix.students.map((st) => {
    const updatedScores = { ...st.scores };
    if (scores[st.studentId] !== undefined) {
      updatedScores[subjectName] = scores[st.studentId];
    }
    return {
      studentId: st.studentId,
      studentName: st.studentName,
      gender: st.gender,
      scores: updatedScores,
    };
  });

  // Calculate new totals and ranks
  const computedStudents = calculateRankAndTotals(updatedRawRows, subjects);
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });

  // Prepare full matrix to write to Google Sheet
  const headers = [
    "ID សិស្ស",
    "ឈ្មោះពេញ",
    "ភេទ",
    ...subjects,
    "ពិន្ទុសរុប",
    "មធ្យមភាគ",
    "ចំណាត់ថ្នាក់",
    "និទ្ទេស",
    "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព",
  ];

  const dataRows = computedStudents.map((st) => [
    st.studentId,
    st.studentName,
    st.gender,
    ...subjects.map((sub) => (st.scores[sub] !== undefined ? st.scores[sub] : "")),
    st.total > 0 ? st.total : "",
    st.average > 0 ? st.average : "",
    st.rank !== "-" ? st.rank : "",
    st.mention !== "-" ? st.mention : "",
    now,
  ]);

  // Overwrite the entire tab data cleanly
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers, ...dataRows],
    },
  });

  // Re-calculate stats
  const subjectStats: Record<string, { submittedCount: number; totalCount: number }> = {};
  for (const sub of subjects) {
    let count = 0;
    for (const st of computedStudents) {
      if (st.scores[sub] !== undefined && st.scores[sub] !== "") count++;
    }
    subjectStats[sub] = { submittedCount: count, totalCount: computedStudents.length };
  }

  return {
    sheetTitle: matrix.sheetTitle,
    className,
    month,
    subjects,
    students: computedStudents,
    subjectStats,
  };
}

// Save complete matrix (used by Homeroom Teacher when editing in live grid)
export async function saveFullGradesMatrix(
  sheetIdOrUrl: string,
  className: string,
  month: string,
  subjects: string[],
  students: StudentGradeRow[]
): Promise<GradesMatrixData> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();
  const tabName = getGradeTabName(className, month);
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });

  const rawRows = students.map((st) => ({
    studentId: st.studentId,
    studentName: st.studentName,
    gender: st.gender,
    scores: st.scores,
  }));

  const computedStudents = calculateRankAndTotals(rawRows, subjects);

  const headers = [
    "ID សិស្ស",
    "ឈ្មោះពេញ",
    "ភេទ",
    ...subjects,
    "ពិន្ទុសរុប",
    "មធ្យមភាគ",
    "ចំណាត់ថ្នាក់",
    "និទ្ទេស",
    "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព",
  ];

  const dataRows = computedStudents.map((st) => [
    st.studentId,
    st.studentName,
    st.gender,
    ...subjects.map((sub) => (st.scores[sub] !== undefined ? st.scores[sub] : "")),
    st.total > 0 ? st.total : "",
    st.average > 0 ? st.average : "",
    st.rank !== "-" ? st.rank : "",
    st.mention !== "-" ? st.mention : "",
    now,
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers, ...dataRows],
    },
  });

  const subjectStats: Record<string, { submittedCount: number; totalCount: number }> = {};
  for (const sub of subjects) {
    let count = 0;
    for (const st of computedStudents) {
      if (st.scores[sub] !== undefined && st.scores[sub] !== "") count++;
    }
    subjectStats[sub] = { submittedCount: count, totalCount: computedStudents.length };
  }

  return {
    sheetTitle: tabName,
    className,
    month,
    subjects,
    students: computedStudents,
    subjectStats,
  };
}

// Calculate Subject Absence Summary Matrix for a class/month
export async function getSubjectAbsenceSummary(
  sheetIdOrUrl: string,
  className?: string,
  monthFilter?: string
): Promise<SubjectAbsenceSummaryData> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();

  // 1. Get students list
  const allStudents = await getStudentsList(sheetId);
  const targetClass = className && className !== "all" ? className.trim().toLowerCase() : "";
  const filteredStudents = targetClass
    ? allStudents.filter((s) => s.className.trim().toLowerCase() === targetClass)
    : allStudents;

  // 2. Read Attendance rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Attendance!A1:ZZ",
  });

  const allRows = res.data.values || [];
  if (allRows.length < 2) {
    return {
      className: className || "all",
      subjects: [],
      students: filteredStudents.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        gender: s.gender,
        className: s.className,
        subjects: {} as Record<string, { permission: number; absent: number }>,
        totalPermission: 0,
        totalAbsent: 0,
        totalMissed: 0,
      })),
      totalRecords: 0,
      totalPermission: 0,
      totalAbsent: 0,
      totalMissed: 0,
    };
  }

  const header = allRows[0] || [];
  const hasSubjectCol = header.length >= 8 && String(header[4] || "").includes("មុខវិជ្ជា");

  const distinctSubjectsSet = new Set<string>();
  const studentMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      gender: string;
      className: string;
      subjects: Record<string, { permission: number; absent: number }>;
      totalPermission: number;
      totalAbsent: number;
      totalMissed: number;
    }
  >();

  filteredStudents.forEach((s) => {
    studentMap.set(s.id, {
      studentId: s.id,
      studentName: s.name,
      gender: s.gender,
      className: s.className,
      subjects: {},
      totalPermission: 0,
      totalAbsent: 0,
      totalMissed: 0,
    });
  });

  let grandTotalPermission = 0;
  let grandTotalAbsent = 0;

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || !row[0] || !row[1]) continue;

    const rowDate = String(row[0]).trim();
    const stuId = String(row[1]).trim();

    if (!studentMap.has(stuId)) continue;

    // Filter by month if provided (e.g. "2026-10")
    if (monthFilter && monthFilter !== "all") {
      if (!rowDate.startsWith(monthFilter)) continue;
    }

    let sub = "វត្តមានទូទៅ";
    let status = "present";

    if (hasSubjectCol) {
      sub = String(row[4] || "វត្តមានទូទៅ").trim();
      status = toEnglishStatus(String(row[5] || ""));
    } else {
      status = toEnglishStatus(String(row[4] || ""));
      const rawNote = String(row[5] || "");
      const match = rawNote.match(/\[មុខវិជ្ជា:\s*([^\]]+)\]/);
      sub = match ? match[1].trim() : "វត្តមានទូទៅ";
    }

    if (status === "permission" || status === "absent") {
      distinctSubjectsSet.add(sub);
      const studentData = studentMap.get(stuId)!;

      if (!studentData.subjects[sub]) {
        studentData.subjects[sub] = { permission: 0, absent: 0 };
      }

      if (status === "permission") {
        studentData.subjects[sub].permission++;
        studentData.totalPermission++;
        grandTotalPermission++;
      } else if (status === "absent") {
        studentData.subjects[sub].absent++;
        studentData.totalAbsent++;
        grandTotalAbsent++;
      }
      studentData.totalMissed++;
    }
  }

  const subjectsList = Array.from(distinctSubjectsSet);
  const studentsList = Array.from(studentMap.values());

  // Sort by totalMissed descending (students with highest absences at top)
  studentsList.sort((a, b) => b.totalMissed - a.totalMissed);

  return {
    className: className || "all",
    subjects: subjectsList,
    students: studentsList,
    totalRecords: allRows.length - 1,
    totalPermission: grandTotalPermission,
    totalAbsent: grandTotalAbsent,
    totalMissed: grandTotalPermission + grandTotalAbsent,
  };
}

// Export / Sync Subject Absence Summary as a dedicated tab in Google Sheet
export async function exportAbsenceSummaryToSheet(
  sheetIdOrUrl: string,
  className: string = "all",
  month: string = "all"
): Promise<{ tabName: string; updatedRows: number }> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();

  const summary = await getSubjectAbsenceSummary(sheetId, className, month);

  const cleanClass = className === "all" ? "គ្រប់ថ្នាក់" : (className.trim() || "ទូទៅ");
  const cleanMonth = month === "all" ? "សរុប" : (month.trim() || "សរុប");
  const tabName = sanitizeTabName(`អវត្តមាន_${cleanClass}_${cleanMonth}`);

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingSheets = meta.data.sheets?.map((s) => s.properties?.title || "") || [];
  const tabExists = existingSheets.includes(tabName);

  const subjects = summary.subjects.length > 0 ? summary.subjects : ["វត្តមានទូទៅ"];

  if (!tabExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
                gridProperties: {
                  rowCount: Math.max(100, summary.students.length + 15),
                  columnCount: subjects.length + 10,
                  frozenRowCount: 1,
                  frozenColumnCount: 2,
                },
              },
            },
          },
        ],
      },
    });
  }

  // Headers
  const headers = [
    "ID សិស្ស",
    "ឈ្មោះពេញ",
    "ភេទ",
    "ថ្នាក់",
    ...subjects,
    "សរុបច្បាប់",
    "សរុបអវត្តមាន",
    "សរុបខកខាន",
    "ស្ថានភាព",
    "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព",
  ];

  const nowStr = new Date().toLocaleString("km-KH", { timeZone: "Asia/Phnom_Penh" });

  const rows = summary.students.map((st) => {
    const subjectCells = subjects.map((sub) => {
      const rec = st.subjects[sub];
      if (!rec || (rec.permission === 0 && rec.absent === 0)) {
        return "-";
      }
      const parts = [];
      if (rec.permission > 0) parts.push(`ច្បាប់:${rec.permission}`);
      if (rec.absent > 0) parts.push(`អវត្តមាន:${rec.absent}`);
      return parts.join(" | ");
    });

    let statusLabel = "ល្អ";
    if (st.totalMissed > 5) {
      statusLabel = "ប្រកាសអាសន្ន";
    } else if (st.totalMissed > 2) {
      statusLabel = "ត្រូវតាមដាន";
    } else if (st.totalMissed > 0) {
      statusLabel = "មធ្យម";
    }

    return [
      st.studentId,
      st.studentName,
      st.gender,
      st.className,
      ...subjectCells,
      st.totalPermission,
      st.totalAbsent,
      st.totalMissed,
      statusLabel,
      nowStr,
    ];
  });

  // Clear existing content and update
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A1:Z${Math.max(100, rows.length + 10)}`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return { tabName, updatedRows: rows.length };
}


