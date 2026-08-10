import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector:'app-placeholder', standalone:true, imports:[RouterLink,IconComponent],
  template:`<div class="placeholder"><div class="icon"><sam-icon [name]="route.snapshot.data['icon'] || 'settings'" size="38"/></div><p>{{route.snapshot.data['eyebrow'] || 'Smart Attendance'}}</p><h1>{{route.snapshot.data['title'] || 'Module'}}</h1><span>{{route.snapshot.data['description'] || 'This workspace is ready for the next API-backed feature.'}}</span><a [routerLink]="route.snapshot.data['back'] || '/'">Back to dashboard</a></div>`,
  styles:[`.placeholder{min-height:calc(100dvh - 160px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;color:#14243a}.icon{width:76px;height:76px;border-radius:20px;background:#e7f5fb;color:#078fc9;display:grid;place-items:center}.placeholder p{text-transform:uppercase;letter-spacing:.15em;color:#0792cc;font-size:13px;font-weight:800;margin:22px 0 8px}.placeholder h1{font-size:29px;margin:0 0 10px}.placeholder span{color:#738195;font-size:15px}.placeholder a{margin-top:24px;color:#fff;background:#0795cf;border-radius:8px;padding:11px 16px;text-decoration:none;font-size:14px;font-weight:700}`],
})
export class PlaceholderComponent { readonly route=inject(ActivatedRoute); }
