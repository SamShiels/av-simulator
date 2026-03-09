import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { saveScene, loadScene } from '../io/sceneFile';

function CogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function SimSettings() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const simulationPrompt = useEditorStore(s => s.simulationPrompt);
  const setSimulationPrompt = useEditorStore(s => s.setSimulationPrompt);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        title="Settings"
        onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-lg transition-all ${open ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
      >
        <CogIcon />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 rounded-xl backdrop-blur-xl bg-white/10 shadow-2xl border border-white/15 p-3 z-20">
          <label className="block text-white/50 text-xs font-medium uppercase tracking-wider mb-1.5">
            Simulation Prompt
          </label>
          <textarea
            value={simulationPrompt}
            onChange={e => setSimulationPrompt(e.target.value)}
            rows={5}
            className="w-full bg-black/30 text-white text-xs rounded-lg p-2 border border-white/15 resize-none focus:outline-none focus:border-white/40 placeholder:text-white/30"
          />

          <div className="flex gap-2 mt-2">
            <button
              onClick={saveScene}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
            >
              Save
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
            >
              Load
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) { loadScene(file); setOpen(false); }
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}
