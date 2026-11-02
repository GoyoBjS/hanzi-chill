# Encargo para Codex — construir la PWA

Convierte el prototipo `legacy/chino_tarjetas_anki_audio.html` en una **PWA de chino mandarín para iPhone y escritorio**, orientada a estudiar sin esfuerzo. No quiero un mockup ni una explicación; implementa el producto funcional y déjalo listo para ejecutar y desplegar.

Lee `SPEC.md`, usa `data/base-deck.json` y los 30 archivos de audio en `public/audio/`. La prioridad absoluta es **ver caracteres y oír su pronunciación automáticamente**, con velocidad ajustable y repasos tipo Anki.

Stack preferido: Vite + React + TypeScript, `vite-plugin-pwa`, IndexedDB (por ejemplo Dexie) y `ts-fsrs` para programación de repasos. Puedes simplificar las dependencias si justificas por qué, pero no reemplaces la repetición espaciada por un contador aleatorio.

Orden sugerido:
1. Crear el proyecto Vite React TypeScript e instalar dependencias.
2. Importar cartas y audios existentes como archivos separados y comprobar reproducción.
3. Construir UI móvil: Explorar / Repasar, caracteres, pinyin/significado ocultables, audio, velocidad, avanzar.
4. Añadir SRS con Otra vez/Difícil/Bien/Fácil, límites diarios y persistencia robusta.
5. Añadir importación de CSV y copia/restauración JSON, incluidas copias exportadas del HTML legacy versión 2.
6. Configurar manifest, service worker, iconos, instalación en iOS y caché de recursos esenciales.
7. Añadir pruebas automatizadas de la lógica crítica y verificar build funcional.
8. Documentar instrucciones de instalación, ejecución, QA en iPhone y despliegue estático.

Criterio de terminado: `npm run build` funciona; la PWA es usable offline en iPhone; se puede reproducir audio por tarjeta, variar la velocidad y repasar con SRS; se conservan progreso y ajustes; import/export funciona. No intentes integrar motores de IA en el cliente en esta fase.
