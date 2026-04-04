"""Генерация коротких WAV-заглушек для vishing (плейсхолдеры под реальную озвучку). Запуск: python scripts/generate_vishing_audio.py"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

SR = 22050


def _segment(samples: int, freq: float, vol: float) -> bytes:
    out = bytearray()
    for i in range(samples):
        t = i / SR
        # лёгкая модуляция «как трубка»
        wobble = 1.0 + 0.04 * math.sin(2 * math.pi * 3.2 * t)
        s = vol * wobble * math.sin(2 * math.pi * freq * t)
        s = max(-1.0, min(1.0, s))
        out.extend(struct.pack("<h", int(s * 32000)))
    return bytes(out)


def _silence(samples: int) -> bytes:
    return b"\x00\x00" * samples


def build_track_phrases(phrases: list[tuple[float, int, float]]) -> bytes:
    """phrases: (duration_sec, freq_hz, volume 0..1)"""
    parts: list[bytes] = []
    for dur, freq, vol in phrases:
        n = int(SR * dur)
        parts.append(_segment(n, freq, vol))
    return b"".join(parts)


def write_wav(path: Path, pcm: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_dir = root / "frontend" / "public" / "vishing"

    # Три «фразы»: разная высота тона, паузы ~0.35s между ними (для синхронной подсветки)
    bank = build_track_phrases(
        [
            (4.2, 180.0, 0.11),
            (0.35, 180.0, 0.0),
            (4.0, 195.0, 0.11),
            (0.35, 195.0, 0.0),
            (3.6, 170.0, 0.1),
        ]
    )
    write_wav(out_dir / "vishing-bank.wav", bank)

    it = build_track_phrases(
        [
            (5.0, 200.0, 0.1),
            (0.35, 200.0, 0.0),
            (4.5, 215.0, 0.1),
        ]
    )
    write_wav(out_dir / "vishing-it.wav", it)

    courier = build_track_phrases(
        [
            (4.8, 165.0, 0.1),
            (0.35, 165.0, 0.0),
            (4.2, 188.0, 0.1),
        ]
    )
    write_wav(out_dir / "vishing-courier.wav", courier)

    print("Written:", out_dir / "vishing-bank.wav", out_dir / "vishing-it.wav", out_dir / "vishing-courier.wav")


if __name__ == "__main__":
    main()
