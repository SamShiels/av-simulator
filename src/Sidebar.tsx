import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RoadType } from './App';
import { RoadTileModel } from './visuals/RoadTile';

interface Props {
  selectedRoadType: RoadType;
  onSelect: (type: RoadType) => void;
}

const ROAD_TYPES: { type: RoadType; label: string }[] = [
  { type: 'straight', label: 'Straight' },
  { type: 'corner', label: 'Corner' },
];

function TilePreview({ roadType }: { roadType: RoadType }) {
  return (
    <Canvas
      camera={{ position: [0, 4, 0], fov: 40, up: [0, 0, -1] }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={2} />
      <directionalLight position={[3, 6, 3]} intensity={1} />
      <Suspense fallback={null}>
        <RoadTileModel roadType={roadType} rotation={0} ghost={false} />
      </Suspense>
    </Canvas>
  );
}

export default function Sidebar({ selectedRoadType, onSelect }: Props) {
  return (
    <Card className="dark absolute right-4 top-1/2 -translate-y-1/2 w-44 bg-card/80 backdrop-blur-md border-border/50 shadow-2xl">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs tracking-widest text-muted-foreground uppercase">
          Road
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {ROAD_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                'flex flex-col items-center gap-1 p-1.5 rounded-md transition-all text-xs',
                selectedRoadType === type
                  ? 'bg-white/20 ring-1 ring-white text-white'
                  : 'text-muted-foreground hover:bg-white/10 hover:text-white',
              )}
            >
              <div className="w-full aspect-square rounded overflow-hidden">
                <TilePreview roadType={type} />
              </div>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground text-center leading-tight">
          Right-click to rotate
        </p>
      </CardContent>
    </Card>
  );
}
