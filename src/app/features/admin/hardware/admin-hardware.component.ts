import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Course,
  HardwareDevice,
  HardwareDeviceCreatePayload,
  HardwareDeviceUpdatePayload,
  PageResponse,
} from '../../../core/models/api.models';
import { AcademicService } from '../../../core/services/academic.service';
import {
  HardwareDeviceFilters,
  HardwareDeviceService,
} from '../../../core/services/hardware-device.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

interface DeviceCredential {
  deviceId: string;
  deviceName: string;
  key: string;
  rotated: boolean;
}

@Component({
  selector: 'app-admin-hardware',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, IconComponent],
  templateUrl: './admin-hardware.component.html',
  styleUrl: './admin-hardware.component.css',
})
export class AdminHardwareComponent implements OnInit {
  private readonly api = inject(HardwareDeviceService);
  private readonly academics = inject(AcademicService);
  private readonly fb = inject(FormBuilder);

  readonly devices = signal<PageResponse<HardwareDevice> | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly workingId = signal('');
  readonly error = signal('');
  readonly modalOpen = signal(false);
  readonly editing = signal<HardwareDevice | null>(null);
  readonly bindingError = signal('');
  readonly keyVisible = signal(false);
  readonly credential = signal<DeviceCredential | null>(null);
  readonly copied = signal(false);
  readonly page = signal(0);

  readonly filter = this.fb.nonNullable.group({
    query: [''],
    enabled: [''],
  });

  readonly form = this.fb.nonNullable.group({
    deviceId: [
      '',
      [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Za-z0-9._-]+$/)],
    ],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    deviceKey: ['', [Validators.required, Validators.minLength(16), Validators.maxLength(200)]],
    room: ['', Validators.maxLength(100)],
    courseId: [''],
    enabled: [true],
  });

  ngOnInit(): void {
    this.academics.courses('', 0, 100).subscribe({
      next: (response) => this.courses.set(response.content),
      error: (error) => this.fail(error, 'Courses could not be loaded.'),
    });
    this.load();
  }

  apply(): void {
    this.page.set(0);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.search(this.filters()).subscribe({
      next: (response) => {
        this.devices.set(response);
        this.page.set(response.page);
        this.loading.set(false);
      },
      error: (error) => this.fail(error, 'Hardware devices could not be loaded.'),
    });
  }

  open(device?: HardwareDevice): void {
    this.editing.set(device || null);
    this.bindingError.set('');
    this.keyVisible.set(false);
    this.copied.set(false);
    this.form.controls.deviceId.enable();
    this.form.reset({
      deviceId: device?.deviceId || '',
      name: device?.name || '',
      deviceKey: '',
      room: device?.room || '',
      courseId: device?.courseId || '',
      enabled: device?.enabled ?? true,
    });
    this.configureKeyValidation(!device);
    if (device) this.form.controls.deviceId.disable();
    this.modalOpen.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
    this.form.controls.deviceKey.setValue('');
    this.keyVisible.set(false);
  }

  save(): void {
    this.bindingError.set('');
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    if (!value.room.trim() && !value.courseId) {
      this.bindingError.set('Bind the device to a room, a course, or both.');
      return;
    }
    if (this.form.invalid || this.saving()) return;

    const key = value.deviceKey.trim();
    const device = this.editing();
    this.saving.set(true);
    this.error.set('');
    const request = device
      ? this.api.update(device.id, this.updatePayload(value, key))
      : this.api.create(this.createPayload(value, key));

    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.form.controls.deviceKey.setValue('');
        if (key) {
          this.credential.set({
            deviceId: saved.deviceId,
            deviceName: saved.name,
            key,
            rotated: !!device,
          });
          this.copied.set(false);
        }
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.fail(error, 'The hardware device could not be saved.');
      },
    });
  }

  toggle(device: HardwareDevice): void {
    if (this.workingId()) return;
    this.workingId.set(device.id);
    const payload: HardwareDeviceUpdatePayload = {
      name: device.name,
      room: device.room,
      courseId: device.courseId,
      newDeviceKey: null,
      enabled: !device.enabled,
    };
    this.api.update(device.id, payload).subscribe({
      next: () => {
        this.workingId.set('');
        this.load();
      },
      error: (error) => {
        this.workingId.set('');
        this.fail(error, 'The device status could not be changed.');
      },
    });
  }

  remove(device: HardwareDevice): void {
    if (
      !confirm(
        `Delete ${device.name} (${device.deviceId})? This device will no longer authenticate.`,
      )
    )
      return;
    this.workingId.set(device.id);
    this.api.delete(device.id).subscribe({
      next: () => {
        this.workingId.set('');
        if (this.devices()?.content.length === 1 && this.page() > 0)
          this.page.update((page) => page - 1);
        this.load();
      },
      error: (error) => {
        this.workingId.set('');
        this.fail(error, 'The hardware device could not be deleted.');
      },
    });
  }

  move(delta: number): void {
    const response = this.devices();
    const next = this.page() + delta;
    if (next < 0 || (response && next >= response.totalPages)) return;
    this.page.set(next);
    this.load();
  }

  generateKey(): void {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = btoa(String.fromCharCode(...bytes))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    this.form.controls.deviceKey.setValue(key);
    this.form.controls.deviceKey.markAsDirty();
    this.form.controls.deviceKey.updateValueAndValidity();
    this.keyVisible.set(true);
    this.copied.set(false);
  }

  async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(true);
    } catch {
      this.error.set('The key could not be copied. Select it and copy it manually.');
    }
  }

  dismissCredential(): void {
    this.credential.set(null);
    this.copied.set(false);
  }

  private configureKeyValidation(required: boolean): void {
    const validators = [Validators.minLength(16), Validators.maxLength(200)];
    this.form.controls.deviceKey.setValidators(
      required ? [Validators.required, ...validators] : validators,
    );
    this.form.controls.deviceKey.updateValueAndValidity();
  }

  private filters(): HardwareDeviceFilters {
    const value = this.filter.getRawValue();
    return {
      query: value.query.trim() || undefined,
      enabled: value.enabled === '' ? undefined : value.enabled === 'true',
      page: this.page(),
      size: 20,
    };
  }

  private createPayload(
    value: ReturnType<typeof this.form.getRawValue>,
    key: string,
  ): HardwareDeviceCreatePayload {
    return {
      deviceId: value.deviceId.trim(),
      name: value.name.trim(),
      deviceKey: key,
      room: value.room.trim() || null,
      courseId: value.courseId || null,
      enabled: value.enabled,
    };
  }

  private updatePayload(
    value: ReturnType<typeof this.form.getRawValue>,
    key: string,
  ): HardwareDeviceUpdatePayload {
    return {
      name: value.name.trim(),
      room: value.room.trim() || null,
      courseId: value.courseId || null,
      newDeviceKey: key || null,
      enabled: value.enabled,
    };
  }

  private fail(error: any, fallback: string): void {
    this.loading.set(false);
    this.error.set(
      error.status === 0 ? 'Cannot reach the backend API.' : error.error?.message || fallback,
    );
  }
}
