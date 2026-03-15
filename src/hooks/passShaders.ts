// View-space Z range (units) to map to white→black.
const DEPTH_NEAR = 0.1;
const DEPTH_FAR = 20;

export const DEPTH_VERTEX = `
  varying float vViewZ;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewZ = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const DEPTH_FRAGMENT = `
  uniform float depthNear;
  uniform float depthFar;
  varying float vViewZ;
  void main() {
    float t = (vViewZ - depthNear) / (depthFar - depthNear);
    float brightness = 1.0 - clamp(t, 0.0, 1.0);
    gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
  }
`;

export const DEPTH_UNIFORMS = {
  depthNear: { value: DEPTH_NEAR },
  depthFar: { value: DEPTH_FAR },
};

// Depth-discontinuity threshold (in normalised depth units).
// Raise to suppress fine edges, lower to catch more detail.
export const EDGE_THRESHOLD = 0.04;

export const EDGE_VERTEX = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const EDGE_FRAGMENT = `
  uniform sampler2D depthTex;
  uniform vec2 resolution;
  uniform float threshold;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texel = 1.0 / resolution;

    float d  = texture2D(depthTex, uv).r;
    float dL = texture2D(depthTex, uv + vec2(-texel.x, 0.0)).r;
    float dR = texture2D(depthTex, uv + vec2( texel.x, 0.0)).r;
    float dU = texture2D(depthTex, uv + vec2(0.0,  texel.y)).r;
    float dD = texture2D(depthTex, uv + vec2(0.0, -texel.y)).r;

    float dx = abs(dR - dL);
    float dy = abs(dU - dD);
    float edge = step(threshold, max(dx, dy));

    gl_FragColor = vec4(vec3(1.0 - edge), 1.0);
  }
`;
