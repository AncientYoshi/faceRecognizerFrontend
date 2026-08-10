import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AttendanceSession, AttendanceVerification } from '../../../core/models/api.models';
import { AttendanceService } from '../../../core/services/attendance.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type ScanState = 'idle' | 'camera' | 'verifying' | 'success' | 'failed';

@Component({
  selector: 'app-student-scan', standalone: true,
  imports: [DatePipe, PercentPipe, RouterLink, IconComponent],
  templateUrl: './student-scan.component.html', styleUrl: './student-scan.component.css',
})
export class StudentScanComponent implements OnInit, OnDestroy {
  @ViewChild('camera') camera?: ElementRef<HTMLVideoElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attendance = inject(AttendanceService);
  private mediaStream?: MediaStream;

  readonly state = signal<ScanState>('idle');
  readonly session = signal<AttendanceSession | null>(null);
  readonly result = signal<AttendanceVerification | null>(null);
  readonly errorMessage = signal('');
  readonly cameraSupported = !!navigator.mediaDevices?.getUserMedia;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId');
    if (id) this.attendance.getSession(id).subscribe(session => this.session.set(session));
    else this.attendance.listSessions(new Date().toISOString().slice(0,10)).subscribe(page => this.session.set(page.content.find(s => s.status === 'ACTIVE') ?? page.content[0] ?? null));
  }

  async startCamera(): Promise<void> {
    this.errorMessage.set('');
    if (!this.session()) { this.errorMessage.set('No attendance session is available.'); return; }
    if (!this.cameraSupported) { this.fail('This browser does not support camera access.'); return; }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      this.state.set('camera');
      setTimeout(() => {
        if (this.camera?.nativeElement && this.mediaStream) {
          this.camera.nativeElement.srcObject = this.mediaStream;
          this.camera.nativeElement.play().catch(() => undefined);
        }
      });
    } catch {
      this.fail('Camera permission was denied. Allow camera access in your browser and try again.');
    }
  }

  captureAndVerify(): void {
    const video = this.camera?.nativeElement;
    const sessionId = this.session()?.id;
    if (!video || !sessionId || !video.videoWidth) { this.fail('The camera is not ready yet. Please wait a moment.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.state.set('verifying');
    this.stopCamera();
    canvas.toBlob(blob => {
      if (!blob) { this.fail('Could not capture an image. Please try again.'); return; }
      this.attendance.verify(sessionId, blob).subscribe({
        next: result => { this.result.set(result); this.state.set(result.matched ? 'success' : 'failed'); if (!result.matched) this.errorMessage.set(result.message); },
        error: error => this.fail(error.error?.message || 'Verification failed. Check the AI service and try again.'),
      });
    }, 'image/jpeg', .9);
  }

  cancel(): void { this.stopCamera(); this.state.set('idle'); }
  tryAgain(): void { this.result.set(null); this.errorMessage.set(''); this.state.set('idle'); }
  continue(): void { this.router.navigateByUrl('/student/attendance'); }
  ngOnDestroy(): void { this.stopCamera(); }

  private fail(message: string): void { this.stopCamera(); this.errorMessage.set(message); this.state.set('failed'); }
  private stopCamera(): void { this.mediaStream?.getTracks().forEach(track => track.stop()); this.mediaStream = undefined; }
}
