# 汉字 Chill

Una PWA local para escuchar y estudiar mandarín simplificado. Incluye 500 entradas del programa HSK 3.0 (2025) para los niveles 1 y 2, además de las tarjetas del prototipo y las 80 palabras opcionales. Sin cuentas, servidor ni servicios de IA.

## Ejecutar y comprobar

Requisitos: Node.js 20.19+ o 22.12+ y npm.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Para comprobar el service worker y el modo offline usa la compilación de producción (`npm run build` y `npm run preview`), no el servidor de desarrollo. Abre la página una vez con conexión y espera a que termine la instalación del service worker y la descarga; después desactiva la red y recarga. Las 500 pistas HSK, las 30 pistas originales, los datos y los recursos de la interfaz se incluyen en la precaché. La primera visita sin conexión no funciona. Las actualizaciones se instalan automáticamente; una pestaña abierta puede recargarse cuando se active una nueva versión.

## Instalar en iPhone y desplegar

Publica `dist/` en un alojamiento estático HTTPS. Conserva la estructura de archivos; para desplegar en un subdirectorio se usan rutas relativas. Abre la URL HTTPS en Safari, pulsa Compartir → «Añadir a pantalla de inicio». `file://` no permite instalar ni activar el service worker. En el dispositivo, activa el audio una vez y avanza; iOS puede volver a exigir un toque tras interrumpir la sesión. Comprueba la instalación, desactiva datos y wifi, reabre y escucha varias tarjetas, cambia la velocidad, califica y recarga. La disponibilidad de voces del sistema y las restricciones de reproducción dependen de iOS.

## Datos y copias

La aplicación guarda el mazo, ajustes, estado FSRS y revisiones en IndexedDB del navegador. Explorar permite filtrar por nivel, tema cotidiano, tipo y estado, y barajar sin registrar repasos. Los temas se inspiran en situaciones frecuentes —conversar, moverse, comer, vida diaria— y una tarjeta puede pertenecer a varios; las importadas que no coinciden aparecen en «Otras palabras». En Repasar, «Escuchar primero» oculta los caracteres para practicar la recuperación auditiva. Las tarjetas marcadas como aprendidas se apartan de FSRS sin borrar su historial y pueden recuperarse desde Explorar → Estado → Aprendidas. En Oído puedes reconocer palabras o distinguir tonos de una misma sílaba, con respuesta inmediata y sin modificar FSRS. Los homófonos con el mismo pinyin no se enfrentan entre sí; «Ya vistas» limita la práctica a tarjetas repasadas o marcadas como aprendidas. Se utilizan solo audios locales; si los filtros dejan muy pocos ejemplos, amplíalos. La velocidad y la reproducción automática siguen los ajustes de audio. Los pares de tonos son una selección limitada de lecturas sintéticas, no pronunciaciones verificadas por hablantes nativos. El límite diario cuenta tarjetas introducidas según la primera revisión local de cada tarjeta. Las tarjetas ya pendientes no están sujetas a ese límite. Exporta una copia JSON desde Ajustes antes de cambiar de dispositivo, borrar datos del navegador o restaurar otra copia; no hay sincronización. Restaurar sustituye los datos actuales tras confirmación.

Importa CSV/TSV con cabeceras `hanzi,pinyin,meaning`; los tres campos son obligatorios y se deduplica por hanzi y pinyin normalizados. El botón de vocabulario extra importa el CSV suministrado. Para tarjetas sin MP3 se usa una voz china instalada en el dispositivo si existe; algunas voces podrían no estar disponibles sin red. Los MP3 del mazo base y HSK son voz sintética generada en el ordenador con [Kokoro-82M-v1.1-zh](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh), voz zf_001 (modelo Apache-2.0). Son archivos locales: la aplicación no ejecuta el modelo ni necesita conexión para reproducirlos después de instalar la caché. No se han sometido a revisión fonética profesional; contrasta tonos, cambios tonales y palabras polisémicas con hablantes nativos antes de considerarlos material de referencia. Los audios anteriores siguen incorporados en el HTML de `legacy/`.

Para trasladar el prototipo abierto como archivo `file://`, exporta allí su copia JSON versión 2 e impórtala en Ajustes. No se puede acceder automáticamente al almacenamiento de ese archivo. Se preserva la copia antigua completa en `legacyArchive`; su fecha de vencimiento y algunos valores se trasladan a un estado FSRS aproximado. Su historial simplificado no es equivalente a FSRS ni aporta registros de revisiones individuales, por lo que estadísticas y límites de ese día no reconstruyen dicho historial.

El script `scripts/generar_audios_kokoro.py` permite regenerar los archivos en una carpeta separada con Python 3.10–3.12 y las dependencias indicadas en el propio archivo. Para el mazo HSK pasa `--deck data/hsk3-levels-1-2.json` y la carpeta de destino mediante `--output`. Descarga el modelo al ordenador la primera vez; no se incluye en la PWA. Revisa las pronunciaciones y los archivos generados antes de sustituir los MP3 de `public/audio/`. No es necesario ejecutar el script para usar, compilar o desplegar la aplicación.

Las fuentes, licencias y limitaciones del contenido figuran en [créditos del mazo HSK](docs/creditos-datos-hsk.md).

Los datos de estudio no se envían a ningún servidor. La caché y los datos locales dependen del almacenamiento del navegador, que el usuario o el sistema pueden borrar. Guarda copias periódicas.
