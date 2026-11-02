# 汉字 Chill

Una PWA local para escuchar y estudiar mandarín simplificado. Incluye los 30 audios y tarjetas del prototipo y permite añadir las 80 palabras opcionales. Sin cuentas, servidor ni servicios de IA.

## Ejecutar y comprobar

Requisitos: Node.js 20.19+ o 22.12+ y npm.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Para comprobar el service worker y el modo offline usa la compilación de producción (`npm run build` y `npm run preview`), no el servidor de desarrollo. Abre la página una vez con conexión y espera a que termine la instalación del service worker y la descarga; después desactiva la red y recarga. Las 30 pistas, datos y recursos de la interfaz se incluyen en la precaché. La primera visita sin conexión no funciona. Las actualizaciones se instalan automáticamente; una pestaña abierta puede recargarse cuando se active una nueva versión.

## Instalar en iPhone y desplegar

Publica `dist/` en un alojamiento estático HTTPS. Conserva la estructura de archivos; para desplegar en un subdirectorio se usan rutas relativas. Abre la URL HTTPS en Safari, pulsa Compartir → «Añadir a pantalla de inicio». `file://` no permite instalar ni activar el service worker. En el dispositivo, activa el audio una vez y avanza; iOS puede volver a exigir un toque tras interrumpir la sesión. Comprueba la instalación, desactiva datos y wifi, reabre y escucha varias tarjetas, cambia la velocidad, califica y recarga. La disponibilidad de voces del sistema y las restricciones de reproducción dependen de iOS.

## Datos y copias

La aplicación guarda el mazo, ajustes, estado FSRS y revisiones en IndexedDB del navegador. Explorar no registra repasos. El límite diario cuenta tarjetas introducidas según la primera revisión local de cada tarjeta. Las tarjetas ya pendientes no están sujetas a ese límite. Exporta una copia JSON desde Ajustes antes de cambiar de dispositivo, borrar datos del navegador o restaurar otra copia; no hay sincronización. Restaurar sustituye los datos actuales tras confirmación.

Importa CSV/TSV con cabeceras `hanzi,pinyin,meaning`; los tres campos son obligatorios y se deduplica por hanzi y pinyin normalizados. El botón de vocabulario extra importa el CSV suministrado. Para tarjetas sin MP3 se usa una voz china instalada en el dispositivo si existe; algunas voces podrían no estar disponibles sin red. Los MP3 originales son muestras heredadas, no grabaciones de VoiceStudio ni material con revisión fonética profesional.

Para trasladar el prototipo abierto como archivo `file://`, exporta allí su copia JSON versión 2 e impórtala en Ajustes. No se puede acceder automáticamente al almacenamiento de ese archivo. Se preserva la copia antigua completa en `legacyArchive`; su fecha de vencimiento y algunos valores se trasladan a un estado FSRS aproximado. Su historial simplificado no es equivalente a FSRS ni aporta registros de revisiones individuales, por lo que estadísticas y límites de ese día no reconstruyen dicho historial.

Los datos de estudio no se envían a ningún servidor. La caché y los datos locales dependen del almacenamiento del navegador, que el usuario o el sistema pueden borrar. Guarda copias periódicas.
