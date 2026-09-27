import maplibregl, { type CustomLayerInterface, type Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import { createBusModel, createTrolleyModel } from "@/lib/vehicle-models";
import type { Vehicle } from "@/lib/vehicles";

const ORIGIN: [number, number] = [23.687, 52.097];

export class VehicleLayer implements CustomLayerInterface {
  id = "vehicles-3d";
  type = "custom" as const;
  renderingMode = "3d" as const;

  private map: MapLibreMap | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private root = new THREE.Group();
  private buses: THREE.Group[] = [];
  private trolleys: THREE.Group[] = [];
  private vehicles: Vehicle[] = [];
  private originMercator = maplibregl.MercatorCoordinate.fromLngLat(
    { lng: ORIGIN[0], lat: ORIGIN[1] },
    0,
  );
  highlightedId: string | null = null;

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const hemi = new THREE.HemisphereLight("#f4f1ea", "#8a8a86", 1.05);
    const dir = new THREE.DirectionalLight("#ffffff", 0.85);
    dir.position.set(40, 80, 30);
    this.scene.add(hemi, dir, this.root);

    for (let i = 0; i < 70; i++) {
      const bus = createBusModel();
      bus.visible = false;
      this.root.add(bus);
      this.buses.push(bus);
    }
    for (let i = 0; i < 40; i++) {
      const t = createTrolleyModel();
      t.visible = false;
      this.root.add(t);
      this.trolleys.push(t);
    }
  }

  onRemove() {
    this.renderer?.dispose();
    this.scene.clear();
    this.map = null;
  }

  setVehicles(list: Vehicle[]) {
    this.vehicles = list;
    this.map?.triggerRepaint();
  }

  private toScene(lng: number, lat: number) {
    const merc = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat }, 0);
    const s = this.originMercator.meterInMercatorCoordinateUnits();
    return {
      x: (merc.x - this.originMercator.x) / s,
      y: -(merc.y - this.originMercator.y) / s,
      z: ((merc.z ?? 0) - (this.originMercator.z ?? 0)) / s,
    };
  }

  render(_gl: WebGL2RenderingContext, args: { defaultProjectionData: { mainMatrix: ArrayLike<number> } }) {
    const map = this.map;
    const renderer = this.renderer;
    if (!map || !renderer) return;

    const origin = this.originMercator;
    const scale = origin.meterInMercatorCoordinateUnits();
    const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as number[]);
    const l = new THREE.Matrix4()
      .makeTranslation(origin.x, origin.y, origin.z ?? 0)
      .scale(new THREE.Vector3(scale, -scale, scale));
    this.camera.projectionMatrix = m.multiply(l);

    const busPool = this.buses;
    const trolPool = this.trolleys;
    busPool.forEach((g) => (g.visible = false));
    trolPool.forEach((g) => (g.visible = false));

    let bi = 0;
    let ti = 0;
    for (const v of this.vehicles) {
      const pool = v.kind === "bus" ? busPool : trolPool;
      const idx = v.kind === "bus" ? bi++ : ti++;
      if (idx >= pool.length) continue;
      const mesh = pool[idx];
      const p = this.toScene(v.lng, v.lat);
      mesh.visible = true;
      mesh.position.set(p.x, p.y, p.z);
      // Z-up scene: X east, Y north, Z up. Model is Y-up facing +Z, so pitch to ground then yaw.
      mesh.rotation.set(Math.PI / 2, 0, THREE.MathUtils.degToRad(-v.bearing));
      const hi = this.highlightedId && v.id === this.highlightedId;
      mesh.scale.setScalar(hi ? 1.18 : 1);
    }

    renderer.resetState();
    renderer.render(this.scene, this.camera);
    map.triggerRepaint();
  }
}
