'use client';

import { MidiTrack } from '@/types/midi';

interface Props {
  tracks: MidiTrack[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
}

export function TrackList({ tracks, selectedTrackId, onSelectTrack, onToggleMute, onToggleSolo }: Props) {
  return (
    <div className="w-48 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
      <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest border-b border-gray-800">
        Tracks
      </div>

      {tracks.map(track => (
        <div
          key={track.id}
          className={`group flex items-center gap-2 px-2 py-2.5 cursor-pointer border-b border-gray-800/40 transition-colors ${
            selectedTrackId === track.id
              ? 'bg-gray-800'
              : 'hover:bg-gray-800/50'
          }`}
          onClick={() => onSelectTrack(track.id)}
        >
          {/* Color strip */}
          <div
            className="w-1.5 h-8 rounded-full flex-shrink-0"
            style={{ backgroundColor: track.muted ? '#4b5563' : track.color }}
          />

          {/* Name + channel */}
          <div className="flex-1 min-w-0">
            <div
              className={`text-xs font-medium truncate ${
                track.muted ? 'text-gray-500' : 'text-gray-100'
              }`}
            >
              {track.name}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {track.instrument} &middot; Ch {track.channel + 1}
            </div>
          </div>

          {/* M / S */}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onToggleMute(track.id); }}
              title="Mute"
              className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${
                track.muted
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              M
            </button>
            <button
              onClick={e => { e.stopPropagation(); onToggleSolo(track.id); }}
              title="Solo"
              className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${
                track.solo
                  ? 'bg-green-500 text-gray-900'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              S
            </button>
          </div>
        </div>
      ))}

      {/* Note count legend */}
      <div className="mt-auto p-3 border-t border-gray-800 space-y-1.5">
        {tracks.map(track => (
          <div key={track.id} className="flex items-center gap-2 text-[10px] text-gray-500">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
            <span className="truncate">{track.notes.length} notes</span>
          </div>
        ))}
      </div>
    </div>
  );
}
