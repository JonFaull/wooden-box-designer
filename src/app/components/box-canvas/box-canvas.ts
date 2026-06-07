import { PanelGeometryService, PanelData } from '../../services/panel-geometry';
import {
  Component, OnInit, OnDestroy, OnChanges,
  ElementRef, ViewChild, Input, SimpleChanges
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';

@Component({
  selector: 'app-box-canvas',
  standalone: true,
  templateUrl: './box-canvas.html',
  styleUrl: './box-canvas.scss'
})
export class BoxCanvasComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() width = 200;
  @Input() height = 100;
  @Input() depth = 150;
  @Input() thickness = 9;
  @Input() fingerCount = 6;
  @Input() bitDiameter = 6;
  @Input() tolerance = 0.1;
  @Input() includeLid = false;
  @Input() includeBase = true;
  @Input() explode = 0;
  @Input() triggered = 0;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private animId!: number;
  private boxGroup!: THREE.Group;

  private panelFront!: THREE.Group;
  private panelBack!: THREE.Group;
  private panelLeft!: THREE.Group;
  private panelRight!: THREE.Group;
  private panelBase!: THREE.Group;
  private panelLid!: THREE.Group;

  private readonly whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.4,
    metalness: 0.0,
  });
  private readonly dummyMat = new THREE.MeshStandardMaterial();

  ngOnInit() {
    this.initThree();
    this.buildBox();
    this.animate();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.scene && changes['triggered']) {
      this.buildBox();
    }
    if (this.scene && changes['explode']) {
      this.applyExplode(this.explode);
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
  }

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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

    // Ambient — soft base light
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Key light — main sun from top right
    const key = new THREE.DirectionalLight(0xfff5e0, 1.8);
    key.position.set(300, 500, 300);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 2000;
    key.shadow.camera.left = -500;
    key.shadow.camera.right = 500;
    key.shadow.camera.top = 500;
    key.shadow.camera.bottom = -500;
    key.shadow.bias = -0.001;
    this.scene.add(key);

    // Fill light — cool blue from left
    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.6);
    fill.position.set(-400, 200, -200);
    this.scene.add(fill);

    // Rim light — warm from behind
    const rim = new THREE.DirectionalLight(0xffe0c0, 0.4);
    rim.position.set(0, 100, -500);
    this.scene.add(rim);

    // Ground bounce
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd0d8e8, 0.4));

    // Ground plane to receive shadows
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(1000, 20, 0xb8bcc8, 0xc8ccd8);
    grid.position.y = 0.1;
    this.scene.add(grid);

    window.addEventListener('resize', () => this.onResize());
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private makeMesh(w: number, h: number, d: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.dummyMat);
    m.updateMatrix();
    return m;
  }

  private addMesh(w: number, h: number, d: number, x: number, y: number, z: number, parent: THREE.Group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.whiteMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }

  private addOutline(w: number, h: number, d: number, x: number, y: number, z: number, parent: THREE.Group) {
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
      new THREE.LineBasicMaterial({ color: 0x4f6ef7 })
    );
    line.position.set(x, y, z);
    parent.add(line);
  }

  private box3(w: number, h: number, d: number, x: number, y: number, z: number, parent: THREE.Group) {
    this.addMesh(w, h, d, x, y, z, parent);
    this.addOutline(w, h, d, x, y, z, parent);
  }

  // ── CSG: union all cutters then subtract once ─────────────────────────────

  private subtractAll(target: THREE.Mesh, cutters: THREE.Mesh[]): THREE.Mesh {
    if (cutters.length === 0) return target;

    target.matrixAutoUpdate = false;
    target.updateMatrix();

    let union = cutters[0];
    union.matrixAutoUpdate = false;
    union.updateMatrix();

    for (let i = 1; i < cutters.length; i++) {
      cutters[i].matrixAutoUpdate = false;
      cutters[i].updateMatrix();
      try { union = CSG.union(union, cutters[i]); }
      catch (e) { console.warn('union failed', e); }
    }

    target.updateMatrix();
    union.updateMatrix();
    let result = target;
    try { result = CSG.subtract(target, union); }
    catch (e) { console.warn('subtract failed', e); }

    result.material = this.whiteMat;
    result.castShadow = result.receiveShadow = true;
    return result;
  }

  // ── Side panel (left/right) with slots and dogbones ───────────────────────

  private buildSidePanel(
    panelH: number, panelD: number, panelW: number,
    fingers: number, fH: number,
    slotDepth: number, bitR: number
  ): THREE.Mesh {
    const hh = panelH / 2;
    const hd = panelD / 2;
    const sd = hd - slotDepth;
    const offset = bitR * Math.sqrt(2) / 2;

    const cutters: THREE.Mesh[] = [];

    for (let i = 0; i < fingers; i++) {
      if (i % 2 !== 0) continue;

      const y0 = -hh + i * fH;
      const y1 = y0 + fH;
      const fH_ = fH;
      const yMid = y0 + fH_ / 2;

      // Front slot
      const fs = this.makeMesh(panelW * 1.1, fH_, slotDepth);
      fs.position.set(0, yMid, hd - slotDepth / 2);
      fs.updateMatrix();
      cutters.push(fs);

      // Back slot
      const bs = this.makeMesh(panelW * 1.1, fH_, slotDepth);
      bs.position.set(0, yMid, -hd + slotDepth / 2);
      bs.updateMatrix();
      cutters.push(bs);

      // Dogbone corners
      const corners: [number, number, number][] = [
        ...(i === 0 ? [] : [[0, y0 + offset, sd + offset] as [number, number, number]]),
        ...(i === 0 ? [] : [[0, y0 + offset, -sd - offset] as [number, number, number]]),
        [0, y1 - offset, sd + offset],
        [0, y1 - offset, -sd - offset],
      ];

      for (const [cx, cy, cz] of corners) {
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(bitR, bitR, panelW * 1.1, 32),
          this.dummyMat
        );
        cyl.rotation.z = Math.PI / 2;
        cyl.position.set(cx, cy, cz);
        cyl.updateMatrix();
        cutters.push(cyl);
      }
    }

    const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, panelD), this.whiteMat);
    panel.updateMatrix();
    return this.subtractAll(panel, cutters);
  }

  // ── Front/back panel with dogbones at tab roots ───────────────────────────

  private addFrontBackEdges(
    w: number, h: number, d: number,
    fingers: number, fH: number,
    tabDepth: number, parent: THREE.Group
  ) {
    const mat = new THREE.LineBasicMaterial({ color: 0x4f6ef7 });
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const td = tabDepth; // tab protrusion = material thickness

    const line = (a: [number, number, number], b: [number, number, number]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...a), new THREE.Vector3(...b)
      ]);
      parent.add(new THREE.Line(geo, mat));
    };

    // Top face
    line([-hw, hh, -hd], [hw, hh, -hd]);
    line([-hw, hh, hd], [hw, hh, hd]);
    line([-hw, hh, -hd], [-hw, hh, hd]);
    line([hw, hh, -hd], [hw, hh, hd]);

    // Bottom face
    line([-hw, -hh, -hd], [hw, -hh, -hd]);
    line([-hw, -hh, hd], [hw, -hh, hd]);
    line([-hw, -hh, -hd], [-hw, -hh, hd]);
    line([hw, -hh, -hd], [hw, -hh, hd]);

    // Vertical edges — stepped profile on left and right sides
    for (const xSign of [-1, 1] as const) {
      const x = xSign * hw;
      const xTab = x + xSign * td; // tab extends outward

      for (let i = 0; i < fingers; i++) {
        const y0 = -hh + i * fH;
        const y1 = y0 + fH;
        const isTab = i % 2 === 0;

        if (isTab) {
          // Tab row — protrudes outward in X
          line([x, y0, -hd], [x, y0, hd]);  // step in
          line([x, y0, -hd], [xTab, y0, -hd]);  // top step face front
          line([x, y0, hd], [xTab, y0, hd]);  // top step face back
          line([xTab, y0, -hd], [xTab, y1, -hd]);  // tab front edge
          line([xTab, y0, hd], [xTab, y1, hd]);  // tab back edge
          line([xTab, y0, -hd], [xTab, y0, hd]);  // tab top face
          line([xTab, y1, -hd], [xTab, y1, hd]);  // tab bottom face
          line([x, y1, -hd], [xTab, y1, -hd]);  // bottom step face front
          line([x, y1, hd], [xTab, y1, hd]);  // bottom step face back
          line([x, y1, -hd], [x, y1, hd]);  // step out
        } else {
          // Slot row — stays at panel edge
          line([x, y0, -hd], [x, y1, -hd]);
          line([x, y0, hd], [x, y1, hd]);
        }
      }
    }

    // Front and back face vertical lines
    for (const zSign of [-1, 1] as const) {
      const z = zSign * hd;
      for (let i = 0; i < fingers; i++) {
        const y0 = -hh + i * fH;
        const y1 = y0 + fH;
        const isTab = i % 2 === 0;
        if (!isTab) {
          line([-hw, y0, z], [-hw, y1, z]);
          line([hw, y0, z], [hw, y1, z]);
        }
      }
    }
  }

  private buildFrontBackPanel(
    panelW: number, panelH: number, panelD: number,
    fingers: number, fH: number, bitR: number,
    parent: THREE.Group
  ) {
    const hh = panelH / 2;
    const hw = panelW / 2;
    const offset = bitR * Math.sqrt(2) / 2;

    // Main panel body — mesh only
    this.addMesh(panelW, panelH, panelD, 0, 0, 0, parent);

    // Tabs on even rows with dogbone cutouts
    for (let i = 0; i < fingers; i++) {


      if (i % 2 !== 0) continue;

      const yPos = -hh + i * fH + fH / 2;
      const isFirst = i === 0;
      const isLast = i === fingers - 1;

      // Dogbone corners in local tab space
      // Tab is centred at (0,0,0) locally, size panelD x fH x panelD
      // Corners are at y=±fH/2, z=±panelD/2
      const corners: [number, number, number][] = [
        ...(isFirst ? [] : [[0, -fH / 2 + offset, -panelD / 2 + offset] as [number, number, number]]),
        ...(isFirst ? [] : [[0, -fH / 2 + offset, panelD / 2 - offset] as [number, number, number]]),
        ...(isLast ? [] : [[0, fH / 2 - offset, -panelD / 2 + offset] as [number, number, number]]),
        ...(isLast ? [] : [[0, fH / 2 - offset, panelD / 2 - offset] as [number, number, number]]),
      ];

      const tabCutters: THREE.Mesh[] = corners.map(([cx, cy, cz]) => {
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(bitR, bitR, panelD * 1.5, 32),
          this.dummyMat
        );
        cyl.rotation.z = Math.PI / 2;
        cyl.position.set(cx, cy, cz);
        cyl.updateMatrix();
        return cyl;
      });

      // Left tab
      let leftTab: THREE.Mesh = new THREE.Mesh(
        new THREE.BoxGeometry(panelD, fH, panelD),
        this.whiteMat.clone()
      );
      leftTab.position.set(-hw - panelD / 2, yPos, 0);
      leftTab.updateMatrix();
      if (tabCutters.length > 0) {
        leftTab = this.subtractAll(
          leftTab,
          tabCutters.map(c => { const m = c.clone(); m.updateMatrix(); return m; })
        );
        leftTab.position.set(-hw - panelD / 2, yPos, 0);
      }
      leftTab.castShadow = leftTab.receiveShadow = true;
      parent.add(leftTab);

      // Right tab
      let rightTab: THREE.Mesh = new THREE.Mesh(
        new THREE.BoxGeometry(panelD, fH, panelD),
        this.whiteMat.clone()
      );
      rightTab.position.set(hw + panelD / 2, yPos, 0);
      rightTab.updateMatrix();
      if (tabCutters.length > 0) {
        rightTab = this.subtractAll(
          rightTab,
          tabCutters.map(c => { const m = c.clone(); m.updateMatrix(); return m; })
        );
        rightTab.position.set(hw + panelD / 2, yPos, 0);
      }
      rightTab.castShadow = rightTab.receiveShadow = true;
      parent.add(rightTab);
    }

    // Manual edge lines for whole panel including tabs
    this.addFrontBackEdges(panelW, panelH, panelD, fingers, fH, panelD, parent);
  }
  // ── Panel edge lines ──────────────────────────────────────────────────────

  private addPanelEdges(w: number, h: number, d: number, fingers: number, fH: number, parent: THREE.Group) {
    const mat = new THREE.LineBasicMaterial({ color: 0x4f6ef7 });
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const sd = hd - w;

    const line = (a: [number, number, number], b: [number, number, number]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...a), new THREE.Vector3(...b)
      ]);
      parent.add(new THREE.Line(geo, mat));
    };

    line([-hw, hh, -hd], [hw, hh, -hd]); line([-hw, hh, hd], [hw, hh, hd]);
    line([-hw, hh, -hd], [-hw, hh, hd]); line([hw, hh, -hd], [hw, hh, hd]);
    line([-hw, -hh, -hd], [hw, -hh, -hd]); line([-hw, -hh, hd], [hw, -hh, hd]);
    line([-hw, -hh, -hd], [-hw, -hh, hd]); line([hw, -hh, -hd], [hw, -hh, hd]);

    for (const xSign of [-1, 1] as const) {
      const x = xSign * hw;
      for (let i = 0; i < fingers; i++) {
        const y0 = -hh + i * fH;
        const y1 = y0 + fH;
        if (i % 2 !== 0) {
          line([x, y0, -hd], [x, y1, -hd]);
          line([x, y0, hd], [x, y1, hd]);
        } else {
          line([x, y0, -sd], [x, y1, -sd]); line([x, y0, sd], [x, y1, sd]);
          line([x, y0, -hd], [x, y0, -sd]); line([x, y0, hd], [x, y0, sd]);
          line([x, y1, -hd], [x, y1, -sd]); line([x, y1, hd], [x, y1, sd]);
        }
      }
    }

    for (const zSign of [-1, 1] as const) {
      const z = zSign * hd;
      for (let i = 0; i < fingers; i++) {



        if (i % 2 !== 0) {
          const y0 = -hh + i * fH, y1 = y0 + fH;
          line([-hw, y0, z], [-hw, y1, z]);
          line([hw, y0, z], [hw, y1, z]);
        }
      }
    }
  }

  // ── Build box ─────────────────────────────────────────────────────────────

  private buildBox() {
    if (this.boxGroup) this.scene.remove(this.boxGroup);
    this.boxGroup = new THREE.Group();

    const W = this.width;
    const H = this.height;
    const D = this.depth;
    const t = this.thickness;
    const f = Math.max(2, this.fingerCount);
    const fH = H / f;
    const bitR = this.bitDiameter / 2;

    // ── FRONT ───────────────────────────────────────────────────────────
    this.panelFront = new THREE.Group();
    this.buildFrontBackPanel(W, H, t, f, fH, bitR, this.panelFront);
    this.panelFront.position.set(0, H / 2, D / 2 - t / 2);
    this.boxGroup.add(this.panelFront);

    // ── BACK ────────────────────────────────────────────────────────────
    this.panelBack = new THREE.Group();
    this.buildFrontBackPanel(W, H, t, f, fH, bitR, this.panelBack);
    this.panelBack.position.set(0, H / 2, -D / 2 + t / 2);
    this.boxGroup.add(this.panelBack);

    // ── LEFT ────────────────────────────────────────────────────────────
    this.panelLeft = new THREE.Group();
    const leftMesh = this.buildSidePanel(H, D, t, f, fH, t, bitR);
    this.panelLeft.add(leftMesh);
    this.addPanelEdges(t, H, D, f, fH, this.panelLeft);
    this.panelLeft.position.set(-W / 2 - t / 2, H / 2, 0);
    this.boxGroup.add(this.panelLeft);

    // ── RIGHT ───────────────────────────────────────────────────────────
    this.panelRight = new THREE.Group();
    const rightMesh = this.buildSidePanel(H, D, t, f, fH, t, bitR);
    this.panelRight.add(rightMesh);
    this.addPanelEdges(t, H, D, f, fH, this.panelRight);
    this.panelRight.position.set(W / 2 + t / 2, H / 2, 0);
    this.boxGroup.add(this.panelRight);

    // ── BASE ────────────────────────────────────────────────────────────
    if (this.includeBase) {
      this.panelBase = new THREE.Group();
      this.box3(W, t, D, 0, 0, 0, this.panelBase);
      this.panelBase.position.set(0, t / 2, 0);
      this.boxGroup.add(this.panelBase);
    }

    // ── LID ─────────────────────────────────────────────────────────────
    if (this.includeLid) {
      this.panelLid = new THREE.Group();
      this.box3(W, t, D, 0, 0, 0, this.panelLid);
      this.panelLid.position.set(0, H + t / 2, 0);
      this.boxGroup.add(this.panelLid);
    }

    this.scene.add(this.boxGroup);

    const maxDim = Math.max(W, H, D);
    this.camera.position.set(maxDim * 1.4, maxDim * 1.0, maxDim * 1.6);
    this.camera.lookAt(0, H / 2, 0);
    this.controls.target.set(0, H / 2, 0);

    this.applyExplode(this.explode);
  }

  private applyExplode(amount: number) {
    const W = this.width, H = this.height, D = this.depth, t = this.thickness, e = amount;
    if (this.panelFront) this.panelFront.position.set(0, H / 2, D / 2 - t / 2 + e);
    if (this.panelBack) this.panelBack.position.set(0, H / 2, -D / 2 + t / 2 - e);
    if (this.panelLeft) this.panelLeft.position.set(-W / 2 - t / 2 - e, H / 2, 0);
    if (this.panelRight) this.panelRight.position.set(W / 2 + t / 2 + e, H / 2, 0);
    if (this.panelBase) this.panelBase.position.set(0, t / 2 - e, 0);
    if (this.panelLid) this.panelLid.position.set(0, H + t / 2 + e, 0);
  }

  private onResize() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
