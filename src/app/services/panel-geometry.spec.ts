import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PanelData {
  label: string;
  pathData: string;
  w: number;
  h: number;
  t: number;
  tabsOnWidth: boolean;
}

@Injectable({ providedIn: 'root' })
export class PanelGeometryService {
  panels$ = new BehaviorSubject<PanelData[]>([]);

  update(panels: PanelData[]) {
    this.panels$.next(panels);
  }
}
