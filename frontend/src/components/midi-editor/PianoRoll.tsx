'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { MidiNote, MidiTrack } from '@/types/midi';

export const PIANO_KEY_WIDTH = 80;
export const TIME_RULER_HEIGHT = 32;
export const NOTE_HEIGHT = 14;
const TOTAL_PITCHES = 128;
const GRID_HEIGHT = TOTAL_PITCHES * NOTE_HEIGHT;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function isBlackKey(pitch: number) {
  return [1, 3, 6, 8, 10].includes(pitch % 12);
}

function getNoteName(pitch: number) {
  const octave = Math.floor(pitch / 12) - 1;
  return `${NOTE_NAMES[pitch % 12]}${octave}`;
}

interface DragState {
  noteId: string;
  trackId: string;
  startMouseX: number;
  startMouseY: number;
  originalTime: number;
  originalPitch: number;
}

interface Props {
  tracks: MidiTrack[];
  durationBeats: number;
  beatsPerBar: number;
  pixelsPerBeat: number;
  playheadBeats: number;
  onUpdateNote: (trackId: string, noteId: string, time: number, pitch: number) => void;
  onDeleteNote: (trackId: string, noteId: string) => void;
}

export function PianoRoll({
  tracks,
  durationBeats,
  beatsPerBar,
  pixelsPerBeat,
  playheadBeats,
  onUpdateNote,
  onDeleteNote,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pianoScrollRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState({ time: 0, pitch: 0 });

  const totalBeats = Math.max(durationBeats + 4, 32);
  const totalBars = Math.ceil(totalBeats / beatsPerBar);
  const totalWidth = totalBeats * pixelsPerBeat;

  // Sync piano keys and ruler scroll with the grid
  const handleGridScroll = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (pianoScrollRef.current) pianoScrollRef.current.scrollTop = grid.scrollTop;
    if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = grid.scrollLeft;
  }, []);

  // Scroll to show C4 area on mount
  useEffect(() => {
    if (gridRef.current) {
      const c4Y = (127 - 60) * NOTE_HEIGHT;
      gridRef.current.scrollTop = Math.max(0, c4Y - 200);
    }
  }, []);

  // Drag: global mouse move + up
  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const rawDt = (e.clientX - dragState.startMouseX) / pixelsPerBeat;
      const rawDp = -(e.clientY - dragState.startMouseY) / NOTE_HEIGHT;
      // Snap time to nearest 16th note (0.25 beats)
      setDragOffset({
        time: Math.round(rawDt * 4) / 4,
        pitch: Math.round(rawDp),
      });
    };

    const onMouseUp = () => {
      const newTime = Math.max(0, dragState.originalTime + dragOffset.time);
      const newPitch = Math.max(0, Math.min(127, dragState.originalPitch + dragOffset.pitch));
      onUpdateNote(dragState.trackId, dragState.noteId, newTime, newPitch);
      setDragState(null);
      setDragOffset({ time: 0, pitch: 0 });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, dragOffset, pixelsPerBeat, onUpdateNote]);

  const hasSolo = tracks.some(t => t.solo);
  const activeTrackIds = new Set(
    tracks.filter(t => !t.muted && (!hasSolo || t.solo)).map(t => t.id)
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Piano keys column */}
      <div className="flex flex-col flex-shrink-0" style={{ width: PIANO_KEY_WIDTH }}>
        {/* Corner spacer */}
        <div
          className="flex-shrink-0 bg-gray-950 border-b border-r border-gray-800"
          style={{ height: TIME_RULER_HEIGHT }}
        />
        {/* Keys scroll (controlled by grid scroll) */}
        <div
          ref={pianoScrollRef}
          className="flex-1 overflow-hidden border-r border-gray-800"
        >
          <div style={{ height: GRID_HEIGHT }}>
            {Array.from({ length: TOTAL_PITCHES }, (_, i) => {
              const pitch = 127 - i;
              const black = isBlackKey(pitch);
              const isC = pitch % 12 === 0;
              const isA4 = pitch === 69;
              const showLabel = isC || isA4;

              return (
                <div
                  key={pitch}
                  className={`flex items-center justify-between px-1.5 select-none ${
                    black ? 'bg-gray-900' : 'bg-gray-800'
                  }`}
                  style={{
                    height: NOTE_HEIGHT,
                    borderBottom: isC
                      ? '1px solid rgba(99,102,241,0.3)'
                      : '1px solid rgba(75,85,99,0.2)',
                  }}
                >
                  {showLabel ? (
                    <span
                      className={`text-[9px] font-medium leading-none ${
                        isC ? 'text-indigo-300' : 'text-gray-500'
                      }`}
                    >
                      {getNoteName(pitch)}
                    </span>
                  ) : null}
                  {/* Visual key shape hint */}
                  {!black && (
                    <div className="w-1.5 h-2 rounded-b-sm bg-gray-600/40" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right side: ruler + scrollable grid */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Time ruler */}
        <div
          ref={rulerScrollRef}
          className="flex-shrink-0 overflow-hidden bg-gray-950 border-b border-gray-800"
          style={{ height: TIME_RULER_HEIGHT }}
        >
          <div className="relative" style={{ width: totalWidth, height: TIME_RULER_HEIGHT }}>
            {Array.from({ length: totalBars }, (_, bar) => {
              const barX = bar * beatsPerBar * pixelsPerBeat;
              return (
                <div key={bar} style={{ position: 'absolute', left: barX }}>
                  <div className="absolute top-0 h-full w-px bg-gray-600/70" />
                  <span className="absolute top-1.5 left-1.5 text-[10px] text-gray-400 font-mono select-none">
                    {bar + 1}
                  </span>
                  {Array.from({ length: beatsPerBar - 1 }, (_, b) => (
                    <div
                      key={b}
                      className="absolute top-5 bottom-0 w-px bg-gray-700/50"
                      style={{ left: (b + 1) * pixelsPerBeat }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Note grid */}
        <div
          ref={gridRef}
          className="flex-1 overflow-scroll"
          onScroll={handleGridScroll}
          style={{ cursor: dragState ? 'grabbing' : 'default' }}
        >
          <div
            className="relative"
            style={{ width: totalWidth, height: GRID_HEIGHT }}
          >
            {/* Pitch row backgrounds */}
            {Array.from({ length: TOTAL_PITCHES }, (_, i) => {
              const pitch = 127 - i;
              const black = isBlackKey(pitch);
              const isC = pitch % 12 === 0;
              return (
                <div
                  key={pitch}
                  className={`absolute w-full ${black ? 'bg-gray-900/50' : 'bg-gray-950'}`}
                  style={{
                    top: i * NOTE_HEIGHT,
                    height: NOTE_HEIGHT,
                    borderBottom: isC
                      ? '1px solid rgba(99,102,241,0.15)'
                      : '1px solid rgba(55,65,81,0.25)',
                  }}
                />
              );
            })}

            {/* Bar / beat grid lines */}
            {Array.from({ length: totalBars }, (_, bar) => {
              const barX = bar * beatsPerBar * pixelsPerBeat;
              return (
                <div key={bar}>
                  <div
                    className="absolute top-0 bottom-0 w-px bg-gray-600/40"
                    style={{ left: barX }}
                  />
                  {Array.from({ length: beatsPerBar - 1 }, (_, b) => (
                    <div
                      key={b}
                      className="absolute top-0 bottom-0 w-px bg-gray-800/50"
                      style={{ left: barX + (b + 1) * pixelsPerBeat }}
                    />
                  ))}
                </div>
              );
            })}

            {/* Notes */}
            {tracks.map(track =>
              track.notes.map(note => {
                const isDragging =
                  dragState?.noteId === note.id && dragState?.trackId === track.id;

                const displayTime = isDragging
                  ? Math.max(0, note.time + dragOffset.time)
                  : note.time;
                const displayPitch = isDragging
                  ? Math.max(0, Math.min(127, note.pitch + dragOffset.pitch))
                  : note.pitch;

                const x = displayTime * pixelsPerBeat;
                const y = (127 - displayPitch) * NOTE_HEIGHT;
                const width = Math.max(3, note.duration * pixelsPerBeat - 1);
                const isActive = activeTrackIds.has(track.id);

                return (
                  <div
                    key={`${track.id}-${note.id}`}
                    title={`${getNoteName(note.pitch)} — vel ${note.velocity}`}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: y + 1,
                      width,
                      height: NOTE_HEIGHT - 2,
                      backgroundColor: track.color,
                      opacity: isActive ? (isDragging ? 1 : 0.9) : 0.25,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      borderRadius: 2,
                      border: isDragging
                        ? '1px solid rgba(255,255,255,0.6)'
                        : '1px solid rgba(0,0,0,0.3)',
                      zIndex: isDragging ? 10 : 1,
                      boxShadow: isDragging ? '0 0 0 1px rgba(255,255,255,0.25)' : undefined,
                      userSelect: 'none',
                    }}
                    onMouseDown={e => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      setDragState({
                        noteId: note.id,
                        trackId: track.id,
                        startMouseX: e.clientX,
                        startMouseY: e.clientY,
                        originalTime: note.time,
                        originalPitch: note.pitch,
                      });
                    }}
                    onContextMenu={e => {
                      e.preventDefault();
                      onDeleteNote(track.id, note.id);
                    }}
                  />
                );
              })
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/80 pointer-events-none"
              style={{ left: playheadBeats * pixelsPerBeat, zIndex: 20 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
