import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DayOfWeek, PageResponse, StudentTimetable, TimetableEntry, TimetablePayload } from '../models/api.models';
import { AuthService } from './auth.service';

@Injectable({providedIn:'root'})
export class TimetableService{
  private http=inject(HttpClient);private auth=inject(AuthService);private preview=signal<TimetableEntry[]>([]);
  list(filters:{courseId?:string;dayOfWeek?:DayOfWeek;onDate?:string;active?:boolean;page?:number;size?:number}={}):Observable<PageResponse<TimetableEntry>>{if(this.auth.isPreview())return of(this.page(this.preview(),filters.page||0,filters.size||100));let params=new HttpParams();Object.entries({...filters,page:filters.page||0,size:filters.size||100}).forEach(([k,v])=>{if(v!==undefined&&v!=='')params=params.set(k,String(v))});return this.http.get<PageResponse<TimetableEntry>>(`${environment.apiUrl}/timetables`,{params})}
  get(id:string):Observable<TimetableEntry>{if(this.auth.isPreview())return of(this.preview().find(x=>x.id===id)!);return this.http.get<TimetableEntry>(`${environment.apiUrl}/timetables/${id}`)}
  create(body:TimetablePayload):Observable<TimetableEntry>{if(this.auth.isPreview()){const x={...body,id:crypto.randomUUID(),courseCode:'PREVIEW',courseName:'Preview Course',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};this.preview.update(v=>[...v,x]);return of(x)}return this.http.post<TimetableEntry>(`${environment.apiUrl}/timetables`,body)}
  update(id:string,body:TimetablePayload):Observable<TimetableEntry>{if(this.auth.isPreview()){const old=this.preview().find(x=>x.id===id)!;const x={...old,...body};this.preview.update(v=>v.map(y=>y.id===id?x:y));return of(x)}return this.http.put<TimetableEntry>(`${environment.apiUrl}/timetables/${id}`,body)}
  delete(id:string):Observable<void>{if(this.auth.isPreview()){this.preview.update(v=>v.filter(x=>x.id!==id));return of(undefined)}return this.http.delete<void>(`${environment.apiUrl}/timetables/${id}`)}
  mine(weekStart?:string):Observable<StudentTimetable>{if(this.auth.isPreview()){const today=new Date().toISOString().slice(0,10);return of({studentId:'preview-student',today,weekStart:weekStart||today,weekEnd:today,timeZone:'Asia/Yangon',entries:[]})}return this.http.get<StudentTimetable>(`${environment.apiUrl}/students/me/timetable`,{params:weekStart?{weekStart}:{}})}
  private page<T>(all:T[],page:number,size:number):PageResponse<T>{return{content:all.slice(page*size,page*size+size),page,size,totalElements:all.length,totalPages:Math.ceil(all.length/size),first:page===0,last:(page+1)*size>=all.length}}
}
