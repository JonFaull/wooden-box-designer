import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsPanelComponent } from './components/settings-panel/settings-panel';
import { BoxPanelThreeComponent } from './components/box-panel-3d/box-panel-3d';
import { BoxPanelFlatComponent } from './components/box-panel-flat/box-panel-flat';

@Component({
  selector: 'app-root',
  imports: [SettingsPanelComponent, BoxPanelThreeComponent, BoxPanelFlatComponent, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  topFlex = 3;
  bottomFlex = 1;

  private dragging = false;
  private startY = 0;
  private startTop = 0;
  private startBot = 0;
  private wrapperH = 0;

  onDividerMouseDown(event: MouseEvent) {
    this.dragging = true;
    this.startY = event.clientY;
    this.startTop = this.topFlex;
    this.startBot = this.bottomFlex;
    this.wrapperH = (event.target as HTMLElement)
      .closest('.viewport-wrapper')!.clientHeight;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.dragging) return;
    const delta = event.clientY - this.startY;
    const totalFlex = this.startTop + this.startBot;
    const pxPerFlex = this.wrapperH / totalFlex;
    const flexDelta = delta / pxPerFlex;
    this.topFlex = Math.max(0.1, this.startTop + flexDelta);
    this.bottomFlex = Math.max(0.1, this.startBot - flexDelta);
  }

  @HostListener('document:mouseup')
  onMouseUp() { this.dragging = false; }
}
