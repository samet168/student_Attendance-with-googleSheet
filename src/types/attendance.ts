export interface StudentSubjectAbsence {
  studentId: string;
  studentName: string;
  gender: string;
  className: string;
  subjects: Record<string, { permission: number; absent: number }>;
  totalPermission: number;
  totalAbsent: number;
  totalMissed: number;
}

export interface SubjectAbsenceSummaryData {
  className: string;
  subjects: string[];
  students: StudentSubjectAbsence[];
  totalRecords: number;
  totalPermission: number;
  totalAbsent: number;
  totalMissed: number;
}

export interface SubjectSheetStudentRow {
  index: number;
  studentId: string;
  studentName: string;
  gender: string;
  className: string;
  score: number | string;
  presentCount: number;
  permissionCount: number;
  absentCount: number;
  totalMissed: number;
  discipline: string;
  lastUpdated: string;
}

export interface SubjectSheetData {
  tabName: string;
  className: string;
  month: string;
  subject: string;
  students: SubjectSheetStudentRow[];
  stats: {
    totalStudents: number;
    scoredCount: number;
    averageScore: number | string;
    totalPresent: number;
    totalPermission: number;
    totalAbsent: number;
    totalMissed: number;
  };
}

