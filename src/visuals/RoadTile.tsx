import { Suspense, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import type { RoadType } from '../App'
import { TILE_SIZE } from '../constants'

const OBJ_PATH: Record<RoadType, string> = {
  straight: '/assets/roads/road-straight.obj',
  corner:   '/assets/roads/road-bend-sidewalk.obj',
  pavement: '/assets/roads/tile-low.obj',
}
const MTL_PATH: Record<RoadType, string> = {
  straight: '/assets/roads/road-straight.mtl',
  corner:   '/assets/roads/road-bend-sidewalk.mtl',
  pavement: '/assets/roads/tile-low.mtl',
}

function applyGhost(mat: THREE.Material): THREE.Material {
  const g = mat.clone()
  g.transparent = true
  g.opacity = 0.5
  return g
}

export function RoadTileModel({
  roadType,
  rotation,
  ghost,
}: {
  roadType: RoadType
  rotation: number
  ghost: boolean
}) {
  const materials = useLoader(MTLLoader, MTL_PATH[roadType])
  const obj = useLoader(OBJLoader, OBJ_PATH[roadType])

  const clone = useMemo(() => {
    materials.preload()
    const c = obj.clone(true)
    c.traverse(child => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const matName = (mesh.material as THREE.Material)?.name
      const freshMat = matName ? materials.create(matName) : undefined
      const baseMat = freshMat ?? (mesh.material as THREE.Material)
      mesh.material = ghost ? applyGhost(baseMat) : baseMat
    })
    return c
  }, [obj, materials, ghost])

  return (
    <primitive
      object={clone}
      scale={TILE_SIZE}
      rotation={[0, (rotation * Math.PI) / 2, 0]}
    />
  )
}

export default function RoadTile({
  position,
  roadType,
  rotation,
  ghost = false,
  selected = false,
}: {
  position: [number, number, number];
  roadType: RoadType;
  rotation: number;
  ghost?: boolean;
  selected?: boolean;
}) {
  return (
    <group position={position}>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE_SIZE * 0.97, TILE_SIZE * 0.97]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      <Suspense fallback={null}>
        <RoadTileModel roadType={roadType} rotation={rotation} ghost={ghost} />
      </Suspense>
    </group>
  );
}
