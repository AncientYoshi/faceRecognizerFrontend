import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Course, PageResponse, StudentProfile } from '../models/api.models';
import { AuthService } from './auth.service';

const PREVIEW_PROFILE: StudentProfile = {
  studentId: 'preview-student',
  userId: 'preview-student-user',
  studentNumber: 'STU-24018',
  email: 'student@sam.edu',
  firstName: 'Mia',
  lastName: 'Anderson',
  departmentId: 'preview-cse',
  departmentCode: 'CSE',
  departmentName: 'Computer Science and Engineering',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const PREVIEW_COURSES: Course[] = [
  { id: '1', code: 'ME 51021', name: 'Robotic Analysis', semester: 'FIRST', academicYear: '2026-2027', departmentId: 'me', departmentCode: 'ME', departmentName: 'Mechanical Engineering', teacherId: '1', teacherUserId: '1', teacherName: 'Daw Aye', enrollmentCount: 34, createdAt: '', updatedAt: '' },
  { id: '2', code: 'CE 4102', name: 'Structural Design', semester: 'FIRST', academicYear: '2026-2027', departmentId: 'ce', departmentCode: 'CE', departmentName: 'Civil Engineering', teacherId: '2', teacherUserId: '2', teacherName: 'Mg Mg', enrollmentCount: 41, createdAt: '', updatedAt: '' },
  { id: '3', code: 'CSE 2103', name: 'Programming Fundamentals', semester: 'FIRST', academicYear: '2026-2027', departmentId: 'cse', departmentCode: 'CSE', departmentName: 'Computer Science and Engineering', teacherId: '3', teacherUserId: '3', teacherName: 'Hsu Hlaing', enrollmentCount: 52, createdAt: '', updatedAt: '' },
  { id: '4', code: 'ECE 3101', name: 'Digital Electronics', semester: 'FIRST', academicYear: '2026-2027', departmentId: 'ece', departmentCode: 'ECE', departmentName: 'Electronic Engineering', teacherId: '4', teacherUserId: '4', teacherName: 'Khin Thandar', enrollmentCount: 38, createdAt: '', updatedAt: '' },
];

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private profileRequest?: Observable<StudentProfile>;
  private coursesRequest?: Observable<PageResponse<Course>>;
  private cachedUserId?: string;
  private readonly _profile = signal<StudentProfile | null>(null);

  readonly profile = this._profile.asReadonly();

  getMyProfile(force = false): Observable<StudentProfile> {
    this.ensureCurrentUserCache();
    if (this.auth.isPreview()) {
      this._profile.set(PREVIEW_PROFILE);
      return of(PREVIEW_PROFILE);
    }
    if (!this.profileRequest || force) {
      this.profileRequest = this.http.get<StudentProfile>(`${environment.apiUrl}/students/me`).pipe(
        tap(profile => this._profile.set(profile)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.profileRequest;
  }

  getMyCourses(force = false): Observable<PageResponse<Course>> {
    this.ensureCurrentUserCache();
    if (this.auth.isPreview()) return of(this.page(PREVIEW_COURSES));
    if (!this.coursesRequest || force) {
      this.coursesRequest = this.getMyProfile(force).pipe(
        switchMap(profile => this.http.get<PageResponse<Course>>(
          `${environment.apiUrl}/students/${profile.studentId}/courses`,
          { params: { page: 0, size: 100 } },
        )),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.coursesRequest;
  }

  clearCache(): void {
    this.profileRequest = undefined;
    this.coursesRequest = undefined;
    this._profile.set(null);
    this.cachedUserId = undefined;
  }

  private ensureCurrentUserCache(): void {
    const currentUserId = this.auth.user()?.id;
    if (this.cachedUserId !== currentUserId) {
      this.profileRequest = undefined;
      this.coursesRequest = undefined;
      this._profile.set(null);
      this.cachedUserId = currentUserId;
    }
  }

  private page<T>(content: T[]): PageResponse<T> {
    return { content, page: 0, size: content.length, totalElements: content.length, totalPages: 1, first: true, last: true };
  }
}
