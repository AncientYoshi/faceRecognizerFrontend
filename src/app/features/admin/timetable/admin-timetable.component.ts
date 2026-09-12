import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import {
  TimetableService,
  ScheduleCancellationContext,
} from '../../../core/services/timetable.service';
import {
  Course,
  DayOfWeek,
  TimetableEntry,
  TimetablePayload,
} from '../../../core/models/api.models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-admin-timetable',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './admin-timetable.component.html',
  styleUrl: './admin-timetable.component.css',
})
export class AdminTimetableComponent implements OnInit {
  private api = inject(TimetableService);
  private academics = inject(AcademicService);
  private dashboard = inject(DashboardService);
  readonly auth = inject(AuthService);
  private fb = inject(FormBuilder);
  readonly entries = signal<TimetableEntry[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modal = signal(false);
  readonly editing = signal<TimetableEntry | null>(null);
  readonly cancellationContext = signal<ScheduleCancellationContext | null>(null);
  readonly cancellationLoading = signal(false);
  readonly cancelling = signal(false);
  readonly confirmCancellation = signal(false);
  readonly cancellationError = signal('');
  readonly cancellationSuccess = signal('');
  cancellationForm = this.fb.nonNullable.group({
    courseId: ['', Validators.required],
    scope: ['TODAY' as 'TODAY' | 'FUTURE', Validators.required],
    fromDate: [''],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });
  readonly days: DayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  form = this.fb.nonNullable.group({
    courseId: ['', Validators.required],
    dayOfWeek: ['MONDAY' as DayOfWeek, Validators.required],
    startTime: ['08:30', Validators.required],
    endTime: ['10:00', Validators.required],
    room: [''],
    effectiveFrom: [''],
    effectiveTo: [''],
    active: [true],
  });
  ngOnInit() {
    if (this.auth.hasRole('TEACHER'))
      this.dashboard.getTeacherDashboard().subscribe({
        next: (x) => {
          this.courses.set(
            x.myCourses.map((c) => ({
              id: c.courseId,
              code: c.courseCode,
              name: c.courseName,
              semester: '',
              academicYear: '',
              studyYear: 1,
              departmentId: '',
              departmentCode: '',
              departmentName: '',
              teacherId: x.teacherId,
              teacherUserId: '',
              teacherName: x.teacherName,
              enrollmentCount: c.enrolledStudents,
              createdAt: '',
              updatedAt: '',
            })),
          );
          this.load();
          this.initializeCancellation();
        },
        error: (e) => this.fail(e),
      });
    else
      this.academics.courses('', 0, 100).subscribe({
        next: (x) => {
          this.courses.set(x.content);
          this.load();
          this.initializeCancellation();
        },
        error: (e) => this.fail(e),
      });
  }

  private initializeCancellation() {
    this.cancellationForm.controls.courseId.setValue(this.courses()[0]?.id ?? '');
    this.loadCancellations();
  }

  loadCancellations() {
    const courseId = this.cancellationForm.controls.courseId.value;
    this.cancellationContext.set(null);
    this.cancellationError.set('');
    this.cancellationSuccess.set('');
    this.confirmCancellation.set(false);
    this.cancellationLoading.set(!!courseId);
    if (!courseId) return;
    this.api.cancellations(courseId).subscribe({
      next: (context) => {
        if (courseId !== this.cancellationForm.controls.courseId.value) return;
        this.cancellationContext.set(context);
        this.cancellationForm.controls.fromDate.setValue(context.today);
        this.cancellationLoading.set(false);
      },
      error: (e) => {
        if (courseId !== this.cancellationForm.controls.courseId.value) return;
        this.cancellationLoading.set(false);
        this.cancellationError.set(
          e.error?.message || 'Unable to load course cancellations. Please try again.',
        );
      },
    });
  }

  cancellationCourseName() {
    const course = this.courses().find(
      (c) => c.id === this.cancellationForm.controls.courseId.value,
    );
    return course ? `${course.code} — ${course.name}` : '';
  }

  reviewCancellation() {
    this.cancellationForm.markAllAsTouched();
    this.cancellationError.set('');
    this.cancellationSuccess.set('');
    const context = this.cancellationContext();
    const value = this.cancellationForm.getRawValue();
    if (!context || this.cancellationForm.invalid || !value.reason.trim()) {
      this.cancellationError.set('Select a course and enter a reason (up to 500 characters).');
      return;
    }
    if (value.scope === 'FUTURE' && (!value.fromDate || value.fromDate < context.today)) {
      this.cancellationError.set('The start date must be today or a future date.');
      return;
    }
    this.confirmCancellation.set(true);
  }

  cancelSchedule() {
    if (this.cancelling() || !this.confirmCancellation()) return;
    const value = this.cancellationForm.getRawValue();
    this.cancelling.set(true);
    this.cancellationError.set('');
    this.api
      .cancelCourse(value.courseId, {
        scope: value.scope,
        fromDate: value.scope === 'FUTURE' ? value.fromDate : null,
        reason: value.reason.trim(),
      })
      .subscribe({
        next: (result) => {
          const previous = this.cancellationContext()!;
          this.cancellationContext.set({
            ...previous,
            cancellations: [
              result.cancellation,
              ...previous.cancellations.filter((c) => c.id !== result.cancellation.id),
            ],
          });
          this.cancelling.set(false);
          this.confirmCancellation.set(false);
          this.cancellationForm.controls.reason.reset('');
          this.cancellationSuccess.set(
            `${value.scope === 'TODAY' ? "Today's attendance cancelled" : 'Future attendance stopped'}. ${result.cancelledSessions} scheduled or active sessions cancelled.`,
          );
          this.load();
        },
        error: (e) => {
          this.cancelling.set(false);
          this.cancellationError.set(e.error?.message || 'Cancellation failed. Please try again.');
        },
      });
  }
  load() {
    this.loading.set(true);
    this.api.list({ active: true, size: 100 }).subscribe({
      next: (x) => {
        const allowed = new Set(this.courses().map((c) => c.id));
        this.entries.set(
          this.auth.hasRole('TEACHER')
            ? x.content.filter((e) => allowed.has(e.courseId))
            : x.content,
        );
        this.loading.set(false);
      },
      error: (e) => this.fail(e),
    });
  }
  open(item?: TimetableEntry) {
    this.editing.set(item || null);
    this.form.reset(
      item
        ? {
            courseId: item.courseId,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime.slice(0, 5),
            endTime: item.endTime.slice(0, 5),
            room: item.room || '',
            effectiveFrom: item.effectiveFrom || '',
            effectiveTo: item.effectiveTo || '',
            active: item.active,
          }
        : {
            courseId: this.courses()[0]?.id || '',
            dayOfWeek: 'MONDAY',
            startTime: '08:30',
            endTime: '10:00',
            room: '',
            effectiveFrom: '',
            effectiveTo: '',
            active: true,
          },
    );
    this.modal.set(true);
  }
  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const body: TimetablePayload = {
      ...v,
      room: v.room || null,
      effectiveFrom: v.effectiveFrom || null,
      effectiveTo: v.effectiveTo || null,
    };
    const request = this.editing()
      ? this.api.update(this.editing()!.id, body)
      : this.api.create(body);
    request.subscribe({
      next: () => {
        this.modal.set(false);
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }
  remove(item: TimetableEntry) {
    if (confirm(`Delete ${item.courseCode} ${item.dayOfWeek} timetable?`))
      this.api.delete(item.id).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }
  private fail(e: any) {
    this.loading.set(false);
    this.error.set(
      e.status === 0
        ? 'Cannot reach the backend API.'
        : e.error?.message || 'The timetable operation failed.',
    );
  }
}
