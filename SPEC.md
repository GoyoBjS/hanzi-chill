# Especificación de producto — 汉字 Chill

## Propósito y tono

Aplicación PWA en español para aprender chino mandarín simplificado mediante tarjetas cortas, sin presión por rachas. Inspirada en Anki, pero más ligera y agradable. Primero quiere **asociar la grafía y el sonido**, sin verse obligado a hacer ejercicios académicos. Uso habitual de 2–10 minutos en iPhone y también desde PC.

## Requisitos P0 (MVP indispensable)

### Tarjeta y reproducción
- Muestra el hanzi en grande, legible, con fallback de fuentes CJK.
- Reproduce el audio al mostrar o pasar a la siguiente tarjeta **después de una primera interacción del usuario que habilite el sonido**. Un solo toque inicial vale para activar la reproducción si el navegador lo permite.
- Permite repetir el audio manualmente, pausar/parar si hace falta, y ajustar velocidad de reproducción **0,55×–1,15×**. Guardar la velocidad.
- Botón para revelar/ocultar pinyin y traducción. Pinyin con diacríticos tonales.
- Priorización: MP3 local por tarjeta -> voz mandarín del dispositivo `zh-CN` si existe -> mensaje claro de audio no disponible (sin romper la UI).
- La velocidad debe funcionar con los archivos de audio sin volver a generarlos: `HTMLAudioElement.playbackRate`. Maneja promesas rechazadas por autoplay en Safari/iOS.
- No reproduzcas dos audios simultáneamente al avanzar rápido. Prefetch del siguiente clip.

### Modos
- **Explorar**: pasar libremente entre tarjetas, sin registrar calificación ni contaminar datos SRS.
- **Repasar**: muestra tarjetas nuevas / pendientes; revelar y marcar **Otra vez, Difícil, Bien, Fácil**, con próximo repaso calculado mediante una biblioteca de FSRS mantenida (ej. `ts-fsrs`).
- Límite de tarjetas nuevas configurable, defecto **5 al día**. Si ya terminaste, mostrar «Por hoy está bien» sin culpabilizar.
- Ajuste «reproducción automática» (activo por defecto después de habilitar audio), y ajuste «mostrar pinyin».

### Datos
- El mazo inicial tiene **30 tarjetas y 30 MP3**, entregados en `data/base-deck.json` y `public/audio/`. Usar las rutas `audioUrl` existentes.
- `data/vocabulario_chino_extra.csv` incluye **80 tarjetas opcionales sin audio**. Ofrecer importación manual y asegurar TTS fallback si hay voz china instalada.
- Mantener ID estable de cada tarjeta, sin usar índice aleatorio para el historial.
- Guardar mazos, progreso SRS, ajustes y revisiones en **IndexedDB**, con manejo de errores y esquema migrable. Persistir tras recarga, cerrar la app y reabrir.
- Importar CSV/TSV con columnas `hanzi`, `pinyin`, `meaning`; validar caracteres, deduplicar por criterio robusto y avisar si faltan datos. Evitar inyección de HTML al mostrar contenido importado.
- Exportar/importar copia JSON completa (contenido + progreso + ajustes). Admitir opcionalmente formato de backup legacy `version: 2` del HTML (`imported`, `schedule`, `settings`, `mode`, `exploreIndex`). Si no se puede convertir el historial de intervalos 1:1 a FSRS, preservar datos en un campo de archivo y documentarlo; no afirmar migración exacta.
- No asumir acceso automático al `localStorage` del fichero `file://` original: el usuario deberá exportar desde la versión anterior e importar en la nueva.

### PWA / offline
- Manifest con iconos 192/512, `display: standalone`, `start_url`, `theme_color`, `lang: es`.
- Service worker con precache del shell, fuente/datos iniciales y 30 audios locales, con estrategia de actualizaciones que evite servir la versión antigua indefinidamente.
- Instalable desde Safari de iPhone mediante Añadir a pantalla de inicio. Indicar que la instalación y el service worker requieren HTTPS o localhost, no `file://`.
- No depender de APIs de red en la experiencia de aprendizaje inicial. No enviar datos personales a terceros.
- Layout responsive y accesible, soporte táctil, foco visible, zonas de pulsación grandes. No uses gestos como única forma de navegar.

## Requisitos P1 (después de que P0 funcione)
- Estadísticas mínimas: nuevas, pendientes, repasadas hoy y tasa de acierto, sin rachas obligatorias.
- Filtro por palabras/caracteres y etiquetas o nivel HSK, siempre que los datos tengan licencia/procedencia verificable.
- Audio opcional «escuchar antes» vs «escuchar al revelar», y modo entrenamiento auditivo.
- Botón «descargar mazo» para futuros packs de audio grandes, sin necesidad de cachear miles de MP3 por defecto.
- Apariencia clara y oscura.

## Generación de voz (NO en el MVP cliente)
- El script heredado `scripts/generar_audios_voicestudio_legacy.py` llama a una API local de VoiceStudio y genera HTML con audio incrustado; **no es la arquitectura definitiva de la PWA**.
- En una iteración futura, crear un script ejecutable en PC que genere MP3/Opus por lotes desde una API TTS configurada localmente, normalice nombres de archivos, añada rutas al JSON, registre errores y reintentos.
- El modelo se ejecutará en el PC (NVIDIA si está disponible), **no** en el iPhone ni en cada sesión. La PWA solo reproduce archivos ya generados.
- Verificar compatibilidad real del backend/API elegido antes de generar. No asumir que todo motor habla mandarín ni que los tonos quedan correctos.
- QA: seleccionar una muestra representativa de tonos, cambios tonales, sílabas polisémicas y palabras multisilábicas, contrastar con referencias nativas. No prometer exactitud perfecta de síntesis.
- Para variar velocidad, prioriza `playbackRate`; generar variantes lentas solo si se comprueba que el audio degradado es problemático.

## Criterios de aceptación manual

1. En Safari iPhone, abro la app, pulso «Activar audio» una vez y en «Siguiente» cada tarjeta suena sin tener que pulsar el altavoz de nuevo, siempre que iOS lo permita.
2. Ajusto 0,65×, avanzo y la velocidad sigue igual tras cerrar y reabrir.
3. Sin red, los 30 audios y la UI siguen disponibles después de primera instalación/carga.
4. Repaso 3 tarjetas con los 4 botones de dificultad: se guardan las fechas y tras recargar no se reinicia el historial.
5. Importo un CSV de palabras nuevas sin MP3: funciona con voz china disponible o muestra aviso útil sin bloquear la navegación.
6. Exporto progreso a JSON y restauro en otra sesión. Se conserva el contenido aprendido.
7. La app no descarga modelos TTS de gigabytes ni requiere ejecutar un servidor API para aprender.
8. `npm run build` y las pruebas indicadas en README completan correctamente; de lo contrario detalla el fallo verificable.

## Fuera de alcance del MVP
- Login, sincronización multi-dispositivo, backend, LLM conversacional, reconocimiento de voz, pagos y gamificación por rachas.
