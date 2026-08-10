# Smart Attendance Frontend

Responsive Angular portal for the Smart Attendance Spring Boot API. The current delivery includes authentication, role-aware navigation, admin, teacher, and student dashboards, attendance sessions, webcam face capture/verification, face registration, course rosters, reports, and attendance history.

## Run locally

Requirements: Node.js 20.19+, 22.12+, or 24 LTS.

```bash
npm install
npm start
```

Open `http://localhost:4200`. The default configuration connects to the deployed API at `https://smart-attendance-api.duckdns.org`.

To work against a Spring Boot server running at `http://localhost:8080`, use:

```bash
npm run start:local
```

The deployed and local API base URLs are configured in `src/environments/environment.ts` and `src/environments/environment.local.ts`, respectively.

The login page also contains Admin, Teacher, and Student preview buttons. Preview mode uses local sample data, never sends API requests, and is intended only for reviewing the responsive UI without running the backend.

## Implemented API integration

- `POST /auth/login`, `POST /auth/logout`, and `GET /me`
- `GET /dashboard/admin` and `GET /dashboard/teacher`
- `GET /users` and `GET /courses`
- `GET /roles` and complete `/users` create, read, update, delete management
- Complete `/departments` and `/courses` CRUD management
- Department teacher/student assignment and unassignment APIs
- Searchable assigned-member lists through `GET /departments/{id}/teachers` and `GET /departments/{id}/students`
- Course enrollment listing, enrollment, and removal APIs
- Complete `/timetables` CRUD plus `GET /students/me/timetable`
- Attendance session CRUD plus start, close, and cancel lifecycle actions
- Attendance record filtering and attendance report PDF/Excel exports
- Teacher weekly/monthly per-student attendance percentages with paged search and PDF/Excel exports
- Dashboard-backed attendance analytics by department
- `GET /attendance-sessions` and `GET /attendance-sessions/{id}`
- `GET /students/me` and `GET /students/{studentId}/courses`
- `GET /students/{studentId}/face` and multipart `POST /students/{studentId}/face/register`
- `POST /attendance/verify?sessionId={id}` as multipart form data (`image`)
- `GET /attendance` using the backend's student role scoping
- `GET /attendance/{id}` record detail
- `GET /audit-logs` with action, user, and date filters
- Complete `/system-settings` list, detail, and update integration
- Automatic access-token renewal through `POST /auth/refresh`

The student portal resolves the authenticated student profile through `/students/me`, caches it for the active user, loads enrolled courses with the returned `studentId`, and filters attendance sessions to those course IDs.

The teacher portal loads its identity, dashboard totals, assigned courses, and today's sessions through `/dashboard/teacher`; retrieves each course roster through `/courses/{courseId}/enrollments`; and exposes teacher-scoped timetable and attendance management, records, reports, and exports. Notification UI has been removed because the backend contract does not expose a notification API.

## Quality checks

```bash
npm test -- --watch=false
npm run build
```

The layout has desktop, tablet, and phone breakpoints, collapsible navigation, reduced-motion handling, camera permission errors, empty states, loading states, and API fallback states.
