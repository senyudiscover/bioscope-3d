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
  BRAIN_CATEGORY_DIRECTIONS,
  BRAIN_CATEGORY_PALETTE,
  BRAIN_STRUCTURE_COUNT,
  DEFAULT_HIDDEN_BRAIN_CATEGORIES,
  findBrainMetadataOwner,
  getBrainAppearance,
  getBrainExplodePhases,
  getBrainStructureId,
  type BrainExplodeOffset,
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
  explodeProgress: number;
  focusNonce: number;
  resetNonce: number;
  onSelect: (id: number) => void;
  onReady: (stats: BrainRuntimeStats) => void;
  onStats: (stats: BrainRuntimeStats) => void;
  onError: (message: string) => void;
};

type ExplodeTransform = {
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  offset: BrainExplodeOffset;
};

const EXPLODE_EPSILON = 1e-8;

function normalizeOrFallback(
  vector: THREE.Vector3,
  fallback: readonly [number, number, number],
  minimumLength = 0,
) {
  if (
    vector.lengthSq() < Math.max(EXPLODE_EPSILON, minimumLength * minimumLength)
  ) {
    vector.fromArray(fallback);
  }
  return vector.normalize();
}

function worldOffsetToLocal(
  parent: THREE.Object3D | null,
  worldOffset: THREE.Vector3,
) {
  if (!parent) return worldOffset.clone();
  const inverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const origin = new THREE.Vector3().applyMatrix4(inverse);
  return worldOffset.clone().applyMatrix4(inverse).sub(origin);
}

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
  explodeProgress,
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
  const pickableMeshes = useRef<THREE.Mesh[]>([]);
  const explodeTransforms = useRef<ExplodeTransform[]>([]);
  const baseEmissive = useRef(new Map<THREE.Material, number>());
  const hoveredId = useRef<number | null>(null);
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
  const assembledCameraDistance = useRef(0);
  const focusedStructureId = useRef<number | null>(null);

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

  const applyMeshAppearance = useCallback(
    (
      mesh: THREE.Mesh,
      id: number,
      appearance: ReturnType<typeof getBrainAppearance>,
      isHovered: boolean,
    ) => {
      mesh.visible = appearance.visible;
      mesh.renderOrder = appearance.highlighted ? 3 : isHovered ? 2 : 0;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        material.opacity = appearance.opacity;
        material.depthWrite = appearance.opacity >= 0.98;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = appearance.highlighted
            ? 0.44
            : isHovered
              ? 0.52
              : 0.66;
          material.emissive.set(
            appearance.highlighted
              ? '#ff684f'
              : isHovered
                ? '#2b6672'
                : '#000000',
          );
          material.emissiveIntensity = appearance.highlighted
            ? 0.82
            : isHovered
              ? 0.62
              : (baseEmissive.current.get(material) ?? 0);
        }
      }
      mesh.userData.brainInteractionState = appearance.highlighted
        ? 'selected'
        : isHovered
          ? 'hovered'
          : 'normal';
      mesh.userData.brainStructureId = id;
    },
    [],
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
    assembledCameraDistance.current = camera.position.distanceTo(center);
    controlsRef.current?.target.copy(center);
    controlsRef.current?.update();
    focusedStructureId.current = null;
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
          clone.color.set(
            BRAIN_CATEGORY_PALETTE[expected.category] ?? '#b9978c',
          );
          clone.roughness = Math.max(0.58, clone.roughness);
          clone.metalness = Math.min(0.04, clone.metalness);
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

    scene.updateMatrixWorld(true);
    const wholeBrainBox = new THREE.Box3();
    const coreBrainBox = new THREE.Box3();
    const boxesById = new Map<number, THREE.Box3>();
    const boxesByCategory = new Map<string, THREE.Box3>();
    meshesById.current.forEach((meshes, id) => {
      const node = nodesById.get(id);
      if (!node) return;
      const structureBox = new THREE.Box3();
      meshes.forEach((mesh) => structureBox.expandByObject(mesh));
      boxesById.set(id, structureBox);
      wholeBrainBox.union(structureBox);
      if (node.core) coreBrainBox.union(structureBox);
      const categoryBox =
        boxesByCategory.get(node.category) ?? new THREE.Box3();
      categoryBox.union(structureBox);
      boxesByCategory.set(node.category, categoryBox);
    });

    const referenceBrainBox = coreBrainBox.isEmpty()
      ? wholeBrainBox
      : coreBrainBox;
    const wholeCenter = referenceBrainBox.getCenter(new THREE.Vector3());
    const brainDiagonal = Math.max(
      referenceBrainBox.getSize(new THREE.Vector3()).length(),
      0.001,
    );
    meshesById.current.forEach((meshes, id) => {
      const node = nodesById.get(id);
      const structureBox = boxesById.get(id);
      const categoryBox = node ? boxesByCategory.get(node.category) : undefined;
      if (!node || !structureBox || !categoryBox) return;

      const fallback = BRAIN_CATEGORY_DIRECTIONS[node.category] ?? [0, 1, 0];
      const categoryCenter = categoryBox.getCenter(new THREE.Vector3());
      const structureCenter = structureBox.getCenter(new THREE.Vector3());
      const categoryDelta = categoryCenter.clone().sub(wholeCenter);
      const categoryDirection = normalizeOrFallback(
        categoryDelta.clone(),
        fallback,
        brainDiagonal * 0.025,
      );
      const categoryDistance =
        Math.min(categoryDelta.length() * 0.65, brainDiagonal * 0.12) +
        brainDiagonal * 0.08;
      const categoryWorldOffset =
        categoryDirection.multiplyScalar(categoryDistance);

      const structureDelta = structureCenter.clone().sub(categoryCenter);
      const sideFallback: [number, number, number] = [
        node.side === 'left' ? -1 : node.side === 'right' ? 1 : fallback[0],
        fallback[1],
        fallback[2],
      ];
      const structureDirection = normalizeOrFallback(
        structureDelta.clone(),
        sideFallback,
        brainDiagonal * 0.003,
      );
      const structureDistance =
        Math.min(structureDelta.length(), brainDiagonal * 0.16) * 0.58 +
        brainDiagonal * 0.05;
      const structureWorldOffset =
        structureDirection.multiplyScalar(structureDistance);

      for (const mesh of meshes) {
        explodeTransforms.current.push({
          mesh,
          basePosition: mesh.position.clone(),
          offset: {
            category: worldOffsetToLocal(
              mesh.parent,
              categoryWorldOffset,
            ).toArray(),
            structure: worldOffsetToLocal(
              mesh.parent,
              structureWorldOffset,
            ).toArray(),
          },
        });
      }
    });
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
        applyMeshAppearance(
          mesh,
          id,
          appearance,
          id === hoveredId.current && !appearance.highlighted,
        );
      }
    });
    pickableMeshes.current = allMeshes.current.filter((mesh) => {
      if (!mesh.visible) return false;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      return materials.some((material) => material.opacity > 0.05);
    });
  }, [applyMeshAppearance, nodesById, visualState]);

  useEffect(() => {
    const phases = getBrainExplodePhases(explodeProgress);
    for (const transform of explodeTransforms.current) {
      const x =
        transform.offset.category[0] * phases.category +
        transform.offset.structure[0] * phases.structure;
      const y =
        transform.offset.category[1] * phases.category +
        transform.offset.structure[1] * phases.structure;
      const z =
        transform.offset.category[2] * phases.category +
        transform.offset.structure[2] * phases.structure;
      transform.mesh.position.set(
        transform.basePosition.x + x,
        transform.basePosition.y + y,
        transform.basePosition.z + z,
      );
    }
    scene.updateMatrixWorld(true);
    if (
      focusedStructureId.current !== null &&
      focusedStructureId.current === visualState.selectedId
    ) {
      const members = meshesById.current.get(focusedStructureId.current);
      const controls = controlsRef.current;
      if (members?.length && controls) {
        const box = new THREE.Box3();
        members.forEach((mesh) => box.expandByObject(mesh));
        const nextTarget = box.getCenter(new THREE.Vector3());
        camera.position.add(nextTarget.clone().sub(controls.target));
        controls.target.copy(nextTarget);
        controls.update();
      }
      return;
    }
    if (assembledCameraDistance.current > 0) {
      const target = controlsRef.current?.target ?? new THREE.Vector3();
      const direction = camera.position.clone().sub(target).normalize();
      const distance =
        assembledCameraDistance.current * (1 + explodeProgress * 0.0075);
      camera.position.copy(target).addScaledVector(direction, distance);
      controlsRef.current?.update();
    }
  }, [camera, explodeProgress, scene, visualState.selectedId]);

  useEffect(() => {
    if (focusNonce === 0 || visualState.selectedId === null) return;
    const members = meshesById.current.get(visualState.selectedId);
    if (!members?.length) return;
    focusedStructureId.current = visualState.selectedId;
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
      const startedAt = performance.now();
      const hit = raycaster.current.intersectObjects(
        pickableMeshes.current,
        false,
      )[0];
      raycastMs.current = performance.now() - startedAt;
      return hit ? Number(hit.object.userData.brainStructureId) : null;
    },
    [camera, gl],
  );

  const updateHover = useCallback(
    (nextId: number | null) => {
      const previousId = hoveredId.current;
      if (previousId === nextId) return;
      const refresh = (id: number, isHovered: boolean) => {
        const node = nodesById.get(id);
        if (!node) return;
        const appearance = getBrainAppearance(node, visualState);
        meshesById.current
          .get(id)
          ?.forEach((mesh) =>
            applyMeshAppearance(
              mesh,
              id,
              appearance,
              isHovered && !appearance.highlighted,
            ),
          );
      };
      if (previousId !== null) refresh(previousId, false);
      hoveredId.current = nextId;
      if (nextId !== null) refresh(nextId, true);
    },
    [applyMeshAppearance, nodesById, visualState],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerMove = (event: PointerEvent) => {
      if (pointerDown.current) {
        canvas.style.cursor = 'grabbing';
        return;
      }
      const now = performance.now();
      if (now - lastHoverAt.current < 40) return;
      lastHoverAt.current = now;
      const id = pick(event.clientX, event.clientY);
      updateHover(id);
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
      ) {
        updateHover(null);
        canvas.style.cursor = 'grab';
        return;
      }
      const id = pick(event.clientX, event.clientY);
      if (id !== null) onSelect(id);
    };
    const onPointerLeave = () => {
      updateHover(null);
      canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [gl, onSelect, pick, updateHover]);

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
      <hemisphereLight args={['#c9d8ed', '#241115', 0.72]} />
      <ambientLight intensity={0.34} />
      <directionalLight color="#ffe1ce" position={[4, 6, 7]} intensity={2.15} />
      <directionalLight
        color="#79a9c7"
        position={[-5, 1, -4]}
        intensity={0.82}
      />
      <directionalLight
        color="#d67564"
        position={[1, -5, -3]}
        intensity={0.48}
      />
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
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
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
