export interface SubjectConfig {
  id: string;
  name: string;
  maxScore: number;
}

export const DEFAULT_GRADE_SUBJECTS: SubjectConfig[] = [
  { id: "khmer", name: "ភាសាខ្មែរ", maxScore: 50 },
  { id: "math", name: "គណិតវិទ្យា", maxScore: 50 },
  { id: "physics", name: "រូបវិទ្យា", maxScore: 50 },
  { id: "chemistry", name: "គីមីវិទ្យា", maxScore: 50 },
  { id: "biology", name: "ជីវវិទ្យា", maxScore: 50 },
  { id: "history", name: "ប្រវត្តិវិទ្យា", maxScore: 50 },
  { id: "geography", name: "ភូមិវិទ្យា", maxScore: 50 },
  { id: "english", name: "ភាសាអង់គ្លេស", maxScore: 50 },
  { id: "civics", name: "សីលធម៌-ពលរដ្ឋ", maxScore: 50 },
  { id: "earth", name: "ផែនដីវិទ្យា", maxScore: 50 },
];

export interface StudentGradeRow {
  studentId: string;
  studentName: string;
  gender: string;
  scores: Record<string, number | "">;
  total: number;
  average: number;
  rank: number | "-";
  mention: string;
}

export interface GradesMatrixData {
  sheetTitle: string;
  className: string;
  month: string;
  subjects: string[];
  students: StudentGradeRow[];
  subjectStats: Record<string, { submittedCount: number; totalCount: number }>;
}
