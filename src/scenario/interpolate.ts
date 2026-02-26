import * as THREE from 'three';
import type { WaypointTrack, ScenarioPose } from './types';

// Reused across calls to avoid per-call allocation
const _curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();

export type DrivingZone = 'accelerating' | 'braking' | 'cruising';

export interface AdvanceResult {
  pose: ScenarioPose;
  speed: number;
  progress: number;
  zone: DrivingZone;
}

export function advance_actor(track: WaypointTrack, current_speed: number, current_progress: number, delta: number, acceleration: number, brake: number): AdvanceResult | null {
  const wps = track.waypoints;
  const segments = wps.length;

  if (segments === 0) {
    return null;
  }

  if (segments === 1) {
    const [x, y, z] = wps[0].position;
    return { pose: { position: [x, y, z], yaw: 0 }, speed: current_speed, progress: current_progress, zone: 'cruising' };
  }

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
  _curve.updateArcLengths();
  const total_length = _curve.getLength();

  const wp_distances = _curve.getLengths(wps.length - 1);

  let i = 0;
  while (i < segments - 2 && wp_distances[i + 1] <= current_progress) i++;

  const next_waypoint = wps[i + 1];

  const get_new_speed = (): number => {
    if (current_speed < next_waypoint.targetSpeed) {
      // Speed up!
      return current_speed + (acceleration * delta);
    } else if (current_speed > next_waypoint.targetSpeed) {
      // Slow down!
      const braking_distance = (Math.pow(current_speed, 2) - Math.pow(next_waypoint.targetSpeed, 2)) / (brake * 2);
      const distance_to_next_waypoint = wp_distances[i + 1] - current_progress;
      
      if (distance_to_next_waypoint < braking_distance) {
        return Math.max(current_speed - (brake * delta), next_waypoint.targetSpeed);
      }
    }

    return current_speed;
  }

  const updated_speed = get_new_speed();
  const updated_progress = current_progress + updated_speed * delta;

  const progress_percentage = updated_progress / total_length;

  _curve.getPointAt(progress_percentage, _pos);
  _curve.getTangentAt(progress_percentage, _tangent);

  const yaw = Math.atan2(_tangent.x, _tangent.z);

  let zone: DrivingZone;
  if (updated_speed > current_speed) zone = 'accelerating';
  else if (updated_speed < current_speed) zone = 'braking';
  else zone = 'cruising';

  return {
    pose: { position: [_pos.x, _pos.y, _pos.z], yaw },
    speed: updated_speed,
    progress: updated_progress,
    zone,
  };
}

export function createSpeedProfile(track: WaypointTrack, accel: number, brake: number, top_speed: number): WaypointTrack {
  const _curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
  const wps = track.waypoints;
  if (wps.length < 2) return track;

  _curve.points = wps.map(w => new THREE.Vector3(w.position[0], w.position[1], w.position[2]));

  const wp_distances = _curve.getLengths(wps.length - 1);

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
