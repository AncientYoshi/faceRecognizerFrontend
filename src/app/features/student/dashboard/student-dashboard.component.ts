import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AttendanceRecord, AttendanceSession, Course } from '../../../core/models/api.models';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StudentService } from '../../../core/services/student.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-student-dashboard', standalone: true,
  imports: [DatePipe, RouterLink, IconComponent],
  templateUrl: './student-dashboard.component.html', styleUrl: './student-dashboard.component.css',
})
export class StudentDashboardComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  readonly auth = inject(AuthService);
  readonly student = inject(StudentService);
  readonly sessions = signal<AttendanceSession[]>([]);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly today = new Date();

  ngOnInit(): void {
    forkJoin({
      sessions: this.attendance.listSessions(this.today.toISOString().slice(0,10)),
      courses: this.student.getMyCourses(),
    }).subscribe({
      next: ({ sessions, courses }) => {
        this.courses.set(courses.content);
        const enrolledCourseIds = new Set(courses.content.map(course => course.id));
        this.sessions.set(sessions.content.filter(session => enrolledCourseIds.has(session.courseId)));
      },
      error: () => { this.sessions.set([]); this.courses.set([]); },
    });
    this.attendance.listMyAttendance().subscribe({ next: page => this.records.set(page.content), error: () => this.records.set([]) });
  }
}
