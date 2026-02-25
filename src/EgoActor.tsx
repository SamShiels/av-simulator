import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import Car from './Car';
import { advance_actor } from './scenario/interpolate';
import { EGO_ACCEL, EGO_BRAKE } from './constants';
import type { WaypointTrack, ScenarioPose } from './scenario/types';

interface Props {
  track: WaypointTrack;
  rendering: boolean;
}

export default function EgoActor({ track, rendering }: Props) {
  const poseRef     = useRef<ScenarioPose | null>(null);
  const speedRef    = useRef(0);
  const progressRef = useRef(0);

  // Reset physics state when the track changes
  useEffect(() => {
    speedRef.current    = 0;
    progressRef.current = 0;
    poseRef.current     = null;
  }, [track]);

  useFrame((_, delta) => {
    const result = advance_actor(
      track,
      speedRef.current,
      progressRef.current,
      delta,
      EGO_ACCEL,
      EGO_BRAKE,
    );
    if (!result) return;

    poseRef.current     = result.pose;
    speedRef.current    = result.speed;
    progressRef.current = result.progress;
  });

  return <Car poseRef={poseRef} rendering={rendering} />;
}
