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
    # El mazo usa tono neutro para 上 en 早上.
    'context-019': '我2ㄇㄟ3ㄊ言1/ㄗㄠ3ㄕㄤ5/ㄌ又4ㄉ言3/ㄑㄧ3ㄔ王2.',
    'context-039': '我2ㄇㄟ3ㄊ言1/ㄗㄠ3ㄕㄤ5/ㄉㄡ1/ㄏㄜ1ㄔㄚ2.',
    'hsk-w00060': 'ㄍㄜ4', 'hsk-w00132': 'ㄋㄚ3ㄍㄜ5',
    'hsk-w00248': 'ㄒ月2ㄕㄥ1', 'hsk-w00275': 'ㄗㄠ3ㄕㄤ5',
    'hsk-w00287': 'ㄓ十1', 'hsk-w00314': 'ㄔㄤ2',
    'hsk-w00347': 'ㄍ我4', 'hsk-w00352': 'ㄏㄞ2ㄕ十5',
    'hsk-w00367': 'ㄐ要1', 'hsk-w00369': 'ㄐㄝ4ㄕㄠ4',
    'hsk-w00427': 'ㄕㄤ4ㄑㄩ4',
    # Lecturas y tonos de las frases del catálogo completo.
    'context-043': 'ㄅㄞ2ㄊ言1/我3/ㄑㄩ4/ㄕㄤ4ㄎㄜ4, 万3ㄕㄤ5/ㄏ为2ㄌㄞ2/ㄉㄨ2ㄕㄨ1.',
    'context-048': 'ㄓㄜ4/ㄓㄤ1/ㄓ十3/ㄉㄜ5/ㄌ阳3ㄅ言1/ㄉㄡ1/又3/ㄗㄭ4.',
    'context-062': 'ㄋㄚ4ㄍㄜ5/ㄉ言4ㄏ穵4/ㄕ十4/ㄕㄟ2/ㄉㄜ5?',
    'context-087': 'ㄋㄚ3ㄍㄜ5/ㄕ十4/ㄋㄧ3/ㄉㄜ5/ㄕㄡ3ㄐㄧ1?',
    'context-089': 'ㄋㄚ3ㄒㄝ1/ㄕ十4/ㄒ阴1ㄕㄨ1, ㄋㄚ3ㄒㄝ1/ㄕ十4/ㄐ又4ㄕㄨ1?',
    'context-108': 'ㄒ要3ㄆㄥ2又3, ㄍㄞ1/ㄕ为4ㄐ要4/ㄌㄜ5. 万3ㄢ1!',
    'context-110': 'ㄓㄜ4/ㄌ阳2ㄓ十1ㄋ要3/ㄏㄣ2ㄒ要3, ㄊㄚ1ㄇㄣ5/ㄏㄞ2/ㄅㄨ2ㄏ为4/ㄈㄟ1.',
    'context-114': 'ㄇㄚ2ㄈㄢ5/ㄋㄧ2ㄅㄚ3/ㄕㄥ1阴1/ㄊ要2/ㄒ要3/ㄧ4ㄉ言R3.',
    'context-115': 'ㄋㄧ3/ㄒ言1/ㄗ我4ㄒ压4, 我3/ㄑㄩ4/ㄇㄞ3/ㄒㄝ1/ㄕ为2ㄍ我3.',
    'context-116': 'ㄗㄠ3ㄕㄤ5ㄏㄠ3, ㄓㄤ1/ㄒ言1ㄕㄥ5!',
    'context-118': 'ㄒ应1ㄑㄧ1ㄖ十4/ㄗㄠ3ㄕㄤ5/ㄅㄚ1ㄉ言3, ㄕㄤ1ㄉ言4/ㄘㄞ2/ㄎㄞ1ㄇㄣ2.',
    'context-128': 'ㄚ5, 元2ㄌㄞ2/ㄋㄧ3/ㄉㄜ5/ㄞ4ㄏㄠ4/ㄕ十4/ㄏ穵4ㄏ穵4!',
    'context-136': 'ㄌㄠ3ㄕ十1/ㄐ要1/我3ㄇㄣ5/ㄉㄨ2/ㄓㄜ4ㄍㄜ5/ㄘㄭ2.',
    'context-140': '我3/ㄗㄞ4/ㄐ又3ㄉ言4/ㄇㄣ2ㄎㄡ3, ㄋㄧ3/ㄔㄨ1ㄌㄞ2/ㄅㄚ5.',
    'context-141': '外4ㄇ言4/ㄊㄞ4ㄌㄥ3/ㄌㄜ5, ㄅㄝ2ㄔㄨ1ㄑㄩ4.',
    'context-147': 'ㄍ我4ㄋ言2/ㄕ十2, ㄋㄞ3ㄋㄞ5/ㄖㄤ4/我3ㄇㄣ5/ㄍ我4ㄌㄞ2/ㄔ十1ㄈㄢ4.',
    'context-148': 'ㄑ要2/ㄉ为4ㄇ言4/又3/ㄧ4ㄐ压1/ㄈㄢ4ㄍ万3, 我3ㄇㄣ5/ㄗㄡ3/ㄍ我4ㄑㄩ4/ㄅㄚ5.',
    'context-150': 'ㄋㄧ2ㄒ阳3/ㄏㄜ1/ㄏ中2ㄔㄚ2/ㄏㄞ2ㄕ十5/ㄌㄩ4ㄔㄚ2?',
    'context-154': '我3/ㄉㄜ5/ㄕㄡ2ㄅ要3/ㄏ外4/ㄌㄜ5, 我3/ㄉㄟ3/ㄏ为2ㄑㄩ4/ㄋㄚ2/ㄕㄡ3ㄐㄧ1.',
    'context-157': 'ㄑ应3ㄐ阴4ㄌㄞ2, 我3ㄍㄟ2ㄋㄧ3/ㄐㄝ4ㄕㄠ4/ㄧ2ㄒ压4/我3/ㄉㄜ5/ㄆㄥ2又5.',
    'context-158': 'ㄇㄣ2/ㄎㄞ1/ㄓㄜ5, ㄋㄧ3ㄎㄜ2ㄧ3/ㄐ阴4ㄑㄩ4.',
    'context-169': 'ㄓㄜ4ㄍㄜ5/ㄐㄝ2ㄇㄨ4/ㄇㄟ2ㄧ4ㄙㄭ5, 我3ㄇㄣ5/ㄔㄨ1ㄑㄩ4/ㄗㄡ3ㄗㄡ5/ㄅㄚ5.',
    'context-170': 'ㄓㄜ4/ㄓㄤ1ㄎㄚ3/ㄉㄜ5/ㄌ阳3ㄇ言4/ㄉㄡ1/又3/ㄓㄠ4ㄆ言4.',
    'context-173': 'ㄅㄝ2/ㄋㄚ4阳4/ㄕ我1ㄏ穵4, ㄅㄝ2ㄖㄣ2/ㄏ为4/ㄋㄢ2ㄍ我4.',
    'context-177': 'ㄊㄚ1/ㄇㄟ3ㄊ言1/ㄗㄠ3ㄕㄤ5/ㄉㄡ1/ㄑㄩ4/ㄆㄠ3ㄅㄨ4.',
    'context-179': 'ㄑ应3/ㄓㄢ4/ㄑㄧ3ㄌㄞ2, 王3ㄑ言2ㄇ言4/ㄗㄡ2ㄌ阳3ㄅㄨ4.',
    'context-182': '我3/ㄗㄞ4/ㄌㄡ2ㄕㄤ4, ㄋㄧ3/ㄕㄤ4ㄌㄞ2/ㄅㄚ5.',
    'context-184': 'ㄉ言4ㄊㄧ1/ㄗㄞ4/ㄋㄚ4ㄅ言1, 我3ㄇㄣ5/ㄕㄤ4ㄑㄩ4/ㄅㄚ5.',
    'context-190': 'ㄙ为1ㄖㄢ2/我3/ㄊㄡ2ㄊㄥ2, ㄏㄞ2ㄕ十5/ㄅㄚ3/ㄓㄜ4/ㄉㄠ4ㄊㄧ2/ㄗ我4/万2/ㄌㄜ5.',
    'context-196': '我3/ㄗㄞ4/ㄌㄡ2ㄒ压4/ㄉㄥ2ㄋㄧ3, ㄋㄧ3/ㄒ压4ㄌㄞ2/ㄅㄚ5.',
    'context-198': 'ㄌㄡ2ㄒ压4/又3ㄖㄣ2/ㄓㄠ2ㄋㄧ3, ㄋㄧ3/ㄒ压4ㄑㄩ4/ㄎㄢ4ㄎㄢ5/ㄅㄚ5.',
    'context-204': '我3/ㄧ2ㄏ为R4/ㄐ又4/ㄏ为2ㄌㄞ2, ㄋㄧ3/ㄒ言1/ㄗ我4/ㄅㄚ5.',
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
