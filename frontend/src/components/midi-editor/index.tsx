'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MidiData, MidiTrack, PlaybackState } from '@/types/midi';
import { FileInput } from './FileInput';
import { Transport } from './Transport';
import { TrackList } from './TrackList';
import { PianoRoll } from './PianoRoll';

const PIXELS_PER_BEAT = 80;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToneModule = typeof import('tone') & { [key: string]: any };

export function MidiEditor() {
  const [midiData, setMidiData] = useState<MidiData | null>(null);
  const [tracks, setTracks] = useState<MidiTrack[]>([]);
  const [fileName, setFileName] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentTimeSecs, setCurrentTimeSecs] = useState(0);
  const [playheadBeats, setPlayheadBeats] = useState(0);

  const toneRef = useRef<ToneModule | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthsRef = useRef<Map<string, any>>(new Map());

  const cancelAnimation = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const disposeSynths = () => {
    synthsRef.current.forEach(s => {
      try { s.dispose(); } catch { /* already disposed */ }
    });
    synthsRef.current.clear();
  };

  const stopPlayback = useCallback(async () => {
    const Tone = toneRef.current;
    if (Tone) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    }
    cancelAnimation();
    disposeSynths();
    setPlaybackState('stopped');
    setCurrentTimeSecs(0);
    setPlayheadBeats(0);
  }, []);

  const startAnimation = useCallback((bpm: number) => {
    const Tone = toneRef.current;
    if (!Tone) return;
    const tick = () => {
      const secs = Tone.Transport.seconds;
      setCurrentTimeSecs(secs);
      setPlayheadBeats(secs * bpm / 60);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const scheduleAndPlay = useCallback(async (data: MidiData, trackList: MidiTrack[]) => {
    if (!toneRef.current) {
      toneRef.current = await import('tone') as ToneModule;
    }
    const Tone = toneRef.current;

    await Tone.start();

    Tone.Transport.cancel();
    Tone.Transport.bpm.value = data.bpm;

    disposeSynths();

    const hasSolo = trackList.some(t => t.solo);
    const active = trackList.filter(t => !t.muted && (!hasSolo || t.solo));
    const beatsToSecs = (b: number) => b * 60 / data.bpm;

    for (const track of active) {
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        oscillator: { type: 'triangle' as const },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      });
      synth.volume.value = -6;
      synthsRef.current.set(track.id, synth);

      for (const note of track.notes) {
        const t0 = beatsToSecs(note.time);
        const dur = Math.max(0.05, beatsToSecs(note.duration));
        const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
        const vel = note.velocity / 127;
        Tone.Transport.schedule((time: number) => {
          synth.triggerAttackRelease(freq, dur, time, vel);
        }, t0);
      }
    }

    Tone.Transport.start();
    setPlaybackState('playing');
    startAnimation(data.bpm);
  }, [startAnimation]);

  const handlePlay = useCallback(() => {
    if (!midiData) return;
    if (playbackState === 'paused' && toneRef.current) {
      toneRef.current.Transport.start();
      setPlaybackState('playing');
      startAnimation(midiData.bpm);
    } else {
      scheduleAndPlay(midiData, tracks);
    }
  }, [midiData, tracks, playbackState, scheduleAndPlay, startAnimation]);

  const handlePause = useCallback(() => {
    const Tone = toneRef.current;
    if (Tone) Tone.Transport.pause();
    cancelAnimation();
    setPlaybackState('paused');
  }, []);

  const handleStop = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const handleBpmChange = useCallback((newBpm: number) => {
    setMidiData(prev => prev ? { ...prev, bpm: newBpm } : null);
    if (toneRef.current) {
      toneRef.current.Transport.bpm.value = newBpm;
    }
  }, []);

  const handleMidiLoaded = useCallback((data: MidiData, name: string) => {
    stopPlayback();
    setMidiData(data);
    setTracks(data.tracks);
    setFileName(name);
    setSelectedTrackId(data.tracks[0]?.id ?? null);
  }, [stopPlayback]);

  const handleToggleMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  }, []);

  const handleToggleSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t));
  }, []);

  const handleUpdateNote = useCallback((trackId: string, noteId: string, time: number, pitch: number) => {
    setTracks(prev =>
      prev.map(track =>
        track.id !== trackId
          ? track
          : {
              ...track,
              notes: track.notes.map(n =>
                n.id === noteId ? { ...n, time, pitch } : n
              ),
            }
      )
    );
  }, []);

  const handleDeleteNote = useCallback((trackId: string, noteId: string) => {
    setTracks(prev =>
      prev.map(track =>
        track.id !== trackId
          ? track
          : { ...track, notes: track.notes.filter(n => n.id !== noteId) }
      )
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
      disposeSynths();
      toneRef.current?.Transport.stop();
      toneRef.current?.Transport.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!midiData) {
    return <FileInput onMidiLoaded={handleMidiLoaded} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <Transport
        state={playbackState}
        currentTime={currentTimeSecs}
        bpm={midiData.bpm}
        fileName={fileName}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onBpmChange={handleBpmChange}
        onBack={() => {
          stopPlayback();
          setMidiData(null);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <TrackList
          tracks={tracks}
          selectedTrackId={selectedTrackId}
          onSelectTrack={setSelectedTrackId}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
        />
        <PianoRoll
          tracks={tracks}
          durationBeats={midiData.durationBeats}
          beatsPerBar={midiData.timeSignature[0]}
          pixelsPerBeat={PIXELS_PER_BEAT}
          playheadBeats={playheadBeats}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
        />
      </div>

      {/* Status bar */}
      <div className="h-6 flex items-center px-4 gap-4 bg-gray-900 border-t border-gray-800 text-[10px] text-gray-500 flex-shrink-0">
        <span>Drag notes to move &nbsp;|&nbsp; Right-click to delete</span>
        <span>{tracks.reduce((s, t) => s + t.notes.length, 0)} total notes</span>
        <span>{midiData.timeSignature[0]}/{midiData.timeSignature[1]}</span>
      </div>
    </div>
  );
}
