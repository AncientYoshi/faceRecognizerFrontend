import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TimetableService } from '../../../core/services/timetable.service';
import { StudentTimetable, StudentTimetableEntry } from '../../../core/models/api.models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({selector:'app-student-timetable',standalone:true,imports:[DatePipe,IconComponent],templateUrl:'./student-timetable.component.html',styleUrl:'./student-timetable.component.css'})
export class StudentTimetableComponent implements OnInit{
  private api=inject(TimetableService);
  readonly timetable=signal<StudentTimetable|null>(null);
  readonly loading=signal(true);
  readonly error=signal('');
  readonly week=signal(this.monday(new Date()));
  readonly days=computed(()=>{
    const start=this.timetable()?.weekStart||this.week();
    const today=this.timetable()?.today||this.localDate(new Date());
    const entries=this.timetable()?.entries||[];
    return Array.from({length:7},(_,index)=>{
      const date=this.addDays(start,index);
      return {date,today:date===today,entries:entries.filter(entry=>entry.date===date)};
    });
  });
  readonly entryCount=computed(()=>this.timetable()?.entries.length||0);

  ngOnInit(){this.load()}
  load(){this.loading.set(true);this.error.set('');this.api.mine(this.week()).subscribe({next:x=>{this.week.set(x.weekStart);this.timetable.set(x);this.loading.set(false)},error:e=>{this.loading.set(false);this.error.set(e.status===0?'Cannot reach the backend API.':e.error?.message||'Your timetable could not be loaded.')}})}
  move(days:number){const d=new Date(`${this.week()}T00:00:00`);d.setDate(d.getDate()+days);this.week.set(this.localDate(d));this.load()}
  choose(value:string){if(!value)return;this.week.set(this.monday(new Date(`${value}T00:00:00`)));this.load()}
  currentWeek(){this.week.set(this.monday(new Date()));this.load()}
  trackEntry(_:number,entry:StudentTimetableEntry){return entry.timetableId}

  private monday(date:Date){const d=new Date(date),day=d.getDay()||7;d.setDate(d.getDate()-day+1);return this.localDate(d)}
  private addDays(value:string,days:number){const d=new Date(`${value}T00:00:00`);d.setDate(d.getDate()+days);return this.localDate(d)}
  private localDate(d:Date){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
}
