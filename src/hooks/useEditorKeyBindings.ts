import { useEffect } from 'react';
import { useEditorStore, selectionActorId, selectionWaypointId } from '../store/useEditorStore';

export function useEditorKeyBindings() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const { selection, deleteWaypoint } = useEditorStore.getState();
      const wpId = selectionWaypointId(selection);
      if (wpId) {
        deleteWaypoint(selectionActorId(selection), wpId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
