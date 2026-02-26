export type ActorKind = 'pedestrian' | 'stroller' | 'vehicle';

export interface ActorStats {
  accel: number;    // m/s²
  brake: number;    // m/s²
  topSpeed: number; // m/s
}

export interface Waypoint {
  id: string;
  time: number; // seconds along the timeline
  position: [number, number, number]; // world XYZ
  targetSpeed: number;
}

export interface WaypointTrack {
  actorId: string;
  waypoints: Waypoint[]; // sorted by time ascending
}

export interface Actor {
  id: string;
  kind: ActorKind;
  label: string;
  color: string; // hex color for markers and timeline lane
  accel: number;
  brake: number;
  topSpeed: number;
}

export interface Scenario {
  duration: number; // total seconds
  egoTrack: WaypointTrack; // the car's scripted path
  egoStats: ActorStats;
  actors: Actor[]; // non-ego actors
  tracks: WaypointTrack[]; // one track per actor (matched by actorId)
}

export interface ScenarioPose {
  position: [number, number, number];
  yaw: number; // radians
}

export interface ActorPosition {
  position: [number, number, number];
  physical_progress: number; // How far along the track we are in meters
  speed: number;
  yaw: number; // radians
}
