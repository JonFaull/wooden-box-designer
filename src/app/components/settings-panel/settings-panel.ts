import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.scss'
})
export class SettingsPanelComponent implements OnInit {
  width = 200;
  height = 100;
  depth = 150;
  thickness = 9;
  fingersW = 5;
  fingersH = 5;
  fingersD = 5;
  bitDiameter = 6;
  tolerance = 0.1;
  includeLid = true;
  includeBase = true;
  selectedJoint = 'finger';

  jointTypes = [
    { id: 'finger', name: 'Finger', icon: '⊞' },
    { id: 'dovetail', name: 'Dovetail', icon: '◈' },
    { id: 'rabbet', name: 'Rabbet', icon: '⊏' },
    { id: 'mitre', name: 'Mitre', icon: '◺' },
  ];

  constructor(private settingsService: SettingsService) { }

  ngOnInit() {
    this.emit();
  }

  emit() {
    this.settingsService.update({
      width: this.width,
      height: this.height,
      depth: this.depth,
      thickness: this.thickness,
      fingersW: this.fingersW,
      fingersH: this.fingersH,
      fingersD: this.fingersD,
      bitDiameter: this.bitDiameter,
      tolerance: this.tolerance,
      includeBase: this.includeBase,
      includeLid: this.includeLid,
    });
  }

  onGenerate() {
    this.emit();
  }

  snapFingers(field: 'fingersW' | 'fingersH' | 'fingersD') {
    let val = this[field];
    if (val < 3) val = 3;
    else if (val % 2 === 0) val = val + 1; // snap even to next odd
    this[field] = val;
    this.emit();
  }

  incrementFingers(field: 'fingersW' | 'fingersH' | 'fingersD') {
    this[field] = this[field] + 2;
    this.emit();
  }

  decrementFingers(field: 'fingersW' | 'fingersH' | 'fingersD') {
    if (this[field] > 3) this[field] = this[field] - 2;
    this.emit();
  }
}
