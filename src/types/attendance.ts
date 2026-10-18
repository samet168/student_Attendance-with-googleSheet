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
