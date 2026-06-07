import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Subscription } from 'rxjs';
import { PanelGeometryService, PanelData } from '../../services/panel-geometry';
import { SettingsService } from '../../services/settings.service';


@Component({
  selector: 'app-box-panel-three',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './box-panel-3d.html',
  styleUrl: './box-panel-3d.scss'
})
export class BoxPanelThreeComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  explodeValue = 0;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private labelRenderer!: CSS2DRenderer;
  private animId!: number;
  private boxGroup!: THREE.Group;
  private panelGroups: { label: string, group: THREE.Group, base: THREE.Vector3 }[] = [];
  private sub!: Subscription;
  private hasBuilt = false;
  private mat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 });

  constructor(private panelGeometry: PanelGeometryService, private settingsService: SettingsService) { }

  ngOnInit() {
    this.initThree();
    this.animate();
    this.sub = this.panelGeometry.panels$.subscribe(panels => {
      if (panels.length > 0 && this.scene) this.buildScene(panels);
    });
    this.settingsService.settings$.subscribe(s => {
      this.updatePanelVisibility(s.includeBase, s.includeLid);
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
    this.sub?.unsubscribe();
    this.labelRenderer?.domElement.remove();
  }

  onExplode() {
    this.applyExplode(this.explodeValue);
  }

  private initThree() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0xe8e9ed);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xe8e9ed, 800, 2000);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
    this.camera.position.set(400, 300, 500);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xfff5e0, 1.8);
    key.position.set(300, 500, 300);
    key.castShadow = true;
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd0d8e8, 0.4));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.add(new THREE.GridHelper(1000, 20, 0xb8bcc8, 0xc8ccd8));

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    canvas.parentElement!.appendChild(this.labelRenderer.domElement);

    window.addEventListener('resize', () => this.onResize());
  }

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  private buildScene(panels: PanelData[]) {
    console.log('3D received:', panels.map(p => p.label));
    if (this.boxGroup) this.scene.remove(this.boxGroup);
    this.boxGroup = new THREE.Group();
    this.panelGroups = [];



  const front = panels.find((p: PanelData) => p.label === 'FRONT');
const side = panels.find((p: PanelData) => p.label === 'LEFT SIDE');
const W = front?.w ?? 200;
const H = front?.h ?? 100;
const D = side?.w ?? 150;

    for (const panel of panels) {
      const shape = this.svgToShape(panel.pathData);

     /*  const geo = new THREE.ExtrudeGeometry(shape, { depth: panel.t, bevelEnabled: false });
      //const geo = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: 0xf0f0f0, roughness: 0.4
      }));
      mesh.castShadow = mesh.receiveShadow = true;*/

      // Replace the mesh creation with this
     const geo = new THREE.ExtrudeGeometry(shape, { depth: panel.t, bevelEnabled: false });
      
      geo.computeVertexNormals();

      // const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      //   color: 0xd4c5a0,
      //   roughness: 0.6,
      //   metalness: 0.05,
      //   flatShading: false
      // }));

//       const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
//   color: 0xc8a96e,
//   roughness: 0.8,
//   metalness: 0.0,
//   flatShading: false
// }));

      const faceMaterial = new THREE.MeshStandardMaterial({
  color: 0xc8a96e,
  roughness: 0.8,
  metalness: 0.0,
});

const endMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8c98a,
  roughness: 0.9,
  metalness: 0.0,
});

