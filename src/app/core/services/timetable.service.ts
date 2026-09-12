import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DayOfWeek,
  PageResponse,
  StudentTimetable,
  TimetableEntry,
  TimetablePayload,
} from '../models/api.models';
import { AuthService } from './auth.service';

export interface ScheduleCancellation {
  id: string;
  fromDate: string;
  toDate: string | null;
  reason: string;
  createdAt: string;
}

export interface ScheduleCancellationContext {
  today: string;
  timeZone: string;
  cancellations: ScheduleCancellation[];
}

export interface CancelCourseSchedulePayload {
  scope: 'TODAY' | 'FUTURE';
  fromDate: string | null;
  reason: string;
}

export interface CancelCourseScheduleResult {
  cancellation: ScheduleCancellation;
  cancelledSessions: number;
}

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private preview = signal<TimetableEntry[]>([]);
  private previewCancellations = new Map<string, ScheduleCancellation[]>();

  cancellations(courseId: string): Observable<ScheduleCancellationContext> {
    if (this.auth.isPreview()) {
      return of({
        today: this.previewToday(),
        timeZone: 'Asia/Yangon',
        cancellations: this.previewCancellations.get(courseId) ?? [],
      });
    }
    return this.http.get<ScheduleCancellationContext>(
      `${environment.apiUrl}/courses/${courseId}/schedule-cancellations`,
    );
  }

  cancelCourse(
    courseId: string,
    body: CancelCourseSchedulePayload,
  ): Observable<CancelCourseScheduleResult> {
    if (this.auth.isPreview()) {
      const today = this.previewToday();
      const fromDate = body.scope === 'TODAY' ? today : body.fromDate;
      if (!fromDate || fromDate < today || !body.reason.trim()) {
        return throwError(() => ({
          error: { message: 'Choose today or a future date and enter a reason.' },
        }));
      }
      const toDate = body.scope === 'TODAY' ? today : null;
      const previous = this.previewCancellations.get(courseId) ?? [];
      const cancellation = previous.find((c) => c.fromDate === fromDate && c.toDate === toDate) ?? {
        id: crypto.randomUUID(),
        fromDate,
        toDate,
        reason: body.reason.trim(),
        createdAt: new Date().toISOString(),
      };
      this.previewCancellations.set(courseId, [
        cancellation,
        ...previous.filter((c) => c.id !== cancellation.id),
      ]);
      return of({ cancellation, cancelledSessions: 0 });
    }
    return this.http.post<CancelCourseScheduleResult>(
      `${environment.apiUrl}/courses/${courseId}/schedule-cancellations`,
      body,
    );
  }

  private previewToday(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Yangon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
  list(
    filters: {
      courseId?: string;
      dayOfWeek?: DayOfWeek;
      onDate?: string;
      active?: boolean;
      page?: number;
      size?: number;
    } = {},
  ): Observable<PageResponse<TimetableEntry>> {
    if (this.auth.isPreview())
      return of(this.page(this.preview(), filters.page || 0, filters.size || 100));
    let params = new HttpParams();
    Object.entries({ ...filters, page: filters.page || 0, size: filters.size || 100 }).forEach(
      ([k, v]) => {
        if (v !== undefined && v !== '') params = params.set(k, String(v));
      },
    );
    return this.http.get<PageResponse<TimetableEntry>>(`${environment.apiUrl}/timetables`, {
      params,
    });
  }
  get(id: string): Observable<TimetableEntry> {
    if (this.auth.isPreview()) return of(this.preview().find((x) => x.id === id)!);
    return this.http.get<TimetableEntry>(`${environment.apiUrl}/timetables/${id}`);
  }
  create(body: TimetablePayload): Observable<TimetableEntry> {
    if (this.auth.isPreview()) {
      const x = {
        ...body,
        id: crypto.randomUUID(),
        courseCode: 'PREVIEW',
        courseName: 'Preview Course',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.preview.update((v) => [...v, x]);
      return of(x);
    }
    return this.http.post<TimetableEntry>(`${environment.apiUrl}/timetables`, body);
  }
  update(id: string, body: TimetablePayload): Observable<TimetableEntry> {
    if (this.auth.isPreview()) {
      const old = this.preview().find((x) => x.id === id)!;
      const x = { ...old, ...body };
      this.preview.update((v) => v.map((y) => (y.id === id ? x : y)));
      return of(x);
    }
    return this.http.put<TimetableEntry>(`${environment.apiUrl}/timetables/${id}`, body);
  }
  delete(id: string): Observable<void> {
    if (this.auth.isPreview()) {
      this.preview.update((v) => v.filter((x) => x.id !== id));
      return of(undefined);
    }
    return this.http.delete<void>(`${environment.apiUrl}/timetables/${id}`);
  }
  mine(weekStart?: string): Observable<StudentTimetable> {
    if (this.auth.isPreview()) {
      const today = new Date().toISOString().slice(0, 10);
      return of({
        studentId: 'preview-student',
        today,
        weekStart: weekStart || today,
        weekEnd: today,
        timeZone: 'Asia/Yangon',
        entries: [],
      });
    }
    return this.http.get<StudentTimetable>(`${environment.apiUrl}/students/me/timetable`, {
      params: weekStart ? { weekStart } : {},
    });
  }
  private page<T>(all: T[], page: number, size: number): PageResponse<T> {
    return {
      content: all.slice(page * size, page * size + size),
      page,
      size,
      totalElements: all.length,
      totalPages: Math.ceil(all.length / size),
      first: page === 0,
      last: (page + 1) * size >= all.length,
    };
  }
}
