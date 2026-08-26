import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AttendanceAdminService,
  TeacherOverallAttendanceFilters,
} from '../../../core/services/attendance-admin.service';
import {
  StudentAttendancePeriod,
  TeacherCohortAttendanceReport,
  TeacherStudentOverallAttendance,
} from '../../../core/models/api.models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-teacher-overall-attendance',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, IconComponent],
  templateUrl: './teacher-overall-attendance.component.html',
  styleUrl: './teacher-overall-attendance.component.css',
})
export class TeacherOverallAttendanceComponent implements OnInit {
  private readonly api = inject(AttendanceAdminService);
  private readonly fb = inject(FormBuilder);

  readonly report = signal<TeacherCohortAttendanceReport | null>(null);
  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly error = signal('');
  readonly page = signal(0);
  readonly years = [1, 2, 3, 4, 5, 6];

  readonly filter = this.fb.nonNullable.group({
    studyYear: [5],
    period: ['ALL' as StudentAttendancePeriod],
    date: [this.today()],
    query: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  apply(): void {
    this.page.set(0);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.studentOverallAttendance(this.filters()).subscribe({
      next: (report) => {
        this.report.set(report);
        this.page.set(report.students.page);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(
          error.status === 0
            ? 'Cannot reach the backend API.'
            : error.error?.message || 'Overall attendance could not be loaded.',
        );
      },
    });
  }

  move(delta: number): void {
    const current = this.report();
    const next = this.page() + delta;
    if (next < 0 || (current && next >= current.students.totalPages)) return;
    this.page.set(next);
    this.load();
  }

  downloadExcel(): void {
    if (this.downloading()) return;

    this.downloading.set(true);
    this.error.set('');
    this.api
      .exportStudentOverallAttendance(this.filters())
      .pipe(finalize(() => this.downloading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.body?.size) {
            this.error.set('The downloaded attendance workbook was empty.');
            return;
          }

          const url = URL.createObjectURL(response.body);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.downloadFilename(response.headers.get('content-disposition'));
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (error) => {
          this.error.set(
            error.status === 0
              ? 'Cannot reach the backend API.'
              : error.error?.message || 'The attendance workbook could not be downloaded.',
          );
        },
      });
  }

  yearLabel(year: number): string {
    return (
      ['', 'First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year', 'Sixth Year'][
        year
      ] || `Year ${year}`
    );
  }

  periodLabel(period: StudentAttendancePeriod): string {
    return period === 'ALL' ? 'All time' : period === 'MONTH' ? 'Monthly' : 'Weekly';
  }

  rangeLabel(report: TeacherCohortAttendanceReport): string {
    return report.period === 'ALL'
      ? `Through ${this.readableDate(report.to)}`
      : `${this.readableDate(report.from)} – ${this.readableDate(report.to)}`;
  }

  rateClass(row: TeacherStudentOverallAttendance): string {
    return row.overallAttendancePercentage >= 75
      ? 'good'
      : row.overallAttendancePercentage >= 60
        ? 'warning'
        : 'risk';
  }

  trackStudent(_: number, row: TeacherStudentOverallAttendance): string {
    return row.studentId;
  }

  private filters(): TeacherOverallAttendanceFilters {
    const value = this.filter.getRawValue();
    return {
      studyYear: Number(value.studyYear),
      period: value.period,
      date: value.date || this.today(),
      query: value.query.trim() || undefined,
      page: this.page(),
      size: 20,
    };
  }

  private readableDate(value: string): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private downloadFilename(contentDisposition: string | null): string {
    const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition || '')?.[1];
    const plainName = /filename="?([^";]+)"?/i.exec(contentDisposition || '')?.[1];
    let filename = plainName;

    if (encodedName) {
      try {
        filename = decodeURIComponent(encodedName);
      } catch {
        filename = encodedName;
      }
    }

    return (
      filename ||
      `overall-attendance-year-${this.filter.controls.studyYear.value}-${this.filter.controls.date.value || this.today()}.xlsx`
    ).replace(/[\\/]/g, '-');
  }

  private today(): string {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
}
