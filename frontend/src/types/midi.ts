export interface MidiNote {
  id: string;
  pitch: number; // 0-127
  time: number; // beats from start
  duration: number; // beats
  velocity: number; // 0-127
}

export interface MidiTrack {
  id: string;
  name: string;
  channel: number;
  color: string;
  notes: MidiNote[];
  instrument: string;
  muted: boolean;
  solo: boolean;
}

export interface MidiData {
  bpm: number;
  timeSignature: [number, number];
  durationBeats: number;
  tracks: MidiTrack[];
}

export type PlaybackState = 'stopped' | 'playing' | 'paused';
