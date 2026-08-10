import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog, PageResponse, SystemSetting } from '../models/api.models';
import { AuthService } from './auth.service';

@Injectable({providedIn:'root'})
export class SystemService{
  private http=inject(HttpClient);private auth=inject(AuthService);
  audit(filters:{action?:string;userId?:string;from?:string;to?:string;page?:number;size?:number}={}):Observable<PageResponse<AuditLog>>{if(this.auth.isPreview())return of({content:[],page:0,size:20,totalElements:0,totalPages:0,first:true,last:true});let params=new HttpParams();Object.entries({...filters,page:filters.page||0,size:filters.size||100}).forEach(([k,v])=>{if(v)params=params.set(k,String(v))});return this.http.get<PageResponse<AuditLog>>(`${environment.apiUrl}/audit-logs`,{params})}
  settings():Observable<SystemSetting[]>{if(this.auth.isPreview())return of([{id:'preview',key:'AI_SIMILARITY_THRESHOLD',value:'0.85',valueType:'DECIMAL',description:'Minimum accepted face similarity',updatedBy:null,updatedAt:new Date().toISOString()}]);return this.http.get<SystemSetting[]>(`${environment.apiUrl}/system-settings`)}
  setting(key:string):Observable<SystemSetting>{if(this.auth.isPreview())return of({id:'preview',key,value:'0.85',valueType:'DECIMAL',description:'Preview setting',updatedBy:null,updatedAt:new Date().toISOString()});return this.http.get<SystemSetting>(`${environment.apiUrl}/system-settings/${encodeURIComponent(key)}`)}
  updateSetting(key:string,value:string):Observable<SystemSetting>{if(this.auth.isPreview())return of({id:'preview',key,value,valueType:'STRING',description:'Preview setting',updatedBy:null,updatedAt:new Date().toISOString()});return this.http.put<SystemSetting>(`${environment.apiUrl}/system-settings/${encodeURIComponent(key)}`,{value})}
}
