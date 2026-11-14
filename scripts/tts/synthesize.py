"""
Offline speech synthesis with Piper for scripts/generate-audio.ts. Not meant to be run by hand.

    python scripts/tts/synthesize.py <jobs.json>

jobs.json: {"voicesDir": "...", "outDir": "...", "jobs": [{"file", "text", "model", "lengthScale", "pitch"}]}
Writes each job as a mono MP3 (48 kbit/s) and prints "ok <file>" per finished job.

`pitch` makes another person out of one voice: the text is spoken `pitch` times longer, then resampled back to its
normal length, which raises (or lowers) pitch and timbre by that factor, like a smaller (or bigger) person. Kept within
about 0.85 to 1.2 it sounds natural.
Needs: pip install piper-tts lameenc   (see DEPLOY.md, step 3b)
"""

import json
import sys
from pathlib import Path

import lameenc
import numpy as np
from piper import PiperVoice, SynthesisConfig

PAUSE_BETWEEN_SENTENCES = 0.28  # seconds
LEAD_TRIM_THRESHOLD = 0.01


def trim(samples: np.ndarray) -> np.ndarray:
    """Cuts leading and trailing near-silence, keeping 60 ms on each side."""
    loud = np.flatnonzero(np.abs(samples) > LEAD_TRIM_THRESHOLD)
    if loud.size == 0:
        return samples
    return samples[max(0, loud[0] - 1300) : loud[-1] + 1300]


def resample(samples: np.ndarray, factor: float) -> np.ndarray:
    """Band-limited resampling to len/factor samples (FFT), so factor > 1 raises the pitch."""
    if abs(factor - 1) < 1e-3:
        return samples
    n = len(samples)
    m = max(1, int(round(n / factor)))
    spectrum = np.fft.rfft(samples)
    keep = m // 2 + 1
    if keep <= len(spectrum):
        spectrum = spectrum[:keep]
    else:
        spectrum = np.concatenate([spectrum, np.zeros(keep - len(spectrum), dtype=spectrum.dtype)])
    return np.fft.irfft(spectrum, m).astype(np.float32) * (m / n)


def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    voices_dir = Path(spec["voicesDir"])
    out_dir = Path(spec["outDir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    loaded: dict[str, PiperVoice] = {}

    for job in spec["jobs"]:
        model = job["model"]
        if model not in loaded:
            loaded[model] = PiperVoice.load(voices_dir / f"{model}.onnx")
        voice = loaded[model]
        pitch = job.get("pitch") or 1.0
        config = SynthesisConfig(
            length_scale=(job.get("lengthScale") or 1.0) * pitch,
            noise_scale=0.6,
            noise_w_scale=0.75,
        )
        rate = voice.config.sample_rate
        pause = np.zeros(int(rate * PAUSE_BETWEEN_SENTENCES), dtype=np.float32)
        pieces: list[np.ndarray] = []
        for chunk in voice.synthesize(job["text"], syn_config=config):
            if pieces:
                pieces.append(pause)
            # Each sentence trimmed on its own, so the pause between sentences is always the same.
            pieces.append(trim(chunk.audio_float_array.astype(np.float32)))
        samples = np.concatenate(pieces) if pieces else np.zeros(1, dtype=np.float32)
        samples = resample(samples, pitch)
        peak = float(np.max(np.abs(samples))) or 1.0
        pcm = (np.clip(samples / peak * 0.89, -1, 1) * 32767).astype(np.int16)

        encoder = lameenc.Encoder()
        encoder.set_bit_rate(48)
        encoder.set_in_sample_rate(rate)
        encoder.set_channels(1)
        encoder.set_quality(2)
        mp3 = encoder.encode(pcm.tobytes()) + encoder.flush()
        (out_dir / job["file"]).write_bytes(mp3)
        print(f"ok {job['file']}", flush=True)


if __name__ == "__main__":
    main()
