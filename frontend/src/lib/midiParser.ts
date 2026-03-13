import { Midi } from '@tonejs/midi';
import { MidiData, MidiTrack, MidiNote } from '@/types/midi';

const TRACK_COLORS = [
  '#60a5fa', '#34d399', '#f87171', '#fbbf24',
  '#a78bfa', '#38bdf8', '#fb923c', '#f472b6',
];

export function parseMidiFile(buffer: ArrayBuffer): MidiData {
  const midi = new Midi(buffer);

  const bpm =
    midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;

  const timeSig: [number, number] =
    midi.header.timeSignatures.length > 0
      ? (midi.header.timeSignatures[0].timeSignature as [number, number])
      : [4, 4];

  const secondsToBeats = (seconds: number) => seconds * bpm / 60;

  const tracks: MidiTrack[] = midi.tracks
    .filter(t => t.notes.length > 0)
    .map((track, i): MidiTrack => ({
      id: `track-${i}`,
      name: track.name || `Track ${i + 1}`,
      channel: track.channel ?? i,
      color: TRACK_COLORS[i % TRACK_COLORS.length],
      instrument: track.instrument?.name || 'Piano',
      muted: false,
      solo: false,
      notes: track.notes.map((note, j): MidiNote => ({
        id: `t${i}-n${j}`,
        pitch: note.midi,
        time: secondsToBeats(note.time),
        duration: Math.max(0.125, secondsToBeats(note.duration)),
        velocity: Math.round(note.velocity * 127),
      })),
    }));

  const durationBeats = secondsToBeats(midi.duration) || 16;

  return {
    bpm,
    timeSignature: timeSig,
    durationBeats: Math.ceil(durationBeats),
    tracks,
  };
}
