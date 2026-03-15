import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderPass } from '../App';

const VERTEX = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

export function useEdgePass(renderPass: RenderPass): void {
  const { scene } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const prevBackgroundRef = useRef<THREE.Color | THREE.Texture | null>(null);

  useEffect(() => {
    if (renderPass === 'edge') {
      materialRef.current ??= new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      });
      prevBackgroundRef.current = scene.background;
      scene.overrideMaterial = materialRef.current;
      scene.background = new THREE.Color(0x000000);
    } else {
      scene.overrideMaterial = null;
      scene.background = prevBackgroundRef.current;
    }

    return () => {
      scene.overrideMaterial = null;
      scene.background = prevBackgroundRef.current;
    };
  }, [renderPass, scene]);
}
