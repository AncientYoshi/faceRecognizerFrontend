import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminDashboardView } from '../../../core/models/api.models';
import { DashboardService, PREVIEW_DASHBOARD } from '../../../core/services/dashboard.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TitleCasePipe, RouterLink, IconComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly dashboard = signal<AdminDashboardView>(PREVIEW_DASHBOARD);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.service.getAdminDashboard().subscribe(data => { this.dashboard.set(data); this.loading.set(false); });
  }

  initials(first: string, last: string): string { return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase(); }
  totalDepartmentValue(): number { return this.dashboard().departmentStatistics.reduce((total, d) => total + d.attendanceRecords, 0) || 1; }
  deptPercent(value: number): number { return Math.round(value / this.totalDepartmentValue() * 100); }
}
