import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { RenderPass } from '../App';

function pickMimeType(): string {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useCanvasRecorder(renderPass: RenderPass): void {
  const { gl } = useThree();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');

  useEffect(() => {
    if (renderPass !== 'idle') {
      startRecording();
    } else {
      stopRecording();
    }
  }, [renderPass]);

  function startRecording(): void {
    const canvas = gl.domElement;
    const mimeType = pickMimeType();
    mimeTypeRef.current = mimeType;

    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const ext = mimeTypeRef.current.startsWith('video/mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      downloadBlob(blob, `render-${Date.now()}.${ext}`);
    };

    recorder.start();
    recorderRef.current = recorder;
  }

  function stopRecording(): void {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  }
}
