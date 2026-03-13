'use client';

import { useRef, useState } from 'react';
import { parseMidiFile } from '@/lib/midiParser';
import { DUMMY_MIDI } from '@/lib/dummy';
import { MidiData } from '@/types/midi';

interface Props {
  onMidiLoaded: (data: MidiData, source: string) => void;
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function FileInput({ onMidiLoaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState('');

  const handleFile = async (file: File) => {
    const name = file.name;
    if (name.endsWith('.mid') || name.endsWith('.midi')) {
      setStatus('Parsing MIDI file...');
      try {
        const buffer = await file.arrayBuffer();
        const data = parseMidiFile(buffer);
        onMidiLoaded(data, name);
      } catch (e) {
        console.error(e);
        setStatus('');
        alert('Could not parse MIDI file. It may be corrupted or unsupported.');
      }
    } else {
      // Voice/audio file — conversion not yet implemented, use dummy
      setStatus('Processing audio... (using placeholder MIDI)');
      setTimeout(() => {
        onMidiLoaded(structuredClone(DUMMY_MIDI), `${name} (converted)`);
        setStatus('');
      }, 1200);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setStatus('Converting voice to MIDI... (using placeholder MIDI)');
        setTimeout(() => {
          onMidiLoaded(structuredClone(DUMMY_MIDI), 'Voice Recording (converted)');
          setStatus('');
        }, 1400);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Orca MIDI Editor</h1>
          <p className="text-gray-400 text-sm">Upload a MIDI file, an audio recording, or record your voice</p>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-gray-700 hover:border-gray-500 bg-gray-900 hover:bg-gray-900/80'
          }`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".mid,.midi,.wav,.mp3,.ogg,.m4a,.webm,.flac"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div className="text-white font-medium">Drop a file here or click to browse</div>
            <div className="text-gray-500 text-sm">MIDI: .mid, .midi &nbsp;|&nbsp; Audio: .wav, .mp3, .ogg, .m4a</div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-sm">or record live</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Record */}
        <div className="flex flex-col items-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white px-8 py-3.5 rounded-full font-semibold transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-white" />
              Record Voice
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-2xl tabular-nums">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-full font-semibold transition-colors"
              >
                Stop &amp; Convert
              </button>
            </div>
          )}
          <p className="text-gray-600 text-xs">Voice-to-MIDI conversion coming soon &mdash; a placeholder will be shown</p>
        </div>

        {/* Status */}
        {status && (
          <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
