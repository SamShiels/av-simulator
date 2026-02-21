import * as THREE from 'three'
import type { Dir, PathStep } from './pathfinder'
import { TILE_SIZE } from '@/constants'

const HALF_TILE = TILE_SIZE / 2;

// Lateral offset from road centre — positive = left of travel direction (UK/left-hand traffic)
const LANE_OFFSET = 0.4;

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

    // Left-of-travel perpendicular vectors at entry and exit (up × travelDir).
    // entry travel dir = (-fdx, 0, -fdz)  →  left = (-fdz, 0,  fdx)
    // exit  travel dir = ( tdx, 0,  tdz)  →  left = ( tdz, 0, -tdx)
    const lEx = -fdz, lEz = fdx;   // left at entry
    const lXx =  tdz, lXz = -tdx; // left at exit

    const entry = new THREE.Vector3(cx + fdx * HALF_TILE + lEx * LANE_OFFSET, 0, cz + fdz * HALF_TILE + lEz * LANE_OFFSET)
    const exit  = new THREE.Vector3(cx + tdx * HALF_TILE + lXx * LANE_OFFSET, 0, cz + tdz * HALF_TILE + lXz * LANE_OFFSET)

    // Check if the entry and exit are exact opposites (e.g., entered South, exiting North)
    const isStraight = (fdx === -tdx && fdz === -tdz)

    if (isStraight) {
      // 1. Straight lines get a simple, mathematically perfect straight curve
      path.add(new THREE.LineCurve3(entry, exit))
    } else {
      // 2. Corners get a Quadratic Bezier.
      // The new control point is the intersection of the two offset tangent lines,
      // which equals the original tile centre shifted by the sum of both lane offsets.
      const controlPoint = new THREE.Vector3(cx + (lEx + lXx) * LANE_OFFSET, 0, cz + (lEz + lXz) * LANE_OFFSET)
      path.add(new THREE.QuadraticBezierCurve3(entry, controlPoint, exit))
    }
  }

  return path
}
