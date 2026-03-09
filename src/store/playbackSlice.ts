import type { StateCreator } from 'zustand';
import type { RenderPass } from '../App';
import type { EditorStore } from './useEditorStore';

export type RenderStatus = 'idle' | 'rendering' | 'uploading' | 'error';

export type PlaybackSlice = {
  playing: boolean;
  renderPass: RenderPass;
  renderStatus: RenderStatus;
  scenarioProgress: number;
  simulationPrompt: string;

  togglePlaying: () => void;
  setScenarioProgress: (t: number) => void;
  setRenderPass: (pass: RenderPass) => void;
  setRenderStatus: (status: RenderStatus) => void;
  startRender: () => void;
  cancelRender: () => void;
  setSimulationPrompt: (prompt: string) => void;
};

export const createPlaybackSlice: StateCreator<EditorStore, [], [], PlaybackSlice> = (set) => ({
  playing: false,
  renderPass: 'idle',
  renderStatus: 'idle',
  scenarioProgress: 0,
  simulationPrompt: 'Photorealistic dashcam footage, driving down a road, heavy rain, glowing streetlights reflecting on wet asphalt, cinematic lighting, 8k resolution.',

  togglePlaying: () => set(s => ({ playing: !s.playing })),
  setScenarioProgress: (t) => set({ scenarioProgress: t }),
  setRenderPass: (pass) => set({ renderPass: pass }),
  setRenderStatus: (status) => set({ renderStatus: status }),
  startRender: () => set({ scenarioProgress: 0, playing: false, renderPass: 'depth', renderStatus: 'rendering' }),
  cancelRender: () => set({ renderPass: 'idle', renderStatus: 'idle' }),
  setSimulationPrompt: (prompt) => set({ simulationPrompt: prompt }),
});
