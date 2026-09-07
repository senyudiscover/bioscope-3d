'use client';

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as THREE from 'three';
import {
  BRAIN_ASSET,
  BRAIN_STRUCTURE_COUNT,
  DEFAULT_HIDDEN_BRAIN_CATEGORIES,
  findBrainMetadataOwner,
  getBrainAppearance,
  getBrainStructureId,
  type BrainManifestNode,
  type BrainVisualState,
} from '@/lib/brain-atlas';

export type BrainRuntimeStats = {
  structures: number;
  meshes: number;
  fps: number;
  raycastMs: number;
  draws: number;
  triangles: number;
};

type BrainViewerProps = {
  nodesById: ReadonlyMap<number, BrainManifestNode>;
  visualState: BrainVisualState;
  focusNonce: number;
  resetNonce: number;
  onSelect: (id: number) => void;
  onReady: (stats: BrainRuntimeStats) => void;
  onStats: (stats: BrainRuntimeStats) => void;
  onError: (message: string) => void;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  onError: (message: string) => void;
};

class BrainErrorBoundary extends Component<
  ErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error.message || 'Unable to load the brain model.');
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function LoadingModel() {
  return (
    <Html center>
      <div className="whitespace-nowrap rounded-full border border-white/10 bg-[#120f18]/90 px-4 py-2 font-mono text-[10px] tracking-[0.14em] text-zinc-300 shadow-xl">
        DECODING 437 STRUCTURES…
      </div>
    </Html>
  );
}

