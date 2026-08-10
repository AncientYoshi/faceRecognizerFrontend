import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Course } from '../../../core/models/api.models';
import { StudentService } from '../../../core/services/student.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-student-courses',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './student-courses.component.html',
  styleUrl: './student-courses.component.css',
})
export class StudentCoursesComponent implements OnInit {
  readonly student = inject(StudentService);
  readonly courses = signal<Course[]>([]);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filteredCourses = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.courses();
    return this.courses().filter(course =>
      `${course.code} ${course.name} ${course.teacherName} ${course.departmentName}`.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void { this.load(); }

  load(force = false): void {
    this.loading.set(true);
    this.error.set('');
    this.student.getMyCourses(force).subscribe({
      next: page => { this.courses.set(page.content); this.loading.set(false); },
      error: error => {
        this.loading.set(false);
        this.error.set(error.status === 0 ? 'Cannot reach the backend API.' : (error.error?.message || 'Could not load your enrolled courses.'));
      },
    });
  }

  updateQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); }
}
