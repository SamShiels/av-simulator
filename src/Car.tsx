import { Suspense, useRef, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as THREE from 'three';

const MTL = '/assets/car/sedan-sports.mtl';
const OBJ = '/assets/car/sedan-sports.obj';

// World units per second along the curve
const SPEED = 6;

// 1. Suspension roll / pitch tuning
const ROLL_STRENGTH = 0.01;   // radians of body roll per unit of signed curvature
const ROLL_SMOOTHING = 2.5;   // lerp rate — lower = heavier, slower suspension lag
const PITCH_STRENGTH = 0.3;   // fraction of road gradient expressed as body pitch
const PITCH_SMOOTHING = 2.0;

// 2. Lateral lane-wander tuning
const DRIFT_AMPLITUDE = 0.1; // max lateral offset in world units
const DRIFT_FREQUENCY = 0.28; // cycles per second of the wander sine wave

// Reused across frames to avoid per-frame allocation
const _cross = new THREE.Vector3();

interface Props {
  curve: THREE.Curve<THREE.Vector3> | null;
  playing: boolean;
}

/**
 * Multi-sine road-noise for the vertical (Y) axis.
 * Incommensurate frequencies prevent any visible periodicity.
 * Amplitude is barely perceptible — just enough for a natural "buzz".
 */
function roadNoiseY(t: number): number {
  return (
    Math.sin(t * 23.7) * 0.0030 +
    Math.sin(t * 47.3) * 0.0018 +
    Math.sin(t * 11.3) * 0.0015 +
    Math.sin(t * 97.1) * 0.0008
  );
}

function Model({ curve, playing }: Props) {
  const materials = useLoader(MTLLoader, MTL);
  const obj = useLoader(OBJLoader, OBJ, loader => {
    materials.preload();
    loader.setMaterials(materials);
  });

  // Clone once so the cached loader object isn't mutated by the scene graph
  const clone = useMemo(() => obj.clone(), [obj]);

  const groupRef = useRef<THREE.Group>(null); // world position + Y yaw
  const bodyRef  = useRef<THREE.Group>(null); // local pitch / roll / noise-Y

  const tRef     = useRef(0);
  const timeRef  = useRef(0);
  const rollRef  = useRef(0);
  const pitchRef = useRef(0);

  useFrame((_, delta) => {
    if (!curve || !groupRef.current || !bodyRef.current) return;

    if (!playing) {
      tRef.current = 0;
      return;
    }
    // Advance t proportional to world-space speed
    const len = curve.getLength();
    tRef.current = (tRef.current + (SPEED / len) * delta) % 1;
    timeRef.current += delta;

    const t    = tRef.current;
    const time = timeRef.current;

    // ── Position & heading ──────────────────────────────────────────────────
    const pos     = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    // Right vector perpendicular to travel direction in the XZ plane
    // Equivalent to worldUp × tangent (normalized since tangent is a unit vector)
    const right = new THREE.Vector3(tangent.z, 0, -tangent.x);

    // 3. Imperfect steering — slow sine wave lateral drift within the lane
    const lateralDrift = Math.sin(time * Math.PI * 2 * DRIFT_FREQUENCY) * DRIFT_AMPLITUDE;
    pos.addScaledVector(right, lateralDrift);

    groupRef.current.position.copy(pos);
    // atan2(x, z) gives the Y rotation for a model that faces +Z by default
    groupRef.current.rotation.y = Math.atan2(tangent.x, tangent.z);

    // ── 1. Suspension roll from spline curvature ────────────────────────────
    // Sample tangent slightly ahead to estimate signed curvature.
    const eps = 0.002;
    const nextTangent = curve.getTangent((t + eps) % 1);
    _cross.crossVectors(tangent, nextTangent);

    // cross.y is positive for a left turn, negative for a right turn.
    // Dividing by eps converts the raw cross product magnitude to an angular rate.
    const signedCurvature = _cross.y / eps;

    // The body leans opposite to centripetal acceleration (suspension inertia).
    // Negative Z rotation = top of car tilts away from the turn direction.
    const targetRoll = signedCurvature * ROLL_STRENGTH;
    rollRef.current = THREE.MathUtils.lerp(rollRef.current, targetRoll, delta * ROLL_SMOOTHING);

    // Pitch from road gradient (zero on the flat demo track; ready for elevation)
    const targetPitch = -Math.asin(THREE.MathUtils.clamp(tangent.y, -1, 1)) * PITCH_STRENGTH;
    pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitch, delta * PITCH_SMOOTHING);

    // ── 2. Road-noise micro-vibration on the vertical axis ──────────────────
    const noiseY = roadNoiseY(time);

    // Apply pitch, roll, and noise to the inner body group (car-local frame)
    bodyRef.current.rotation.x = pitchRef.current;
    bodyRef.current.rotation.z = rollRef.current;
    bodyRef.current.position.y = noiseY;
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <primitive object={clone} scale={0.4} />
      </group>
    </group>
  );
}

export default function Car({ curve, playing }: Props) {
  return (
    <Suspense fallback={null}>
      <Model curve={curve} playing={playing} />
    </Suspense>
  );
}
