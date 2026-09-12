import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TimetableService } from './timetable.service';

describe('TimetableService cancellations', () => {
  let service: TimetableService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isPreview: () => false } },
      ],
    });
    service = TestBed.inject(TimetableService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads server date, timezone and cancellation history for the selected course', () => {
    const context = { today: '2026-09-09', timeZone: 'Asia/Yangon', cancellations: [] };
    let result: unknown;
    service.cancellations('course-1').subscribe((value) => (result = value));
    const request = http.expectOne(`${environment.apiUrl}/courses/course-1/schedule-cancellations`);
    expect(request.request.method).toBe('GET');
    request.flush(context);
    expect(result).toEqual(context);
  });

  it.each([
    { scope: 'TODAY' as const, fromDate: null, reason: 'Sick leave' },
    { scope: 'FUTURE' as const, fromDate: '2026-09-10', reason: 'Course completed' },
  ])('posts the explicit cancellation scope: $scope', (body) => {
    service.cancelCourse('course-1', body).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/courses/course-1/schedule-cancellations`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ cancellation: {}, cancelledSessions: 2 });
  });

  it('propagates authorization errors instead of reporting success', () => {
    let status: number | undefined;
    service
      .cancelCourse('other-course', { scope: 'TODAY', fromDate: null, reason: 'Leave' })
      .subscribe({ error: (error) => (status = error.status) });
    http
      .expectOne(`${environment.apiUrl}/courses/other-course/schedule-cancellations`)
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
  });
});
