import { useRef } from 'react';
import * as THREE from 'three';
import { useViewportControls } from './useViewportControls';

interface Options {
  gl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  enabled: boolean;
  scenarioTime: number;
  selectedActorId: string;
  onAddWaypoint: (actorId: string, time: number, position: [number, number, number]) => void;
  onScenarioTimeChange: (t: number) => void;
}

export function useScenarioMouseControls({
  gl, camera, enabled, scenarioTime, selectedActorId, 
  onAddWaypoint
}: Options) {
  const state = useRef({ scenarioTime, selectedActorId });
  state.current = { scenarioTime, selectedActorId };

  useViewportControls({
    gl,
    camera,
    enabled,
    onGroundClick: (pos) => {
      onAddWaypoint(
        state.current.selectedActorId,
        state.current.scenarioTime,
        [pos.x, 0, pos.z] // Cast back to tuple for your data model
      );
    },
    onContextMenu: (e) => e.preventDefault()
  });
}