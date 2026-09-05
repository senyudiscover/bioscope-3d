'use client';

import { useEffect, useRef } from 'react';
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import { Edges, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { PhotosynthesisSceneId } from '@/data/photosynthesis/micro-lab';

type PhotosynthesisViewerProps = {
  scene: PhotosynthesisSceneId;
  selectedId: string | null;
  hoveredId: string | null;
  emphasizedIds?: string[];
  focusRequestKey: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onInteractionStart: () => void;
};

type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

const sceneCameraPose: Record<PhotosynthesisSceneId, CameraPose> = {
  'mesophyll-cell': {
    position: new THREE.Vector3(0.2, 0.12, 8.2),
    target: new THREE.Vector3(0, 0, 0),
  },
  chloroplast: {
    position: new THREE.Vector3(0.1, 0.2, 7.1),
    target: new THREE.Vector3(0, 0, 0),
  },
  thylakoid: {
    position: new THREE.Vector3(0, 0.35, 8.4),
    target: new THREE.Vector3(0, 0, 0),
  },
};

const focusPoses: Record<string, CameraPose> = {
  'mesophyll-cell:chloroplast': {
    position: new THREE.Vector3(1.65, 0.65, 4.1),
    target: new THREE.Vector3(1.35, 0.55, 0),
  },
  'mesophyll-cell:mitochondrion': {
    position: new THREE.Vector3(-1.5, -0.72, 4),
    target: new THREE.Vector3(-1.35, -0.68, 0),
  },
  'chloroplast:granum': {
    position: new THREE.Vector3(-0.7, 0.35, 4.7),
    target: new THREE.Vector3(-0.75, 0.2, 0),
  },
  'chloroplast:thylakoid': {
    position: new THREE.Vector3(-0.7, 0.35, 4.7),
    target: new THREE.Vector3(-0.75, 0.2, 0),
  },
  'thylakoid:atp-synthase': {
    position: new THREE.Vector3(2.35, 0.45, 5.2),
    target: new THREE.Vector3(2.35, 0.25, 0),
  },
};

function handlers(
  id: string,
  onHover: PhotosynthesisViewerProps['onHover'],
  onSelect: PhotosynthesisViewerProps['onSelect'],
) {
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

function CameraRig({
  scene,
  selectedId,
  focusRequestKey,
  onInteractionStart,
}: Pick<
  PhotosynthesisViewerProps,
  'scene' | 'selectedId' | 'focusRequestKey' | 'onInteractionStart'
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
      focusPoses[`${scene}:${selectedIdRef.current ?? ''}`] ??
      sceneCameraPose[scene];
    animation.current = {
      startedAt: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls?.target.clone() ?? new THREE.Vector3(),
      toPosition: pose.position.clone(),
      toTarget: pose.target.clone(),
    };
  }, [camera, focusRequestKey, scene]);

  useFrame(() => {
    const current = animation.current;
    const controls = controlsRef.current;
    if (!current || !controls) return;
    const elapsed = Math.min(1, (performance.now() - current.startedAt) / 430);
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
      dampingFactor={0.075}
      minDistance={0.75}
      maxDistance={18}
      maxPolarAngle={Math.PI * 0.92}
      onStart={() => {
        animation.current = null;
        onInteractionStart();
      }}
    />
  );
}

function ChloroplastOrganelle({
  position,
  rotation,
  active,
  scale = 1,
  onHover,
  onSelect,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  active: boolean;
  scale?: number;
  onHover: PhotosynthesisViewerProps['onHover'];
  onSelect: PhotosynthesisViewerProps['onSelect'];
}) {
  return (
    <group
      position={position}
      rotation={rotation}
      {...handlers('chloroplast', onHover, onSelect)}
    >
      <mesh scale={[0.64 * scale, 0.27 * scale, 0.2 * scale]}>
        <sphereGeometry args={[1, 36, 22]} />
        <meshStandardMaterial
          color={active ? '#839e5d' : '#5f7845'}
          emissive={active ? '#2a3b1d' : '#0b1008'}
          emissiveIntensity={active ? 0.42 : 0.09}
          roughness={0.67}
        />
        {active && <Edges color="#b3c68b" threshold={14} />}
      </mesh>
      <mesh
        position={[0, 0, 0.015]}
        scale={[0.5 * scale, 0.18 * scale, 0.205 * scale]}
      >
        <sphereGeometry args={[1, 28, 18]} />
        <meshStandardMaterial
          color="#91a66f"
          transparent
          opacity={0.28}
          depthWrite={false}
          roughness={0.72}
        />
      </mesh>
      {[-0.2, 0, 0.2].map((x) => (
        <mesh key={x} position={[x * scale, 0, 0.215 * scale]}>
          <boxGeometry args={[0.105 * scale, 0.05 * scale, 0.028 * scale]} />
          <meshStandardMaterial color="#33462a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function MitochondrionOrganelle({
  position,
  rotation,
  active,
  onHover,
  onSelect,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  active: boolean;
  onHover: PhotosynthesisViewerProps['onHover'];
  onSelect: PhotosynthesisViewerProps['onSelect'];
}) {
  return (
    <group
      position={position}
      rotation={rotation}
      {...handlers('mitochondrion', onHover, onSelect)}
    >
      <mesh scale={[0.55, 0.25, 0.18]}>
        <sphereGeometry args={[1, 34, 20]} />
        <meshStandardMaterial
          color={active ? '#ba8062' : '#935f4a'}
          emissive={active ? '#482519' : '#130a07'}
          emissiveIntensity={active ? 0.35 : 0.06}
          roughness={0.7}
        />
        {active && <Edges color="#dfaf8a" threshold={14} />}
      </mesh>
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={x} position={[x, 0, 0.225]} rotation={[0, 0, 0.55]}>
          <torusGeometry args={[0.11, 0.014, 8, 18, Math.PI]} />
          <meshStandardMaterial color="#c88f73" roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

/** A visible, but intentionally non-occluding, plant-cell envelope. */
function CellEnvelope({ props }: { props: PhotosynthesisViewerProps }) {
  const active = (id: string) =>
    props.selectedId === id || props.hoveredId === id;
  const wallStrips: Array<{
    position: [number, number, number];
    args: [number, number, number];
  }> = [
    { position: [0, 1.83, 0.73], args: [5.52, 0.15, 0.14] },
    { position: [0, -1.83, 0.73], args: [5.52, 0.15, 0.14] },
    { position: [-2.75, 0, 0.73], args: [0.15, 3.52, 0.14] },
    { position: [2.75, 0, 0.73], args: [0.15, 3.52, 0.14] },
  ];
  const membraneStrips: Array<{
    position: [number, number, number];
    args: [number, number, number];
  }> = [
    { position: [0, 1.62, 0.68], args: [5.12, 0.07, 0.08] },
    { position: [0, -1.62, 0.68], args: [5.12, 0.07, 0.08] },
    { position: [-2.55, 0, 0.68], args: [0.07, 3.12, 0.08] },
    { position: [2.55, 0, 0.68], args: [0.07, 3.12, 0.08] },
  ];
  const cytoplasmStrips: Array<{
    position: [number, number, number];
    args: [number, number, number];
  }> = [
    { position: [0.1, 1.5, 0.36], args: [4.66, 0.28, 0.34] },
    { position: [0.1, -1.5, 0.36], args: [4.66, 0.28, 0.34] },
    { position: [-2.37, 0, 0.36], args: [0.28, 2.82, 0.34] },
    { position: [2.57, 0, 0.36], args: [0.28, 2.82, 0.34] },
  ];

  return (
    <>
      <RoundedBox
        args={[5.72, 3.86, 1.26]}
        radius={0.35}
        smoothness={6}
        raycast={() => {}}
      >
        <meshPhysicalMaterial
          color="#667553"
          transparent
          opacity={0.14}
          depthWrite={false}
          roughness={0.78}
          side={THREE.DoubleSide}
        />
        <Edges color="#8a9874" threshold={12} />
      </RoundedBox>
      <RoundedBox
        args={[5.42, 3.55, 1.08]}
        radius={0.29}
        smoothness={6}
        raycast={() => {}}
      >
        <meshPhysicalMaterial
          color="#9baa92"
          transparent
          opacity={0.07}
          depthWrite={false}
          roughness={0.72}
          side={THREE.DoubleSide}
        />
        <Edges color="#9fae9a" threshold={12} />
      </RoundedBox>
      {wallStrips.map((strip, index) => (
        <RoundedBox
          key={`wall-${index}`}
          position={strip.position}
          args={strip.args}
          radius={0.05}
          smoothness={3}
          {...handlers('cell-wall', props.onHover, props.onSelect)}
        >
          <meshStandardMaterial
            color={active('cell-wall') ? '#98a67b' : '#72805e'}
            emissive={active('cell-wall') ? '#2f3923' : '#0a0d08'}
            emissiveIntensity={active('cell-wall') ? 0.32 : 0.04}
            transparent
            opacity={active('cell-wall') ? 0.76 : 0.16}
            depthWrite={false}
            roughness={0.82}
          />
        </RoundedBox>
      ))}
      {membraneStrips.map((strip, index) => (
        <RoundedBox
          key={`membrane-${index}`}
          position={strip.position}
          args={strip.args}
          radius={0.03}
          smoothness={3}
          {...handlers('cell-membrane', props.onHover, props.onSelect)}
        >
          <meshStandardMaterial
            color={active('cell-membrane') ? '#b7c7b0' : '#91a391'}
            emissive={active('cell-membrane') ? '#314032' : '#0d120d'}
            emissiveIntensity={active('cell-membrane') ? 0.28 : 0.03}
            transparent
            opacity={active('cell-membrane') ? 0.7 : 0.14}
            depthWrite={false}
            roughness={0.72}
          />
        </RoundedBox>
      ))}
      {cytoplasmStrips.map((strip, index) => (
        <RoundedBox
          key={`cytoplasm-${index}`}
          position={strip.position}
          args={strip.args}
          radius={0.12}
          smoothness={3}
          {...handlers('cytoplasm', props.onHover, props.onSelect)}
        >
          <meshPhysicalMaterial
            color={active('cytoplasm') ? '#9aab8a' : '#74836b'}
            transparent
            opacity={active('cytoplasm') ? 0.3 : 0.15}
            depthWrite={false}
            roughness={0.72}
          />
        </RoundedBox>
      ))}
    </>
  );
}

function CentralVacuole({ props }: { props: PhotosynthesisViewerProps }) {
  const active = props.selectedId === 'vacuole' || props.hoveredId === 'vacuole';
  return (
    <RoundedBox
      args={[4.68, 2.9, 0.72]}
      radius={0.56}
      smoothness={7}
      position={[0.1, -0.03, 0.03]}
      {...handlers('vacuole', props.onHover, props.onSelect)}
    >
      <meshPhysicalMaterial
        color={active ? '#82a4a7' : '#63878d'}
        transparent
        opacity={active ? 0.34 : 0.23}
        depthWrite={false}
        roughness={0.54}
        transmission={0.02}
      />
      <Edges color={active ? '#b7d0ce' : '#52777a'} threshold={16} />
    </RoundedBox>
  );
}

function CellNucleus({ props }: { props: PhotosynthesisViewerProps }) {
  const active = props.selectedId === 'nucleus' || props.hoveredId === 'nucleus';
  return (
    <group
      position={[-1.9, -0.26, 0.61]}
      {...handlers('nucleus', props.onHover, props.onSelect)}
    >
      <mesh scale={[0.43, 0.47, 0.27]}>
        <sphereGeometry args={[1, 34, 22]} />
        <meshStandardMaterial
          color={active ? '#86738c' : '#6e6075'}
          emissive={active ? '#302537' : '#100d12'}
          emissiveIntensity={active ? 0.38 : 0.08}
          roughness={0.65}
        />
        {active && <Edges color="#b4a3b8" threshold={14} />}
      </mesh>
      <mesh
        position={[0.08, 0.03, 0.25]}
        scale={[0.1, 0.1, 0.06]}
        raycast={() => {}}
      >
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#48394d" roughness={0.8} />
      </mesh>
    </group>
  );
}

function MesophyllCellScene(props: PhotosynthesisViewerProps) {
  const chloroplasts: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale?: number;
  }> = [
    { position: [-2.03, 1.2, 0.61], rotation: [0.08, 0.16, 0.27], scale: 0.93 },
    { position: [-0.75, 1.36, 0.65], rotation: [-0.05, -0.12, -0.12], scale: 1.04 },
    { position: [0.63, 1.32, 0.64], rotation: [0.07, 0.08, 0.11], scale: 0.94 },
    { position: [1.9, 1.03, 0.59], rotation: [-0.04, -0.18, -0.26], scale: 1.02 },
    { position: [2.18, -0.03, 0.61], rotation: [0.05, 0.15, 0.3], scale: 0.96 },
    { position: [1.45, -1.23, 0.63], rotation: [-0.06, 0.09, -0.19], scale: 1.04 },
    { position: [0.08, -1.4, 0.62], rotation: [0.04, -0.14, 0.08], scale: 0.94 },
    { position: [-1.22, -1.3, 0.61], rotation: [-0.08, 0.15, -0.16], scale: 0.98 },
    { position: [-2.25, 0.62, 0.6], rotation: [0.04, -0.18, 0.38], scale: 0.91 },
  ];
  return (
    <group rotation={[-0.1, 0.16, 0]}>
      <CellEnvelope props={props} />
      <CentralVacuole props={props} />
      <CellNucleus props={props} />
      {chloroplasts.map((item) => (
        <ChloroplastOrganelle
          key={item.position.join(':')}
          {...item}
          active={
            props.selectedId === 'chloroplast' ||
            props.hoveredId === 'chloroplast'
          }
          onHover={props.onHover}
          onSelect={props.onSelect}
        />
      ))}
      <MitochondrionOrganelle
        position={[0.16, 0.98, 0.62]}
        rotation={[0.05, -0.18, -0.18]}
        active={
          props.selectedId === 'mitochondrion' ||
          props.hoveredId === 'mitochondrion'
        }
        onHover={props.onHover}
        onSelect={props.onSelect}
      />
      <MitochondrionOrganelle
        position={[1.9, -0.78, 0.63]}
        rotation={[-0.08, 0.2, 0.24]}
        active={
          props.selectedId === 'mitochondrion' ||
          props.hoveredId === 'mitochondrion'
        }
        onHover={props.onHover}
        onSelect={props.onSelect}
      />
    </group>
  );
}

function Granum({
  position,
  rotation,
  selected,
  onHover,
  onSelect,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  selected: boolean;
  onHover: PhotosynthesisViewerProps['onHover'];
  onSelect: PhotosynthesisViewerProps['onSelect'];
}) {
  return (
    <group
      position={position}
      rotation={rotation}
      {...handlers('granum', onHover, onSelect)}
    >
      {[-0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24].map((height) => (
        <mesh key={height} position={[0, height, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 0.045, 32]} />
          <meshStandardMaterial
            color={selected ? '#86ad5d' : '#496b3f'}
            emissive={selected ? '#314824' : '#0c130a'}
            emissiveIntensity={selected ? 0.55 : 0.08}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

function ChloroplastScene(props: PhotosynthesisViewerProps) {
  const grana: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
  }> = [
    { position: [-1.35, 0.38, 0.05], rotation: [0.1, 0.1, 0.03] },
    { position: [-0.45, -0.35, 0.08], rotation: [-0.05, 0.12, 0.02] },
    { position: [0.55, 0.4, 0.02], rotation: [0.08, -0.1, -0.02] },
    { position: [1.38, -0.3, 0.06], rotation: [-0.08, 0.08, 0.03] },
  ];
  return (
    <group rotation={[-0.08, 0.2, 0]}>
      <mesh scale={[3.05, 1.65, 0.98]} raycast={() => {}}>
        <sphereGeometry args={[1, 56, 32]} />
        <meshPhysicalMaterial
          color="#718b58"
          transparent
          opacity={0.16}
          roughness={0.5}
          transmission={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh scale={[2.86, 1.47, 0.86]} raycast={() => {}}>
        <sphereGeometry args={[1, 56, 32]} />
        <meshPhysicalMaterial
          color="#9baa78"
          transparent
          opacity={0.11}
          roughness={0.54}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh scale={[2.66, 1.29, 0.73]} raycast={() => {}}>
        <sphereGeometry args={[1, 48, 28]} />
        <meshPhysicalMaterial
          color="#b6c898"
          transparent
          opacity={0.1}
          roughness={0.62}
        />
      </mesh>
      {grana.map((item) => (
        <Granum
          key={item.position.join(':')}
          {...item}
          selected={
            props.selectedId === 'granum' || props.selectedId === 'thylakoid'
          }
          onHover={props.onHover}
          onSelect={props.onSelect}
        />
      ))}
      {[-0.9, 0.05, 0.95].map((x, index) => (
        <mesh
          key={x}
          position={[x, index % 2 ? -0.03 : 0.08, 0]}
          rotation={[0, 0, Math.PI / 2]}
          {...handlers('thylakoid', props.onHover, props.onSelect)}
        >
          <boxGeometry args={[0.075, 1.1, 0.3]} />
          <meshStandardMaterial
            color={props.selectedId === 'thylakoid' ? '#83a85e' : '#59794c'}
            roughness={0.72}
          />
        </mesh>
      ))}
    </group>
  );
}

function ProteinPlaceholder({
  id,
  x,
  color,
  selected,
  emphasized,
  onHover,
  onSelect,
  head = 'disc',
}: {
  id: string;
  x: number;
  color: string;
  selected: boolean;
  emphasized: boolean;
  onHover: PhotosynthesisViewerProps['onHover'];
  onSelect: PhotosynthesisViewerProps['onSelect'];
  head?: 'disc' | 'sphere';
}) {
  return (
    <group position={[x, 0.08, 0]} {...handlers(id, onHover, onSelect)}>
      <mesh>
        <cylinderGeometry args={[0.28, 0.34, 0.86, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={selected || emphasized ? (emphasized ? '#f1c96b' : color) : '#070807'}
          emissiveIntensity={selected ? 0.32 : emphasized ? 0.72 : 0.04}
          roughness={0.58}
        />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        {head === 'sphere' ? (
          <sphereGeometry args={[0.38, 28, 18]} />
        ) : (
          <cylinderGeometry args={[0.46, 0.38, 0.2, 28]} />
        )}
        <meshStandardMaterial color={emphasized ? '#e2bd68' : color} roughness={0.54} />
      </mesh>
      <mesh position={[0, -0.53, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.25, 20]} />
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>
    </group>
  );
}

function ThylakoidScene(props: PhotosynthesisViewerProps) {
  const emphasized = (id: string) => props.emphasizedIds?.includes(id) ?? false;
  return (
    <group rotation={[-0.08, 0.08, 0]}>
      <RoundedBox
        args={[7.1, 1.55, 2.65]}
        radius={0.18}
        smoothness={4}
        position={[0, 0.92, -0.05]}
        raycast={() => {}}
      >
        <meshPhysicalMaterial color="#809675" transparent opacity={0.08} />
        <Edges color="#52634d" threshold={14} />
      </RoundedBox>
      <RoundedBox
        args={[7.1, 0.44, 2.65]}
        radius={0.14}
        smoothness={4}
        {...handlers('thylakoid-membrane', props.onHover, props.onSelect)}
      >
        <meshStandardMaterial
          color={
            emphasized('thylakoid-membrane') ? '#d0b866' : props.selectedId === 'thylakoid-membrane' ? '#738f64' : '#536d4d'
          }
          roughness={0.7}
        />
        <Edges color="#9aae88" threshold={14} />
      </RoundedBox>
      <RoundedBox
        args={[7.1, 1.55, 2.65]}
        radius={0.18}
        smoothness={4}
        position={[0, -0.92, -0.05]}
        {...handlers('thylakoid-lumen', props.onHover, props.onSelect)}
      >
        <meshPhysicalMaterial
          color="#557781"
          transparent
          opacity={emphasized('thylakoid-lumen') ? 0.3 : props.selectedId === 'thylakoid-lumen' ? 0.22 : 0.11}
          roughness={0.52}
        />
        <Edges color="#4f6972" threshold={14} />
      </RoundedBox>
      <ProteinPlaceholder
        id="photosystem-ii"
        x={-2.5}
        color="#81727f"
        selected={props.selectedId === 'photosystem-ii'} emphasized={emphasized('photosystem-ii')}
        onHover={props.onHover}
        onSelect={props.onSelect}
      />
      <group
        position={[-0.85, 0.02, 0]}
        {...handlers('electron-transport', props.onHover, props.onSelect)}
      >
        {[-0.36, 0, 0.36].map((x, index) => (
          <mesh key={x} position={[x, index === 1 ? 0.18 : -0.05, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 0.58 + index * 0.12, 20]} />
            <meshStandardMaterial
              color={
                emphasized('electron-transport') ? '#e0bb63' : props.selectedId === 'electron-transport'
                  ? '#b88e55'
                  : '#886947'
              }
              roughness={0.62}
            />
          </mesh>
        ))}
      </group>
      <ProteinPlaceholder
        id="photosystem-i"
        x={0.85}
        color="#617f7b"
        selected={props.selectedId === 'photosystem-i'} emphasized={emphasized('photosystem-i')}
        onHover={props.onHover}
        onSelect={props.onSelect}
      />
      <ProteinPlaceholder
        id="atp-synthase"
        x={2.5}
        color="#b0a078"
        selected={props.selectedId === 'atp-synthase'} emphasized={emphasized('atp-synthase')}
        onHover={props.onHover}
        onSelect={props.onSelect}
        head="sphere"
      />
    </group>
  );
}

function Scene(props: PhotosynthesisViewerProps) {
  return (
    <>
      <color attach="background" args={['#0a0d0b']} />
      <fog attach="fog" args={['#0a0d0b', 10, 22]} />
      <ambientLight intensity={0.92} />
      <directionalLight
        position={[4.5, 6, 6]}
        intensity={2.35}
        color="#f2edda"
      />
      <directionalLight
        position={[-5, -2, 4]}
        intensity={1.05}
        color="#829b87"
      />
      <pointLight position={[0, 1, -4]} intensity={0.85} color="#c5d4bd" />
      {props.scene === 'mesophyll-cell' && <MesophyllCellScene {...props} />}
      {props.scene === 'chloroplast' && <ChloroplastScene {...props} />}
      {props.scene === 'thylakoid' && <ThylakoidScene {...props} />}
      <CameraRig
        scene={props.scene}
        selectedId={props.selectedId}
        focusRequestKey={props.focusRequestKey}
        onInteractionStart={props.onInteractionStart}
      />
    </>
  );
}

export function PhotosynthesisViewer(props: PhotosynthesisViewerProps) {
  return (
    <Canvas
      camera={{
        position: sceneCameraPose[props.scene].position.toArray(),
        fov: 37,
        near: 0.05,
        far: 90,
      }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="可交互的光合作用微观教学模型"
    >
      <Scene {...props} />
    </Canvas>
  );
}
