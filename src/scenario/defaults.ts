import type { Scenario, WaypointTrack } from './types';
import { EGO_ACCEL, EGO_BRAKE, EGO_TOP_SPEED } from '../constants';

export function defaultEgoTrack(): WaypointTrack {
  return { actorId: 'ego', waypoints: [], length: 0 };
}

export function defaultScenario(): Scenario {
  return {
    duration: 10,
    egoTrack: defaultEgoTrack(),
    egoStats: { accel: EGO_ACCEL, brake: EGO_BRAKE, topSpeed: EGO_TOP_SPEED },
    actors: [],
    tracks: [],
  };
}

const ACTOR_COLORS = [
  '#f97316', // orange
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

export function nextActorColor(existingCount: number): string {
  return ACTOR_COLORS[existingCount % ACTOR_COLORS.length];
}
