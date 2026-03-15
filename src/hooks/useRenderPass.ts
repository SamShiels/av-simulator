import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderPass } from '../App';
import {
  DEPTH_VERTEX, DEPTH_FRAGMENT, DEPTH_UNIFORMS,
  EDGE_VERTEX, EDGE_FRAGMENT, EDGE_THRESHOLD,
} from './passShaders';

function createDepthMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: DEPTH_VERTEX,
    fragmentShader: DEPTH_FRAGMENT,
    uniforms: { ...DEPTH_UNIFORMS },
  });
}

function createEdgeMaterial(width: number, height: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: EDGE_VERTEX,
    fragmentShader: EDGE_FRAGMENT,
    uniforms: {
      depthTex: { value: null },
      resolution: { value: new THREE.Vector2(width, height) },
      threshold: { value: EDGE_THRESHOLD },
    },
  });
}

function createEdgeScene(material: THREE.ShaderMaterial): { scene: THREE.Scene; camera: THREE.OrthographicCamera } {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);
  return { scene, camera };
}

export function useRenderPass(renderPass: RenderPass): void {
  const { scene, gl, camera, size } = useThree();
  const depthMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const edgeMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const edgeSceneRef = useRef<{ scene: THREE.Scene; camera: THREE.OrthographicCamera } | null>(null);
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const renderPassRef = useRef<RenderPass>(renderPass);

  renderPassRef.current = renderPass;

  // Create / resize the offscreen render target when the canvas size changes.
  useEffect(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height);
    renderTargetRef.current = rt;

    if (edgeMatRef.current) {
      edgeMatRef.current.uniforms.resolution.value.set(size.width, size.height);
    }

    return () => { rt.dispose(); };
  }, [size.width, size.height]);

  // Priority 1 disables R3F's auto-render so we control all passes.
  useFrame(() => {
    const pass = renderPassRef.current;

    if (pass === 'depth') {
      renderDepth(gl, scene, camera, depthMatRef);
    } else if (pass === 'edge') {
      renderEdge(gl, scene, camera, size, depthMatRef, edgeMatRef, edgeSceneRef, renderTargetRef);
    } else {
      gl.render(scene, camera);
    }
  }, 1);
}

// ── helpers ───────────────────────────────────────────────────────────────

function renderDepth(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  depthMatRef: React.MutableRefObject<THREE.ShaderMaterial | null>,
): void {
  depthMatRef.current ??= createDepthMaterial();
  scene.overrideMaterial = depthMatRef.current;
  gl.render(scene, camera);
  scene.overrideMaterial = null;
}

function renderEdge(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  size: { width: number; height: number },
  depthMatRef: React.MutableRefObject<THREE.ShaderMaterial | null>,
  edgeMatRef: React.MutableRefObject<THREE.ShaderMaterial | null>,
  edgeSceneRef: React.MutableRefObject<{ scene: THREE.Scene; camera: THREE.OrthographicCamera } | null>,
  renderTargetRef: React.MutableRefObject<THREE.WebGLRenderTarget | null>,
): void {
  depthMatRef.current ??= createDepthMaterial();

  if (!edgeMatRef.current) {
    edgeMatRef.current = createEdgeMaterial(size.width, size.height);
    edgeSceneRef.current = createEdgeScene(edgeMatRef.current);
  }

  const rt = renderTargetRef.current!;

  // 1. Render linearised depth to the offscreen target.
  scene.overrideMaterial = depthMatRef.current;
  gl.setRenderTarget(rt);
  gl.clear();
  gl.render(scene, camera);
  scene.overrideMaterial = null;
  gl.setRenderTarget(null);

  // 2. Fullscreen edge-detection pass to the canvas.
  edgeMatRef.current.uniforms.depthTex.value = rt.texture;
  gl.clear();
  gl.render(edgeSceneRef.current!.scene, edgeSceneRef.current!.camera);
}
