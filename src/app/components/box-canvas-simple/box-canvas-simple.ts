import {
  Component, OnInit, OnDestroy, OnChanges,
  ElementRef, ViewChild, Input, SimpleChanges
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Subscription } from 'rxjs';
import { PanelGeometryService, PanelData } from '../../services/panel-geometry';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

@Component({
  selector: 'app-box-canvas-simple',
  standalone: true,
  templateUrl: './box-canvas-simple.html',
  styleUrl: './box-canvas-simple.scss'
})
export class BoxCanvasSimpleComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() width = 200;
  @Input() height = 100;
  @Input() depth = 150;
  @Input() thickness = 9;
  @Input() explode = 0;
  @Input() triggered = 0;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private animId!: number;
  private boxGroup!: THREE.Group;
  private sub!: Subscription;
  private hasBuiltOnce = false;
  private labelRenderer!: CSS2DRenderer;

  private readonly whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0, roughness: 0.4, metalness: 0.0,
  });

  private panelGroups: { label: string, group: THREE.Group }[] = [];

  constructor(private panelGeometry: PanelGeometryService) { }

  ngOnInit() {
    this.initThree();
    this.animate();

    this.sub = this.panelGeometry.panels$.subscribe(panels => {
      if (panels.length > 0 && this.scene) {
        this.buildBoxFrom2D(panels);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.scene && changes['explode']) {
      this.applyExplode(this.explode);
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
    this.sub?.unsubscribe();
    this.labelRenderer?.domElement.remove();
  }

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  private initThree() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xe8e9ed);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xe8e9ed, 800, 2000);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
    this.camera.position.set(400, 300, 500);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const key = new THREE.DirectionalLight(0xfff5e0, 1.8);
    key.position.set(300, 500, 300);
    key.castShadow = true;
    key.shadow.mapSize.width = key.shadow.mapSize.height = 2048;
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 2000;
    key.shadow.camera.left = key.shadow.camera.bottom = -500;
    key.shadow.camera.right = key.shadow.camera.top = 500;
    key.shadow.bias = -0.001;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.6);
    fill.position.set(-400, 200, -200);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffe0c0, 0.4);
    rim.position.set(0, 100, -500);
    this.scene.add(rim);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd0d8e8, 0.4));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(1000, 20, 0xb8bcc8, 0xc8ccd8);
    grid.position.y = 0.1;
    this.scene.add(grid);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    canvas.parentElement!.appendChild(this.labelRenderer.domElement);

    window.addEventListener('resize', () => this.onResize());
  }

  private addLabel(text: string, position: THREE.Vector3, parent: THREE.Group) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = `
      font-family: 'Geist', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #4f6ef7;
      background: rgba(255,255,255,0.85);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #4f6ef7;
      pointer-events: none;
      white-space: nowrap;
    `;
    const label = new CSS2DObject(div);
    label.position.copy(position);
    parent.add(label);
  }

  private buildBoxFrom2D(panels: PanelData[]) {
    if (this.boxGroup) this.scene.remove(this.boxGroup);
    this.boxGroup = new THREE.Group();
    this.panelGroups = [];

    const W = this.width;
    const H = this.height;
    const D = this.depth;
    const t = this.thickness;

    for (const panel of panels) {
      const shape = this.svgToShape(panel.pathData);

      const geo = new THREE.ExtrudeGeometry(shape, { depth: panel.t, bevelEnabled: false });
      const mesh = new THREE.Mesh(geo, this.whiteMat.clone());
      mesh.castShadow = mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(geo, 15);
      const line = new THREE.LineSegments(
        edges, new THREE.LineBasicMaterial({ color: 0x4f6ef7 })
      );

      const group = new THREE.Group();
      group.add(mesh);
      group.add(line);

      this.positionPanel(panel, group, W, H, D, t);

      // Add label at centre of panel
      const labelPos = new THREE.Vector3(panel.w / 2, panel.h / 2, panel.t / 2);
      this.addLabel(panel.label, labelPos, group);

      this.boxGroup.add(group);
      this.panelGroups.push({ label: panel.label, group });
    }

    this.scene.add(this.boxGroup);

    if (!this.hasBuiltOnce) {
      const maxDim = Math.max(W, H, D);
      this.camera.position.set(maxDim * 1.4, maxDim * 1.0, maxDim * 1.6);
      this.camera.lookAt(0, H / 2, 0);
      this.controls.target.set(0, H / 2, 0);
      this.hasBuiltOnce = true;
    }

    this.applyExplode(this.explode);
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

  private positionPanel(panel: PanelData, group: THREE.Group, W: number, H: number, D: number, t: number) {
    switch (panel.label) {
      case 'FRONT':
        group.position.set(-(W - 2 * t) / 2, 0, D / 2 - t);
        break;
      case 'BACK':
        group.rotation.y = Math.PI;
        group.position.set((W - 2 * t) / 2, 0, -D / 2 + t);
        break;
      case 'LEFT SIDE':
        group.rotation.y = Math.PI / 2;
        group.position.set(-W / 2, 0, D / 2);
        break;
      case 'RIGHT SIDE':
        group.rotation.y = -Math.PI / 2;
        group.position.set(W / 2, 0, -D / 2);
        break;
      case 'BASE':
        group.rotation.x = -Math.PI / 2;
        group.position.set(-(W - 2 * t) / 2, 0, (D - 2 * t) / 2);
        break;
      case 'LID':
        group.rotation.x = -Math.PI / 2;
        group.position.set(-(W - 2 * t) / 2, H - t, (D - 2 * t) / 2);
        break;
    }
  }

  private applyExplode(amount: number) {
    const W = this.width;
    const H = this.height;
    const D = this.depth;
    const t = this.thickness;
    const e = amount;

    for (const { label, group } of this.panelGroups) {
      switch (label) {
        case 'FRONT': group.position.set(-(W - 2 * t) / 2, 0, D / 2 - t + e); break;
        case 'BACK': group.position.set((W - 2 * t) / 2, 0, -D / 2 + t - e); break;
        case 'LEFT SIDE': group.position.set(-W / 2 - e, 0, D / 2); break;
        case 'RIGHT SIDE': group.position.set(W / 2 + e, 0, -D / 2); break;
        case 'BASE': group.position.set(-(W - 2 * t) / 2, -e, (D - 2 * t) / 2); break;
        case 'LID': group.position.set(-(W - 2 * t) / 2, H - t + e, (D - 2 * t) / 2); break;
      }
    }
  }

  private onResize() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }
}
