import * as THREE from "three";

function box(w: number, h: number, d: number, color: string, y = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.08 }),
  );
  mesh.position.y = y;
  mesh.castShadow = false;
  return mesh;
}

function glass(w: number, h: number, d: number, y: number, z = 0, x = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color: "#1a2430",
      roughness: 0.15,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
    }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function wheel(x: number, z: number) {
  const g = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 12);
  g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ color: "#1c1c1c", roughness: 0.7 }),
  );
  m.position.set(x, 0.48, z);
  return m;
}

/** Y-up city bus, facing +Z (front). Length ~12 m. */
export function createBusModel() {
  const g = new THREE.Group();
  g.add(box(2.5, 1.35, 11.4, "#1f4d46", 1.35));
  g.add(box(2.52, 0.18, 11.5, "#d9d3c7", 2.08));
  g.add(glass(2.2, 0.72, 10.2, 1.85, 0));
  g.add(glass(2.1, 0.78, 0.08, 1.7, 5.55));
  const bumper = box(2.45, 0.28, 0.22, "#cfc8ba", 0.78);
  bumper.position.z = 5.7;
  g.add(bumper);
  const lampL = box(0.28, 0.16, 0.08, "#f2ead4", 1.05);
  lampL.position.set(-0.78, 1.05, 5.72);
  const lampR = lampL.clone();
  lampR.position.x = 0.78;
  g.add(lampL, lampR);
  const dest = box(1.5, 0.28, 0.06, "#111814", 2.22);
  dest.position.z = 5.55;
  g.add(dest);
  for (const x of [-1.15, 1.15]) {
    g.add(wheel(x, 3.6));
    g.add(wheel(x, -3.4));
  }
  g.userData.length = 11.4;
  return g;
}

/** Y-up trolleybus with roof poles, facing +Z. Length ~14 m. */
export function createTrolleyModel() {
  const g = new THREE.Group();
  g.add(box(2.55, 1.42, 13.2, "#2c4a6e", 1.4));
  g.add(box(2.58, 0.16, 13.3, "#c9c3b6", 2.16));
  g.add(glass(2.22, 0.74, 12.0, 1.92, 0));
  g.add(glass(2.15, 0.82, 0.08, 1.74, 6.45));
  const skirt = box(2.5, 0.22, 13.1, "#243a58", 0.72);
  g.add(skirt);
  const lampL = box(0.3, 0.14, 0.08, "#f2ead4", 1.08);
  lampL.position.set(-0.82, 1.08, 6.62);
  const lampR = lampL.clone();
  lampR.position.x = 0.82;
  g.add(lampL, lampR);
  const housing = box(0.7, 0.22, 2.4, "#1a2c46", 2.36);
  g.add(housing);
  const poleMat = new THREE.MeshStandardMaterial({ color: "#2a2a28", roughness: 0.45, metalness: 0.4 });
  for (const x of [-0.28, 0.28]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.6, 6), poleMat);
    pole.position.set(x, 4.4, -1.4);
    pole.rotation.x = 0.42;
    g.add(pole);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.32), poleMat);
    shoe.position.set(x, 6.55, -3.45);
    g.add(shoe);
  }
  for (const x of [-1.18, 1.18]) {
    g.add(wheel(x, 4.2));
    g.add(wheel(x, -3.8));
  }
  g.userData.length = 13.2;
  return g;
}
