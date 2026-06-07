import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PanelGeometryService, PanelData } from '../../services/panel-geometry';

interface Panel {
  label: string;
  w: number;
  h: number;
  t: number;
  tabsOnWidth: boolean;
}

@Component({
  selector: 'app-box-panel-flat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './box-canvas-flat.html',
  styleUrl: './box-canvas-flat.scss'
})
export class BoxPanelFlatComponent implements OnInit {
  width = 200;
  height = 100;
  depth = 150;
  thickness = 9;
  fingersW = 6;
  fingersH = 6;
  fingersD = 6;
  bitDiameter = 6;
  includeBase = true;
  includeLid = true;

  panels: Panel[] = [];
  panelPaths: string[] = [];

  constructor(private panelGeometry: PanelGeometryService) { }

  ngOnInit() {
    this.buildPanels();
  }

  onChange() {
    this.buildPanels();
  }

  private buildPanels() {
    const t = this.thickness;

    this.panels = [
      { label: 'FRONT', w: this.width, h: this.height, t, tabsOnWidth: true },
      { label: 'BACK', w: this.width, h: this.height, t, tabsOnWidth: true },
      { label: 'LEFT SIDE', w: this.depth, h: this.height, t, tabsOnWidth: false },
      { label: 'RIGHT SIDE', w: this.depth, h: this.height, t, tabsOnWidth: false },
    ];

    if (this.includeBase) this.panels.push(
      { label: 'BASE', w: this.width, h: this.depth, t, tabsOnWidth: true }
    );
    if (this.includeLid) this.panels.push(
      { label: 'LID', w: this.width, h: this.depth, t, tabsOnWidth: true }
    );

    this.panelPaths = this.panels.map(p =>
      `M 0 0 L ${p.w} 0 L ${p.w} ${p.h} L 0 ${p.h} Z`
    );

    const panelData: PanelData[] = this.panels.map((p, i) => ({
      label: p.label,
      pathData: this.panelPaths[i],
      w: p.w,
      h: p.h,
      t: p.t,
      tabsOnWidth: p.tabsOnWidth,
    }));
    this.panelGeometry.update(panelData);
  }

  getViewBox(panel: Panel): string {
    const pad = panel.t * 2;
    return `${-pad} ${-pad} ${panel.w + pad * 2} ${panel.h + pad * 2}`;
  }

  getSvgHeight(panel: Panel): number {
    return 200;
  }
}



