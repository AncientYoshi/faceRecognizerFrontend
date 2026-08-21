import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboardResponse, AdminDashboardView, PageResponse, StudentDashboard, TeacherDashboard, UserSummary } from '../models/api.models';
import { AuthService } from './auth.service';

export const PREVIEW_DASHBOARD: AdminDashboardView = {
  totalUsers: 1248,
  totalStudents: 1163,
  totalTeachers: 85,
  totalCourses: 62,
  todayAttendance: 1075,
  expectedAttendance: 1163,
  attendanceRate: 92.4,
  recentSessions: [
    { id: '1', courseId: '1', courseCode: 'CS501', courseName: 'Database Systems', teacherId: '1', teacherUserId: '1', teacherName: 'Dr. John Smith', sessionDate: '2026-08-04', startTime: '2026-08-04T10:00:00Z', endTime: '2026-08-04T11:30:00Z', rollCallCount: 1, status: 'ACTIVE', createdAt: '', updatedAt: '' },
    { id: '2', courseId: '2', courseCode: 'CS502', courseName: 'Artificial Intelligence', teacherId: '2', teacherUserId: '2', teacherName: 'Dr. Emily Johnson', sessionDate: '2026-08-04', startTime: '2026-08-04T08:00:00Z', endTime: '2026-08-04T09:30:00Z', rollCallCount: 1, status: 'CLOSED', createdAt: '', updatedAt: '' },
    { id: '3', courseId: '3', courseCode: 'CS503', courseName: 'Software Engineering', teacherId: '3', teacherUserId: '3', teacherName: 'Dr. Michael Brown', sessionDate: '2026-08-04', startTime: '2026-08-04T14:00:00Z', endTime: '2026-08-04T15:30:00Z', rollCallCount: 1, status: 'CLOSED', createdAt: '', updatedAt: '' },
    { id: '4', courseId: '4', courseCode: 'CS504', courseName: 'Web Technologies', teacherId: '4', teacherUserId: '4', teacherName: 'Dr. Sarah Wilson', sessionDate: '2026-08-04', startTime: '2026-08-04T16:00:00Z', endTime: '2026-08-04T17:30:00Z', rollCallCount: 1, status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  ],
  departmentStatistics: [
    { departmentId: '1', departmentCode: 'CS', departmentName: 'Computer Science', students: 388, teachers: 24, courses: 16, attendanceRecords: 94 },
    { departmentId: '2', departmentCode: 'IT', departmentName: 'Information Technology', students: 302, teachers: 20, courses: 14, attendanceRecords: 90 },
    { departmentId: '3', departmentCode: 'SE', departmentName: 'Software Engineering', students: 267, teachers: 19, courses: 13, attendanceRecords: 93 },
    { departmentId: '4', departmentCode: 'DS', departmentName: 'Data Science', students: 206, teachers: 22, courses: 19, attendanceRecords: 89 },
  ],
  recentUsers: [
    { id: '1', email: 'john@sam.edu', firstName: 'John', lastName: 'Doe', enabled: true, roles: ['STUDENT'], studentNumber: 'CS2021001', createdAt: new Date().toISOString() },
    { id: '2', email: 'alice@sam.edu', firstName: 'Alice', lastName: 'Smith', enabled: true, roles: ['TEACHER'], createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: '3', email: 'michael@sam.edu', firstName: 'Michael', lastName: 'Roberts', enabled: true, roles: ['STUDENT'], studentNumber: 'CS2021002', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '4', email: 'sarah@sam.edu', firstName: 'Sarah', lastName: 'Johnson', enabled: true, roles: ['TEACHER'], createdAt: new Date(Date.now() - 90000000).toISOString() },
  ],
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getAdminDashboard(): Observable<AdminDashboardView> {
    if (this.auth.isPreview()) return of(PREVIEW_DASHBOARD);
    return forkJoin({
      dashboard: this.http.get<AdminDashboardResponse>(`${environment.apiUrl}/dashboard/admin`),
      users: this.http.get<PageResponse<UserSummary>>(`${environment.apiUrl}/users`, { params: { page: 0, size: 4 } }),
      courses: this.http.get<PageResponse<unknown>>(`${environment.apiUrl}/courses`, { params: { page: 0, size: 1 } }),
    }).pipe(
      map(({ dashboard, users, courses }) => ({
        ...dashboard,
        totalUsers: users.totalElements,
        totalCourses: courses.totalElements,
        recentUsers: users.content,
      })),
      catchError(() => of(PREVIEW_DASHBOARD)),
    );
  }

  getTeacherDashboard(): Observable<TeacherDashboard> {
    if (this.auth.isPreview()) return of({ teacherId:'preview-teacher', teacherName:'John Smith', myCourses:[{courseId:'c1',courseCode:'CSE-2103',courseName:'Programming Fundamentals',enrolledStudents:52}], todaySessions:PREVIEW_DASHBOARD.recentSessions.slice(0,2), attendanceRecords:182, expectedAttendance:195, attendanceRate:93.3 });
    return this.http.get<TeacherDashboard>(`${environment.apiUrl}/dashboard/teacher`);
  }

  getStudentDashboard(date: string): Observable<StudentDashboard> {
    if (this.auth.isPreview()) return of({
      overallAttendancePercentage:94,
      currentMonthPercentage:96,
      previousMonthPercentage:93.6,
      monthlyChange:2.4,
      classesAttended:47,
      eligibleSessions:50,
      presentCount:47,
      absentCount:3,
      todaySessionCount:2,
      activeCourseCount:4,
      requiredAttendancePercentage:75,
      todaySessions:PREVIEW_DASHBOARD.recentSessions.slice(0,2),
    });
    return this.http.get<StudentDashboard>(`${environment.apiUrl}/dashboard/student`, { params: { date } });
  }
}
