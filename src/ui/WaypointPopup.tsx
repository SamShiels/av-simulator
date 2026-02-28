import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/useEditorStore';

const POPUP_OFFSET_Y = 60; // px above the click point

export default function WaypointPopup() {
  const selectedWaypointId     = useEditorStore(s => s.selectedWaypointId);
  const selectedWaypointActorId = useEditorStore(s => s.selectedWaypointActorId);
  const waypointPopupPos       = useEditorStore(s => s.waypointPopupPos);
  const scenario               = useEditorStore(s => s.scenario);
  const dismissWaypointPopup   = useEditorStore(s => s.dismissWaypointPopup);
  const setWaypointTargetSpeed = useEditorStore(s => s.setWaypointTargetSpeed);

  const popupRef = useRef<HTMLDivElement>(null);

  // Dismiss on any pointerdown outside the popup
  useEffect(() => {
    if (!waypointPopupPos) return;

    function handlePointerDown(e: PointerEvent) {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) return;
      document.addEventListener('click', swallowClick, { capture: true, once: true });
      dismissWaypointPopup();
    }

    function swallowClick(e: MouseEvent) {
      e.stopImmediatePropagation();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [waypointPopupPos, dismissWaypointPopup]);

  if (!selectedWaypointId || !selectedWaypointActorId || !waypointPopupPos) return null;

  const track = selectedWaypointActorId === 'ego'
    ? scenario.egoTrack
    : scenario.tracks.find(t => t.actorId === selectedWaypointActorId);

  const waypoint = track?.waypoints.find(w => w.id === selectedWaypointId);
  if (!waypoint) return null;

  const { x, y } = waypointPopupPos;

  return (
    <div
      ref={popupRef}
      className="absolute z-50 rounded-xl backdrop-blur-xl bg-white/10 border border-white/15 shadow-2xl p-3 flex flex-col gap-2 min-w-[10rem]"
      style={{ left: x, top: y - POPUP_OFFSET_Y, transform: 'translateX(-50%)' }}
      onPointerDown={e => e.stopPropagation()}
    >
      <span className="text-white/50 text-xs uppercase tracking-wider">Target Speed</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={1}
          value={waypoint.targetSpeed}
          onChange={e => setWaypointTargetSpeed(selectedWaypointActorId, selectedWaypointId, Number(e.target.value))}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-white/40"
        />
        <span className="text-white/50 text-xs">m/s</span>
      </div>
    </div>
  );
}
