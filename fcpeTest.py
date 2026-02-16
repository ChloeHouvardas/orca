from torchfcpe import spawn_bundled_infer_model
import torch
import librosa
import numpy as np
import pretty_midi
from scipy.signal import medfilt, savgol_filter

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


def smooth_f0(f0_tensor, median_win=5, savgol_win=11, savgol_order=2, min_f0=1.0):
    """Smooth an F0 curve (median then Savitzky-Golay) on voiced frames only."""
    if isinstance(f0_tensor, torch.Tensor):
        f0_np = f0_tensor.detach().cpu().numpy().squeeze().copy()
    else:
        f0_np = np.asarray(f0_tensor).squeeze().copy()

    voiced = f0_np > min_f0

    # --- Step 1: median filter to remove short pitch spikes ---
    if np.sum(voiced) >= median_win:
        voiced_vals = f0_np[voiced]
        voiced_vals = medfilt(voiced_vals, kernel_size=median_win)
        f0_np[voiced] = voiced_vals

    # --- Step 2: Savitzky-Golay for gentle smoothing ---
    if np.sum(voiced) >= savgol_win:
        voiced_vals = f0_np[voiced]
        voiced_vals = savgol_filter(voiced_vals, window_length=savgol_win, polyorder=savgol_order)
        f0_np[voiced] = voiced_vals

    return f0_np


# Smooth the F0 curve before MIDI conversion
f0_smoothed = smooth_f0(f0, median_win=5, savgol_win=11, savgol_order=2)


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


# Extract MIDI from smoothed f0 and save
write_midi_from_f0(
    f0_smoothed,
    hop=hop_size,
    sample_rate=sr,
    output_path="test.mid",
    velocity=100,
    program=0,
    min_f0=1.0,
)

print("Saved MIDI to test.mid")