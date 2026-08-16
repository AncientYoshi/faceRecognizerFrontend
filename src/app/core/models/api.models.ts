export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type SelfRegistrationRole = 'TEACHER' | 'STUDENT';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  roles: Role[];
  createdAt: string;
}

export interface PublicDepartment {
  id: string;
  code: string;
  name: string;
}

export interface RegisterUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: SelfRegistrationRole;
  studentNumber: string | null;
  employeeNumber: string | null;
  departmentId: string;
}

export interface RegisterUserResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SelfRegistrationRole;
  studentId: string | null;
  studentNumber: string | null;
  teacherId: string | null;
  employeeNumber: string | null;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  registeredAt: string;
}

export interface StudentProfile {
  studentId: string;
  userId: string;
  studentNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  academicYear: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  teacherId: string;
  teacherUserId: string;
  teacherName: string;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string; code: string; name: string; description: string;
  studentCount: number; teacherCount: number; courseCount: number;
  createdAt: string; updatedAt: string;
}

export interface Enrollment {
  id: string; courseId: string; courseCode: string; courseName: string;
  studentId: string; studentUserId: string; studentNumber: string;
  studentName: string; enrolledAt: string;
}

export interface CoursePayload {
  code: string; name: string; semester: string; academicYear: string;
  departmentId: string; teacherId: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  teacherId: string;
  teacherUserId: string;
  teacherName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentStatistic {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  students: number;
  teachers: number;
  courses: number;
  attendanceRecords: number;
}

export interface AdminDashboardResponse {
  totalStudents: number;
  totalTeachers: number;
  todayAttendance: number;
  expectedAttendance: number;
  attendanceRate: number;
  recentSessions: AttendanceSession[];
  departmentStatistics: DepartmentStatistic[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  sessionId: string;
  attendanceTime: string;
  status: string;
  similarityScore: number;
  verifiedAt: string;
}

export interface AttendanceVerification {
  matched: boolean;
  similarity: number;
  attendanceId: string | null;
  status: string | null;
  verifiedAt: string | null;
  message: string;
}

export interface SessionPayload { courseId: string; sessionDate: string; startTime: string; endTime: string; }
export interface AttendanceReport {
  totalRecords: number; expectedAttendance: number; attendanceRate: number;
  generatedAt: string; records: PageResponse<AttendanceRecord>;
}

export type AttendancePercentagePeriod = 'WEEK' | 'MONTH';
export interface StudentAttendancePercentage {
  studentId:string; studentUserId:string; studentNumber:string; studentName:string;
  courseId:string; courseCode:string; courseName:string; totalSessions:number;
  presentSessions:number; absentSessions:number; attendancePercentage:number;
}
export interface StudentAttendancePercentageReport {
  period:AttendancePercentagePeriod; referenceDate:string; from:string; to:string;
  generatedAt:string; students:PageResponse<StudentAttendancePercentage>;
}

export interface TeacherCourseSummary { courseId:string; courseCode:string; courseName:string; enrolledStudents:number; }
export interface TeacherDashboard {
  teacherId:string; teacherName:string; myCourses:TeacherCourseSummary[];
  todaySessions:AttendanceSession[]; attendanceRecords:number;
  expectedAttendance:number; attendanceRate:number;
}
export interface StudentDashboard {
  overallAttendancePercentage:number;
  currentMonthPercentage:number;
  previousMonthPercentage:number;
  monthlyChange:number;
  classesAttended:number;
  eligibleSessions:number;
  presentCount:number;
  absentCount:number;
  todaySessionCount:number;
  activeCourseCount:number;
  requiredAttendancePercentage:number;
  todaySessions:AttendanceSession[];
}
export interface FaceRegistration { id:string; studentId:string; studentNumber:string; embeddingId:string; registeredAt:string; updatedAt:string; }

export interface ProfileAssignment {
  profileId:string; userId:string; fullName:string; referenceNumber:string;
  departmentId:string|null; departmentName:string|null;
}

export interface AssignedTeacher {
  teacherId:string; userId:string; employeeNumber:string; email:string;
  firstName:string; lastName:string; fullName:string; departmentId:string;
  departmentCode:string; departmentName:string;
}

export interface AssignedStudent {
  studentId:string; userId:string; studentNumber:string; email:string;
  firstName:string; lastName:string; fullName:string; departmentId:string;
  departmentCode:string; departmentName:string;
}

export type DayOfWeek='MONDAY'|'TUESDAY'|'WEDNESDAY'|'THURSDAY'|'FRIDAY'|'SATURDAY'|'SUNDAY';
export interface TimetableEntry {
  id:string; courseId:string; courseCode:string; courseName:string; dayOfWeek:DayOfWeek;
  startTime:string; endTime:string; room:string|null; effectiveFrom:string|null;
  effectiveTo:string|null; active:boolean; createdAt:string; updatedAt:string;
}
export interface TimetablePayload {
  courseId:string; dayOfWeek:DayOfWeek; startTime:string; endTime:string;
  room:string|null; effectiveFrom:string|null; effectiveTo:string|null; active:boolean;
}
export interface StudentTimetableEntry {
  timetableId:string; courseId:string; courseCode:string; courseName:string; semester:string;
  academicYear:string; teacherId:string; teacherName:string; dayOfWeek:DayOfWeek;
  date:string; startTime:string; endTime:string; room:string|null; today:boolean;
}
export interface StudentTimetable {
  studentId:string; today:string; weekStart:string; weekEnd:string; timeZone:string;
  entries:StudentTimetableEntry[];
}
export interface AuditLog {
  id:string; userId:string|null; userEmail:string|null; action:string; entityType:string|null;
  entityId:string|null; details:string|null; ipAddress:string|null; createdAt:string;
}
export interface SystemSetting {
  id:string; key:string; value:string; valueType:string; description:string;
  updatedBy:string|null; updatedAt:string;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  roles: Role[];
  studentId?: string;
  studentNumber?: string;
  teacherId?: string;
  employeeNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RoleResponse {
  id: string;
  name: Role;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  studentNumber: string | null;
  employeeNumber: string | null;
}

export interface UpdateUserPayload extends Omit<CreateUserPayload, 'password'> {
  password: string | null;
  enabled: boolean;
}

export interface AdminDashboardView extends AdminDashboardResponse {
  totalUsers: number;
  totalCourses: number;
  recentUsers: UserSummary[];
}
