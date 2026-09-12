import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TimetableService } from '../../../core/services/timetable.service';
import { AdminTimetableComponent } from './admin-timetable.component';

describe('Course cancellation controls', () => {
  let component: AdminTimetableComponent;
  let response: Subject<any>;
  let api: { cancelCourse: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    response = new Subject();
    api = { cancelCourse: vi.fn(() => response) };
    TestBed.configureTestingModule({
      providers: [
        { provide: TimetableService, useValue: api },
        { provide: AcademicService, useValue: {} },
        { provide: DashboardService, useValue: {} },
        { provide: AuthService, useValue: { hasRole: () => true } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminTimetableComponent());
    component.cancellationContext.set({
      today: '2026-09-09',
      timeZone: 'Asia/Yangon',
      cancellations: [],
    });
    component.cancellationForm.patchValue({ courseId: 'course-1', reason: ' Sick leave ' });
    vi.spyOn(component, 'load').mockImplementation(() => {});
  });

  it('requires confirmation, trims the reason and prevents duplicate requests while loading', () => {
    component.cancelSchedule();
    expect(api.cancelCourse).not.toHaveBeenCalled();
    component.reviewCancellation();
    component.cancelSchedule();
    component.cancelSchedule();
    expect(api.cancelCourse).toHaveBeenCalledExactlyOnceWith('course-1', {
      scope: 'TODAY',
      fromDate: null,
      reason: 'Sick leave',
    });
    expect(component.cancelling()).toBe(true);
    response.next({ cancellation: { id: 'rule-1' }, cancelledSessions: 1 });
    expect(component.cancelling()).toBe(false);
    expect(component.confirmCancellation()).toBe(false);
    expect(component.cancellationContext()?.cancellations).toHaveLength(1);
  });

  it('rejects blank reasons and past future-cancellation dates', () => {
    component.cancellationForm.controls.reason.setValue('  ');
    component.reviewCancellation();
    expect(component.confirmCancellation()).toBe(false);
    component.cancellationForm.patchValue({
      reason: 'Finished',
      scope: 'FUTURE',
      fromDate: '2026-09-08',
    });
    component.reviewCancellation();
    expect(component.confirmCancellation()).toBe(false);
    expect(component.cancellationError()).toContain('future date');
  });

  it('passes the inclusive future date and leaves the form retryable on failure', () => {
    component.cancellationForm.patchValue({ scope: 'FUTURE', fromDate: '2026-09-10' });
    component.reviewCancellation();
    component.cancelSchedule();
    expect(api.cancelCourse.mock.calls[0][1].fromDate).toBe('2026-09-10');
    response.error({ error: { message: 'Try again' } });
    expect(component.cancelling()).toBe(false);
    expect(component.confirmCancellation()).toBe(true);
    expect(component.cancellationError()).toBe('Try again');
    expect(component.cancellationSuccess()).toBe('');
  });
});
