# Framer Motion to CSS Migration Plan

## Objetivo

Eliminar `framer-motion` y reproducir con CSS las animaciones actuales, manteniendo el aspecto y comportamiento percibido antes de continuar con React 19.

Plan creado el 20 de junio de 2026.

## Alcance actual

Framer Motion se usa en cinco componentes y siete grupos de animacion:

| Componente | Animacion |
| --- | --- |
| `src/components/SideBar.tsx` | Entrada escalonada de drives |
| `src/components/ContextMenu.tsx` | Opacidad y escala del menu |
| `src/components/DetailsPopup.tsx` | Opacidad, desplazamiento vertical y escala |
| `src/components/Preview.tsx` | Backdrop y panel de imagen/Markdown |
| `src/components/AudioPreview.tsx` | Reproductor y popup de volumen |

El proyecto no usa drag, gestos, layout animations, shared layout, scroll animations ni `AnimatePresence`.

## Diferencia esperada

CSS no reproduce exactamente una simulacion fisica `spring`. Los springs configurados actualmente usan `bounce: 0` y una duracion de `0.3s`, por lo que se pueden aproximar con una curva `cubic-bezier` sin una diferencia visual importante.

La equivalencia se validara manualmente despues de cada fase.

## Reglas de trabajo

1. Migrar un grupo visual cada vez.
2. Mantener `framer-motion` instalado hasta convertir los cinco componentes.
3. No corregir bugs funcionales durante esta migracion.
4. Mantener los elementos montados y controlar visibilidad con clases CSS.
5. Usar `opacity`, `visibility` y `pointer-events` en lugar de animar `display`.
6. El usuario ejecuta todos los comandos de build y desarrollo.

## Fase 0. Baseline de animaciones

Estado: completada.

### Donde observar

- Recargar la aplicacion y observar la entrada escalonada de drives.
- Abrir y cerrar el menu contextual.
- Mantener hover sobre un archivo hasta mostrar metadata.
- Abrir y cerrar preview de imagen y Markdown.
- Abrir audio, reproducir y abrir el control de volumen.

### Criterio de salida

- Las animaciones actuales estan identificadas antes de modificar codigo.

## Fase 1. Context Menu y Details Popup

Estado: completada y validada.

Son los dos casos de menor riesgo.

### Context Menu

Cambios previstos:

- Sustituir `motion.div` por `div`.
- Eliminar `contextMenuVariants`.
- Aplicar una clase de estado como `visible`.
- Estado oculto: `opacity: 0`, `scale(0.8)`, `visibility: hidden` y `pointer-events: none`.
- Estado visible: `opacity: 1`, `scale(1)`, `visibility: visible` y `pointer-events: auto`.
- Mantener transicion de `0.2s`.

Donde probar:

- Click derecho sobre carpeta.
- Click derecho sobre archivo.
- Cierre haciendo click fuera.
- Posicion del menu en distintas zonas de la ventana.
- Hover y separador.

### Details Popup

Cambios previstos:

- Sustituir `motion.div` por `div`.
- Combinar el centrado horizontal con la animacion en una sola propiedad `transform`.
- Oculto: `translate(-50%, 100%) scale(0.7)` y opacidad cero.
- Visible: `translate(-50%, 0) scale(1)` y opacidad uno.
- Mantener transicion de `0.1s`.

Donde probar:

- Mantener hover sobre carpeta y archivo durante dos segundos.
- Salir del elemento y comprobar el cierre.
- Confirmar posicion centrada y contenido de metadata.

## Fase 2. Preview y Backdrop

Estado: completada y validada.

### Backdrop

Cambios previstos:

- Sustituir `motion.div` por `div`.
- Eliminar `previewBackdropVariants`.
- Controlar visibilidad con una clase.
- Sustituir `display: none/flex` por opacidad, visibilidad y pointer events.

### Panel de preview

Cambios previstos:

