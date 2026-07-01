"""Verify prompt IDs, transcripts, and mp3 paths are aligned."""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_prompt_audio import parse_interview_all, parse_listen_repeat_all

ROOT = Path(__file__).resolve().parents[1]
ETS = ROOT / "lib" / "etsOfficialSpeaking.ts"
CUSTOM = ROOT / "lib" / "customSpeakingSets.ts"
LR_DIR = ROOT / "public" / "audio" / "listen-repeat"
IV_DIR = ROOT / "public" / "audio" / "interview"

SET_IDS = [
    "ets-tr-01",
    "ets-fl-01",
    "ets-fl-02",
    "ets-tr-02",
    "custom-01",
    "custom-02",
    "custom-03",
    "custom-04",
]
TEST_IDS = [
    "test-01",
    "test-02",
    "test-03",
    "test-04",
    "test-05",
    "test-06",
    "test-07",
    "test-08",
]


def flatten_lr_from_ets(content: str) -> list[tuple[str, str, str]]:
    """Mirror lib/prompts.ts flattenOfficialListenRepeat."""
    items: list[tuple[str, str, str]] = []
    global_index = 0
    for set_idx, set_id in enumerate(SET_IDS):
        block = content.split(f'id: "{set_id}"', 1)[1]
        sentences_block = re.search(
            r"sentences:\s*\[([\s\S]*?)\]\s*,\s*\n\s*\}",
            block,
        )
        if not sentences_block:
            raise RuntimeError(f"No sentences for {set_id}")
        texts = re.findall(
            r'text:\s*"((?:[^"\\]|\\.)*)"',
            sentences_block.group(1),
        )
        if len(texts) != 7:
            raise RuntimeError(f"{set_id}: expected 7 sentences, got {len(texts)}")
        for text in texts:
            global_index += 1
            pid = f"lr-{global_index:02d}"
            items.append((set_id, pid, text.replace('\\"', '"').replace("\\n", " ")))
    return items


def flatten_iv_from_ets(content: str) -> list[tuple[str, str, str]]:
    """Mirror lib/interviewPrompts.ts buildSessionsFromOfficial."""
    items: list[tuple[str, str, str]] = []
    for set_idx, set_id in enumerate(SET_IDS):
        session_id = f"iv-{set_idx + 1:02d}"
        block = content.split(f'id: "{set_id}"', 1)[1]
        interview_block = block.split("interview:", 1)[1]
        prompts = re.findall(
            r'prompt:\s*\n\s*"((?:[^"\\]|\\.)*)"',
            interview_block.split("listenRepeat:", 1)[0]
            if "listenRepeat:" in interview_block
            else interview_block,
        )
        if len(prompts) < 4:
            raise RuntimeError(f"{set_id}: expected 4 interview prompts, got {len(prompts)}")
        for q_idx, prompt in enumerate(prompts[-4:], start=1):
            qid = f"{session_id}-q{q_idx}"
            items.append(
                (
                    set_id,
                    qid,
                    prompt.replace('\\"', '"').replace("\\n", " "),
                )
            )
    return items


def main() -> None:
    content = ETS.read_text(encoding="utf-8")
    if CUSTOM.exists():
        content += "\n" + CUSTOM.read_text(encoding="utf-8")
    lr_ts = flatten_lr_from_ets(content)
    iv_ts = flatten_iv_from_ets(content)
    lr_gen = parse_listen_repeat_all()
    iv_gen = parse_interview_all()

    errors: list[str] = []

    if len(lr_ts) != 56:
        errors.append(f"LR ts flatten count {len(lr_ts)} != 56")
    if len(lr_gen) != 56:
        errors.append(f"LR generator count {len(lr_gen)} != 56")
    if lr_ts != [(a, b, c) for a, b, c in lr_ts]:  # noqa: PLR0133
        pass
    for (set_id, pid, text_ts), (pid_gen, text_gen) in zip(lr_ts, lr_gen, strict=True):
        if pid != pid_gen:
            errors.append(f"LR id mismatch {set_id}: {pid} vs {pid_gen}")
        if text_ts != text_gen:
            errors.append(f"LR text mismatch {pid}: ts vs generator")
        mp3 = LR_DIR / f"{pid}.mp3"
        if not mp3.exists():
            errors.append(f"Missing mp3: {mp3.name}")

    for (set_id, qid, text_ts), (qid_gen, text_gen) in zip(iv_ts, iv_gen, strict=True):
        if qid != qid_gen:
            errors.append(f"IV id mismatch {set_id}: {qid} vs {qid_gen}")
        if text_ts != text_gen:
            errors.append(f"IV text mismatch {qid}")
        mp3 = IV_DIR / f"{qid}.mp3"
        if not mp3.exists():
            errors.append(f"Missing mp3: {mp3.name}")

    print("=== Test set -> audio mapping ===")
    for test_idx, test_id in enumerate(TEST_IDS):
        set_id = SET_IDS[test_idx]
        lr_slice = lr_ts[test_idx * 7 : (test_idx + 1) * 7]
        iv_slice = iv_ts[test_idx * 4 : (test_idx + 1) * 4]
        print(f"\n{test_id} ({set_id})")
        print("  Listen & Repeat:")
        for _, pid, text in lr_slice:
            print(f"    {pid}.mp3  {text[:55]}...")
        print("  Interview:")
        for _, qid, text in iv_slice:
            print(f"    {qid}.mp3  {text[:55]}...")

    if errors:
        print("\n=== ERRORS ===")
        for e in errors:
            print(" ", e)
        sys.exit(1)

    print("\nOK: 56 LR + 32 IV prompts match generator, TypeScript source, and mp3 files.")


if __name__ == "__main__":
    main()
