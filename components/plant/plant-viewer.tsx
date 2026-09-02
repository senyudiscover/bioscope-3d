'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PlantModelLevel } from '@/data/plant/plant-explorer';

type PlantViewerProps = {
  level: PlantModelLevel;
  selectedId: string | null;
  focusRequestKey: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onInteractionStart?: () => void;
};

type InteractiveProps = {
  id: string;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
};

type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

const levelCameraPose: Record<PlantModelLevel, CameraPose> = {
  spinach: {
    position: new THREE.Vector3(0, 2.1, 7.5),
    target: new THREE.Vector3(0, 0.25, 0),
  },
  leaf: {
    position: new THREE.Vector3(0, 0.25, 5.4),
    target: new THREE.Vector3(0, 0.15, 0),
  },
  'mesophyll-cell': {
    position: new THREE.Vector3(0, 0.15, 6.3),
    target: new THREE.Vector3(0, 0, 0),
  },
  chloroplast: {
    position: new THREE.Vector3(0, 0.2, 6.2),
    target: new THREE.Vector3(0, 0, 0),
  },
};

const focusOverrides: Record<string, CameraPose> = {
  'spinach:leaf': {
    position: new THREE.Vector3(0, 1.2, 4.8),
    target: new THREE.Vector3(0, 0.45, 0),
  },
  'mesophyll-cell:chloroplast': {
    position: new THREE.Vector3(1.2, 0.55, 3.2),
    target: new THREE.Vector3(1.15, 0.45, 0),
  },
  'mesophyll-cell:mitochondrion': {
    position: new THREE.Vector3(-1.15, -0.62, 3.1),
    target: new THREE.Vector3(-1.1, -0.58, 0.15),
  },
};

function eventHandlers({ id, onHover, onSelect }: InteractiveProps) {
  return {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHover(id);
    },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHover(null);
    },
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onSelect(id);
    },
  };
}

function PlantCameraRig({
  level,
  selectedId,
  focusRequestKey,
  onInteractionStart,
}: Pick<
  PlantViewerProps,
  'level' | 'selectedId' | 'focusRequestKey' | 'onInteractionStart'
>) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const selectedIdRef = useRef(selectedId);
  const animation = useRef<{
    startedAt: number;
    fromPosition: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPosition: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const controls = controlsRef.current;
    const pose =
      focusOverrides[`${level}:${selectedIdRef.current ?? ''}`] ??
      levelCameraPose[level];
    animation.current = {
      startedAt: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls?.target.clone() ?? new THREE.Vector3(),
      toPosition: pose.position.clone(),
      toTarget: pose.target.clone(),
    };
  }, [camera, focusRequestKey, level]);

  useFrame(() => {
    const current = animation.current;
    const controls = controlsRef.current;
    if (!current || !controls) return;
    const elapsed = Math.min(1, (performance.now() - current.startedAt) / 420);
    const eased = 1 - (1 - elapsed) ** 3;
    camera.position.lerpVectors(
      current.fromPosition,
      current.toPosition,
      eased,
    );
    controls.target.lerpVectors(current.fromTarget, current.toTarget, eased);
    controls.update();
    if (elapsed >= 1) animation.current = null;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.7}
      maxDistance={18}
      maxPolarAngle={Math.PI * 0.92}
      onStart={() => {
        animation.current = null;
        onInteractionStart?.();
      }}
    />
  );
}

