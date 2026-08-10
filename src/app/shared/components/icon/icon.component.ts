import { Component, Input } from '@angular/core';

@Component({
  selector: 'sam-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name) {
        @case ('home') { <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/> }
        @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/> }
        @case ('user') { <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10"/> }
        @case ('teacher') { <path d="m2 7 10-5 10 5-10 5zM6 10v5c2 2 4 3 6 3s4-1 6-3v-5M22 7v6"/> }
        @case ('book') { <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 5.5v14"/> }
        @case ('building') { <path d="M3 21h18M6 21V6l6-3 6 3v15M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/> }
        @case ('calendar') { <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/> }
        @case ('clock') { <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/> }
        @case ('chart') { <path d="M3 3v18h18M7 16l4-5 3 3 5-7"/> }
        @case ('report') { <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/> }
        @case ('settings') { <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.07 14H3v-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.07V3h4v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.93 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15z"/> }
        @case ('search') { <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/> }
        @case ('menu') { <path d="M4 6h16M4 12h16M4 18h16"/> }
        @case ('logout') { <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/> }
        @case ('scan') { <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 11a4 4 0 0 1 8 0M9 17c.8-2 1.8-3 3-3s2.2 1 3 3M8 11h8"/> }
        @case ('camera') { <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"/><circle cx="12" cy="13" r="4"/> }
        @case ('check') { <path d="m5 12 4 4L19 6"/> }
        @case ('x') { <path d="M18 6 6 18M6 6l12 12"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
        @case ('arrow') { <path d="m9 18 6-6-6-6"/> }
        @case ('chevron') { <path d="m6 9 6 6 6-6"/> }
        @case ('refresh') { <path d="M20 7h-5V2M20 7a9 9 0 1 0 1 8"/> }
        @case ('info') { <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/> }
        @case ('more') { <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/> }
        @default { <circle cx="12" cy="12" r="9"/> }
      }
    </svg>
  `,
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class IconComponent {
  @Input() name = 'circle';
  @Input() size: number | string = 22;
}
