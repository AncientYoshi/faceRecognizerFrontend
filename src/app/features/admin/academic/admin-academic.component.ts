import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { Course, CoursePayload, Department, Enrollment, UserSummary } from '../../../core/models/api.models';
import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Observable } from 'rxjs';

type Mode='departments'|'courses'|'enrollments';
@Component({selector:'app-admin-academic',standalone:true,imports:[ReactiveFormsModule,DatePipe,IconComponent],templateUrl:'./admin-academic.component.html',styleUrl:'./admin-academic.component.css'})
export class AdminAcademicComponent implements OnInit{
  private route=inject(ActivatedRoute);private api=inject(AcademicService);private usersApi=inject(UserService);private fb=inject(FormBuilder);
  readonly mode=this.route.snapshot.data['mode'] as Mode;readonly loading=signal(true);readonly error=signal('');readonly modal=signal(false);readonly departments=signal<Department[]>([]);readonly courses=signal<Course[]>([]);readonly enrollments=signal<Enrollment[]>([]);readonly teachers=signal<UserSummary[]>([]);readonly students=signal<UserSummary[]>([]);readonly editing=signal<Department|Course|null>(null);readonly selectedCourse=signal('');
  readonly title=this.mode==='departments'?'Departments':this.mode==='courses'?'Courses':'Enrollments';
  form=this.fb.nonNullable.group({code:['',Validators.required],name:['',Validators.required],description:[''],semester:['FIRST',Validators.required],academicYear:['2026-2027',Validators.required],studyYear:[1,[Validators.required,Validators.min(1),Validators.max(6)]],departmentId:['',Validators.required],teacherId:['',Validators.required],studentId:['',Validators.required]});
  ngOnInit(){this.loadReferences();this.load()}
  loadReferences(){this.api.departments('',0,100).subscribe(x=>this.departments.set(x.content));this.api.courses('',0,100).subscribe(x=>{this.courses.set(x.content);if(!this.selectedCourse()&&x.content.length)this.selectCourse(x.content[0].id)});this.usersApi.listAll().subscribe(x=>{this.teachers.set(x.filter(u=>u.roles.includes('TEACHER')));this.students.set(x.filter(u=>u.roles.includes('STUDENT')))})}
  load(){this.loading.set(true);this.error.set('');if(this.mode==='departments')this.api.departments('',0,100).subscribe({next:x=>{this.departments.set(x.content);this.loading.set(false)},error:e=>this.fail(e)});else if(this.mode==='courses')this.api.courses('',0,100).subscribe({next:x=>{this.courses.set(x.content);this.loading.set(false)},error:e=>this.fail(e)});else{if(this.selectedCourse())this.loadEnrollments();else this.loading.set(false)}}
  selectCourse(id:string){this.selectedCourse.set(id);if(this.mode==='enrollments')this.loadEnrollments()}
  loadEnrollments(){this.loading.set(true);this.api.enrollments(this.selectedCourse()).subscribe({next:x=>{this.enrollments.set(x.content);this.loading.set(false)},error:e=>this.fail(e)})}
  openCreate(){this.editing.set(null);const course=this.courses().find(c=>c.id===this.selectedCourse());this.form.reset({code:'',name:'',description:'',semester:'FIRST',academicYear:'2026-2027',studyYear:course?.studyYear||1,departmentId:this.departments()[0]?.id||'',teacherId:this.teachers()[0]?.teacherId||'',studentId:this.eligibleStudents()[0]?.studentId||''});this.modal.set(true)}
  openEdit(item:Department|Course){this.editing.set(item);if(this.mode==='departments'){const d=item as Department;this.form.patchValue({code:d.code,name:d.name,description:d.description})}else{const c=item as Course;this.form.patchValue({code:c.code,name:c.name,semester:c.semester,academicYear:c.academicYear,studyYear:c.studyYear,departmentId:c.departmentId,teacherId:c.teacherId})}this.modal.set(true)}
  save(){if(this.mode==='enrollments'){const id=this.form.value.studentId;if(!id)return;this.api.enroll(this.selectedCourse(),id).subscribe({next:()=>{this.modal.set(false);this.loadEnrollments()},error:e=>this.fail(e)});return}if(this.form.invalid){this.form.markAllAsTouched();return}const v=this.form.getRawValue();let req:Observable<unknown>;if(this.mode==='departments'){const body={code:v.code,name:v.name,description:v.description};req=this.editing()?this.api.updateDepartment(this.editing()!.id,body):this.api.createDepartment(body)}else{const body=this.courseBody(v);req=this.editing()?this.api.updateCourse(this.editing()!.id,body):this.api.createCourse(body)}req.subscribe({next:()=>{this.modal.set(false);this.load();this.loadReferences()},error:(e:any)=>this.fail(e)})}
  remove(item:Department|Course|Enrollment){if(!confirm(`Delete ${'name'in item?item.name:'this enrollment'}?`))return;const req=this.mode==='departments'?this.api.deleteDepartment(item.id):this.mode==='courses'?this.api.deleteCourse(item.id):this.api.unenroll((item as Enrollment).courseId,(item as Enrollment).studentId);req.subscribe({next:()=>this.load(),error:e=>this.fail(e)})}
  eligibleStudents(){const year=this.courses().find(c=>c.id===this.selectedCourse())?.studyYear;return this.students().filter(s=>!year||s.studyYear===year)}
  private courseBody(v:any):CoursePayload{return{code:v.code,name:v.name,semester:v.semester,academicYear:v.academicYear,studyYear:Number(v.studyYear),departmentId:v.departmentId,teacherId:v.teacherId}}
  private fail(e:any){this.loading.set(false);this.error.set(e.status===0?'Cannot reach the backend API.':e.error?.message||'The operation could not be completed.')}
}
