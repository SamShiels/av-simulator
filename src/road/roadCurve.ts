import * as THREE from 'three'
import type { Dir, PathStep } from './pathfinder'
import { TILE_SIZE } from '@/constants'

const HALF_TILE = TILE_SIZE / 2;

const DIR_XZ: Record<Dir, [number, number]> = {
  N: [0, -1],
  E: [1,  0],
  S: [0,  1],
  W: [-1, 0],
}

// Convert a sequence of path steps into a smooth CatmullRom spline.
//
// Per tile we emit up to 3 points:
//   • entry edge midpoint  (where the road crosses the incoming tile edge)
//   • tile centre          (guides the curve through corners)
//   • exit edge midpoint   (where the road crosses the outgoing tile edge)
//
// Adjacent tiles share an edge midpoint so duplicates are filtered out.
export function buildRoadCurve(steps: PathStep[]): THREE.CurvePath<THREE.Vector3> {
  // We use a CurvePath to stitch multiple different curve types together smoothly
  const path = new THREE.CurvePath<THREE.Vector3>()

  for (const { block, fromDir, toDir } of steps) {
    const [cx, , cz] = block.position

    const [fdx, fdz] = DIR_XZ[fromDir]
    const [tdx, tdz] = DIR_XZ[toDir]

    const entry = new THREE.Vector3(cx + fdx * HALF_TILE, 0, cz + fdz * HALF_TILE)
    const exit  = new THREE.Vector3(cx + tdx * HALF_TILE, 0, cz + tdz * HALF_TILE)

    // Check if the entry and exit are exact opposites (e.g., entered South, exiting North)
    const isStraight = (fdx === -tdx && fdz === -tdz)

    if (isStraight) {
      // 1. Straight lines get a simple, mathematically perfect straight curve
      path.add(new THREE.LineCurve3(entry, exit))
    } else {
      // 2. Corners get a Quadratic Bezier. 
      // The exact center of the tile acts as the perfect control point to pull 
      // the arc into a natural sweep matching the road mesh.
      const controlPoint = new THREE.Vector3(cx, 0, cz)
      path.add(new THREE.QuadraticBezierCurve3(entry, controlPoint, exit))
    }
  }

  return path
}
