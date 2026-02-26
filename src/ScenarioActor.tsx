import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useActorAdvance } from './hooks/useActorAdvance';
import { PedestrianMesh, StrollerMesh, VehicleMesh } from './visuals/ActorMesh';
import type { Actor, WaypointTrack } from './scenario/types';

interface Props {
  actor: Actor;
  track: WaypointTrack;
  onSelect?: () => void;
}

export default function ScenarioActor({ actor, track, onSelect }: Props) {
  const poseRef = useActorAdvance(track, actor.accel, actor.brake, actor.topSpeed, actor.label);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !poseRef.current) return;
    const [px, py, pz] = poseRef.current.position;
    groupRef.current.position.set(px, py, pz);
    groupRef.current.rotation.y = poseRef.current.yaw;
  });

  return (
    <group
      ref={groupRef}
      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
    >
      {actor.kind === 'pedestrian' && <PedestrianMesh color={actor.color} />}
      {actor.kind === 'stroller' && <StrollerMesh color={actor.color} />}
      {actor.kind === 'vehicle' && <VehicleMesh color={actor.color} />}
    </group>
  );
}
