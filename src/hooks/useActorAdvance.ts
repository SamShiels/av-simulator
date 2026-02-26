import { useRef, useEffect, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { advance_actor } from '../scenario/interpolate';
import type { DrivingZone } from '../scenario/interpolate';
import type { WaypointTrack, ScenarioPose } from '../scenario/types';

export function useActorAdvance(
  track: WaypointTrack,
  accel: number,
  brake: number,
  topSpeed: number,
  label: string,
): MutableRefObject<ScenarioPose | null> {
  const poseRef     = useRef<ScenarioPose | null>(null);
  const speedRef    = useRef(0);
  const progressRef = useRef(0);
  const zoneRef     = useRef<DrivingZone | null>(null);

  useEffect(() => {
    poseRef.current     = null;
    speedRef.current    = 0;
    progressRef.current = 0;
    zoneRef.current     = null;
  }, [track]);

  useFrame((_, delta) => {
    const result = advance_actor(
      track,
      speedRef.current,
      progressRef.current,
      delta,
      accel,
      brake,
      topSpeed,
    );
    if (!result) return;

    if (result.zone !== zoneRef.current) {
      console.log(`[${label}] ${result.zone} — speed: ${result.speed.toFixed(2)} m/s`);
      zoneRef.current = result.zone;
    }

    poseRef.current     = result.pose;
    speedRef.current    = result.speed;
    progressRef.current = result.progress;
  });

  return poseRef;
}
