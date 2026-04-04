"""
Озвучка vishing через Edge TTS (нейросеть Microsoft, без API-ключа).

  pip install -r scripts/requirements-vishing-tts.txt
  ffmpeg должен быть в PATH (склейка и паузы между фразами).

  python scripts/generate_vishing_tts.py

Пишет MP3 в frontend/public/vishing/ и cues.generated.json.
После смены текстов в SCENARIOS перегенерируйте и обновите cues_sec в scenario_api.py
по значениям из cues.generated.json.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from mutagen.mp3 import MP3

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None  # type: ignore[assignment]

try:
    import edge_tts
except ImportError:
    print("Установите: pip install -r scripts/requirements-vishing-tts.txt", file=sys.stderr)
    raise

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "frontend" / "public" / "vishing"
PAUSE_SEC = 0.45

VOICES = {
    "ru": "ru-RU-DmitryNeural",
    "en": "en-US-GuyNeural",
}

# Тексты строго как в scenario_api.py (peer messages по порядку)
SCENARIOS: dict[str, dict[str, list[str]]] = {
    "vishing-bank": {
        "ru": [
            "Добрый день, антифрод МегаБанка. Мы остановили онлайн-оплату на 89 тысяч рублей с вашей карты. Это были вы?",
            "Чтобы снять блокировку, назовите трёхзначный код на обороте карты и одноразовый код из СМС, которое мы сейчас отправим. Произнесите чётко.",
            "Не кладите трубку — у вас около двух минут, иначе операция уйдёт получателю.",
        ],
        "en": [
            "Good afternoon, this is MegaBank fraud monitoring. We just blocked an online charge of one thousand one hundred dollars from your card. Was that you?",
            "To reverse the hold, I need the three-digit security code on the back of the card and the one-time code from the SMS we are sending now. Please read them clearly.",
            "Do not hang up — you have about two minutes before the transaction is released to the merchant.",
        ],
    },
    "vishing-it": {
        "ru": [
            "Здравствуйте, корпоративный IT, разговор записывается. Завершаем миграцию почты — половина отдела уже подтвердила. Нужен ваш пароль от учётной записи, чтобы синхронизировать профиль до отсечки.",
            "Тикет-система лежит, поэтому звоним. Это займёт секунд десять — продиктуйте пароль по буквам, цифры тоже.",
        ],
        "en": [
            "Hi, corporate IT on a recorded line. We're finishing mailbox migration — half of the team already confirmed. I need your login password here to sync your profile before the cutoff.",
            "The ticket portal is down, that's why we're calling. It takes ten seconds — spell the password slowly, numbers included.",
        ],
    },
    "vishing-courier": {
        "ru": [
            "Здравствуйте, курьерская служба. Ваша посылка на складе — не оплачен таможенный сбор 499 рублей. Оплатите картой по телефону сейчас, иначе завтра отправим обратно отправителю.",
            "Могу принять номер карты, срок и код с оборота — это только для проверки, списание символическое.",
        ],
        "en": [
            "Hello, express delivery. Your package is held at the hub — unpaid customs clearance of four ninety-nine. Pay by card over the phone now or it returns to the sender tomorrow.",
            "I can take card number, expiry and the code from the back — it's only for verification, the charge is tiny.",
        ],
    },
}


def _mp3_duration_sec(path: Path) -> float:
    audio = MP3(path)
    return float(audio.info.length)


def _resolve_ffmpeg() -> str:
    if shutil.which("ffmpeg"):
        return shutil.which("ffmpeg") or "ffmpeg"
    if imageio_ffmpeg is not None:
        return imageio_ffmpeg.get_ffmpeg_exe()
    raise RuntimeError("Нужен ffmpeg в PATH или пакет imageio-ffmpeg: pip install imageio-ffmpeg")


def _ffmpeg_concat_with_pauses(parts: list[Path], out_path: Path, pause_sec: float) -> None:
    ffmpeg = _resolve_ffmpeg()

    if len(parts) == 1:
        shutil.copy(parts[0], out_path)
        return

    # Генерируем короткий немой mp3 для паузы (через lavfi → mp3)
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        sil = td_path / "silence.mp3"
        cmd_sil = [
            ffmpeg,
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r=44100:cl=mono",
            "-t",
            str(pause_sec),
            "-c:a",
            "libmp3lame",
            "-q:a",
            "6",
            str(sil),
        ]
        subprocess.run(cmd_sil, check=True, capture_output=True)

        seq: list[Path] = []
        for i, p in enumerate(parts):
            seq.append(p)
            if i < len(parts) - 1:
                seq.append(sil)

        list_file = td_path / "concat_list.txt"
        lines = []
        for p in seq:
            # concat demuxer: file '/path'
            ap = p.resolve().as_posix().replace("'", "'\\''")
            lines.append(f"file '{ap}'")
        list_file.write_text("\n".join(lines), encoding="utf-8")

        cmd = [
            ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(out_path),
        ]
        subprocess.run(cmd, check=True, capture_output=True)


async def _synthesize_line(text: str, voice: str, out_mp3: Path) -> None:
    communicate = edge_tts.Communicate(text.strip(), voice)
    await communicate.save(str(out_mp3))


async def build_track(
    scenario_id: str,
    locale: str,
    lines: list[str],
    voice: str,
    out_mp3: Path,
) -> list[float]:
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        part_paths: list[Path] = []
        for i, line in enumerate(lines):
            part = td_path / f"p{i}.mp3"
            await _synthesize_line(line, voice, part)
            part_paths.append(part)

        durations = [_mp3_duration_sec(p) for p in part_paths]
        cues: list[float] = []
        t_acc = 0.0
        for i, d in enumerate(durations):
            cues.append(round(t_acc, 3))
            t_acc += d
            if i < len(durations) - 1:
                t_acc += PAUSE_SEC

        _ffmpeg_concat_with_pauses(part_paths, out_mp3, PAUSE_SEC)
        return cues


async def main_async() -> dict[str, dict[str, list[float]]]:
    try:
        _resolve_ffmpeg()
    except RuntimeError as e:
        print(f"Ошибка: {e}", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    all_cues: dict[str, dict[str, list[float]]] = {}

    for sid, locs in SCENARIOS.items():
        all_cues[sid] = {}
        for loc, phrases in locs.items():
            voice = VOICES[loc]
            out = OUT_DIR / f"{sid}-{loc}.mp3"
            print(f">> {out.name} ({voice}) ...")
            cues = await build_track(sid, loc, phrases, voice, out)
            all_cues[sid][loc] = cues
            print(f"   cues_sec: {cues}")

    cues_path = OUT_DIR / "cues.generated.json"
    cues_path.write_text(json.dumps(all_cues, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved: {cues_path}")
    return all_cues


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
