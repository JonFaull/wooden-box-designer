import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BoxSettings {
  width: number;
  height: number;
  depth: number;
  thickness: number;
  fingersW: number;
  fingersH: number;
  fingersD: number;
  bitDiameter: number;
  tolerance: number;
  includeBase: boolean;
  includeLid: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  settings$ = new BehaviorSubject<BoxSettings>({
    width: 200, height: 100, depth: 150,
    thickness: 9,
    fingersW: 6, fingersH: 6, fingersD: 6,
    bitDiameter: 6, tolerance: 0.1,
    includeBase: true, includeLid: true
  });

  update(s: BoxSettings) {
    this.settings$.next(s);
  }
}
