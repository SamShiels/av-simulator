import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderPass } from '../App';

// View-space Z range (units) to map to white→black.
// Camera is at [10,10,10] looking at origin; scene objects sit between
// ~12 (near tiles) and ~35 (far-edge tiles). Tune these if the output
// https://gemini.google.com/app/115683dc6d5cd929// looks too bright or too dark overall.
const DEPTH_NEAR = 0.1;   // objects closer than this → pure white
const DEPTH_FAR  = 20;  // objects farther than this → pure black

const VERTEX = `
  varying float vViewZ;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewZ = -mvPos.z; // positive = in front of camera
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAGMENT = `
  uniform float depthNear;
  uniform float depthFar;
  varying float vViewZ;
  void main() {
    float t = (vViewZ - depthNear) / (depthFar - depthNear);
    float brightness = 1.0 - clamp(t, 0.0, 1.0);
    gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
  }
`;

export function useDepthPass(renderPass: RenderPass): void {
  const { scene } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    if (renderPass === 'depth') {
      materialRef.current ??= new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          depthNear: { value: DEPTH_NEAR },
          depthFar:  { value: DEPTH_FAR },
        },
      });
      scene.overrideMaterial = materialRef.current;
    } else {
      scene.overrideMaterial = null;
    }

    return () => { scene.overrideMaterial = null; };
  }, [renderPass, scene]);
}
