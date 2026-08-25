import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  HardwareDevice,
  HardwareDeviceCreatePayload,
  HardwareDeviceUpdatePayload,
  PageResponse,
} from '../models/api.models';
import { AuthService } from './auth.service';

export interface HardwareDeviceFilters {
  query?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
}

const now = new Date().toISOString();
const PREVIEW_DEVICES: HardwareDevice[] = [
  {
    id: 'hardware-preview-1',
    deviceId: 'CLASSROOM-01',
    name: 'Automation Lab Camera',
    room: 'Automation Lab',
    courseId: 'c1',
    courseCode: 'CSE-2103',
    courseName: 'Programming Fundamentals',
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'hardware-preview-2',
    deviceId: 'ROBOTICS-CAM-01',
    name: 'Robotics Lab Camera',
    room: 'Robotics Lab',
    courseId: null,
    courseCode: null,
    courseName: null,
    enabled: false,
    createdAt: now,
    updatedAt: now,
  },
];

@Injectable({ providedIn: 'root' })
export class HardwareDeviceService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly previewDevices = signal(PREVIEW_DEVICES);

  search(filters: HardwareDeviceFilters = {}): Observable<PageResponse<HardwareDevice>> {
    if (this.auth.isPreview()) {
      const query = filters.query?.trim().toLowerCase() || '';
      const rows = this.previewDevices().filter(
        (device) =>
          `${device.deviceId} ${device.name} ${device.room || ''}`.toLowerCase().includes(query) &&
          (filters.enabled === undefined || device.enabled === filters.enabled),
      );
      return of(this.page(rows, filters.page || 0, filters.size || 20)).pipe(delay(300));
    }
    let params = new HttpParams()
      .set('query', filters.query || '')
      .set('page', String(filters.page || 0))
      .set('size', String(filters.size || 20));
    if (filters.enabled !== undefined) params = params.set('enabled', String(filters.enabled));
    return this.http.get<PageResponse<HardwareDevice>>(`${environment.apiUrl}/hardware-devices`, {
      params,
    });
  }

  create(payload: HardwareDeviceCreatePayload): Observable<HardwareDevice> {
    if (this.auth.isPreview()) {
      const device: HardwareDevice = {
        id: crypto.randomUUID(),
        deviceId: payload.deviceId.trim().toUpperCase(),
        name: payload.name.trim(),
        room: payload.room,
        courseId: payload.courseId,
        courseCode: payload.courseId ? 'CSE-2103' : null,
        courseName: payload.courseId ? 'Programming Fundamentals' : null,
        enabled: payload.enabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.previewDevices.update((devices) => [device, ...devices]);
      return of(device).pipe(delay(300));
    }
    return this.http.post<HardwareDevice>(`${environment.apiUrl}/hardware-devices`, payload);
  }

  update(id: string, payload: HardwareDeviceUpdatePayload): Observable<HardwareDevice> {
    if (this.auth.isPreview()) {
      const previous = this.previewDevices().find((device) => device.id === id)!;
      const device: HardwareDevice = {
        ...previous,
        name: payload.name.trim(),
        room: payload.room,
        courseId: payload.courseId,
        courseCode: payload.courseId ? 'CSE-2103' : null,
        courseName: payload.courseId ? 'Programming Fundamentals' : null,
        enabled: payload.enabled,
        updatedAt: new Date().toISOString(),
      };
      this.previewDevices.update((devices) =>
        devices.map((item) => (item.id === id ? device : item)),
      );
      return of(device).pipe(delay(300));
    }
    return this.http.put<HardwareDevice>(`${environment.apiUrl}/hardware-devices/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    if (this.auth.isPreview()) {
      this.previewDevices.update((devices) => devices.filter((device) => device.id !== id));
      return of(undefined).pipe(delay(300));
    }
    return this.http.delete<void>(`${environment.apiUrl}/hardware-devices/${id}`);
  }

  private page<T>(rows: T[], page: number, size: number): PageResponse<T> {
    return {
      content: rows.slice(page * size, page * size + size),
      page,
      size,
      totalElements: rows.length,
      totalPages: Math.ceil(rows.length / size),
      first: page === 0,
      last: (page + 1) * size >= rows.length,
    };
  }
}
