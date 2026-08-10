import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AttendanceRecord } from '../../../core/models/api.models';
import { AttendanceService } from '../../../core/services/attendance.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({ selector:'app-student-attendance', standalone:true, imports:[DatePipe, DecimalPipe, IconComponent], templateUrl:'./student-attendance.component.html', styleUrls:['./student-attendance.component.css','./student-attendance-detail.css'] })
export class StudentAttendanceComponent implements OnInit {
  private readonly service=inject(AttendanceService); readonly records=signal<AttendanceRecord[]>([]); readonly selected=signal<AttendanceRecord|null>(null); readonly loading=signal(true);
  ngOnInit():void{this.service.listMyAttendance().subscribe({next:p=>{this.records.set(p.content);this.loading.set(false)},error:()=>this.loading.set(false)})}
  view(id:string){this.service.getAttendance(id).subscribe(x=>this.selected.set(x))}
}
