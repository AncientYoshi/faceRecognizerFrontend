import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AttendanceRecord, StudentDashboard } from '../../../core/models/api.models';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StudentService } from '../../../core/services/student.service';

@Component({
  selector: 'app-student-dashboard', standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, IconComponent],
  templateUrl: './student-dashboard.component.html', styleUrl: './student-dashboard.component.css',
})
export class StudentDashboardComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly dashboards = inject(DashboardService);
  readonly auth = inject(AuthService);
  readonly student = inject(StudentService);
  readonly dashboard = signal<StudentDashboard|null>(null);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly today = new Date();
  readonly sessions = computed(()=>this.dashboard()?.todaySessions||[]);
  readonly overallPercentage = computed(()=>this.dashboard()?.overallAttendancePercentage||0);
  readonly meetsThreshold = computed(()=>this.overallPercentage()>=(this.dashboard()?.requiredAttendancePercentage||0));
  readonly hasAttendance = computed(()=>(this.dashboard()?.eligibleSessions||0)>0);
  readonly progressStyle = computed(()=>`${Math.min(100,Math.max(0,this.overallPercentage()))}%`);

  ngOnInit(): void {
    this.dashboards.getStudentDashboard(this.localDate(this.today)).subscribe({
      next: dashboard => { this.dashboard.set(dashboard); this.loading.set(false); },
      error: error => {
        this.error.set(error.status===0?'Cannot reach the backend API.':error.error?.message||'Your dashboard could not be loaded.');
        this.loading.set(false);
      },
    });
    this.attendance.listMyAttendance().subscribe({ next: page => this.records.set(page.content), error: () => this.records.set([]) });
  }

  private localDate(date:Date):string{return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10)}
}