function LeafBlade({
  selected,
  onHover,
  onSelect,
  color = '#4f9f58',
}: {
  selected: boolean;
  onHover: PlantViewerProps['onHover'];
  onSelect: PlantViewerProps['onSelect'];
  color?: string;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -1.75);
    shape.bezierCurveTo(-0.35, -1.35, -1.15, -0.65, -1.18, 0.2);
    shape.bezierCurveTo(-1.2, 1.05, -0.52, 1.62, 0, 1.92);
    shape.bezierCurveTo(0.52, 1.62, 1.2, 1.05, 1.18, 0.2);
    shape.bezierCurveTo(1.15, -0.65, 0.35, -1.35, 0, -1.75);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.045,
      bevelThickness: 0.04,
    });
  }, []);
  return (
    <mesh
      geometry={geometry}
      {...eventHandlers({ id: 'leaf', onHover, onSelect })}
    >
      <meshStandardMaterial
        color={selected ? '#83d977' : color}
        roughness={0.72}
        metalness={0.02}
        emissive={selected ? '#2c6d37' : '#08170b'}
        emissiveIntensity={selected ? 0.8 : 0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SpinachModel(
  props: Omit<PlantViewerProps, 'level' | 'focusRequestKey'>,
) {
  const leaves = [
    { rotation: 0, scale: 0.74, tilt: -0.18 },
    { rotation: 0.78, scale: 0.82, tilt: -0.3 },
    { rotation: 1.55, scale: 0.7, tilt: -0.12 },
    { rotation: 2.35, scale: 0.78, tilt: -0.26 },
    { rotation: 3.12, scale: 0.69, tilt: -0.14 },
    { rotation: 3.92, scale: 0.84, tilt: -0.28 },
    { rotation: 4.7, scale: 0.72, tilt: -0.15 },
    { rotation: 5.48, scale: 0.8, tilt: -0.25 },
  ];
  return (
    <group rotation={[-0.42, 0, 0]} position={[0, 0.35, 0]}>
      {leaves.map((leaf, index) => (
        <group
          key={leaf.rotation}
          rotation={[leaf.tilt, 0, leaf.rotation]}
          scale={leaf.scale}
        >
          <group position={[0, 1.05, index % 2 ? -0.08 : 0.08]}>
            <LeafBlade
              selected={props.selectedId === 'leaf'}
              onHover={props.onHover}
              onSelect={props.onSelect}
              color={index % 2 ? '#438d4f' : '#559e55'}
            />
          </group>
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 1.45, 12]} />
            <meshStandardMaterial color="#6b9d55" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.18, 0.12, 0.8, 16]} />
        <meshStandardMaterial color="#7a5d35" roughness={0.9} />
      </mesh>
      {[0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9].map((rotation) => (
        <mesh
          key={rotation}
          position={[
            Math.cos(rotation) * 0.16,
            -1.05,
            Math.sin(rotation) * 0.16,
          ]}
          rotation={[0.16 * Math.cos(rotation), 0, 0.1 * Math.sin(rotation)]}
        >
          <cylinderGeometry args={[0.018, 0.055, 1.1, 8]} />
          <meshStandardMaterial color="#806441" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function LeafModel(props: Omit<PlantViewerProps, 'level' | 'focusRequestKey'>) {
  return (
    <group rotation={[-0.06, 0.12, -0.05]}>
      <group scale={[1.35, 1.15, 1]}>
        <LeafBlade
          selected={props.selectedId === 'leaf'}
          onHover={props.onHover}
          onSelect={props.onSelect}
        />
      </group>
      <mesh position={[0, 0.1, 0.14]}>
        <cylinderGeometry args={[0.045, 0.08, 3.35, 14]} />
        <meshStandardMaterial color="#a3c874" roughness={0.78} />
      </mesh>
      {[-1.15, -0.72, -0.3, 0.15, 0.6, 1.05].map((y, index) => (
        <group key={y} position={[0, y, 0.13]}>
          <mesh rotation={[0, 0, 0.9]} position={[-0.45, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.025, 0.95 - index * 0.05, 8]} />
            <meshStandardMaterial color="#88b86c" />
          </mesh>
          <mesh rotation={[0, 0, -0.9]} position={[0.45, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.025, 0.95 - index * 0.05, 8]} />
            <meshStandardMaterial color="#88b86c" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ChloroplastBody({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  selected,
  onHover,
  onSelect,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  selected: boolean;
  onHover: PlantViewerProps['onHover'];
  onSelect: PlantViewerProps['onSelect'];
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={[0.48 * scale, 0.25 * scale, 0.16 * scale]}
      {...eventHandlers({ id: 'chloroplast', onHover, onSelect })}
    >
      <sphereGeometry args={[1, 28, 18]} />
      <meshStandardMaterial
        color={selected ? '#a7e26d' : '#72ad4d'}
        emissive={selected ? '#4d7d25' : '#14210b'}
        emissiveIntensity={selected ? 0.9 : 0.25}
        roughness={0.55}
      />
    </mesh>
  );
}

function MitochondrionBody({
  selected,
  onHover,
  onSelect,
}: Pick<PlantViewerProps, 'selectedId' | 'onHover' | 'onSelect'> & {
  selected: boolean;
}) {
  return (
    <group
      position={[-1.1, -0.58, 0.18]}
      rotation={[0.15, -0.25, -0.28]}
      {...eventHandlers({ id: 'mitochondrion', onHover, onSelect })}
    >
      <mesh scale={[0.58, 0.28, 0.24]}>
        <sphereGeometry args={[1, 28, 18]} />
        <meshStandardMaterial
          color={selected ? '#ffb270' : '#c77749'}
          emissive={selected ? '#7d351c' : '#241007'}
          emissiveIntensity={selected ? 0.9 : 0.25}
          roughness={0.58}
        />
      </mesh>
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={x} position={[x, 0, 0.22]} rotation={[0, 0, 0.6]}>
          <torusGeometry args={[0.12, 0.018, 8, 18, Math.PI]} />
          <meshStandardMaterial color="#ffd0a6" />
        </mesh>
      ))}
    </group>
  );
}

function MesophyllCellModel(
  props: Omit<PlantViewerProps, 'level' | 'focusRequestKey'>,
) {
  const chloroplasts: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
  }> = [
    { position: [1.18, 0.52, 0.05], rotation: [0.1, 0.2, -0.25] },
    { position: [1.25, -0.48, 0.02], rotation: [-0.1, -0.2, 0.2] },
    { position: [-1.28, 0.55, 0.05], rotation: [0.2, 0.1, 0.3] },
    { position: [-0.35, 0.86, 0.08], rotation: [0, 0.2, -0.12] },
    { position: [0.5, -0.83, 0.08], rotation: [0.1, -0.1, 0.16] },
  ];
  return (
    <group>
      <mesh
        scale={[3.25, 2.2, 0.62]}
        {...eventHandlers({
          id: 'mesophyll-cell',
          onHover: props.onHover,
          onSelect: props.onSelect,
        })}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color="#7cae55"
          transparent
          opacity={0.13}
          roughness={0.65}
          transmission={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh scale={[3.05, 2.02, 0.56]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#a4c88a"
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
      <mesh scale={[1.78, 1.25, 0.34]} position={[0.15, -0.02, 0]}>
        <sphereGeometry args={[1, 32, 22]} />
        <meshPhysicalMaterial
          color="#8fc8cf"
          transparent
          opacity={0.2}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[-0.92, 0.52, 0.16]} scale={0.28}>
        <sphereGeometry args={[1, 28, 20]} />
        <meshStandardMaterial color="#a88bc4" roughness={0.55} />
      </mesh>
      {chloroplasts.map((item) => (
        <ChloroplastBody
          key={item.position.join(':')}
          {...item}
          selected={props.selectedId === 'chloroplast'}
          onHover={props.onHover}
          onSelect={props.onSelect}
        />
      ))}
      <MitochondrionBody
        selected={props.selectedId === 'mitochondrion'}
        selectedId={props.selectedId}
        onHover={props.onHover}
        onSelect={props.onSelect}
      />
    </group>
  );
}

function ChloroplastModel(
  props: Omit<PlantViewerProps, 'level' | 'focusRequestKey'>,
) {
  const grana = [
    [-1.05, 0.35, 0],
    [-0.25, -0.3, 0.05],
    [0.55, 0.38, -0.05],
    [1.15, -0.35, 0.08],
  ] as const;
  return (
    <group
      {...eventHandlers({
        id: 'chloroplast',
        onHover: props.onHover,
        onSelect: props.onSelect,
      })}
    >
      <mesh scale={[2.55, 1.38, 0.85]}>
        <sphereGeometry args={[1, 48, 28]} />
        <meshPhysicalMaterial
          color="#6daa52"
          transparent
          opacity={0.2}
          transmission={0.08}
          roughness={0.48}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh scale={[2.42, 1.25, 0.77]}>
        <sphereGeometry args={[1, 48, 28]} />
        <meshStandardMaterial
          color="#86b86b"
          transparent
          opacity={0.13}
          wireframe
        />
      </mesh>
      <mesh scale={[2.28, 1.12, 0.66]}>
        <sphereGeometry args={[1, 42, 24]} />
        <meshPhysicalMaterial
          color="#b5d98f"
          transparent
          opacity={0.12}
          roughness={0.6}
        />
      </mesh>
      {grana.map(([x, y, z]) => (
        <group
          key={`${x}-${y}`}
          position={[x, y, z]}
          rotation={[0.12, 0.08, 0]}
        >
          {[-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18].map((height) => (
            <mesh key={height} position={[0, height, 0]}>
              <cylinderGeometry args={[0.34, 0.34, 0.035, 28]} />
              <meshStandardMaterial color="#3f7e3f" roughness={0.68} />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.65, 0.2, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 1.15, 12]} />
          <meshStandardMaterial color="#5d9951" />
        </mesh>
      ))}
    </group>
  );
}

function PlantScene(props: PlantViewerProps) {
  return (
    <>
      <color attach="background" args={['#0b100c']} />
      <fog attach="fog" args={['#0b100c', 8, 19]} />
      <ambientLight intensity={0.82} />
      <directionalLight position={[4, 6, 5]} intensity={2.4} color="#f6edcc" />
      <directionalLight
        position={[-4, -2, 3]}
        intensity={1.1}
        color="#7fb995"
      />
      <pointLight position={[0, 1, -3]} intensity={1.2} color="#d8ffbc" />
      {props.level === 'spinach' && <SpinachModel {...props} />}
      {props.level === 'leaf' && <LeafModel {...props} />}
      {props.level === 'mesophyll-cell' && <MesophyllCellModel {...props} />}
      {props.level === 'chloroplast' && <ChloroplastModel {...props} />}
      <PlantCameraRig
        level={props.level}
        selectedId={props.selectedId}
        focusRequestKey={props.focusRequestKey}
        onInteractionStart={props.onInteractionStart}
      />
    </>
  );
}

export function PlantViewer(props: PlantViewerProps) {
  return (
    <Canvas
      key={props.level}
      camera={{
        position: levelCameraPose[props.level].position.toArray(),
        fov: 38,
        near: 0.05,
        far: 80,
      }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="可交互的植物教学模型"
    >
      <PlantScene {...props} />
    </Canvas>
  );
}
