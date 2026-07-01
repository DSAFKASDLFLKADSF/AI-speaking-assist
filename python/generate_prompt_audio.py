"""
Generate natural English prompt audio (Microsoft en-US-JennyNeural).

  cd python
  pip install edge-tts
  python generate_prompt_audio.py [--force]
"""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from neural_tts import DEFAULT_RATE, DEFAULT_VOICE, synthesize_to_file  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
ETS_TS = ROOT / "lib" / "etsOfficialSpeaking.ts"
CUSTOM_TS = ROOT / "lib" / "customSpeakingSets.ts"
SOURCE_FILES = (ETS_TS, CUSTOM_TS)
OUT_LR = ROOT / "public" / "audio" / "listen-repeat"
OUT_IV = ROOT / "public" / "audio" / "interview"


def unescape(s: str) -> str:
    return s.replace('\\"', '"').replace("\\n", " ")


def _read_sources() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8") for path in SOURCE_FILES if path.exists()
    )


def parse_listen_repeat_all() -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    idx = 0
    for path in SOURCE_FILES:
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8")
        texts = [
            unescape(m)
            for m in re.findall(r'text:\s*"((?:[^"\\]|\\.)*)"', content)
        ]
        for text in texts:
            idx += 1
            items.append((f"lr-{idx:02d}", text))
    return items


def _split_interview_blocks(content: str) -> list[list[str]]:
    blocks: list[list[str]] = []
    for block in re.split(r"interview:\s*\{", content)[1:]:
        prompts = [
            unescape(m)
            for m in re.findall(
                r'prompt:\s*\n\s*"((?:[^"\\]|\\.)*)"',
                block.split("listenRepeat:", 1)[0]
                if "listenRepeat:" in block
                else block,
            )
        ]
        if len(prompts) >= 4:
            blocks.append(prompts[-4:])
    return blocks


def parse_interview_all() -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    session_idx = 0
    for path in SOURCE_FILES:
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8")
        for chunk in _split_interview_blocks(content):
            session_idx += 1
            session_id = f"iv-{session_idx:02d}"
            for q_idx, prompt in enumerate(chunk, start=1):
                items.append((f"{session_id}-q{q_idx}", prompt))
    return items


async def main() -> None:
    force = "--force" in sys.argv
    lr = parse_listen_repeat_all()
    iv = parse_interview_all()
    OUT_LR.mkdir(parents=True, exist_ok=True)
    OUT_IV.mkdir(parents=True, exist_ok=True)

    print(f"Listen & Repeat: {len(lr)} prompts")
    for pid, text in lr:
        dest = OUT_LR / f"{pid}.mp3"
        if not force and dest.exists() and dest.stat().st_size > 512:
            print(f"  skip {dest.name}")
            continue
        await synthesize_to_file(text, dest, voice=DEFAULT_VOICE, rate=DEFAULT_RATE)
        print(f"  ok {dest.name}")

    print(f"Interview: {len(iv)} prompts")
    for pid, text in iv:
        dest = OUT_IV / f"{pid}.mp3"
        if not force and dest.exists() and dest.stat().st_size > 512:
            print(f"  skip {dest.name}")
            continue
        await synthesize_to_file(text, dest, voice=DEFAULT_VOICE, rate=DEFAULT_RATE)
        print(f"  ok {dest.name}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
