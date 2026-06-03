"""
Generate natural English prompt audio (Microsoft en-US-JennyNeural).

  cd python
  pip install edge-tts
  python generate_prompt_audio.py
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
OUT_LR = ROOT / "public" / "audio" / "listen-repeat"
OUT_IV = ROOT / "public" / "audio" / "interview"


def unescape(s: str) -> str:
    return s.replace('\\"', '"').replace("\\n", " ")


def parse_listen_repeat_from_ets(content: str) -> list[tuple[str, str]]:
    texts = [
        unescape(m)
        for m in re.findall(r'text:\s*"((?:[^"\\]|\\.)*)"', content)
    ]
    items: list[tuple[str, str]] = []
    for i, text in enumerate(texts, start=1):
        items.append((f"lr-{i:02d}", text))
    return items


def parse_interview_from_ets(content: str) -> list[tuple[str, str]]:
    """Interview prompts appear after listenRepeat blocks (prompt: fields in questions)."""
    # Split at first interview block question prompts — all `prompt:` in interview.questions
    prompts = [
        unescape(m)
        for m in re.findall(
            r'questionType:[\s\S]*?prompt:\s*\n\s*"((?:[^"\\]|\\.)*)"',
            content,
        )
    ]
    items: list[tuple[str, str]] = []
    for set_idx, chunk in enumerate(_split_interview_blocks(content), start=1):
        session_id = f"iv-{set_idx:02d}"
        for q_idx, prompt in enumerate(chunk, start=1):
            items.append((f"{session_id}-q{q_idx}", prompt))
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
        # Only question prompts (exclude intro if any) — take last 4 prompt fields per block
        if len(prompts) >= 4:
            blocks.append(prompts[-4:])
    return blocks


async def main() -> None:
    ets_content = ETS_TS.read_text(encoding="utf-8")
    lr = parse_listen_repeat_from_ets(ets_content)
    iv = parse_interview_from_ets(ets_content)
    OUT_LR.mkdir(parents=True, exist_ok=True)
    OUT_IV.mkdir(parents=True, exist_ok=True)

    print(f"Listen & Repeat: {len(lr)} prompts")
    for pid, text in lr:
        dest = OUT_LR / f"{pid}.mp3"
        if dest.exists() and dest.stat().st_size > 512:
            print(f"  skip {dest.name}")
            continue
        await synthesize_to_file(text, dest, voice=DEFAULT_VOICE, rate=DEFAULT_RATE)
        print(f"  ok {dest.name}")

    print(f"Interview: {len(iv)} prompts")
    for pid, text in iv:
        dest = OUT_IV / f"{pid}.mp3"
        if dest.exists() and dest.stat().st_size > 512:
            print(f"  skip {dest.name}")
            continue
        await synthesize_to_file(text, dest, voice=DEFAULT_VOICE, rate=DEFAULT_RATE)
        print(f"  ok {dest.name}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
