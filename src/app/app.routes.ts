import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'admin', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN','TEACHER'] },
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: 'dashboard', canActivate: [roleGuard], data: { roles: ['ADMIN'] }, loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'teacher-dashboard', canActivate:[roleGuard], data: { roles:['TEACHER'], mode:'dashboard' }, loadComponent: () => import('./features/teacher/teacher-portal.component').then(m => m.TeacherPortalComponent) },
      { path: 'teacher-courses', canActivate:[roleGuard], data: { roles:['TEACHER'], mode:'courses' }, loadComponent: () => import('./features/teacher/teacher-portal.component').then(m => m.TeacherPortalComponent) },
      { path: 'users', canActivate: [roleGuard], data: { roles: ['ADMIN'] }, loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'teachers', canActivate:[roleGuard], data: { roles:['ADMIN'],role: 'TEACHER' }, loadComponent: () => import('./features/admin/people/admin-people.component').then(m => m.AdminPeopleComponent) },
      { path: 'students', canActivate:[roleGuard], data: { roles:['ADMIN'],role: 'STUDENT' }, loadComponent: () => import('./features/admin/people/admin-people.component').then(m => m.AdminPeopleComponent) },
      { path: 'departments', canActivate:[roleGuard], data: { roles:['ADMIN'],mode: 'departments' }, loadComponent: () => import('./features/admin/academic/admin-academic.component').then(m => m.AdminAcademicComponent) },
      { path: 'courses', canActivate:[roleGuard], data: { roles:['ADMIN'],mode: 'courses' }, loadComponent: () => import('./features/admin/academic/admin-academic.component').then(m => m.AdminAcademicComponent) },
      { path: 'enrollments', canActivate:[roleGuard], data: { roles:['ADMIN'],mode: 'enrollments' }, loadComponent: () => import('./features/admin/academic/admin-academic.component').then(m => m.AdminAcademicComponent) },
      { path: 'assignments', canActivate:[roleGuard], data: { roles:['ADMIN'] }, loadComponent: () => import('./features/admin/assignments/department-assignments.component').then(m => m.DepartmentAssignmentsComponent) },
      { path: 'timetables', loadComponent: () => import('./features/admin/timetable/admin-timetable.component').then(m => m.AdminTimetableComponent) },
      { path: 'sessions', data: { mode: 'sessions' }, loadComponent: () => import('./features/admin/attendance/admin-attendance.component').then(m => m.AdminAttendanceComponent) },
      { path: 'records', data: { mode: 'records' }, loadComponent: () => import('./features/admin/attendance/admin-attendance.component').then(m => m.AdminAttendanceComponent) },
      { path: 'reports', data: { mode: 'reports' }, loadComponent: () => import('./features/admin/attendance/admin-attendance.component').then(m => m.AdminAttendanceComponent) },
      { path: 'analytics', canActivate:[roleGuard], data: { roles:['ADMIN'],mode: 'analytics' }, loadComponent: () => import('./features/admin/attendance/admin-attendance.component').then(m => m.AdminAttendanceComponent) },
      { path: 'settings', canActivate:[roleGuard], data:{roles:['ADMIN'],mode:'settings'}, loadComponent:()=>import('./features/admin/system/admin-system.component').then(m=>m.AdminSystemComponent) },
      { path: 'audit', canActivate:[roleGuard], data:{roles:['ADMIN'],mode:'audit'}, loadComponent:()=>import('./features/admin/system/admin-system.component').then(m=>m.AdminSystemComponent) },
      { path: 'roles', pathMatch:'full', redirectTo:'users' },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  {
    path: 'student', canActivate: [authGuard, roleGuard], data: { roles: ['STUDENT'] },
    loadComponent: () => import('./layouts/student-layout/student-layout.component').then(m => m.StudentLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent) },
      { path: 'sessions', loadComponent: () => import('./features/student/sessions/student-sessions.component').then(m => m.StudentSessionsComponent) },
      { path: 'scan/:sessionId', loadComponent: () => import('./features/student/scan/student-scan.component').then(m => m.StudentScanComponent) },
      { path: 'scan', loadComponent: () => import('./features/student/scan/student-scan.component').then(m => m.StudentScanComponent) },
      { path: 'attendance', loadComponent: () => import('./features/student/attendance/student-attendance.component').then(m => m.StudentAttendanceComponent) },
      { path: 'courses', loadComponent: () => import('./features/student/courses/student-courses.component').then(m => m.StudentCoursesComponent) },
      { path: 'profile', loadComponent: () => import('./features/student/profile/student-profile.component').then(m => m.StudentProfileComponent) },
      { path: 'timetable', loadComponent: () => import('./features/student/timetable/student-timetable.component').then(m => m.StudentTimetableComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
