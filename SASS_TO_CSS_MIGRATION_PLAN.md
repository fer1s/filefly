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

## Paso 2. Componentes de bajo riesgo - pendiente de validacion visual

### Archivos

- `src/styles/components/Spinner.scss`
- `src/styles/components/SearchBar.scss`
- `src/styles/components/DetailsPopup.scss`

### Que hacer

Renombrar a `.css`, aplanar nesting si hace falta y cambiar imports.

La implementacion se completo el 20 de junio de 2026. Falta confirmar visualmente los tres componentes antes de cerrar el paso.

### Donde probar

- `SearchBar`: sidebar izquierda, comprobar input normal, hover y focus
- `DetailsPopup`: dejar el raton quieto sobre un archivo unos 2 segundos
- `Spinner`: abrir un preview y comprobar el estado de carga

## Paso 3. Menu contextual

### Archivos

- `src/styles/components/ContextMenu.scss`

### Donde probar

- Click derecho sobre carpeta
- Click derecho sobre archivo
- Hover sobre opciones
- Cerrar el menu haciendo click fuera

## Paso 4. Barra superior

### Archivos

- `src/styles/components/AppBar.scss`

### Donde probar

- Hover en minimizar, maximizar y cerrar
- Scroll de sidebar para ver si el titulo se oculta igual

## Paso 5. Pantalla de volumenes

### Archivos

- `src/styles/pages/Volumes.scss`

### Donde probar

- Pantalla inicial
- Hover de cada volumen
- Doble click en un volumen para entrar

## Paso 6. Barra de ruta

### Archivos

- `src/styles/components/PathBar.scss`

### Donde probar

- Boton home
- Botones atras y adelante
- Estado `disabled`
- Focus del input
- Cambio entre `grid` y `list`

## Paso 7. Sidebar

### Archivos

- `src/styles/components/SideBar.scss`

### Donde probar

- Scroll de sidebar
- Hover de `Pinned`
- Hover de drives
- Barras de uso y espaciados

## Paso 8. Directorio principal

### Archivos

- `src/styles/pages/Directory.scss`

### Donde probar

- Vista `grid`
- Vista `list`
- Hover de items
- Alternancia de filas pares e impares en `list`
- Iconos y thumbnails
- Bordes del primer y ultimo item en `list`

## Paso 9. Preview general

### Archivos

- `src/styles/components/Preview.scss`

### Donde probar

- Preview de imagen
- Preview de markdown
- Cerrar preview con boton y backdrop
- Estado `loading`
- Variante `.image`

## Paso 10. Preview de audio

### Archivos

- `src/styles/components/AudioPreview.scss`

### Donde probar

- Abrir audio preview
- Boton play y pause
- Slider de progreso
- Control de volumen y su popup
- Hover del thumb del slider

## Paso 11. Estilos globales

### Archivos

- `src/styles/index.scss`

### Donde probar

- Layout completo
- Espaciados globales
- Scrollbars
- Clase `.shadow`
- Fondo general
- Tipografia
- `App` y `AppContent`

## Paso 12. Limpieza final

### Que hacer

- Confirmar que no quedan imports `.scss`
- Eliminar `sass` de `package.json`
- Confirmar que no quedan archivos `.scss` en `src/styles`

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