const mesh = new THREE.Mesh(geo, [faceMaterial, endMaterial, endMaterial]);

      mesh.castShadow = mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(geo, 80);
       const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x4f6ef7 }));

      const group = new THREE.Group();
      group.add(mesh);
     group.add(line);

      const markerGeo = new THREE.SphereGeometry(3, 8, 8);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(0, panel.t, 0);
      group.add(marker);

      const marker2 = new THREE.Mesh(
        new THREE.SphereGeometry(3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      marker2.position.set(panel.w, panel.t, 0);
      group.add(marker2);

      const marker3 = new THREE.Mesh(
        new THREE.SphereGeometry(3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x0000ff })
      );
      marker3.position.set(panel.w, panel.h, 0);
      group.add(marker3);

      const labelPos = new THREE.Vector3(panel.w / 2, panel.h / 2, panel.t + 1);
      this.addLabel(panel.label, labelPos, group);

      this.positionPanel(panel, group, W, H, D);
      this.boxGroup.add(group);

      const base = group.position.clone();
      this.panelGroups.push({ label: panel.label, group, base });
    }

    this.scene.add(this.boxGroup);

    if (!this.hasBuilt) {
      const maxDim = Math.max(W, H, D);
      this.camera.position.set(maxDim * 1.4, maxDim, maxDim * 1.6);
      this.camera.lookAt(0, H / 2, 0);
      this.controls.target.set(0, H / 2, 0);
      this.hasBuilt = true;
    }
    /*console.log('includeBase:', panels.some(p => p.label === 'BASE'));
    console.log('includeLid:', panels.some(p => p.label === 'LID'));*/

    const s = this.settingsService.settings$.getValue();
    this.updatePanelVisibility(s.includeBase, s.includeLid);

    // X axis — red
    const xAxis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(200, 0, 0)
      ]),
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    this.scene.add(xAxis);

    // Y axis — green
    const yAxis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 200, 0)
      ]),
      new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );
    this.scene.add(yAxis);

    // Z axis — blue
    const zAxis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 200)
      ]),
      new THREE.LineBasicMaterial({ color: 0x0000ff })
    );
    this.scene.add(zAxis);

    // labels
    this.addLabel('X', new THREE.Vector3(210, 0, 0), this.boxGroup);
    this.addLabel('Y', new THREE.Vector3(0, 210, 0), this.boxGroup);
    this.addLabel('Z', new THREE.Vector3(0, 0, 210), this.boxGroup);
    

    this.applyExplode(this.explodeValue);

    for (const { label, group } of this.panelGroups) {
  console.log(`${label} x:${group.position.x.toFixed(1)} y:${group.position.y.toFixed(1)} z:${group.position.z.toFixed(1)} | rx:${(group.rotation.x * 180/Math.PI).toFixed(0)}° ry:${(group.rotation.y * 180/Math.PI).toFixed(0)}° rz:${(group.rotation.z * 180/Math.PI).toFixed(0)}°`);
}
  }

  private svgToShape(pathData: string): THREE.Shape {
    const shape = new THREE.Shape();
    const commands = pathData.match(/[MLCZVHmlczvh][^MLCZVHmlczvh]*/g) || [];

    let currentPath: THREE.Shape | THREE.Path = shape;
    let isFirst = true;
    let cx = 0, cy = 0;

    for (const cmd of commands) {
      const type = cmd[0];
      const upper = type.toUpperCase();
      const rel = type === type.toLowerCase() && type !== 'Z' && type !== 'z';
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

      switch (upper) {
        case 'M': {
          const x = rel ? cx + args[0] : args[0];
          const y = rel ? cy + args[1] : args[1];
          if (isFirst) {
            shape.moveTo(x, y);
            currentPath = shape;
            isFirst = false;
          } else {
            const hole = new THREE.Path();
            hole.moveTo(x, y);
            shape.holes.push(hole);
            currentPath = hole;
          }
          cx = x; cy = y;
          break;
        }
        case 'L': {
          for (let i = 0; i + 1 < args.length; i += 2) {
            const x = rel ? cx + args[i] : args[i];
            const y = rel ? cy + args[i + 1] : args[i + 1];
            currentPath.lineTo(x, y);
            cx = x; cy = y;
          }
          break;
        }
        case 'H': {
          for (let i = 0; i < args.length; i++) {
            const x = rel ? cx + args[i] : args[i];
            currentPath.lineTo(x, cy);
            cx = x;
          }
          break;
        }
        case 'V': {
          for (let i = 0; i < args.length; i++) {
            const y = rel ? cy + args[i] : args[i];
            currentPath.lineTo(cx, y);
            cy = y;
          }
          break;
        }
        case 'C': {
          for (let i = 0; i + 5 < args.length; i += 6) {
            const cp1x = rel ? cx + args[i] : args[i];
            const cp1y = rel ? cy + args[i + 1] : args[i + 1];
            const cp2x = rel ? cx + args[i + 2] : args[i + 2];
            const cp2y = rel ? cy + args[i + 3] : args[i + 3];
            const ex = rel ? cx + args[i + 4] : args[i + 4];
            const ey = rel ? cy + args[i + 5] : args[i + 5];
            currentPath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
            cx = ex; cy = ey;
          }
          break;
        }
        case 'Z':
          try { currentPath.closePath(); } catch (e) { }
          break;
      }
    }

    return shape;
  }

  private positionPanel(panel: PanelData, group: THREE.Group, W: number, H: number, D: number) {
    switch (panel.label) {
  case 'FRONT':
  group.rotation.set(Math.PI, 0, 0);
  group.position.set(-W / 2, H, D / 2+ panel.t);
  break;
case 'BACK':
  group.rotation.set(0, Math.PI, Math.PI);
  group.position.set(-W / 2, H, -D / 2);
  break;
case 'LEFT SIDE':
  group.rotation.set(0, -Math.PI / 2, Math.PI);
  group.position.set(-W / 2+ panel.t, H-panel.t, D / 2 );
  break;
case 'RIGHT SIDE':
  group.rotation.set(0, -Math.PI / 2, Math.PI);
  group.position.set(W / 2, H-panel.t, D / 2);
  break;
case 'BASE':
  group.rotation.x = -Math.PI / 2;
  group.position.set(-W / 2 + panel.t, 0, D / 2 + panel.t);
  break;
case 'LID':
  group.rotation.x = -Math.PI / 2;
  group.position.set(-W / 2 + panel.t, H - panel.t, D / 2+ panel.t);
  break;
}

  



  }

  private applyExplode(e: number) {
    for (const { label, group, base } of this.panelGroups) {
      const pos = base.clone();
      switch (label) {
        case 'FRONT': pos.z += e; break;
        case 'BACK': pos.z -= e; break;
        case 'LEFT SIDE': pos.x -= e; break;
        case 'RIGHT SIDE': pos.x += e; break;
        case 'BASE': pos.y -= e; break;
        case 'LID': pos.y += e; break;
      }
      group.position.copy(pos);
    }
  }

  private addLabel(text: string, pos: THREE.Vector3, parent: THREE.Group) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = `
      font-family: 'Geist', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: rgba(79,110,247,0.9);
      pointer-events: none;
      white-space: nowrap;
      text-shadow: 0 0 4px rgba(255,255,255,0.9);
    `;
    const label = new CSS2DObject(div);
    label.position.copy(pos);
    parent.add(label);
  }

  private onResize() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  private updatePanelVisibility(includeBase: boolean, includeLid: boolean) {
    for (const { label, group } of this.panelGroups) {
      if (label === 'BASE') {
        group.visible = includeBase;
        console.log('BASE visibility:', includeBase);
      }
      if (label === 'LID') {
        group.visible = includeLid;
        console.log('LID visibility:', includeLid);
      }
    }
  }
}
