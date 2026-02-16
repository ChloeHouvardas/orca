from torchfcpe import spawn_bundled_infer_model
import torch
import librosa
import numpy as np
import pretty_midi

# Configure device and target hop size
device = 'cpu'  # or 'cuda' if using a GPU
sr = 16000  # Sample rate
hop_size = 160  # Hop size for processing

# Load and preprocess audio
audio, sr = librosa.load('rockHumming.wav', sr=sr)
audio = librosa.to_mono(audio)
audio_length = len(audio)
f0_target_length = (audio_length // hop_size) + 1
audio = torch.from_numpy(audio).float().unsqueeze(0).unsqueeze(-1).to(device)

# Load the model
model = spawn_bundled_infer_model(device=device)

# Perform pitch inference
f0 = model.infer(
    audio,
    sr=sr,
    decoder_mode='local_argmax',  # Recommended mode
    threshold=0.006,  # Threshold for V/UV decision
    f0_min=80,  # Minimum pitch
    f0_max=880,  # Maximum pitch
    interp_uv=False,  # Interpolate unvoiced frames
    output_interp_target_length=f0_target_length,  # Interpolate to target length
)

print(f0)

def write_midi_from_f0(f0_values, hop, sample_rate, output_path, velocity=100, program=0, min_f0=1.0):
    if isinstance(f0_values, torch.Tensor):
        f0_values = f0_values.detach().cpu().numpy()
    f0_values = np.asarray(f0_values).squeeze()

    times = np.arange(len(f0_values)) * hop / sample_rate
    voiced = f0_values > min_f0
    midi_numbers = 69 + 12 * np.log2(np.maximum(f0_values, 1e-6) / 440.0)
    midi_numbers = np.rint(midi_numbers).astype(int)

    pm = pretty_midi.PrettyMIDI()
    instrument = pretty_midi.Instrument(program=program)

    i = 0
    frame_dur = hop / sample_rate
    while i < len(f0_values):
        if not voiced[i]:
            i += 1
            continue
        start = i
        pitch = midi_numbers[i]
        i += 1
        while i < len(f0_values) and voiced[i] and midi_numbers[i] == pitch:
            i += 1
        end = i
        start_time = times[start]
        end_time = times[end] if end < len(times) else times[-1] + frame_dur
        instrument.notes.append(pretty_midi.Note(velocity=velocity, pitch=pitch, start=start_time, end=end_time))

    pm.instruments.append(instrument)
    pm.write(output_path)


# Extract MIDI from f0 and save
write_midi_from_f0(
    f0,
    hop=hop_size,
    sample_rate=sr,
    output_path="test.mid",
    velocity=100,
    program=0,
    min_f0=1.0,
)

print("Saved MIDI to test.mid")