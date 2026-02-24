import { useEffect } from 'react';
import { useEditorStore, selectionActorId } from '../store/useEditorStore';

export function useEditorKeyBindings() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const { selection, selectedWaypointId, deleteWaypoint } = useEditorStore.getState();
      if (selectedWaypointId) {
        deleteWaypoint(selectionActorId(selection), selectedWaypointId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
