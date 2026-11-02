# Investigación: HSK, vocabulario y formas de practicar

Fecha de consulta: 2 de noviembre de 2026.

## Qué significa «HSK 1 y 2»

Hay dos referencias que conviene mantener separadas:

- La documentación clásica de HSK 2.0 describe HSK 1 como 150 palabras y HSK 2 como 300 palabras acumuladas. Esa cifra aparece en el manual publicado por el servicio oficial de exámenes, pero el PDF es un documento antiguo y no debe presentarse como la única lista vigente: [HSKbyWord.pdf, páginas 3–4](https://www.chinesetest.cn/userfiles/file/HSKbyWord.pdf).
- La web oficial actual muestra HSK 3.0 con un marco de tres etapas y nueve niveles. Explica que el programa cubre tareas, temas, vocabulario, gramática y caracteres; por tanto, una aplicación debe modelar palabras y caracteres como entidades relacionadas, no como una sola lista plana: [página oficial HSK](https://www.chinesetest.cn/HSK), [página oficial del nivel 1](https://www.chinesetest.cn/HSK/1?type=2).

La transición es relevante para el producto. El sitio oficial anuncia que HSK 3.0 se lanzará mundialmente el 13 de diciembre de 2026, así que a fecha de esta nota no conviene llamar «lista oficial HSK 1–2» a una mezcla de listas de internet: [aviso oficial de lanzamiento](https://old.chinesetest.cn/gonewcontent.do?flag=kdnew&id=51336883). La aplicación usa ahora el programa HSK 3.0 de 2025: 300 entradas del nivel 1 y 200 adicionales del nivel 2. Se indica expresamente la versión en el filtro, sin mezclarla con la lista clásica.

La web oficial también enlaza el programa y materiales de cada nivel desde el servicio de exámenes: [centro de recursos oficial](https://admin.chinesetest.cn/godownload.do). Debemos descargar la fuente, fijar la versión y conservar el aviso de procedencia antes de distribuir datos dentro de la PWA.

## Datos reutilizables y límites de licencia

No se ha verificado una licencia abierta del documento oficial que permita redistribuir directamente toda su tabla. Se ha seleccionado el conjunto derivado [HearMandarin](https://hearmandarin.com/datasets/), que declara licencia CC BY 4.0 y rastrea su origen al programa oficial, junto con traducciones adaptadas de una fuente que declara licencia MIT. Los detalles están en [créditos del mazo](creditos-datos-hsk.md). El camino prudente es:

1. Usar el programa oficial como referencia de cobertura y de etiquetado.
2. Crear un mazo propio con contenido redactado por nosotros y audio generado o revisado, y marcar la procedencia de cada entrada.
3. Si se reutilizan datos de diccionario, conservar el fichero de atribución y la licencia.

Fuentes abiertas posibles para enriquecer palabras y caracteres:

- CC-CEDICT ofrece chino, pinyin y glosas principalmente en inglés bajo CC BY-SA 4.0. Es útil para lecturas y definiciones, pero no resuelve por sí solo las traducciones al español ni garantiza que una entrada pertenezca a HSK: [ChineseDict, fuentes y licencias](https://chinesedict.com/sources/).
- Wiktionary permite reutilizar el texto bajo CC BY-SA 4.0/GFDL con atribución y compartir las adaptaciones bajo una licencia compatible. Las licencias de archivos de audio o imágenes dentro de cada entrada pueden ser distintas, así que hay que comprobarlas por separado: [Wiktionary Copyrights](https://en.wiktionary.org/wiki/Wiktionary%3ACopyrights).
- Un conjunto derivado puede combinar una lista HSK cuya licencia sea verificable, datos léxicos CC BY-SA y traducciones españolas propias. No conviene copiar una tabla de una aplicación comercial ni sus audios.

Para audio, los MP3 actuales de 汉字 Chill son archivos sintéticos locales y se pueden sustituir por nuevas generaciones del modelo documentado en el README. El modelo no debe entrar en la PWA: el iPhone solo debe recibir los clips finales y su service worker.

## Qué formas de práctica parecen más útiles

La evidencia favorece mantener FSRS y añadir recuperación activa con feedback:

- Una meta-análisis de 48 experimentos y 3.411 participantes encontró un efecto medio–grande de la práctica espaciada en aprendizaje de segunda lengua. La práctica más corta funciona en pruebas inmediatas, pero la separación más larga mejora las pruebas diferidas; el espaciado igual y expansivo no difirieron de forma fiable: [Kim & Webb, 2022, *Language Learning*](https://doi.org/10.1111/lang.12479), resumen y materiales abiertos en Wiley/IRIS.
- La revisión de Roediger y Butler explica que intentar recuperar información suele producir una retención a largo plazo mayor que volver a estudiar pasivamente: [The critical role of retrieval practice in long-term retention](https://www.sciencedirect.com/science/article/pii/S1364661310002081).
- En vocabulario L2, las oportunidades de recuperar la palabra y recibir feedback son especialmente relevantes; la bibliografía de la meta-análisis incluye estudios específicos sobre recuperación de palabras y práctica repetida: [referencias de Kim & Webb](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12479).

Estas fuentes no justifican convertir cada sesión en un examen duro. La inferencia de producto es combinar una entrada amable con pequeños intentos de recordar y feedback inmediato:

- primero escuchar y ver el hanzi;
- después ocultar pinyin y significado;
- intentar recordar el significado o elegirlo entre opciones;
- escuchar de nuevo tras responder;
- programar el próximo intento con FSRS.

## Propuesta concreta para la siguiente versión

### Modelo de contenido

- Añadir `hskVersion`, `hskLevel`, `tags`, `partOfSpeech`, `frequencyRank` y `audioStatus` a `Word`.
- Separar «palabra», «carácter» y «frase». Una palabra puede contener varios caracteres; un carácter puede aparecer en varias palabras.
- Mantener el mazo base actual y publicar packs versionados: `HSK 2.0 Nivel 1`, `HSK 2.0 Nivel 2`, `HSK 3.0 Nivel 1`, etc., para no romper progreso cuando cambien las listas.

### Estados que el usuario controla

- `nueva`: nunca presentada.
- `en_aprendizaje`: ya introducida en FSRS.
- `aprendida`: el usuario la marca como conocida; se conserva el historial y se excluye de los repasos hasta que el usuario la reactive.
- `suspendida`: fuera de las sesiones hasta reactivarla.
- `favorita`: acceso rápido, sin alterar el algoritmo.

«Aprendida» debe ser una decisión de organización, no una calificación que falsifique FSRS. Si el usuario la marca por error, `Deshacer` debe restaurar el estado anterior.

### Modos de práctica

1. **Repaso recomendado**: FSRS decide las tarjetas pendientes y las nuevas del límite diario.
2. **Sesión aleatoria**: muestra una muestra limitada por filtros; no altera FSRS salvo que el usuario califique.
3. **Escucha**: reproduce audio y pide elegir hanzi o significado; registra el resultado como revisión de escucha separada.
4. **Reconocimiento**: hanzi visible, elegir pinyin/meaning entre distractores.
5. **Producción ligera**: mostrar significado o audio y dejar que el usuario escriba pinyin o seleccione los caracteres; comparar de forma tolerante y revelar la respuesta correcta.
6. **Dificultades**: filtrar por «falladas recientemente», «tono difícil», «sin audio», «favoritas» o una etiqueta temática.

La sesión aleatoria debe ser un modo de práctica, no el sustituto del calendario: si se califica, actualiza FSRS; si solo se explora, no contamina el historial.

### Funciones de alto valor

- Filtros combinables por nivel, tema, estado, audio y dificultad.
- Selección «10 minutos» o «10 tarjetas», con resumen al terminar.
- Historial por tarjeta: última respuesta, próximas fechas y número de fallos.
- Repetición auditiva automática con control de pausa y velocidad.
- Comparación de tonos y pares mínimos cuando haya datos revisados.
- Frases cortas en contexto antes de añadir más volumen.
- Estadísticas útiles: tarjetas nuevas, repasos, acierto por modo y tarjetas que más se olvidan; sin rachas obligatorias.

El orden recomendado es: metadatos y packs HSK versionados, filtros/estados, sesión aleatoria segura y modo escucha/reconocimiento. Eso aporta más aprendizaje por tarjeta que simplemente inflar el mazo.