- Sustituir `motion.div` por `div`.
- Eliminar `previewVariants`.
- Oculto: `translateY(100%) scale(0.6)` y opacidad cero.
- Visible: `translateY(0) scale(1)` y opacidad uno.
- Aproximar el spring sin rebote con una transicion de `0.3s` y `cubic-bezier`.
- Mantener las variantes visuales `image`, `markdown` y `loading`.

Donde probar:

- Abrir y cerrar una imagen.
- Abrir y cerrar un Markdown.
- Cerrar con boton y backdrop.
- Comprobar tamanos, scroll y spinner.

## Fase 3. Audio Preview

Estado: completada y validada.

### Reproductor

Cambios previstos:

- Sustituir el contenedor `motion.div` por `div`.
- Eliminar `audioPreviewVariants`.
- Mantener `translateX(-50%)` al combinarlo con desplazamiento vertical y escala.
- Oculto: `translate(-50%, 100%) scale(0.6)` y opacidad cero.
- Visible: `translate(-50%, 0) scale(1)` y opacidad uno.

### Popup de volumen

Cambios previstos:

- Sustituir `motion.div` por `div`.
- Eliminar `volumeControlVariants`.
- Oculto: desplazamiento horizontal, escala y opacidad cero.
- Visible: posicion original, escala uno y opacidad uno.
- Mantener transicion de `0.3s` sin rebote.

Donde probar:

- Abrir y cerrar preview de audio.
- Play y pause.
- Slider de progreso.
- Abrir y cerrar volumen.
- Slider de volumen.
- Cierre mediante backdrop.

## Fase 4. Stagger de Sidebar

Estado: completada y validada.

Cambios previstos:

- Sustituir cada `motion.div` por `div`.
- Eliminar `animatedListVariants` y la prop `custom`.
- Crear keyframes desde `translateX(-100%) scale(0.7)` y opacidad cero.
- Terminar en posicion original, escala uno y opacidad uno.
- Aplicar delay dinamico de `index * 40ms` mediante una custom property CSS o `animationDelay` inline.
- Mantener las animaciones solo para la entrada inicial de cada drive.

Donde probar:

- Recargar la aplicacion.
- Observar orden y ritmo de entrada de drives.
- Comprobar click y hover de cada drive.
- Conectar un volumen removible si esta disponible.

## Fase 5. Reduced Motion

Estado: implementada y pendiente de validacion.

Agregar una regla `prefers-reduced-motion` para desactivar o reducir transiciones y keyframes cuando el sistema lo solicite.

Donde probar:

- Validacion normal con animaciones activas.
- Si es posible, activar reducir movimiento en el sistema y reiniciar la app.

## Fase 6. Limpieza de dependencia

### Comprobaciones previas

- No quedan imports desde `framer-motion`.
- No quedan elementos `motion.*`.
- No quedan objetos `variants` asociados a Framer Motion.

### Comando que ejecutara el usuario

```bash
npm uninstall framer-motion
```

### Validacion

- Confirmar que desaparece de `package.json` y `package-lock.json`.
- Confirmar que desaparece de `node_modules`.
- Ejecutar build.
- Ejecutar Tauri y completar smoke test.

## Fase 7. Smoke Test Final

Recorrido:

1. Inicio y stagger de sidebar.
2. Navegacion desde `Volumes` a `Directory`.
3. Menu contextual en carpeta y archivo.
4. Popup de metadata.
5. Preview de imagen.
6. Preview de Markdown.
7. Preview de audio y volumen.
8. Revision de consola.

## Criterio de exito

La migracion se considera completa cuando:

- Los cinco componentes usan elementos HTML normales.
- Las siete animaciones tienen equivalente CSS.
- No queda ningun import o referencia de Framer Motion.
- `framer-motion` ya no esta instalado.
- Las animaciones se perciben iguales o son aceptadas tras validacion visual.
- Build y smoke test Tauri funcionan.
- React 19 deja de estar bloqueado por la dependencia de animacion.
