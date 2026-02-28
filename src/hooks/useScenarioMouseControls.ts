import { useRef } from 'react';
import * as THREE from 'three';
import { useViewportControls } from './useViewportControls';

interface Options {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  enabled: boolean;
  scenarioProgress: number;
  selectedActorId: string;
  onAddWaypoint: (actorId: string, time: number, position: [number, number, number]) => void;
  onScenarioProgressChange: (t: number) => void;
  onCursorMove?: (pos: [number, number, number] | null) => void;
}

export function useScenarioMouseControls({
  gl, camera, enabled, scenarioProgress, selectedActorId,
  onAddWaypoint, onCursorMove
}: Options) {
  const state = useRef({ scenarioProgress, selectedActorId });
  state.current = { scenarioProgress, selectedActorId };

  useViewportControls({
    gl,
    camera,
    enabled,
    onGroundClick: (pos) => {
      onAddWaypoint(
        state.current.selectedActorId,
        state.current.scenarioProgress,
        [pos.x, 0, pos.z],
      );
    },
    onGroundMove: onCursorMove
      ? (pos) => onCursorMove(pos ? [pos.x, 0, pos.z] : null)
      : undefined,
    onContextMenu: (e) => e.preventDefault(),
  });
}