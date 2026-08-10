import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AttendanceSession } from '../../../core/models/api.models';
import { AttendanceService } from '../../../core/services/attendance.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StudentService } from '../../../core/services/student.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-student-sessions', standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, IconComponent],
  templateUrl: './student-sessions.component.html', styleUrl: './student-sessions.component.css',
})
export class StudentSessionsComponent implements OnInit {
  private readonly service = inject(AttendanceService);
  private readonly student = inject(StudentService);
  readonly sessions = signal<AttendanceSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  selectedDate = new Date().toISOString().slice(0,10);

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ sessions: this.service.listSessions(this.selectedDate), courses: this.student.getMyCourses() }).subscribe({
      next: ({ sessions, courses }) => {
        const enrolledCourseIds = new Set(courses.content.map(course => course.id));
        this.sessions.set(sessions.content.filter(session => enrolledCourseIds.has(session.courseId)));
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(error.status === 0 ? 'Cannot reach the backend API.' : (error.error?.message || 'Could not load your attendance sessions.'));
      },
    });
  }
  canVerify(session: AttendanceSession): boolean { return session.status === 'ACTIVE'; }
}
