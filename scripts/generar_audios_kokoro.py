#!/usr/bin/env python3
"""Genera los MP3 del mazo base en una carpeta de salida, sin modificar la app.

Requiere Python 3.10–3.12, kokoro, misaki[zh], soundfile, imageio-ffmpeg y truststore.
El modelo se descarga en el PC y no se distribuye con la aplicación.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

import truststore
truststore.inject_into_ssl()

import imageio_ffmpeg
import numpy as np
import soundfile as sf
import torch
from kokoro import KModel, KPipeline

REPO = 'hexgrad/Kokoro-82M-v1.1-zh'
VOICE = 'zf_001'
ROOT = Path(__file__).resolve().parent.parent
# Lecturas de palabras aisladas con varias pronunciaciones, según el pinyin del mazo.
PHONEME_OVERRIDES = {
    'hsk-w00060': 'ㄍㄜ4', 'hsk-w00132': 'ㄋㄚ3ㄍㄜ5',
    'hsk-w00248': 'ㄒ月2ㄕㄥ1', 'hsk-w00275': 'ㄗㄠ3ㄕㄤ5',
    'hsk-w00287': 'ㄓ十1', 'hsk-w00314': 'ㄔㄤ2',
    'hsk-w00347': 'ㄍ我4', 'hsk-w00352': 'ㄏㄞ2ㄕ十5',
    'hsk-w00367': 'ㄐ要1', 'hsk-w00369': 'ㄐㄝ4ㄕㄠ4',
    'hsk-w00427': 'ㄕㄤ4ㄑㄩ4',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path, help='Carpeta para los MP3 generados')
    parser.add_argument('--deck', type=Path, default=ROOT / 'data/base-deck.json', help='JSON con tarjetas, id y hanzi')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    cards = json.loads(args.deck.read_text(encoding='utf-8'))
    os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = KModel(repo_id=REPO).to(device).eval()
    pipeline = KPipeline(lang_code='z', repo_id=REPO, model=model, en_callable=lambda _: '')
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix='hanzi-audio-') as temp:
        for card in cards:
            # El pinyin del mazo indica tono neutro en 上 para 早上好.
            if card['id'] in PHONEME_OVERRIDES:
                results = list(pipeline.generate_from_tokens(PHONEME_OVERRIDES[card['id']], voice=VOICE, speed=1.0))
            elif card['id'] == 'base-027':
                phonemes, _ = pipeline.g2p(card['hanzi'])
                if phonemes != 'ㄗㄠ3ㄕㄤ4ㄏㄠ3':
                    raise RuntimeError('Revisar el pinyin de 早上好 antes de generar')
                results = list(pipeline.generate_from_tokens('ㄗㄠ3ㄕㄤ5ㄏㄠ3', voice=VOICE, speed=1.0))
            else:
                results = list(pipeline(card['hanzi'], voice=VOICE, speed=1.0))
            if not results or any(result.audio is None for result in results):
                raise RuntimeError(f"No se generó audio para {card['id']}")
            audio = np.concatenate([result.audio.numpy() for result in results])
            if not np.isfinite(audio).all() or len(audio) < 2400 or np.max(np.abs(audio)) < 0.005:
                raise RuntimeError(f"Audio vacío o inválido: {card['id']}")
            wav = Path(temp) / f"{card['id']}.wav"
            sf.write(wav, audio, 24000)
            target = args.output / f"{card['id']}.mp3"
            subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '96k', str(target)], check=True)
            print(card['id'], card['hanzi'], ' '.join(result.phonemes for result in results), flush=True)


if __name__ == '__main__':
    main()
