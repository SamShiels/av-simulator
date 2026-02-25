import * as THREE from 'three';
import type { WaypointTrack, ScenarioPose } from './types';

// Reused across calls to avoid per-call allocation
const _curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();

/**
 * Evaluate a WaypointTrack at a given time in seconds.
 * Returns null if the track has no waypoints.
 * Clamps to [first waypoint time, last waypoint time].
 */
export function evaluateTrack(track: WaypointTrack, time: number): ScenarioPose | null {
  const wps = track.waypoints;
  const segments = wps.length;

  if (segments === 0) {
    return null;
  }

  if (segments === 1) {
    const [x, y, z] = wps[0].position;
    return { position: [x, y, z], yaw: 0 };
  }

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  const lengths = _curve.getLengths(segments - 1);

  // Clamp time to the track's range
  const t0 = wps[0].time;
  const tN = wps[segments - 1].time;
  const clamped = Math.max(t0, Math.min(tN, time));

  // Find the bracketing segment index
  let i = 0;
  while (i < segments - 2 && wps[i + 1].time <= clamped) i++;

  const segStart = wps[i].time;
  const segEnd =   wps[i + 1].time;
  const alpha = segEnd > segStart ? (clamped - segStart) / (segEnd - segStart) : 0;

  // Map to CatmullRomCurve3's uniform parameter space [0, 1]
  const totalLen = lengths[segments - 1];
  const arcFracs = lengths.map(l => l / totalLen);
  const u = arcFracs[i] + alpha * (arcFracs[i + 1] - arcFracs[i]);

  _curve.getPointAt(u, _pos);
  _curve.getTangentAt(u, _tangent);

  const yaw = Math.atan2(_tangent.x, _tangent.z);

  return {
    position: [_pos.x, _pos.y, _pos.z],
    yaw,
  };
}

export function createSpeedProfile(track: WaypointTrack, accel: number, brake: number, top_speed: number): WaypointTrack {
  const _curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
  const wps = track.waypoints;
  if (wps.length < 2) return track;

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  const total_length = _curve.getLength();

  const wp_distances = wps.map((_, index) => {
    if (index === 0) return 0;
    if (index === wps.length - 1) return total_length;

    const waypoint_progress_percentage = index / (wps.length - 1);
    const current_waypoint_distance = _curve.getUtoTmapping(waypoint_progress_percentage, waypoint_progress_percentage) * total_length;

    return current_waypoint_distance;
  });

  const forward_pass = [wps[0].targetSpeed];

  for (let i = 0; i < wps.length - 1; i++) {
    const s_current = forward_pass[i];
    const distance_to_next_waypoint = wp_distances[i + 1] - wp_distances[i];

    let highest_speed = Math.sqrt(Math.pow(s_current, 2) + (2 * accel * distance_to_next_waypoint));
    highest_speed = Math.min(highest_speed, top_speed);
    highest_speed = Math.min(highest_speed, wps[i + 1].targetSpeed);

    forward_pass.push(highest_speed);
  }

  const backward_pass = new Array(wps.length);
  backward_pass[wps.length - 1] = wps[wps.length - 1].targetSpeed;

  for (let i = wps.length - 1; i > 0; i--) {
    const s_current = backward_pass[i];
    const distance_to_prev_waypoint = wp_distances[i] - wp_distances[i - 1];

    let highest_safe_speed = Math.sqrt(Math.pow(s_current, 2) + (2 * brake * distance_to_prev_waypoint));
    
    // Cap it to top speed
    highest_safe_speed = Math.min(highest_safe_speed, top_speed);
    
    // Cap it to the wishlist speed of the waypoint behind us!
    highest_safe_speed = Math.min(highest_safe_speed, wps[i - 1].targetSpeed);
    backward_pass[i - 1] = highest_safe_speed;
  }

  const corrected_waypoints = wps.map((w, i) => {
    return {
      ...w,
      targetSpeed: Math.min(forward_pass[i], backward_pass[i], top_speed)
    }
  });

  return {
    ...track,
    waypoints: corrected_waypoints
  }
}
