# Instrucciones del agente: PWA de tarjetas de chino

- **Objetivo del trabajo:** implementar una aplicación PWA completa, no limitarse a redactar un plan.
- Lee `TASK.md`, `SPEC.md` y `README.md` antes de tocar código. El proyecto parte de un prototipo HTML con lógica y audio funcional.
- Puedes modificar y crear archivos libremente en este directorio de trabajo, sin borrar `legacy/`, `data/`, ni `public/audio/`.
- Prioriza un producto funcional y probado en el navegador sobre arquitectura excesiva.
- Mantén la interfaz y los textos en español; el contenido es mandarín simplificado con pinyin tonal.
- No pidas confirmación por decisiones pequeñas. Documenta decisiones técnicas y limitaciones reales.
- No introduzcas backend, autenticación, analíticas, cuenta de usuario ni servicios externos en el MVP.
- La app debe funcionar sin conexión después de la primera instalación/carga. Ninguna función principal debe requerir VoiceStudio activo.
- Los 30 MP3 existentes son activos de prueba heredados, NO audios producidos por VoiceStudio ni validaciones fonéticas profesionales.
- Nunca presentes nuevas voces sintéticas como tono 100% correcto sin un proceso de revisión.
- Si el sistema no puede generar audio automáticamente por restricciones del navegador, muestra un botón claro de activación de sonido; el usuario no debe pulsar audio manualmente en cada tarjeta.
- Realiza `npm install`, build y pruebas en el entorno si es posible; informa qué se ejecutó y qué no.
