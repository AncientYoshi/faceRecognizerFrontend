import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TimetableService } from '../../../core/services/timetable.service';
import { Course, DayOfWeek, TimetableEntry, TimetablePayload } from '../../../core/models/api.models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({selector:'app-admin-timetable',standalone:true,imports:[ReactiveFormsModule,IconComponent],templateUrl:'./admin-timetable.component.html',styleUrl:'./admin-timetable.component.css'})
export class AdminTimetableComponent implements OnInit{
  private api=inject(TimetableService);private academics=inject(AcademicService);private dashboard=inject(DashboardService);readonly auth=inject(AuthService);private fb=inject(FormBuilder);
  readonly entries=signal<TimetableEntry[]>([]);readonly courses=signal<Course[]>([]);readonly loading=signal(true);readonly error=signal('');readonly modal=signal(false);readonly editing=signal<TimetableEntry|null>(null);readonly days:DayOfWeek[]=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
  form=this.fb.nonNullable.group({courseId:['',Validators.required],dayOfWeek:['MONDAY' as DayOfWeek,Validators.required],startTime:['08:30',Validators.required],endTime:['10:00',Validators.required],room:[''],effectiveFrom:[''],effectiveTo:[''],active:[true]});
  ngOnInit(){if(this.auth.hasRole('TEACHER'))this.dashboard.getTeacherDashboard().subscribe(x=>{this.courses.set(x.myCourses.map(c=>({id:c.courseId,code:c.courseCode,name:c.courseName,semester:'',academicYear:'',studyYear:1,departmentId:'',departmentCode:'',departmentName:'',teacherId:x.teacherId,teacherUserId:'',teacherName:x.teacherName,enrollmentCount:c.enrolledStudents,createdAt:'',updatedAt:''})));this.load()});else this.academics.courses('',0,100).subscribe(x=>{this.courses.set(x.content);this.load()})}
  load(){this.loading.set(true);this.api.list({active:true,size:100}).subscribe({next:x=>{const allowed=new Set(this.courses().map(c=>c.id));this.entries.set(this.auth.hasRole('TEACHER')?x.content.filter(e=>allowed.has(e.courseId)):x.content);this.loading.set(false)},error:e=>this.fail(e)})}
  open(item?:TimetableEntry){this.editing.set(item||null);this.form.reset(item?{courseId:item.courseId,dayOfWeek:item.dayOfWeek,startTime:item.startTime.slice(0,5),endTime:item.endTime.slice(0,5),room:item.room||'',effectiveFrom:item.effectiveFrom||'',effectiveTo:item.effectiveTo||'',active:item.active}:{courseId:this.courses()[0]?.id||'',dayOfWeek:'MONDAY',startTime:'08:30',endTime:'10:00',room:'',effectiveFrom:'',effectiveTo:'',active:true});this.modal.set(true)}
  save(){if(this.form.invalid)return;const v=this.form.getRawValue();const body:TimetablePayload={...v,room:v.room||null,effectiveFrom:v.effectiveFrom||null,effectiveTo:v.effectiveTo||null};const request=this.editing()?this.api.update(this.editing()!.id,body):this.api.create(body);request.subscribe({next:()=>{this.modal.set(false);this.load()},error:e=>this.fail(e)})}
  remove(item:TimetableEntry){if(confirm(`Delete ${item.courseCode} ${item.dayOfWeek} timetable?`))this.api.delete(item.id).subscribe({next:()=>this.load(),error:e=>this.fail(e)})}
  private fail(e:any){this.loading.set(false);this.error.set(e.status===0?'Cannot reach the backend API.':e.error?.message||'The timetable operation failed.')}
}
