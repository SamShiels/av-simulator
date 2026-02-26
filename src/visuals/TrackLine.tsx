import { useMemo } from 'react';
import * as THREE from 'three';
import type { WaypointTrack } from '../scenario/types';

interface Props {
  track: WaypointTrack;
  color: string;
}

const SAMPLES_PER_SEGMENT = 20;
const SPEED_THRESHOLD = 0.01;
const COLOR_ACCEL = '#22c55e';
const COLOR_BRAKE = '#ef4444';

export default function TrackLine({ track, color }: Props) {
  const lines = useMemo(() => {
    const wps = track.waypoints;
    if (wps.length < 2) return [];

    const curve = new THREE.CatmullRomCurve3(
      wps.map(w => new THREE.Vector3(w.position[0], w.position[1] + 0.05, w.position[2])),
      false,
      'centripetal',
    );

    const arcLengths = curve.getLengths(wps.length - 1);
    const totalLength = arcLengths[arcLengths.length - 1];

    return wps.slice(0, -1).map((wp, i) => {
      const t0 = arcLengths[i] / totalLength;
      const t1 = arcLengths[i + 1] / totalLength;

      const speedNow = wp.targetSpeed;
      const speedNext = wps[i + 1].targetSpeed;

      let segColor: string;
      if (speedNext > speedNow + SPEED_THRESHOLD) segColor = COLOR_ACCEL;
      else if (speedNext < speedNow - SPEED_THRESHOLD) segColor = COLOR_BRAKE;
      else segColor = color;

      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= SAMPLES_PER_SEGMENT; j++) {
        const t = t0 + (t1 - t0) * (j / SAMPLES_PER_SEGMENT);
        points.push(curve.getPointAt(t));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: segColor });
      return new THREE.Line(geom, mat);
    });
  }, [track.waypoints, color]);

  return (
    <>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </>
  );
}
