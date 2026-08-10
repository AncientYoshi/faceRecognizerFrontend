import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StudentService } from '../../core/services/student.service';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './student-layout.component.html',
  styleUrl: './student-layout.component.css',
})
export class StudentLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly student = inject(StudentService);
  readonly menuOpen = signal(false);

  ngOnInit(): void {
    this.student.getMyProfile().subscribe({ error: () => undefined });
  }
}