function BrainScene({
  nodesById,
  visualState,
  focusNonce,
  resetNonce,
  onSelect,
  onReady,
  onStats,
  onError,
}: BrainViewerProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const gltf = useGLTF(BRAIN_ASSET.url, false, true, (loader) => {
    const draco = new DRACOLoader();
    draco.setDecoderPath(BRAIN_ASSET.decoderPath);
    (
      loader as unknown as { setDRACOLoader: (value: unknown) => void }
    ).setDRACOLoader(draco);
  });
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const meshesById = useRef(new Map<number, THREE.Mesh[]>());
  const allMeshes = useRef<THREE.Mesh[]>([]);
  const baseEmissive = useRef(new Map<THREE.Material, number>());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusGoal, setFocusGoal] = useState<{
    center: THREE.Vector3;
    distance: number;
  } | null>(null);
  const initialized = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());
  const lastHoverAt = useRef(0);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const raycastMs = useRef(0);
  const frameCount = useRef(0);
  const statsStartedAt = useRef(0);

  const collectStats = useCallback(
    () => ({
      structures: meshesById.current.size,
      meshes: allMeshes.current.length,
      fps: 0,
      raycastMs: Math.round(raycastMs.current * 100) / 100,
      draws: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    }),
    [gl],
  );

  const frameBrain = useCallback(() => {
    const box = new THREE.Box3();
    for (const mesh of allMeshes.current) {
      const id = Number(mesh.userData.brainStructureId);
      const category = nodesById.get(id)?.category;
      if (
        category &&
        !DEFAULT_HIDDEN_BRAIN_CATEGORIES.includes(
          category as (typeof DEFAULT_HIDDEN_BRAIN_CATEGORIES)[number],
        )
      ) {
        box.expandByObject(mesh);
      }
    }
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    camera.position.set(
      center.x + size * 0.55,
      center.y + size * 0.3,
      center.z + size * 0.75,
    );
    controlsRef.current?.target.copy(center);
    controlsRef.current?.update();
  }, [camera, nodesById]);

  useEffect(() => {
    if (initialized.current) return;
    const registered = new Set<number>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const owner = findBrainMetadataOwner(object);
      const id = getBrainStructureId(owner);
      if (id === null) return;
      const expected = nodesById.get(id);
      if (!expected) return;

      const rawCategory = owner?.userData?.bx_cat;
      const rawLabel = owner?.userData?.bx_label;
      const ownerCategory =
        typeof rawCategory === 'string' ? rawCategory : expected.category;
      const ownerLabel =
        typeof rawLabel === 'string' ? rawLabel : expected.label;
      if (
        ownerCategory !== expected.category ||
        ownerLabel !== expected.label
      ) {
        onError(`Brain metadata mismatch at structure ${id}.`);
        return;
      }

      const materials = (
        Array.isArray(object.material) ? object.material : [object.material]
      ).map((material) => {
        const clone = material.clone();
        clone.transparent = true;
        if (clone instanceof THREE.MeshStandardMaterial) {
          baseEmissive.current.set(clone, clone.emissiveIntensity);
        }
        return clone;
      });
      object.material = Array.isArray(object.material)
        ? materials
        : materials[0];
      object.userData.brainStructureId = id;
      object.geometry.computeBoundingBox();
      allMeshes.current.push(object);
      const members = meshesById.current.get(id) ?? [];
      members.push(object);
      meshesById.current.set(id, members);
      registered.add(id);
    });

    if (registered.size !== BRAIN_STRUCTURE_COUNT) {
      onError(
        `Brain model registered ${registered.size}/${BRAIN_STRUCTURE_COUNT} structures.`,
      );
      return;
    }
    initialized.current = true;
    frameBrain();
    onReady(collectStats());
    const registeredMeshes = allMeshes.current;
    return () => {
      for (const mesh of registeredMeshes) {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach((material) => material.dispose());
      }
    };
  }, [collectStats, frameBrain, nodesById, onError, onReady, scene]);

  useEffect(() => {
    meshesById.current.forEach((meshes, id) => {
      const node = nodesById.get(id);
      if (!node) return;
      const appearance = getBrainAppearance(node, visualState);
      for (const mesh of meshes) {
        mesh.visible = appearance.visible;
        mesh.renderOrder = appearance.highlighted ? 2 : 0;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const material of materials) {
          material.opacity = appearance.opacity;
          material.depthWrite = appearance.opacity >= 0.98;
          if (material instanceof THREE.MeshStandardMaterial) {
            const isHovered = id === hoveredId && !appearance.highlighted;
            material.emissive.set(
              appearance.highlighted
                ? '#ff5038'
                : isHovered
                  ? '#612319'
                  : '#000000',
            );
            material.emissiveIntensity = appearance.highlighted
              ? 0.72
              : isHovered
                ? 0.45
                : (baseEmissive.current.get(material) ?? 0);
          }
        }
      }
    });
  }, [hoveredId, nodesById, visualState]);

  useEffect(() => {
    if (focusNonce === 0 || visualState.selectedId === null) return;
    const members = meshesById.current.get(visualState.selectedId);
    if (!members?.length) return;
    const box = new THREE.Box3();
    members.forEach((mesh) => box.expandByObject(mesh));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    setFocusGoal({ center, distance: Math.max(size * 1.1, 0.06) });
  }, [focusNonce, visualState.selectedId]);

  useEffect(() => {
    if (resetNonce === 0) return;
    const frame = requestAnimationFrame(() => {
      frameBrain();
      setFocusGoal(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [frameBrain, resetNonce]);

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.current.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc.current, camera);
      const candidates = allMeshes.current.filter((mesh) => {
        if (!mesh.visible) return false;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        return materials.some((material) => material.opacity > 0.05);
      });
      const startedAt = performance.now();
      const hit = raycaster.current.intersectObjects(candidates, false)[0];
      raycastMs.current = performance.now() - startedAt;
      return hit ? Number(hit.object.userData.brainStructureId) : null;
    },
    [camera, gl],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverAt.current < 40) return;
      lastHoverAt.current = now;
      const id = pick(event.clientX, event.clientY);
      setHoveredId(id);
      canvas.style.cursor = id === null ? 'grab' : 'pointer';
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerDown.current = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = pointerDown.current;
      pointerDown.current = null;
      if (
        !start ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5
      )
        return;
      const id = pick(event.clientX, event.clientY);
      if (id !== null) onSelect(id);
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, onSelect, pick]);

  useFrame((_state, delta) => {
    if (focusGoal) {
      const direction = camera.position
        .clone()
        .sub(focusGoal.center)
        .normalize();
      const destination = focusGoal.center
        .clone()
        .addScaledVector(direction, focusGoal.distance);
      const damping = 1 - Math.pow(0.001, delta);
      camera.position.lerp(destination, damping);
      controlsRef.current?.target.lerp(focusGoal.center, damping);
      controlsRef.current?.update();
      if (camera.position.distanceTo(destination) < focusGoal.distance * 0.01) {
        setFocusGoal(null);
      }
    }

    frameCount.current += 1;
    const now = performance.now();
    if (statsStartedAt.current === 0) statsStartedAt.current = now;
    if (now - statsStartedAt.current >= 1000) {
      const stats = collectStats();
      stats.fps =
        Math.round(
          (frameCount.current / ((now - statsStartedAt.current) / 1000)) * 10,
        ) / 10;
      onStats(stats);
      frameCount.current = 0;
      statsStartedAt.current = now;
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[0, 4, 6]} intensity={1.55} />
      <directionalLight position={[-4, -2, -4]} intensity={0.45} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.12}
      />
      <primitive object={scene} />
    </>
  );
}

export function BrainViewer(props: BrainViewerProps) {
  return (
    <BrainErrorBoundary onError={props.onError}>
      <Canvas
        dpr={[1, 1.25]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 42, near: 0.001, far: 1000 }}
        aria-label="Interactive 3D brain atlas"
      >
        <Suspense fallback={<LoadingModel />}>
          <BrainScene {...props} />
        </Suspense>
      </Canvas>
    </BrainErrorBoundary>
  );
}
