import { google } from "googleapis";

function formatPrivateKey(rawKey: string): string {
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
      range: "Attendance!A1:G1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["កាលបរិច្ឆេទ", "ID សិស្ស", "ឈ្មោះសិស្ស", "ថ្នាក់", "ស្ថានភាពវត្តមាន", "ចំណាំ", "ម៉ោងកត់ត្រា"],
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

// Get attendance for a specific date
export async function getAttendanceByDate(
  sheetIdOrUrl: string,
  date: string
): Promise<Record<string, { status: "present" | "permission" | "absent"; note?: string }>> {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Attendance!A2:G",
    });

    const rows = res.data.values || [];
    const recordMap: Record<string, { status: "present" | "permission" | "absent"; note?: string }> = {};

    for (const row of rows) {
      if (row[0] === date && row[1]) {
        recordMap[row[1]] = {
          status: (row[4] as any) || "present",
          note: row[5] || "",
        };
      }
    }

    return recordMap;
  } catch {
    return {};
  }
}

// Save or update attendance records for a given date
export async function saveAttendanceRecords(
  sheetIdOrUrl: string,
  date: string,
  records: Array<{
    studentId: string;
    studentName: string;
    className: string;
    status: "present" | "permission" | "absent";
    note?: string;
  }>
) {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const sheets = getSheetsClient();
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });

  // Read existing Attendance rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Attendance!A2:G",
  });

  const existingRows = res.data.values || [];
  
  // Create a map of existing row indices for this date + studentId
  // rowIndex in sheet = index + 2 (since A1 is header and 0-indexed)
  const existingMap = new Map<string, number>();
  existingRows.forEach((row, idx) => {
    if (row && row[0] === date && row[1]) {
      existingMap.set(row[1], idx + 2);
    }
  });

  const updateRequests: { range: string; values: any[][] }[] = [];
  const appendRows: any[][] = [];

  for (const rec of records) {
    const rowValues = [
      date,
      rec.studentId,
      rec.studentName,
      rec.className,
      rec.status,
      rec.note || "",
      now,
    ];

    if (existingMap.has(rec.studentId)) {
      const rowNum = existingMap.get(rec.studentId)!;
      updateRequests.push({
        range: `Attendance!A${rowNum}:G${rowNum}`,
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
      range: "Attendance!A:G",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: appendRows,
      },
    });
  }

  return { success: true, count: records.length };
}
