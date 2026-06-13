import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelGeometryService, PanelData } from '../../services/panel-geometry';
import { SettingsService } from '../../services/settings.service';
import paper from 'paper';

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
  imports: [CommonModule],
  templateUrl: './box-panel-flat.html',
  styleUrl: './box-panel-flat.scss'
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
  tolerance = 0.1;

  panels: Panel[] = [];
  panelPaths: string[] = [];

  constructor(
    private panelGeometry: PanelGeometryService,
    private settingsService: SettingsService
  ) { }

  ngOnInit() {
    this.settingsService.settings$.subscribe(s => {
      this.width = s.width;
      this.height = s.height;
      this.depth = s.depth;
      this.thickness = s.thickness;
      this.fingersW = s.fingersW;
      this.fingersH = s.fingersH;
      this.fingersD = s.fingersD;
      this.bitDiameter = s.bitDiameter;
      this.includeBase = s.includeBase;
      this.includeLid = s.includeLid;
      this.tolerance = s.tolerance;
      this.buildPanels();
    });
  }

  private buildPanels() {
    const t = this.thickness;

    this.panels = [
      { label: 'FRONT', w: this.width, h: this.height, t, tabsOnWidth: true },
      { label: 'BACK', w: this.width, h: this.height, t, tabsOnWidth: true },
      { label: 'LEFT SIDE', w: this.depth - 2 * t, h: this.height - 2 * t, t, tabsOnWidth: false },
      { label: 'RIGHT SIDE', w: this.depth - 2 * t, h: this.height - 2 * t, t, tabsOnWidth: false },
    ];


    if (this.includeBase) this.panels.push(
      { label: 'BASE', w: this.width - 2 * t, h: this.depth, t, tabsOnWidth: true }
    );
    if (this.includeLid) this.panels.push(
      { label: 'LID', w: this.width - 2 * t, h: this.depth, t, tabsOnWidth: true }
    );



    //this.panelPaths = this.panels.map(p => this.getPanelPath(p));
    this.panelPaths = this.panels.map(p => this.addDogbones(this.getPanelPath(p), p));

    const panelData: PanelData[] = this.panels.map((p, i) => ({
      label: p.label,
      pathData: this.panelPaths[i],
      w: p.w,
      h: p.h,
      t: p.t,
      tabsOnWidth: p.tabsOnWidth,
    }));
    console.log('sending to 3D:', panelData.map(p => p.label));
    this.panelGeometry.update(panelData);


    const lid = this.panels.find(p => p.label === 'LID');
    const side = this.panels.find(p => p.label === 'LEFT SIDE');
    console.log('LID depth (h):', lid?.h, 'SIDE width (w):', side?.w);


  }

  private getPanelPath(panel: Panel): string {
    const { w, h, t, label } = panel;

    const r = this.bitDiameter / 2;

    if (label === 'FRONT' || label === 'BACK') {
      const total = this.fingersW;
      const totalH = this.fingersH;
      const tol = this.tolerance;
      const fw = (w - (total - 1) * tol) / total;
      const fh = (h - (totalH - 1) * tol) / totalH;


      let d = this.includeLid ? `M 0 ${t}` : `M 0 0`;

      if (this.includeLid) {
        let cursor = 0;
        for (let i = 0; i < total; i++) {
          if (i % 2 === 0) {
            d += ` L ${cursor} ${t} L ${cursor} 0 L ${cursor + fw} 0 L ${cursor + fw} ${t}`;
            cursor += fw + tol;
          } else {
            // const slotLeft = cursor - tol;
            // const slotRight = cursor + fw + tol;

            // // Left dogbone — enter top, sweep 270°, exit right
            // const leftCx = slotLeft;
            // d += ` L ${leftCx} ${t - r - 0.5}`;
            // d += this.arcAround(leftCx, t, r, 'bottom');

            // // slot floor — straight across
            // d += ` L ${slotRight - r} ${t}`;

            // Right dogbone — enter left, sweep 270°, exit top
            // const rightCx = slotRight;
            // d += this.arcAround(rightCx, t, r, 'bottom-right');
            // d += ` L ${rightCx} ${t - r}`;

            cursor += fw + tol;
          }
        }
        d += ` L ${w} ${t}`;
      }

      // Top edge (left → right) — fingers stick up
      // if (this.includeLid) {
      //   let cursor = 0;
      //   for (let i = 0; i < total; i++) {
      //     if (i % 2 === 0) {
      //       d += ` L ${cursor} ${t} L ${cursor} 0 L ${cursor + fw} 0 L ${cursor + fw} ${t}`;
      //       cursor += fw + tol;
      //     } else {
      //       cursor += fw + tol;
      //     }
      //   }
      //   d += ` L ${w} ${t}`;
      // } else {
      //   d += ` L ${w} 0`;
      // }

      // Right edge (top → bottom) — slots zigzag inward
      // Right edge (top → bottom) — slots zigzag inward
      let cursorRight = 0;
      for (let i = 0; i < totalH; i++) {
        if (i % 2 !== 0) {
          const slotStart = cursorRight - tol;
          const slotEnd = cursorRight + fh + tol;
          d += ` L ${w} ${slotStart} L ${w - t} ${slotStart} L ${w - t} ${slotEnd} L ${w} ${slotEnd}`;
        } else {
          d += ` L ${w} ${cursorRight + fh}`;
        }
        cursorRight += fh + tol;
      }

      // Bottom edge (right → left) — fingers stick down
      if (this.includeBase) {

        let cursorBase = w;
        for (let i = 0; i < total; i++) {
          if (i % 2 === 0) {
            d += ` L ${cursorBase} ${h - t} L ${cursorBase} ${h} L ${cursorBase - fw} ${h} L ${cursorBase - fw} ${h - t}`;
            // h - t
          } else {
            d += ` L ${cursorBase - fw} ${h - t}`;
          }
          cursorBase -= fw + tol;
        }
        console.log('cursorRight after loop:', cursorRight, 'h - t:', h - t);
      } else {
        d += ` L 0 ${h}`;
      }

      // Left edge (bottom → top) — slots zigzag inward
      let cursorLeft = h;
      for (let i = 0; i < totalH; i++) {
        if (i % 2 !== 0) {
          const slotStart = cursorLeft + tol;
          const slotEnd = cursorLeft - fh - tol;
          d += ` L 0 ${slotStart} L ${t} ${slotStart} L ${t} ${slotEnd} L 0 ${slotEnd}`;
        } else {
          d += ` L 0 ${cursorLeft - fh}`;
        }
        cursorLeft -= fh + tol;
      }
      //console.log('FRONT/BACK path:', d);
      d += ` Z`;
      return d;
    }

    if (label === 'BASE' || label === 'LID') {
      const total = this.fingersW;
      const totalD = this.fingersD;
      const tol = this.tolerance;
      const fw = (w + t + t - (total - 1) * tol) / total;
      const fd = (h - (totalD - 1) * tol) / totalD;
      // const fd = (h - 2 * t - (totalD - 1) * tol) / totalD;

      let d = `M 0 ${t}`;

      // Front edge
      let cursor = 0;
      for (let i = 0; i < total; i++) {
        const fingerW = (i === 0 || i === total - 1) ? fw - t : fw;
        if (i % 2 !== 0) {
          d += ` L ${cursor} ${t} L ${cursor} 0 L ${cursor + fingerW} 0 L ${cursor + fingerW} ${t}`;
        } else {
          d += ` L ${cursor + fingerW} ${t}`;
        }
        cursor += fingerW + tol;
      }

      //  d += ` L ${w} ${t} L ${w} ${h - t}`;



      // Right edge (bottom-right → top-right) — slots cut inward
      let cursorRight = t;
      for (let i = 0; i < totalD; i++) {
        const slotLen = (i === 0 || i === totalD - 1) ? fd - t : fd;
        if (i % 2 !== 0) {
          d += ` L ${w} ${cursorRight} L ${w + t} ${cursorRight} L ${w + t} ${cursorRight + slotLen} L ${w} ${cursorRight + slotLen}`;
          cursorRight += slotLen + tol;
        } else {
          d += ` L ${w} ${cursorRight + slotLen}`;
          cursorRight += slotLen + tol;
        }
      }


      // Back edge
      let cursorBack = w;
      for (let i = 0; i < total; i++) {
        const fingerW = (i === 0 || i === total - 1) ? fw - t : fw;
        if (i % 2 !== 0) {
          d += ` L ${cursorBack} ${h - t} L ${cursorBack} ${h} L ${cursorBack - fingerW} ${h} L ${cursorBack - fingerW} ${h - t}`;
        } else {
          d += ` L ${cursorBack - fingerW} ${h - t}`;
        }
        cursorBack -= fingerW + tol;
      }

      let cursorLeft = h - t;
      for (let i = 0; i < totalD; i++) {
        const slotLen = (i === 0 || i === totalD - 1) ? fd - t : fd;
        if (i % 2 !== 0) {
          d += ` L 0 ${cursorLeft} L ${-t} ${cursorLeft} L ${-t} ${cursorLeft - slotLen} L 0 ${cursorLeft - slotLen}`;
          cursorLeft -= slotLen + tol;
        } else {
          d += ` L 0 ${cursorLeft - slotLen}`;
          cursorLeft -= slotLen + tol;
        }
      }
      // d += ` L ${w} ${t} L ${w} ${h}`;



      d += ` Z`;



      // Left edge (top-left → bottom-left) — slots cut inward


      return d;
    }

    if (label === 'LEFT SIDE' || label === 'RIGHT SIDE') {
      const total = this.fingersW;
      const totalD = this.fingersD;
      const totalH = this.fingersH;
      const tol = this.tolerance;
      const fw = (w + t + t - (total - 1) * tol) / total;
      // const fh = (h + t + t - (totalH - 1) * tol) / totalH;
      // const fd = (h + t + t - (totalH - 1) * tol) / totalH;
      const fd = (w + t + t - (totalD - 1) * tol) / totalD;  // depth — for top/bottom edges
      const fh = (h + t + t - (totalH - 1) * tol) / totalH;  // height — for right/left edges

      let d = `M 0 0`;

      // Top edge — fingers stick up
      // Top edge — fingers stick up
      if (this.includeLid) {
        let cursor = 0;
        for (let i = 0; i < totalD; i++) {
          const fingerW = (i === 0 || i === totalD - 1) ? fd - t : fd;
          if (i % 2 === 0) {
            d += ` L ${cursor} 0 L ${cursor} ${-t} L ${cursor + fingerW} ${-t} L ${cursor + fingerW} 0`;
            cursor += fingerW + tol;
          } else {
            cursor += fingerW + tol;
          }
        }
      }

      d += ` L ${w} 0`;

      // Right edge — fingers stick out
      let cursorRight = -t;
      for (let i = 0; i < totalH; i++) {
        if (i % 2 !== 0) {
          d += ` L ${w} ${cursorRight} L ${w + t} ${cursorRight} L ${w + t} ${cursorRight + fh} L ${w} ${cursorRight + fh}`;
        } else {
          d += ` L ${w} ${cursorRight + fh}`;
        }
        cursorRight += fh + tol;
      }

      d += ` L ${w} ${h}`;

      // Bottom edge — fingers stick down
      if (this.includeBase) {
        let cursorBase = w;
        for (let i = 0; i < totalD; i++) {
          const fingerW = (i === 0 || i === totalD - 1) ? fd - t : fd;
          if (i % 2 === 0) {
            d += ` L ${cursorBase} ${h} L ${cursorBase} ${h + t} L ${cursorBase - fingerW} ${h + t} L ${cursorBase - fingerW} ${h}`;
            cursorBase -= fingerW + tol;
          } else {
            cursorBase -= fingerW + tol;
          }
        }
      }

      d += ` L 0 ${h}`;

      // Left edge — fingers stick out
      let cursorLeft = h + t;
      for (let i = 0; i < totalH; i++) {
        if (i % 2 !== 0) {
          d += ` L 0 ${cursorLeft} L ${-t} ${cursorLeft} L ${-t} ${cursorLeft - fh} L 0 ${cursorLeft - fh}`;
        } else {
          d += ` L 0 ${cursorLeft - fh}`;
        }
        cursorLeft -= fh + tol;
      }

      d += ` Z`;


      return d;
    }


    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }
  getViewBox(panel: Panel): string {
    const pad = panel.t * 4;
    return `${-pad} ${-pad} ${panel.w + pad * 2} ${panel.h + pad * 2}`;
  }

  getSvgHeight(): number {
    return 200;
  }

  private circlePath(cx: number, cy: number, r: number): string {
    const k = 0.5523;
    return `M ${cx + r} ${cy} ` +
      `C ${cx + r} ${cy - k * r} ${cx + k * r} ${cy - r} ${cx} ${cy - r} ` +
      `C ${cx - k * r} ${cy - r} ${cx - r} ${cy - k * r} ${cx - r} ${cy} ` +
      `C ${cx - r} ${cy + k * r} ${cx - k * r} ${cy + r} ${cx} ${cy + r} ` +
      `C ${cx + k * r} ${cy + r} ${cx + r} ${cy + k * r} ${cx + r} ${cy} Z`;
  }
  private addDogbones(pathData: string, panel: Panel): string {
    const { w, h, t, label } = panel;
    const r = this.bitDiameter / 2;

    // Set up paper.js with a canvas
    const canvas = document.createElement('canvas');
    paper.setup(canvas);

    // Create main path
    const mainPath = new paper.Path(pathData);
    mainPath.closePath();

    let result = mainPath;

    const subtractCircle = (cx: number, cy: number) => {
      const circle = new paper.Path.Circle(new paper.Point(cx, cy), r);
      result = result.subtract(circle) as paper.Path;
      circle.remove();
    };

    if (label === 'FRONT' || label === 'BACK') {
      const total = this.fingersW;
      const totalH = this.fingersH;
      const tol = this.tolerance;
      const fw = (w - (total - 1) * tol) / total;
      const fh = (h - (totalH - 1) * tol) / totalH;
      const offset = (r / Math.sqrt(2)) - (r * 0.03);

      // Top edge dogbones
      if (this.includeLid) {
        let cursor = 0;
        for (let i = 0; i < total; i++) {
          if (i % 2 !== 0) {
            subtractCircle(cursor - tol + offset, t - offset);
            if (i !== total - 1) subtractCircle(cursor + fw + tol - offset, t - offset);
          }
          cursor += fw + tol;
        }
      }

      // Right edge dogbones
      let cursorRight = 0;
      for (let i = 0; i < totalH; i++) {
        if (i % 2 !== 0) {
          subtractCircle(w - t + offset, cursorRight - tol + offset);
          subtractCircle(w - t + offset, cursorRight + fh + tol - offset);
        }
        cursorRight += fh + tol;
      }

      // Left edge dogbones
      let cursorLeft = h;
      for (let i = 0; i < totalH; i++) {
        if (i % 2 !== 0) {
          subtractCircle(t - offset, cursorLeft + tol - offset);
          subtractCircle(t - offset, cursorLeft - fh - tol + offset);
        }
        cursorLeft -= fh + tol;
      }

      if (this.includeBase) {
        let cursorBase = w;
        for (let i = 0; i < total; i++) {
          if (i % 2 !== 0) {
            subtractCircle(cursorBase + tol - offset, h - t + offset);
            subtractCircle(cursorBase - fw - tol + offset, h - t + offset);
          }
          cursorBase -= fw + tol;
        }
      }

    }

    if (label === 'BASE' || label === 'LID') {
      const total = this.fingersW;
      const totalD = this.fingersD;
      const tol = this.tolerance;
      const fw = (w + t + t - (total - 1) * tol) / total;
      const fd = (h - (totalD - 1) * tol) / totalD;
      const offset = (r / Math.sqrt(2)) - (r * 0.03);

      // Front edge dogbones
      let cursor = 0;
      for (let i = 0; i < total; i++) {
        const fingerW = (i === 0 || i === total - 1) ? fw - t : fw;
        if (i % 2 === 0) {
          if (i === 0) {
            subtractCircle(cursor + fingerW - offset, t - offset);
          } else if (i === total - 1) {
            subtractCircle(cursor + offset, t - offset);
          } else {
            subtractCircle(cursor + offset, t - offset);
            subtractCircle(cursor + fingerW - offset, t - offset);
          }
        }
        cursor += fingerW + tol;
      }

      // Back edge dogbones
      let cursorBack = w;
      for (let i = 0; i < total; i++) {
        const fingerW = (i === 0 || i === total - 1) ? fw - t : fw;
        if (i % 2 === 0) {
          if (i === 0) {
            subtractCircle(cursorBack - fingerW + offset, h - t + offset);
          } else if (i === total - 1) {
            subtractCircle(cursorBack - offset, h - t + offset);
          } else {
            subtractCircle(cursorBack - offset, h - t + offset);
            subtractCircle(cursorBack - fingerW + offset, h - t + offset);
          }
        }
        cursorBack -= fingerW + tol;
      }

      // Right edge dogbones
      // Right edge dogbones
      let cursorRight = t;
      for (let i = 0; i < totalD; i++) {
        const slotLen = (i === 0 || i === totalD - 1) ? fd - t : fd;
        if (i % 2 !== 0) {
          if (i === 0) {
            subtractCircle(w + offset, cursorRight + slotLen + offset);
          } else if (i === totalD - 1) {
            subtractCircle(w + offset, cursorRight - offset);
          } else {
            subtractCircle(w + offset, cursorRight - offset);
            subtractCircle(w + offset, cursorRight + slotLen + offset);
          }
        }
        cursorRight += slotLen + tol;
      }

      // Left edge dogbones
      let cursorLeft = h - t;
      for (let i = 0; i < totalD; i++) {
        const slotLen = (i === 0 || i === totalD - 1) ? fd - t : fd;
        if (i % 2 !== 0) {
          if (i === 0) {
            subtractCircle(-offset, cursorLeft - slotLen - offset);
          } else if (i === totalD - 1) {
            subtractCircle(-offset, cursorLeft + offset);
          } else {
            subtractCircle(-offset, cursorLeft + offset);
            subtractCircle(-offset, cursorLeft - slotLen - offset);
          }
        }
        cursorLeft -= slotLen + tol;
      }

    }

    if (label === 'LEFT SIDE' || label === 'RIGHT SIDE') {
  const totalD = this.fingersD;
  const totalH = this.fingersH;
  const tol = this.tolerance;
  const fd = (w + t + t - (totalD - 1) * tol) / totalD;
  const fh = (h + t + t - (totalH - 1) * tol) / totalH;
  const offset = (r / Math.sqrt(2)) - (r * 0.03);

 // Top edge dogbones
if (this.includeLid) {
  let cursor = 0;
  for (let i = 0; i < totalD; i++) {
    const fingerW = (i === 0 || i === totalD - 1) ? fd - t : fd;
    if (i % 2 !== 0) {
      subtractCircle(cursor + offset, -offset);
      subtractCircle(cursor + fingerW - offset, -offset);
    }
    cursor += fingerW + tol;
  }
}

// Bottom edge dogbones
if (this.includeBase) {
  let cursorBase = w;
  for (let i = 0; i < totalD; i++) {
    const fingerW = (i === 0 || i === totalD - 1) ? fd - t : fd;
    if (i % 2 !== 0) {
      subtractCircle(cursorBase - offset, h + offset);
      subtractCircle(cursorBase - fingerW + offset, h + offset);
    }
    cursorBase -= fingerW + tol;
  }
}

// Right edge dogbones
{
  let cursorRight = -t;
  for (let i = 0; i < totalH; i++) {
    if (i % 2 !== 0) {
      subtractCircle(w + offset, cursorRight - offset);
      subtractCircle(w + offset, cursorRight + fh + offset);
    }
    cursorRight += fh + tol;
  }
}

// Left edge dogbones
// Left edge dogbones
{
  let cursorLeft = h + t;
  for (let i = 0; i < totalH; i++) {
    if (i % 2 !== 0) {
      subtractCircle(-offset, cursorLeft + offset);
      subtractCircle(-offset, cursorLeft - fh - offset);
    }
    cursorLeft -= fh + tol;
  }
}
}

    const resultPath = result.pathData;
    paper.project.clear();
    return resultPath;
  }

  private arcAround(cx: number, cy: number, r: number, side: 'bottom' | 'bottom-right' | 'top' | 'left' | 'right'): string {
    const k = 0.5523;

    if (side === 'bottom') {
      // 270° starting from top: top → left → bottom → right
      return ` C ${cx - k * r} ${cy - r} ${cx - r} ${cy - k * r} ${cx - r} ${cy}` +
        ` C ${cx - r} ${cy + k * r} ${cx - k * r} ${cy + r} ${cx} ${cy + r}` +
        ` C ${cx + k * r} ${cy + r} ${cx + r} ${cy + k * r} ${cx + r} ${cy}`;
    }

    if (side === 'bottom-right') {
      // 270° starting from left: left → bottom → right → top
      return ` C ${cx - r} ${cy + k * r} ${cx - k * r} ${cy + r} ${cx} ${cy + r}` +
        ` C ${cx + k * r} ${cy + r} ${cx + r} ${cy + k * r} ${cx + r} ${cy}` +
        ` C ${cx + r} ${cy - k * r} ${cx + k * r} ${cy - r} ${cx} ${cy - r}`;
    }

    if (side === 'top') {
      return ` C ${cx - r} ${cy - k * r} ${cx - k * r} ${cy - r} ${cx} ${cy - r}` +
        ` C ${cx + k * r} ${cy - r} ${cx + r} ${cy - k * r} ${cx + r} ${cy}`;
    }
    if (side === 'left') {
      return ` C ${cx - k * r} ${cy - r} ${cx - r} ${cy - k * r} ${cx - r} ${cy}` +
        ` C ${cx - r} ${cy + k * r} ${cx - k * r} ${cy + r} ${cx} ${cy + r}`;
    }
    if (side === 'right') {
      return ` C ${cx + k * r} ${cy - r} ${cx + r} ${cy - k * r} ${cx + r} ${cy}` +
        ` C ${cx + r} ${cy + k * r} ${cx + k * r} ${cy + r} ${cx} ${cy + r}`;
    }
    return '';
  }

}