/*import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import paper from 'paper';
import { PanelGeometryService, PanelData } from '../../services/panel-geometry';

interface Panel {
  label: string;
  w: number;
  h: number;
  fingers: number;
  fH: number;
  t: number;
  bitR: number;
  tabsOnWidth: boolean;
}

@Component({
  selector: 'app-box-canvas-flat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './box-canvas-flat.html',
  styleUrl: './box-canvas-flat.scss'
})
export class BoxCanvasFlatComponent implements OnChanges {
  @Input() width = 200;
  @Input() height = 100;
  @Input() depth = 150;
  @Input() thickness = 9;
  @Input() fingerCount = 6;
  @Input() bitDiameter = 6;
  @Input() tolerance = 0.1;
  @Input() includeLid = false;
  @Input() includeBase = true;
  @Input() triggered = 0;
  @Input() panelHeight = 200;

  panels: Panel[] = [];
  panelPaths: string[] = [];

  constructor(private panelGeometry: PanelGeometryService) { }

  ngOnChanges(changes: SimpleChanges) {
    this.buildPanels();
  }

  private buildPanels() {
    const f = Math.max(2, this.fingerCount);
    const t = this.thickness;
    const bitR = this.bitDiameter / 2;

    this.panels = [
      { label: 'FRONT', w: this.width - 2 * t, h: this.height, fingers: f, fH: this.height / f, t, bitR, tabsOnWidth: true },
      { label: 'BACK', w: this.width - 2 * t, h: this.height, fingers: f, fH: this.height / f, t, bitR, tabsOnWidth: true },
      { label: 'LEFT SIDE', w: this.depth, h: this.height, fingers: f, fH: this.height / f, t, bitR, tabsOnWidth: false },
      { label: 'RIGHT SIDE', w: this.depth, h: this.height, fingers: f, fH: this.height / f, t, bitR, tabsOnWidth: false },
    ];

    if (this.includeBase) this.panels.push(
      { label: 'BASE', w: this.width - 2 * t, h: this.depth - 2 * t, fingers: f, fH: (this.depth - 2 * t) / f, t, bitR, tabsOnWidth: true }
    );
    if (this.includeLid) this.panels.push(
      { label: 'LID', w: this.width - 2 * t, h: this.depth - 2 * t, fingers: f, fH: (this.depth - 2 * t) / f, t, bitR, tabsOnWidth: true }
    );

    this.panelPaths = this.panels.map(p => this.buildPaperPath(p));

    const panelData: PanelData[] = this.panels.map((p, i) => ({
      label: p.label,
      pathData: this.panelPaths[i],
      w: p.w,
      h: p.h,
      t: p.t,
      tabsOnWidth: p.tabsOnWidth,
    }));
    this.panelGeometry.update(panelData);
  }

  private buildPaperPath(panel: Panel): string {
    const canvas = document.createElement('canvas');
    paper.setup(canvas);

    const pathData = this.getPanelPathData(panel);
    const mainShape = new paper.Path(pathData);
    mainShape.closed = true;

    const dogbones = this.getDogbonePositions(panel);
    let result: paper.PathItem = mainShape;

    for (const db of dogbones) {
      const circle = new paper.Path.Circle(new paper.Point(db.cx, db.cy), db.r);
      result = result.subtract(circle) as paper.PathItem;
      circle.remove();
    }

    const svgPath = (result as any).pathData;
    result.remove();
    paper.project.clear();
    return svgPath;
  }

  private getPanelPathData(panel: Panel): string {
    const { w, h, fingers, fH, t, tabsOnWidth, label } = panel;
    const isBase = label === 'BASE' || label === 'LID';
    const fw = w / fingers;
    const startX = fw / 2;
    const sfw = (w - 2 * t) / fingers;
    const centreOffsetTop = (w - fingers * sfw) / 2;
    const centreOffsetBase = (w - fingers * sfw) / 2 -t;
    let d = '';

    if (isBase) {
      d += `M 0 0`;
      for (let i = 0; i < fingers; i++) {
        const y0 = i * fH, y1 = y0 + fH;
        if (i % 2 === 0) d += ` L 0 ${y0} L ${-t} ${y0} L ${-t} ${y1} L 0 ${y1}`;
      }
      d += ` L 0 ${h}`;
      for (let i = 0; i < fingers - 1; i++) {
        const x0 = startX + i * fw, x1 = x0 + fw;
        if (i % 2 === 0) d += ` L ${x0} ${h} L ${x0} ${h + t} L ${x1} ${h + t} L ${x1} ${h}`;
      }
      d += ` L ${w} ${h}`;
      for (let i = fingers - 1; i >= 0; i--) {
        const y0 = i * fH, y1 = y0 + fH;
        if (i % 2 === 0) d += ` L ${w} ${y1} L ${w + t} ${y1} L ${w + t} ${y0} L ${w} ${y0}`;
      }
      d += ` L ${w} 0`;
      for (let i = fingers - 2; i >= 0; i--) {
        const x0 = startX + i * fw, x1 = x0 + fw;
        if (i % 2 === 0) d += ` L ${x1} 0 L ${x1} ${-t} L ${x0} ${-t} L ${x0} 0`;
      }
      d += ` Z`;

    } else if (tabsOnWidth) {
      d += `M 0 0`;
      for (let i = 0; i < fingers; i++) {
        const y0 = i * fH, y1 = y0 + fH;
        if (i % 2 === 0) d += ` L 0 ${y0} L ${-t} ${y0} L ${-t} ${y1} L 0 ${y1}`;
      }
      d += ` L 0 ${h}`;
      for (let i = 0; i < fingers - 1; i++) {
        const x0 = startX + i * fw, x1 = x0 + fw;
        if (i % 2 === 0) d += ` L ${x0} ${h} L ${x0} ${h - t} L ${x1} ${h - t} L ${x1} ${h}`;
      }
      d += ` L ${w} ${h}`;
      for (let i = fingers - 1; i >= 0; i--) {
        const y0 = i * fH, y1 = y0 + fH;
        if (i % 2 === 0) d += ` L ${w} ${y1} L ${w + t} ${y1} L ${w + t} ${y0} L ${w} ${y0}`;
      }
      d += ` L ${w} 0`;
      for (let i = fingers - 2; i >= 0; i--) {
        const x0 = startX + i * fw, x1 = x0 + fw;
        if (i % 2 === 0) d += ` L ${x1} 0 L ${x1} ${t} L ${x0} ${t} L ${x0} 0`;
      }
      d += ` Z`;

    } else {
      const isLeftSide = label === 'LEFT SIDE';

      d += `M 0 0 L ${w} 0`;
      for (let i = 0; i < fingers; i++) {
        const y0 = i * fH, y1 = y0 + fH;
        if (i % 2 === 0) d += ` L ${w} ${y0} L ${w - t} ${y0} L ${w - t} ${y1} L ${w} ${y1}`;
      }

      // Bottom edge
      d += ` L ${w} ${h}`;
      for (let i = fingers - 1; i >= 0; i--) {
        const x0 = centreOffsetBase + i * sfw, x1 = x0 + sfw;
        const condition = isLeftSide ? i % 2 === 0 : i % 2 !== 0;
        if (condition) d += ` L ${x1} ${h} L ${x1} ${h - t} L ${x0} ${h - t} L ${x0} ${h}`;
      }
      d += ` L 0 ${h}`;

      for (let i = fingers - 1; i >= 0; i--) {
        const y0 = i * fH, y1 = y0 + fH;
        if (i % 2 === 0) d += ` L 0 ${y1} L ${t} ${y1} L ${t} ${y0} L 0 ${y0}`;
      }

      // Top edge
      d += ` L 0 0`;
      for (let i = 0; i < fingers; i++) {
        const x0 = centreOffsetTop + i * sfw, x1 = x0 + sfw;
        const condition = isLeftSide ? i % 2 === 0 : i % 2 !== 0;
        if (condition) d += ` L ${x0} 0 L ${x0} ${t} L ${x1} ${t} L ${x1} 0`;
      }
      d += ` Z`;
    }

    return d;
  }

  private getDogbonePositions(panel: Panel): { cx: number, cy: number, r: number }[] {
    const { w, fingers, fH, t, bitR, tabsOnWidth } = panel;
    const circles: { cx: number, cy: number, r: number }[] = [];
    const d = bitR / Math.sqrt(2);

    if (tabsOnWidth) {
      for (let i = 0; i < fingers; i++) {
        if (i % 2 === 0) continue;
        const y0 = i * fH, y1 = y0 + fH;
        const isLast = i === fingers - 1;
        circles.push({ cx: -d, cy: y0 + d, r: bitR });
        circles.push({ cx: w + d, cy: y0 + d, r: bitR });
        if (!isLast) {
          circles.push({ cx: -d, cy: y1 - d, r: bitR });
          circles.push({ cx: w + d, cy: y1 - d, r: bitR });
        }
      }
    } else {
      for (let i = 0; i < fingers; i++) {
        if (i % 2 !== 0) continue;
        const y0 = i * fH, y1 = y0 + fH;
        if (i !== 0) {
          circles.push({ cx: t - d, cy: y0 + d, r: bitR });
          circles.push({ cx: w - t + d, cy: y0 + d, r: bitR });
        }
        circles.push({ cx: t - d, cy: y1 - d, r: bitR });
        circles.push({ cx: w - t + d, cy: y1 - d, r: bitR });
      }
    }
    return circles;
  }

  getViewBox(panel: Panel): string {
    const pad = panel.t * 3;
    const extra = panel.tabsOnWidth ? panel.t : 0;
    return `${-extra - pad} ${-pad} ${panel.w + extra * 2 + pad * 2} ${panel.h + pad * 2}`;
  }

  getSvgHeight(panel: Panel): number {
    return Math.max(80, this.panelHeight - 60);
  }


  getDebugSlots(panel: Panel): number[] {
    const indices: number[] = [];
    for (let i = 0; i < panel.fingers; i++) {
      if (i % 2 === 0) indices.push(i);
    }
    return indices;
  }
}
*/
