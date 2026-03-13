'use client';

import { PlaybackState } from '@/types/midi';

interface Props {
  state: PlaybackState;
  currentTime: number; // seconds
  bpm: number;
  fileName: string;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onBack: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function Transport({ state, currentTime, bpm, fileName, onPlay, onPause, onStop, onBpmChange, onBack }: Props) {
  return (
    <div className="flex items-center gap-3 bg-gray-900 border-b border-gray-800 px-4 h-14 flex-shrink-0">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="w-px h-6 bg-gray-700" />

      <span className="text-gray-400 text-sm truncate max-w-40" title={fileName}>{fileName}</span>

      <div className="flex-1" />

      {/* Playback buttons */}
      <div className="flex items-center gap-2">
        {/* Stop */}
        <button
          onClick={onStop}
          title="Stop"
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <div className="w-3.5 h-3.5 bg-current rounded-sm" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={state === 'playing' ? onPause : onPlay}
          title={state === 'playing' ? 'Pause' : 'Play'}
          className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full transition-colors"
        >
          {state === 'playing' ? (
            <div className="flex gap-[3px]">
              <div className="w-[3px] h-4 bg-white rounded-sm" />
              <div className="w-[3px] h-4 bg-white rounded-sm" />
            </div>
          ) : (
            <svg className="w-4 h-4 ml-0.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2.5l11 5.5-11 5.5V2.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Time display */}
      <div className="font-mono text-sm text-white bg-gray-800 px-3 py-1.5 rounded tabular-nums">
        {formatTime(currentTime)}
      </div>

      <div className="w-px h-6 bg-gray-700" />

      {/* BPM */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">BPM</span>
        <input
          type="number"
          value={bpm}
          onChange={e => {
            const v = Number(e.target.value);
            if (v >= 20 && v <= 400) onBpmChange(v);
          }}
          className="w-16 bg-gray-800 text-white text-sm text-center rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-blue-500 tabular-nums"
          min={20}
          max={400}
        />
      </div>
    </div>
  );
}
