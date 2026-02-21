import { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE_SIZE } from '../constants';
import type { GizmoMode } from '../App';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const Y_HOVER   = 0.15;
const SPHERE_R  = 0.12;
const SHAFT_LEN = 0.8;
const SHAFT_R   = 0.075;
const CONE_H    = 0.28;
const CONE_R    = 0.14;

const RING_R     = 0.72;
const RING_TUBE  = 0.055;
const ROT_CONE_H = 0.22;
const ROT_CONE_R = 0.11;

function snapToGrid(v: number) {
  return Math.round(v / TILE_SIZE) * TILE_SIZE;
}

// ── Single axis arrow (translate mode) ───────────────────────────────────────

interface ArrowProps {
  axis: 'x' | 'z';
  color: string;
  onDragStart: (axis: 'x' | 'z') => void;
}

function Arrow({ axis, color, onDragStart }: ArrowProps) {
  const [hovered, setHovered] = useState(false);
  const c = hovered ? '#ffffff' : color;

  const rot: [number, number, number] = axis === 'x'
    ? [0, 0, -Math.PI / 2]
    : [Math.PI / 2, 0, 0];

  const shaftOffset = SPHERE_R + SHAFT_LEN / 2;
  const coneOffset  = SPHERE_R + SHAFT_LEN + CONE_H / 2;

  const shaftPos: [number, number, number] = axis === 'x'
    ? [shaftOffset, 0, 0] : [0, 0, shaftOffset];
  const conePos: [number, number, number] = axis === 'x'
    ? [coneOffset, 0, 0]  : [0, 0, coneOffset];

  return (
    <group
      onPointerDown={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onDragStart(axis); }}
      onPointerEnter={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'; }}
      onPointerLeave={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = ''; }}
    >
      <mesh position={shaftPos} rotation={rot}>
        <cylinderGeometry args={[SHAFT_R, SHAFT_R, SHAFT_LEN, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh position={conePos} rotation={rot}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
    </group>
  );
}

// ── Rotate handle (half-ring arc + arrowhead) ─────────────────────────────────
//
// Two handles together form a full ring in the XZ plane.
// groupRotY = +π/2 → arc on the +X side (CW from above)
// groupRotY = -π/2 → arc on the -X side (CCW from above)
//
// Geometry in local frame (before groupRotY is applied):
//   TorusGeometry arc from θ=0 to θ=π, laid flat via rotation.x = π/2
//   → spans (RING_R,0,0) → (0,0,RING_R) → (-RING_R,0,0)
//   Cone at (-RING_R, 0, ROT_CONE_H/2), rotation [-π/2,0,0] → tip points -Z
//   → tip lands at (-RING_R, 0, 0) = arc end, pointing in the direction of travel

interface RotateHandleProps {
  groupRotY: number;
  color: string;
  onRotate: () => void;
  isDraggingRef: React.MutableRefObject<boolean>;
}

function RotateHandle({ groupRotY, color, onRotate, isDraggingRef }: RotateHandleProps) {
  const [hovered, setHovered] = useState(false);
  const c = hovered ? '#ffffff' : color;

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    isDraggingRef.current = true;
    onRotate();
    function handleUp() {
      window.removeEventListener('pointerup', handleUp);
      setTimeout(() => { isDraggingRef.current = false; }, 0);
    }
    window.addEventListener('pointerup', handleUp);
  }

  return (
    <group
      rotation={[0, groupRotY, 0]}
      onPointerDown={handlePointerDown}
      onPointerEnter={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = ''; }}
    >
      {/* Half-ring arc, laid flat in XZ plane */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RING_R, RING_TUBE, 8, 32, Math.PI]} />
        <meshBasicMaterial color={c} />
      </mesh>
      {/* Arrowhead at the arc end (-RING_R, 0, 0), tip pointing -Z */}
      <mesh position={[-RING_R, 0, ROT_CONE_H / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[ROT_CONE_R, ROT_CONE_H, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
    </group>
  );
}

// ── SelectionGizmo ───────────────────────────────────────────────────────────

interface Props {
  position: [number, number, number];
  mode: GizmoMode;
  onMove: (newPos: [number, number, number]) => void;
  onRotate: (delta: 1 | -1) => void;
  /** Ref shared with Scene so it can suppress ghost/place during drag. */
  isDraggingRef: React.MutableRefObject<boolean>;
}

export default function SelectionGizmo({ position, mode, onMove, onRotate, isDraggingRef }: Props) {
  const { gl, camera } = useThree();

  const posRef = useRef(position);
  posRef.current = position;

  const rc    = useRef(new THREE.Raycaster());
  const hitPt = useRef(new THREE.Vector3());

  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
    };
  }, [isDraggingRef]);

  function raycastGround(e: PointerEvent): [number, number, number] | null {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    rc.current.setFromCamera(ndc, camera);
    if (!rc.current.ray.intersectPlane(GROUND, hitPt.current)) return null;
    return [hitPt.current.x, 0, hitPt.current.z];
  }

  function startDrag(axis: 'x' | 'z') {
    isDraggingRef.current = true;
    document.body.style.cursor = 'grabbing';

    function handleMove(e: PointerEvent) {
      const p = raycastGround(e);
      if (!p) return;
      const [curX, , curZ] = posRef.current;
      const newX = axis === 'x' ? snapToGrid(p[0]) : curX;
      const newZ = axis === 'z' ? snapToGrid(p[2]) : curZ;
      if (newX !== curX || newZ !== curZ) {
        onMove([newX, 0, newZ]);
      }
    }

    function handleUp() {
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setTimeout(() => { isDraggingRef.current = false; }, 0);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  const [px, , pz] = position;

  return (
    <group position={[px, Y_HOVER, pz]}>
      {/* Central sphere */}
      <mesh>
        <sphereGeometry args={[SPHERE_R, 12, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {mode === 'translate' ? (
        <>
          {/* X axis — red */}
          <Arrow axis="x" color="#ef4444" onDragStart={startDrag} />
          {/* Z axis — blue */}
          <Arrow axis="z" color="#3b82f6" onDragStart={startDrag} />
        </>
      ) : (
        <>
          {/* CW handle — right (+X) half of ring */}
          <RotateHandle groupRotY={Math.PI / 2} color="#22c55e" onRotate={() => onRotate(1)} isDraggingRef={isDraggingRef} />
          {/* CCW handle — left (−X) half of ring */}
          <RotateHandle groupRotY={-Math.PI / 2} color="#22c55e" onRotate={() => onRotate(-1)} isDraggingRef={isDraggingRef} />
        </>
      )}
    </group>
  );
}
