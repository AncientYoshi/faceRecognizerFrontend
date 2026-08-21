import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AttendanceAdminService,
  AttendanceFilters,
  StudentPercentageFilters,
} from '../../../core/services/attendance-admin.service';
import { AcademicService } from '../../../core/services/academic.service';
import { UserService } from '../../../core/services/user.service';
import { DashboardService, PREVIEW_DASHBOARD } from '../../../core/services/dashboard.service';
import {
  AttendanceRecord,
  AttendanceReport,
  AttendanceSession,
  Course,
  Department,
  SessionPayload,
  UserSummary,
  AdminDashboardView,
  StudentAttendancePercentage,
  StudentAttendancePercentageReport,
} from '../../../core/models/api.models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin } from 'rxjs';
type Mode = 'sessions' | 'records' | 'reports' | 'analytics';
interface RollCallColumn {
  sessionId: string;
  sessionDate: string;
  callNumber: number;
}
@Component({
  selector: 'app-admin-attendance',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, IconComponent],
  templateUrl: './admin-attendance.component.html',
  styleUrl: './admin-attendance.component.css',
})
export class AdminAttendanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AttendanceAdminService);
  private academics = inject(AcademicService);
  private users = inject(UserService);
  private dashboards = inject(DashboardService);
  private fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly mode = this.route.snapshot.data['mode'] as Mode;
  readonly title =
    this.mode === 'sessions'
      ? 'Attendance Sessions'
      : this.mode === 'records'
        ? 'Attendance Records'
        : this.mode === 'reports'
          ? this.auth.hasRole('TEACHER') ? 'Student Attendance Record' : 'Reports'
          : 'Analytics';
  readonly sessions = signal<AttendanceSession[]>([]);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly students = signal<UserSummary[]>([]);
  readonly report = signal<AttendanceReport | null>(null);
  readonly percentageReport = signal<StudentAttendancePercentageReport | null>(null);
  readonly percentageRows = signal<StudentAttendancePercentage[]>([]);
  readonly percentagePage = signal(0);
  readonly rollCallColumns = signal<RollCallColumn[]>([]);
  readonly presentRollCalls = signal<Set<string>>(new Set());
  readonly analytics = signal<AdminDashboardView>(PREVIEW_DASHBOARD);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modal = signal(false);
  readonly editing = signal<AttendanceSession | null>(null);
  readonly saving = signal(false);
  private pendingCreate: { signature: string; key: string } | null = null;
  private teacherId = signal('');
  filter = this.fb.nonNullable.group({
    courseId: [''],
    studentId: [''],
    departmentId: [''],
    sessionId: [''],
    date: [''],
    status: [''],
    month: [''],
    from: [''],
    to: [''],
    period: ['MONTH' as 'WEEK' | 'MONTH'],
    referenceDate: [this.today()],
    studyYear: [''],
    query: [''],
  });
  sessionForm = this.fb.nonNullable.group({
    courseId: ['', Validators.required],
    sessionDate: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    rollCallCount: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
  });
  ngOnInit() {
    if (this.auth.hasRole('TEACHER'))
      this.dashboards.getTeacherDashboard().subscribe({
        next: (x) => {
          this.teacherId.set(x.teacherId);
          const summaries: Course[] = x.myCourses.map((c) => ({
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
            }));
          this.courses.set(summaries);
          this.academics.courses('',0,100,{teacherId:x.teacherId}).subscribe({
            next: result => {
              const assigned = new Set(x.myCourses.map(course => course.courseId));
              const courses = result.content.filter(course => assigned.has(course.id));
              this.courses.set(courses.length ? courses : summaries);
              this.selectInitialReportCourse();
              this.load();
            },
            error: () => {
              this.selectInitialReportCourse();
              this.load();
            },
          });
        },
        error: (e) => this.fail(e),
      });
    else {
      this.academics.courses('', 0, 100).subscribe((x) => this.courses.set(x.content));
      this.academics.departments('', 0, 100).subscribe((x) => this.departments.set(x.content));
      this.users
        .listAll()
        .subscribe((x) => this.students.set(x.filter((u) => u.roles.includes('STUDENT'))));
      this.load();
    }
  }
  selectCourse(courseId: string) {
    const course = this.courses().find(item => item.id === courseId);
    this.filter.patchValue({
      courseId,
      studyYear: course?.studyYear ? String(course.studyYear) : '',
    });
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    if (this.mode === 'sessions')
      this.api
        .sessions({
          ...this.clean(),
          ...(this.teacherId() ? { teacherId: this.teacherId() } : {}),
          page: 0,
          size: 100,
        })
        .subscribe({
          next: (x) => {
            this.sessions.set(x.content);
            this.loading.set(false);
          },
          error: (e) => this.fail(e),
        });
    else if (this.mode === 'records')
      this.api.records({ ...this.clean(), page: 0, size: 100 }).subscribe({
        next: (x) => {
          this.records.set(x.content);
          this.loading.set(false);
        },
        error: (e) => this.fail(e),
      });
    else if (this.mode === 'reports') {
      if (this.auth.hasRole('TEACHER')) {
        this.percentagePage.set(0);
        this.loadStudentPercentages();
      }
      else
        this.api.report({ ...this.reportFilters(), page: 0, size: 100 }).subscribe({
          next: (x) => {
            this.report.set(x);
            this.records.set(x.records.content);
            this.loading.set(false);
          },
          error: (e) => this.fail(e),
        });
    }
    else
      this.dashboards.getAdminDashboard().subscribe({
        next: (x) => {
          this.analytics.set(x);
          this.loading.set(false);
        },
        error: (e) => this.fail(e),
      });
  }
  open(session?: AttendanceSession) {
    if (this.saving()) return;
    this.pendingCreate = null;
    this.editing.set(session || null);
    if (session)
      this.sessionForm.reset({
        courseId: session.courseId,
        sessionDate: session.sessionDate,
        startTime: this.local(session.startTime),
        endTime: this.local(session.endTime),
        rollCallCount: session.rollCallCount,
      });
    else {
      const now = new Date(),
        later = new Date(now.getTime() + 3600000);
      this.sessionForm.reset({
        courseId: this.courses()[0]?.id || '',
        sessionDate: now.toISOString().slice(0, 10),
        startTime: this.local(now.toISOString()),
        endTime: this.local(later.toISOString()),
        rollCallCount: 1,
      });
    }
    this.modal.set(true);
  }
  save() {
    if (this.sessionForm.invalid || this.saving()) return;
    const v = this.sessionForm.getRawValue();
    const body: SessionPayload = {
      courseId: v.courseId,
      sessionDate: v.sessionDate,
      startTime: new Date(v.startTime).toISOString(),
      endTime: new Date(v.endTime).toISOString(),
      rollCallCount: v.rollCallCount,
    };
    this.saving.set(true);
    const req = this.editing()
      ? this.api.updateSession(this.editing()!.id, body)
      : this.api.createSession(body, this.idempotencyKeyFor(body));
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.pendingCreate = null;
        this.modal.set(false);
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.fail(e);
      },
    });
  }
  action(s: AttendanceSession, a: 'start' | 'close' | 'cancel') {
    this.api.action(s.id, a).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }
  remove(s: AttendanceSession) {
    if (confirm(`Delete ${s.courseName} session?`))
      this.api
        .deleteSession(s.id)
        .subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }
  download(format: 'pdf' | 'excel') {
    const request = this.auth.hasRole('TEACHER')
      ? this.api.exportStudentPercentages(format, this.percentageFilters(false))
      : this.api.export(format, this.reportFilters());
    request.subscribe({
      next: (r) => {
        const cd = r.headers.get('content-disposition') || '';
        const name =
          /filename="?([^";]+)"?/.exec(cd)?.[1] ||
          `${this.auth.hasRole('TEACHER') ? 'student-attendance-percentages' : 'attendance-report'}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        const url = URL.createObjectURL(r.body!);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e) => this.fail(e),
    });
  }
  movePercentage(delta: number) {
    const report = this.percentageReport();
    const next = this.percentagePage() + delta;
    if (next < 0 || (report && next >= report.students.totalPages)) return;
    this.percentagePage.set(next);
    this.loadStudentPercentages();
  }
  bar(value: number) {
    const max = Math.max(
      ...this.analytics().departmentStatistics.map((x) => x.attendanceRecords),
      1,
    );
    return Math.max(4, Math.round((value / max) * 100));
  }
  attendanceMark(studentId: string, column: RollCallColumn) {
    return this.presentRollCalls().has(`${column.sessionId}:${studentId}`) ? 'P' : 'A';
  }
  selectedCourseInfo() {
    return this.courses().find(course => course.id === this.filter.controls.courseId.value);
  }
  studyYearLabel(year: number | string | undefined) {
    const labels = ['','First Year','Second Year','Third Year','Fourth Year','Fifth Year','Sixth Year'];
    return labels[Number(year)] || 'Unassigned';
  }
  private clean(): AttendanceFilters {
    const v = this.filter.getRawValue();
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x));
  }
  private reportFilters(): AttendanceFilters {
    const v = this.clean();
    if (v.month) {
      delete v.from;
      delete v.to;
    } else delete v.month;
    return v;
  }
  private loadStudentPercentages() {
    this.api.studentPercentages(this.percentageFilters(true)).subscribe({
      next: (x) => {
        this.percentageReport.set(x);
        this.percentageRows.set(x.students.content);
        this.percentagePage.set(x.students.page);
        this.loadRegisterData(x);
      },
      error: (e) => this.fail(e),
    });
  }
  private percentageFilters(paged: boolean): StudentPercentageFilters {
    const v = this.filter.getRawValue();
    return {
      period: v.period,
      date: v.referenceDate || this.today(),
      courseId: v.courseId || undefined,
      studyYear: v.studyYear ? Number(v.studyYear) : undefined,
      query: v.query.trim() || undefined,
      ...(paged ? { page: this.percentagePage(), size: 20 } : {}),
    };
  }
  private loadRegisterData(report: StudentAttendancePercentageReport) {
    const courseId = this.filter.controls.courseId.value;
    if (!courseId) {
      this.rollCallColumns.set([]);
      this.presentRollCalls.set(new Set());
      this.loading.set(false);
      return;
    }
    forkJoin({
      sessions: this.api.allSessions({ courseId }),
      records: this.api.allRecords({ courseId }),
    }).subscribe({
      next: ({ sessions, records }) => {
        const now = Date.now();
        const eligible = sessions
          .filter(session =>
            session.sessionDate >= report.from &&
            session.sessionDate <= report.to &&
            session.status !== 'CANCELLED' &&
            new Date(session.startTime).getTime() <= now &&
            (session.status === 'CLOSED' || new Date(session.endTime).getTime() <= now))
          .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        this.rollCallColumns.set(eligible.flatMap(session =>
          Array.from({length: session.rollCallCount}, (_,index) => ({
            sessionId: session.id,
            sessionDate: session.sessionDate,
            callNumber: index + 1,
          }))));
        const sessionIds = new Set(eligible.map(session => session.id));
        this.presentRollCalls.set(new Set(records
          .filter(record => sessionIds.has(record.sessionId) && record.status === 'PRESENT')
          .map(record => `${record.sessionId}:${record.studentId}`)));
        this.loading.set(false);
      },
      error: error => this.fail(error),
    });
  }
  private selectInitialReportCourse() {
    if (this.mode !== 'reports' || !this.courses().length) return;
    this.selectCourse(this.courses()[0].id);
  }
  private today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  private local(iso: string) {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  private idempotencyKeyFor(body: SessionPayload): string {
    const signature = JSON.stringify(body);
    if (!this.pendingCreate || this.pendingCreate.signature !== signature) {
      this.pendingCreate = { signature, key: crypto.randomUUID() };
    }
    return this.pendingCreate.key;
  }
  private fail(e: any) {
    this.loading.set(false);
    this.error.set(
      e.status === 0
        ? 'Cannot reach the backend API.'
        : e.error?.message || 'The operation could not be completed.',
    );
  }
}
