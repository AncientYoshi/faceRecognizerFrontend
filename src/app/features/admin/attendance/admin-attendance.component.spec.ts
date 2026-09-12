import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { AcademicService } from '../../../core/services/academic.service';
import { AttendanceAdminService } from '../../../core/services/attendance-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { UserService } from '../../../core/services/user.service';
import { AttendanceSession } from '../../../core/models/api.models';
import { AdminAttendanceComponent } from './admin-attendance.component';

describe('Manual attendance session room', () => {
  let component: AdminAttendanceComponent;
  let api: { createSession: ReturnType<typeof vi.fn>; updateSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { createSession: vi.fn(() => new Subject()), updateSession: vi.fn(() => new Subject()) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { mode: 'sessions' } } } },
        { provide: AttendanceAdminService, useValue: api },
        { provide: AcademicService, useValue: {} },
        { provide: DashboardService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: AuthService, useValue: { hasRole: () => true } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminAttendanceComponent());
    component.sessionForm.patchValue({
      courseId: 'course-1', sessionDate: '2026-09-12',
      startTime: '2026-09-12T09:00', endTime: '2026-09-12T10:00', rollCallCount: 1,
    });
  });

  it('sends the trimmed room when creating a manual session', () => {
    component.sessionForm.controls.room.setValue('  Automation Lab  ');
    component.save();
    expect(api.createSession).toHaveBeenCalledOnce();
    expect(api.createSession.mock.calls[0][0].room).toBe('Automation Lab');
  });

  it('sends null for a blank optional room', () => {
    component.sessionForm.controls.room.setValue('   ');
    component.save();
    expect(api.createSession.mock.calls[0][0].room).toBeNull();
  });

  it('keeps the room when editing a session', () => {
    const session = {
      id: 'session-1', courseId: 'course-1', sessionDate: '2026-09-12',
      startTime: '2026-09-12T03:00:00Z', endTime: '2026-09-12T04:00:00Z',
      rollCallCount: 1, room: 'Automation Lab', status: 'SCHEDULED',
    } as AttendanceSession;
    component.open(session);
    expect(component.sessionForm.controls.room.value).toBe('Automation Lab');
    component.save();
    expect(api.updateSession).toHaveBeenCalledWith('session-1', expect.objectContaining({ room: 'Automation Lab' }));
  });

  it('rejects a room longer than 100 characters', () => {
    component.sessionForm.controls.room.setValue('a'.repeat(101));
    component.save();
    expect(api.createSession).not.toHaveBeenCalled();
  });
});
