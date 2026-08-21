import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttendanceRecord, AttendanceSession, AttendanceVerification, PageResponse } from '../models/api.models';
import { AuthService } from './auth.service';

export const PREVIEW_SESSIONS: AttendanceSession[] = [
  { id: 'robotics', courseId: '1', courseCode: 'ME 51021', courseName: 'Robotic Analysis', teacherId: '1', teacherUserId: '1', teacherName: 'Daw Aye', sessionDate: '2026-08-04', startTime: '2026-08-04T10:00:00+06:30', endTime: '2026-08-04T12:00:00+06:30', rollCallCount: 1, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { id: 'structural', courseId: '2', courseCode: 'CE 4102', courseName: 'Structural Design', teacherId: '2', teacherUserId: '2', teacherName: 'Mg Mg', sessionDate: '2026-08-04', startTime: '2026-08-04T13:00:00+06:30', endTime: '2026-08-04T15:00:00+06:30', rollCallCount: 1, status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'programming', courseId: '3', courseCode: 'CSE 2103', courseName: 'Programming Fundamentals', teacherId: '3', teacherUserId: '3', teacherName: 'Hsu Hlaing', sessionDate: '2026-08-04', startTime: '2026-08-04T15:30:00+06:30', endTime: '2026-08-04T17:30:00+06:30', rollCallCount: 1, status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'electronics', courseId: '4', courseCode: 'ECE 3101', courseName: 'Digital Electronics', teacherId: '4', teacherUserId: '4', teacherName: 'Khin Thandar', sessionDate: '2026-08-04', startTime: '2026-08-04T09:00:00+06:30', endTime: '2026-08-04T11:00:00+06:30', rollCallCount: 1, status: 'CLOSED', createdAt: '', updatedAt: '' },
];

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  listSessions(date?: string): Observable<PageResponse<AttendanceSession>> {
    if (this.auth.isPreview()) return of(this.page(PREVIEW_SESSIONS));
    let params = new HttpParams().set('page', 0).set('size', 30);
    if (date) params = params.set('date', date);
    return this.http.get<PageResponse<AttendanceSession>>(`${environment.apiUrl}/attendance-sessions`, { params });
  }

  getSession(id: string): Observable<AttendanceSession> {
    const preview = PREVIEW_SESSIONS.find(session => session.id === id) ?? PREVIEW_SESSIONS[0];
    if (this.auth.isPreview()) return of(preview);
    return this.http.get<AttendanceSession>(`${environment.apiUrl}/attendance-sessions/${id}`);
  }

  listMyAttendance(): Observable<PageResponse<AttendanceRecord>> {
    if (this.auth.isPreview()) return of(this.page([
      { id: '1', studentId: '1', studentName: 'Mia Anderson', studentNumber: 'STU-24018', courseId: '1', courseCode: 'ME 51021', courseName: 'Robotic Analysis', sessionId: '1', attendanceTime: new Date().toISOString(), status: 'PRESENT', similarityScore: 0.96, verifiedAt: new Date().toISOString() },
      { id: '2', studentId: '1', studentName: 'Mia Anderson', studentNumber: 'STU-24018', courseId: '2', courseCode: 'CE 4102', courseName: 'Structural Design', sessionId: '2', attendanceTime: new Date(Date.now() - 86400000).toISOString(), status: 'PRESENT', similarityScore: 0.94, verifiedAt: new Date(Date.now() - 86400000).toISOString() },
    ]));
    return this.http.get<PageResponse<AttendanceRecord>>(`${environment.apiUrl}/attendance`, { params: { page: 0, size: 30 } });
  }

  getAttendance(id:string):Observable<AttendanceRecord>{if(this.auth.isPreview())return this.listMyAttendance().pipe(switchMap(x=>of(x.content.find(r=>r.id===id)!)));return this.http.get<AttendanceRecord>(`${environment.apiUrl}/attendance/${id}`)}

  verify(sessionId: string, image: Blob): Observable<AttendanceVerification> {
    if (this.auth.isPreview()) return of({ matched: true, similarity: 0.97, attendanceId: 'preview', status: 'PRESENT', verifiedAt: new Date().toISOString(), message: 'Attendance recorded successfully' });
    const body = new FormData();
    body.append('image', image, 'attendance-capture.jpg');
    return this.http.post<AttendanceVerification>(`${environment.apiUrl}/attendance/verify`, body, { params: { sessionId } });
  }

  private page<T>(content: T[]): PageResponse<T> {
    return { content, page: 0, size: content.length, totalElements: content.length, totalPages: 1, first: true, last: true };
  }
}
