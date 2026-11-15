"""
Builds the real background recordings of the listening scenes: public/audio/ambience/<scene>.mp3.

    .tts/venv/Scripts/python scripts/tts/ambience.py        (macOS / Linux: .tts/venv/bin/python)

Needs: pip install numpy imageio-ffmpeg   (into the same .tts/venv as edge-tts)

All sources are from BigSoundBank (https://bigsoundbank.com), recorded by Joseph Sardin and released under CC0 1.0:
free for any use, no attribution required (credited here anyway). Each scene takes the steadiest minute of its
recording (no sudden loud event), loudness-matched, and its end is cross-faded into its start so it loops without a
seam. The app plays it under the voices; the difficulty only sets how loud.
"""

import subprocess
import sys
import urllib.request
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".tts" / "ambience-src"
OUT = ROOT / "public" / "audio" / "ambience"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
RATE = 32000
LOOP = 60.0  # seconds
FADE = 3.0  # cross-fade of the loop seam
TARGET_RMS = 0.1

# scene -> layers: (BigSoundBank id, title, gain). Several layers are mixed (e.g. a quiet room plus keyboards).
SCENES: dict[str, list[tuple[str, str, float]]] = {
    "cafe": [("2561", "Coffee Shop at the Capucins", 1.0)],
    "shop": [("0579", "Supermarket cash registers", 1.0)],
    "station": [("0634", "Gare du Nord, Paris", 1.0)],
    "street": [("0608", "Street and Roads", 1.0)],
    "home": [("2458", "Sound Atmosphere in a House", 1.0)],
    "office": [("2458", "Sound Atmosphere in a House", 1.0), ("1733", "Slow Keyboard", 0.35)],
}
# (The classroom uses the home recording plus German murmur, see lib/audioScene.ts.)


def source(sound_id: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{sound_id}.mp3"
    if not path.exists() or path.stat().st_size == 0:
        print(f"  downloading {sound_id} ...")
        urllib.request.urlretrieve(f"https://bigsoundbank.com/UPLOAD/mp3/{sound_id}.mp3", path)
    return path


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(RATE), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def steadiest(samples: np.ndarray, seconds: float) -> np.ndarray:
    """The window of `seconds` whose loudest second is closest to its average: no door slam, no announcement burst."""
    per = RATE
    mono = samples.mean(axis=1)
    rms = np.array([np.sqrt(np.mean(mono[i : i + per] ** 2)) for i in range(0, len(mono) - per, per)])
    span = int(np.ceil(seconds))
    skip = min(5, max(0, len(rms) - span - 1))  # recordings often start with the recordist settling in
    best, best_score = skip, float("inf")
    for start in range(skip, max(skip + 1, len(rms) - span)):
        window = rms[start : start + span]
        score = window.max() / (window.mean() + 1e-9)
        if score < best_score:
            best, best_score = start, score
    return samples[best * per : best * per + int(seconds * per)]


def loop_of(samples: np.ndarray) -> np.ndarray:
    """LOOP seconds whose end flows into its start: the first FADE seconds are mixed with what followed the end."""
    n, f = int(LOOP * RATE), int(FADE * RATE)
    if len(samples) < n + f:
        samples = np.concatenate([samples] * int(np.ceil((n + f) / len(samples))))
    body = samples[:n].copy()
    ramp = np.linspace(0, 1, f, dtype=np.float32)[:, None]
    body[:f] = samples[:f] * np.sqrt(ramp) + samples[n : n + f] * np.sqrt(1 - ramp)
    return body


def normalized(samples: np.ndarray) -> np.ndarray:
    rms = float(np.sqrt(np.mean(samples**2))) or 1.0
    return samples * (TARGET_RMS / rms)


def encode(samples: np.ndarray, path: Path) -> None:
    peak = float(np.max(np.abs(samples)))
    if peak > 0.98:
        samples = samples * (0.98 / peak)
    subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(RATE), "-i", "-", "-c:a", "libmp3lame", "-b:a", "64k", str(path)],
        input=samples.astype(np.float32).tobytes(),
        check=True,
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for scene, layers in SCENES.items():
        if only and scene not in only:
            continue
        mix = np.zeros((int(LOOP * RATE), 2), dtype=np.float32)
        for sound_id, _title, gain in layers:
            take = steadiest(decode(source(sound_id)), LOOP + FADE)
            mix += normalized(loop_of(take)) * gain
        encode(normalized(mix), OUT / f"{scene}.mp3")
        print(f"ok {scene}")


if __name__ == "__main__":
    main()
