#!/usr/bin/env python3
"""Genera audios de mandarín mediante VoiceStudio local y crea un HTML autónomo.

Requisitos: Python 3.10+ y VoiceStudio abierto con motor/voz que HABLEN mandarín.
Ejemplo:
 python generar_audios_voicestudio.py --html chino_tarjetas_anki_audio.html --regenerar
 python generar_audios_voicestudio.py --html chino_tarjetas_anki_audio.html --csv vocabulario_chino_extra.csv

Este programa no instala VoiceStudio ni modelos; usa la API local ya iniciada.
No presupone que todos los motores de VoiceStudio admitan mandarín.
Revisa manualmente la pronunciación antes de usarla como material didáctico.
"""
import argparse
import base64
import csv
import io
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request


def read_deck(path):
    text = path.read_text(encoding='utf-8')
    marker = 'const BASE_CARDS = '
    start = text.find(marker)
    if start < 0:
        raise ValueError('Este HTML no contiene const BASE_CARDS')
    start += len(marker)
    deck, length = json.JSONDecoder().raw_decode(text[start:])
    return text, start, start+length, deck


def read_csv(path):
    raw = path.read_text(encoding='utf-8-sig')
    if path.suffix.lower() == '.json':
        data=json.loads(raw)
        if isinstance(data,dict): data=data.get('cards',[])
        return [dict(hanzi=str(x.get('hanzi','')).strip(),pinyin=str(x.get('pinyin','')).strip(),meaning=str(x.get('meaning','')).strip()) for x in data]
    try:
        dialect=csv.Sniffer().sniff(raw[:2000],delimiters=',;\t')
    except csv.Error:
        dialect=csv.excel
    reader=csv.DictReader(io.StringIO(raw),dialect=dialect)
    return [dict(hanzi=(r.get('hanzi') or r.get('caracter') or '').strip(),pinyin=(r.get('pinyin') or '').strip(),meaning=(r.get('meaning') or r.get('traduccion') or '').strip()) for r in reader]


def generate_audio(base_url, model, voice, hanzi, speed, timeout):
    url=base_url.rstrip('/') + '/audio/speech'
    payload={
        'model': model,
        'voice': voice,
        'input': hanzi,
        'language': 'zh',  # Extensión: algunos motores pueden ignorarla.
        'response_format': 'mp3',
        'speed': speed,
    }
    body=json.dumps(payload,ensure_ascii=False).encode('utf-8')
    req=urllib.request.Request(url, data=body,method='POST',headers={
        'Content-Type':'application/json',
        'Authorization':'Bearer local',
    })
    with urllib.request.urlopen(req,timeout=timeout) as response:
        data=response.read()
        mime=response.headers.get('Content-Type','').split(';')[0].strip().lower()
    if not data:
        raise RuntimeError('VoiceStudio ha devuelto audio vacío')
    if data[:4]==b'RIFF' and data[8:12]==b'WAVE':
        mime='audio/wav'
    elif data[:4]==b'fLaC':
        mime='audio/flac'
    elif data[:3]==b'ID3' or (len(data)>2 and data[0]==255 and (data[1]&0xE0)==0xE0):
        mime='audio/mpeg'
    elif mime not in ('audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/flac','audio/aac'):
        raise RuntimeError('Respuesta no reconocida como audio: '+repr(data[:40]))
    return data, 'audio/mpeg' if mime=='audio/mp3' else mime


def main():
    p=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--html',default='chino_tarjetas_anki_audio.html',help='HTML de tarjetas de partida')
    p.add_argument('--csv',default=None,help='CSV o JSON con hanzi,pinyin,meaning para añadir vocabulario')
    p.add_argument('--salida',default='chino_tarjetas_con_voz_local.html',help='HTML generado con audios incrustados')
    p.add_argument('--base-url',default='http://localhost:3900/v1',help='API local de VoiceStudio')
    p.add_argument('--model',default='tts-1',help='Nombre del motor o tts-1 = motor activo')
    p.add_argument('--voice',default='default',help='Perfil o nombre de voz que hable mandarín')
    p.add_argument('--speed',type=float,default=1.0,help='Velocidad de generación, 1.0 recomendada; ralentiza luego en la app')
    p.add_argument('--regenerar',action='store_true',help='Sustituir audios ya integrados por la nueva voz')
    p.add_argument('--limite',type=int,default=0,help='Máximo de audios nuevos en esta ejecución (0 = sin límite)')
    p.add_argument('--timeout',type=int,default=180,help='Timeout por tarjeta en segundos')
    a=p.parse_args()
    source=pathlib.Path(a.html)
    template,start,end,deck=read_deck(source)
    if a.csv:
        rows=read_csv(pathlib.Path(a.csv))
        known={(d['hanzi'],d.get('pinyin','')) for d in deck}
        for x in rows:
            if not x['hanzi'] or not x['meaning']: continue
            key=(x['hanzi'],x.get('pinyin',''))
            if key not in known:
                deck.append(x)
                known.add(key)
    todo=[d for d in deck if a.regenerar or not d.get('audio')]
    if a.limite>0:todo=todo[:a.limite]
    if not todo:
        print('No hay tarjetas pendientes. Usa --regenerar o añade --csv con vocabulario nuevo.')
        return 0
    print(f'Tarjetas totales: {len(deck)} · audios a generar: {len(todo)} · motor: {a.model}')
    print('Comprueba que VoiceStudio está abierto y la voz elegida pronuncia chino mandarín.')
    done=0
    for i,c in enumerate(todo,1):
        try:
            b,mime=generate_audio(a.base_url,a.model,a.voice,c['hanzi'],a.speed,a.timeout)
            c['audio']=base64.b64encode(b).decode('ascii')
            c['audioType']=mime
            c.pop('audioUrl',None)
            done+=1
            print(f'[{i}/{len(todo)}] {c["hanzi"]} ({c.get("pinyin", "")}) · {len(b)} bytes',flush=True)
        except urllib.error.URLError as exc:
            print('ERROR de conexión/API: ',str(exc), file=sys.stderr)
            print('Comprueba que está activa http://localhost:3900/health y el motor seleccionado.',file=sys.stderr)
            break
        except Exception as exc:
            print(f'ERROR en {c["hanzi"]}: {exc}',file=sys.stderr)
            break
    if done==0: return 1
    deck_json=json.dumps(deck,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
    result=template[:start]+deck_json+template[end:]
    dest=pathlib.Path(a.salida)
    dest.write_text(result,encoding='utf-8')
    print(f'Guardadas {len(deck)} tarjetas; {done} audios nuevos. Archivo: {dest.resolve()} ({dest.stat().st_size/1024/1024:.2f} MiB)')
    if dest.stat().st_size>5*1024*1024:
        print('Aviso: el HTML supera 5 MiB. Para miles de tarjetas conviene servir los audios como ficheros separados.')
    print('Revisa la corrección de los tonos, las palabras polisémicas y las variaciones tonales antes de aprender de estos audios.')
    return 0

if __name__=='__main__':
    sys.exit(main())
