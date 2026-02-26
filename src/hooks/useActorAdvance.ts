import { useRef, useEffect, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { advance_actor } from '../scenario/interpolate';
import type { DrivingZone } from '../scenario/interpolate';
import type { WaypointTrack, ScenarioPose } from '../scenario/types';
import { useEditorStore } from '../store/useEditorStore';

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
  const prevTimeRef = useRef(0);

  useEffect(() => {
    poseRef.current     = null;
    speedRef.current    = 0;
    progressRef.current = 0;
    zoneRef.current     = null;
    prevTimeRef.current = 0;
  }, [track]);

  useFrame(() => {
    const scenarioTime = useEditorStore.getState().scenarioTime;
    const delta = scenarioTime - prevTimeRef.current;
    prevTimeRef.current = scenarioTime;

    if (delta === 0) return;

    let speed = speedRef.current;
    let progress = progressRef.current;

    if (delta < 0) {
      // Scrubbed backward — reset and replay from t=0
      speed = 0;
      progress = 0;
    }

    const effectiveDelta = delta < 0 ? scenarioTime : delta;
    if (effectiveDelta <= 0) return;

    const result = advance_actor(track, speed, progress, effectiveDelta, accel, brake, topSpeed);
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
