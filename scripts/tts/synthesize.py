"""
Speech synthesis with edge-tts for scripts/generate-audio.ts. Not meant to be run by hand.

    python scripts/tts/synthesize.py <jobs.json>

jobs.json: {"outDir": "...", "jobs": [{"file", "text", "voice", "pitch", "rate"}]}
Writes each job as the MP3 the service returns (24 kHz mono, neural voice) and prints "ok <file>" per finished job.
`pitch` is in Hz and `rate` in percent; both are applied by the service, so the voice stays natural.

edge-tts uses the "Read aloud" voices of Microsoft Edge: no account, no key. Needs internet while recording.
Needs: pip install edge-tts   (see DEPLOY.md, step 3b)
"""

import asyncio
import json
import sys
from pathlib import Path

import edge_tts

PARALLEL = 6
ATTEMPTS = 4


def signed(value: float, unit: str) -> str:
    return f"{'+' if value >= 0 else '-'}{abs(int(round(value)))}{unit}"


async def record(job: dict, out_dir: Path, gate: asyncio.Semaphore) -> None:
    target = out_dir / job["file"]
    part = target.with_suffix(".part")
    async with gate:
        for attempt in range(1, ATTEMPTS + 1):
            try:
                speech = edge_tts.Communicate(
                    job["text"],
                    job["voice"],
                    rate=signed(job.get("rate") or 0, "%"),
                    pitch=signed(job.get("pitch") or 0, "Hz"),
                )
                await speech.save(str(part))
                if part.stat().st_size == 0:
                    raise RuntimeError("empty recording")
                part.replace(target)
                print(f"ok {job['file']}", flush=True)
                return
            except Exception as error:  # network hiccups: wait and try again
                if attempt == ATTEMPTS:
                    part.unlink(missing_ok=True)
                    raise RuntimeError(f"{job['voice']}: {job['text']!r}: {error}") from error
                await asyncio.sleep(2 * attempt)


async def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out_dir = Path(spec["outDir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    gate = asyncio.Semaphore(PARALLEL)
    await asyncio.gather(*(record(job, out_dir, gate) for job in spec["jobs"]))


if __name__ == "__main__":
    asyncio.run(main())
