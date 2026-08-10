import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuditLog, SystemSetting } from '../../../core/models/api.models';
import { SystemService } from '../../../core/services/system.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Mode='settings'|'audit';
@Component({selector:'app-admin-system',standalone:true,imports:[DatePipe,ReactiveFormsModule,IconComponent],templateUrl:'./admin-system.component.html',styleUrl:'./admin-system.component.css'})
export class AdminSystemComponent implements OnInit{
  private api=inject(SystemService);private fb=inject(FormBuilder);readonly mode=inject(ActivatedRoute).snapshot.data['mode'] as Mode;readonly settings=signal<SystemSetting[]>([]);readonly logs=signal<AuditLog[]>([]);readonly drafts=signal<Record<string,string>>({});readonly loading=signal(true);readonly error=signal('');readonly saved=signal('');readonly actions=['','LOGIN','ATTENDANCE_RECORDED','UPDATE','DELETE','REPORT_DOWNLOADED','SYSTEM_SETTING_UPDATED'];
  filter=this.fb.nonNullable.group({action:[''],userId:[''],from:[''],to:['']});
  ngOnInit(){this.load()}
  load(){this.loading.set(true);this.error.set('');if(this.mode==='settings')this.api.settings().subscribe({next:x=>{this.settings.set(x);this.drafts.set(Object.fromEntries(x.map(s=>[s.key,s.value])));this.loading.set(false)},error:e=>this.fail(e)});else{const v=this.filter.getRawValue(),filters={action:v.action||undefined,userId:v.userId||undefined,from:v.from?new Date(v.from).toISOString():undefined,to:v.to?new Date(v.to).toISOString():undefined,size:100};this.api.audit(filters).subscribe({next:x=>{this.logs.set(x.content);this.loading.set(false)},error:e=>this.fail(e)})}}
  draft(key:string,value:string){this.drafts.update(x=>({...x,[key]:value}))}
  save(setting:SystemSetting){this.saved.set('');this.api.updateSetting(setting.key,this.drafts()[setting.key]).subscribe({next:x=>{this.settings.update(all=>all.map(s=>s.key===x.key?x:s));this.saved.set(x.key)},error:e=>this.fail(e)})}
  private fail(e:any){this.loading.set(false);this.error.set(e.status===0?'Cannot reach the backend API.':e.error?.message||'The request could not be completed.')}
}
