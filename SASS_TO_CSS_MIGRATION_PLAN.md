# Sass to CSS Migration Plan

## Objetivo

Migrar los estilos de `.scss` a `.css` paso a paso, validando cada cambio en la UI antes de continuar, para asegurar que el resultado siga siendo visual y funcionalmente identico.

## Regla de trabajo

En cada paso:

1. Migrar solo los archivos indicados.
2. Actualizar los imports de `.scss` a `.css`.
3. Probar solo la zona afectada.
4. Si algo se rompe, parar en ese paso y revisar que se rompio y que estabas haciendo exactamente.

Mantendremos la dependencia `sass` hasta el ultimo paso para permitir una migracion gradual.

## Paso 1. Baseline visual - completado

### Que hacer

No editar nada todavia. Usar el estado actual como referencia visual y de comportamiento.

La validacion se completo el 20 de junio de 2026. Los problemas encontrados ya existian antes de migrar Sass y estan documentados en `BASELINE_BACKLOG.md`; no deben considerarse regresiones de CSS.

### Donde probar

- Pantalla inicial `Volumes`
- Entrar en una unidad o carpeta para ver `Directory`
- Cambiar entre `grid` y `list`
- Click derecho sobre archivo y carpeta
- Abrir preview de imagen, markdown y audio

## Paso 2. Componentes de bajo riesgo - completado

### Archivos

- `src/styles/components/Spinner.scss`
- `src/styles/components/SearchBar.scss`
- `src/styles/components/DetailsPopup.scss`

### Que hacer

Renombrar a `.css`, aplanar nesting si hace falta y cambiar imports.

La implementacion y la validacion visual se completaron el 20 de junio de 2026. `Spinner`, `SearchBar` y `DetailsPopup` mantienen el aspecto anterior.

### Donde probar

- `SearchBar`: sidebar izquierda, comprobar input normal, hover y focus
- `DetailsPopup`: dejar el raton quieto sobre un archivo unos 2 segundos
- `Spinner`: abrir un preview y comprobar el estado de carga

## Paso 3. Menu contextual - completado

### Archivos

- `src/styles/components/ContextMenu.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. El menu mantiene su aspecto, hover, separador y cierre exterior.

### Donde probar

- Click derecho sobre carpeta
- Click derecho sobre archivo
- Hover sobre opciones
- Cerrar el menu haciendo click fuera

## Paso 4. Barra superior - completado

### Archivos

- `src/styles/components/AppBar.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. La barra mantiene titulo, botones, hover y ocultacion al hacer scroll.

### Donde probar

- Hover en minimizar, maximizar y cerrar
- Scroll de sidebar para ver si el titulo se oculta igual

## Paso 5. Pantalla de volumenes - completado

### Archivos

- `src/styles/pages/Volumes.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. Las tarjetas mantienen dimensiones, contenido, barra de uso y hover.

### Donde probar

- Pantalla inicial
- Hover de cada volumen
- Doble click en un volumen para entrar

## Paso 6. Barra de ruta - completado

### Archivos

- `src/styles/components/PathBar.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. La barra mantiene su aspecto y estados. El bug funcional de atras en macOS se documento por separado.

### Donde probar

- Boton home
- Botones atras y adelante
- Estado `disabled`
- Focus del input
- Cambio entre `grid` y `list`

## Paso 7. Sidebar - completado

### Archivos

- `src/styles/components/SideBar.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. La sidebar mantiene layout, animacion, barras de uso y hover.

### Donde probar

- Scroll de sidebar
- Hover de `Pinned`
- Hover de drives
- Barras de uso y espaciados

## Paso 8. Directorio principal - completado

### Archivos

- `src/styles/pages/Directory.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. Las vistas grid y list mantienen layout, filas, thumbnails y hover.

### Donde probar

- Vista `grid`
- Vista `list`
- Hover de items
- Alternancia de filas pares e impares en `list`
- Iconos y thumbnails
- Bordes del primer y ultimo item en `list`

## Paso 9. Preview general - completado

### Archivos

- `src/styles/components/Preview.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. Los previews de imagen y Markdown mantienen layout, contenido y animacion.

### Donde probar

- Preview de imagen
- Preview de markdown
- Cerrar preview con boton y backdrop
- Estado `loading`
- Variante `.image`

## Paso 10. Preview de audio - completado

### Archivos

- `src/styles/components/AudioPreview.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. El reproductor mantiene layout, controles, sliders y animaciones.

### Donde probar

- Abrir audio preview
- Boton play y pause
- Slider de progreso
- Control de volumen y su popup
- Hover del thumb del slider

## Paso 11. Estilos globales - completado

### Archivos

- `src/styles/index.scss`

La implementacion y la validacion visual se completaron el 20 de junio de 2026. El layout global mantiene tipografia, dimensiones, sombras, scrollbars y espaciados.

### Donde probar

- Layout completo
- Espaciados globales
- Scrollbars
- Clase `.shadow`
- Fondo general
- Tipografia
- `App` y `AppContent`

## Paso 12. Limpieza final - pendiente de comandos de validacion

### Que hacer

- Confirmar que no quedan imports `.scss`
- Eliminar `sass` de `package.json`
- Confirmar que no quedan archivos `.scss` en `src/styles`

Estado actual:

- No quedan archivos `.scss` en `src`.
- No quedan imports `.scss` en `src`.
- Falta retirar `sass` de `package.json` y sincronizar `package-lock.json`.
- Falta ejecutar build y validacion final por parte del usuario.

### Donde probar

Recorrido rapido completo:

- `Volumes`
- `Directory`
- `PathBar`
- `ContextMenu`
- Previews

## Orden recomendado

El orden esta pensado para empezar por componentes de bajo riesgo y dejar para el final los estilos globales y los modulos con mas nesting.

## Criterio de exito

La migracion solo se considera correcta si:

- La UI se ve igual
- Los estados hover, focus y disabled siguen igual
- Los previews y overlays siguen comportandose igual
- No dependemos ya de `sass`
