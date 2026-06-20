# Baseline Backlog

## Proposito

Registrar el comportamiento observado antes de migrar Sass a CSS. Estos puntos son deuda funcional previa y no deben confundirse con regresiones causadas por la migracion visual.

Baseline validado el 20 de junio de 2026.

## Clasificacion: ahora vs Tauri 2

Cada tarea esta etiquetada para decidir el momento de ejecucion:

- `(ahora)`: solo frontend (React/CSS/estado o logica JS de rutas). No depende de APIs Tauri, se puede arreglar sin esperar a la migracion.
- `(Tauri 2)`: acoplada a APIs Tauri que cambian en la version 2 (window, opener/shell, plugin-fs, plugin-dialog, errores de `invoke`). Arreglarla en v1 seria trabajo tirado; se resuelve durante o despues de la migracion a Tauri 2.

Regla: no invertir en tareas `(Tauri 2)` sobre v1. Hacerlas con las APIs nuevas.

## Volumes

### Comportamiento correcto

- Los elementos muestran respuesta visual en hover mediante un borde sutil.
- El doble click permite entrar en un volumen.

### Tareas detectadas

- [ ] (ahora) Revisar por que `Macintosh HD` aparece como `/` y `/System/Volumes/Data`, y decidir si la UI debe agrupar o diferenciar mejor ambos volumenes APFS.
- [ ] (ahora) Definir seleccion visual con un click simple.
- [ ] (ahora) Decidir si entrar debe mantenerse en doble click o cambiarse a click simple.

## Directory

### Comportamiento correcto

- El hover sobre carpetas y archivos responde visualmente.
- El doble click permite entrar en carpetas.
- El popup de metadata aparece y muestra tipo, ruta y extension.

### Tareas detectadas

- [x] (ahora) Implementar seleccion y foco con click simple. `selectedIDs` en `Directory.tsx`; click selecciona y enfoca, Ctrl/Cmd+click multiselecciona, click en vacio o Escape deselecciona.
- [x] (ahora) Implementar navegacion por teclado entre elementos. Flechas mueven cursor (grid: salto por columnas; list: +-1), Enter abre, Escape limpia, en `Directory.tsx`.
- [x] (ahora) Implementar busqueda incremental por letra para localizar archivos o directorios. Type-to-find con buffer (reset 700ms) en `Directory.tsx`; un solo caracter cicla coincidencias.
- [x] (ahora) Definir un estilo claro para el elemento seleccionado. Clase `.selected` (grid y list) en `Directory.css`.

## Sidebar

### Bugs funcionales

- Los items visuales de la sidebar no ofrecen todas las acciones esperadas al hacer click.
- El item fijado `Downloads` es solo visual y no navega a la carpeta.
- El campo `Search` es solo visual: no mantiene una consulta ni filtra el directorio actual.

### Tareas detectadas

- [x] (ahora) Conectar los items fijados con rutas reales y permitir navegar al hacer click. `SideBar.tsx` resuelve Home/Desktop/Documents/Downloads/Pictures con `@tauri-apps/api/path` y navega al click.
- [x] (ahora) Revisar y validar el click de todos los items de la sidebar. Volumenes y pinned ahora navegan via `setPath`.
- [x] (ahora) Implementar la busqueda sobre el contenido del directorio actual. `search` en contexto; `SearchBar` filtra `dirContent` por nombre en `Directory.tsx`. Se resetea al navegar.
- [x] (ahora) Definir el comportamiento cuando no hay resultados. Mensaje `No results for "..."` (`.no_results`).
- [x] (ahora) Permitir limpiar la busqueda y recuperar el listado completo. Boton X en `SearchBar` y reset automatico al cambiar de ruta.

### Mejora propuesta: sidebar colapsable

- [ ] (ahora) Anadir un control para colapsar y expandir la sidebar.
- [ ] (ahora) Definir una vista colapsada basada en iconos.
- [ ] (ahora) Ajustar el area principal para aprovechar el espacio liberado.
- [ ] (ahora) Mantener accesibles las acciones mediante labels o tooltips.
- [ ] (ahora) Decidir si el estado colapsado debe persistirse entre sesiones.

## Controles de ventana

### Bug funcional

- Los controles de maximizar y minimizar mantienen siempre el mismo icono y no reflejan visualmente el estado actual de la ventana.
- Al maximizar, el boton deberia cambiar a un icono de restaurar ventana.
- Al restaurar, deberia volver al icono de maximizar.

### Tareas detectadas

- [ ] (Tauri 2) Consultar el estado maximizado real de la ventana Tauri. En v2 se usa `getCurrentWindow()` de `@tauri-apps/api/window`.
- [ ] (Tauri 2) Escuchar cambios de tamano o estado de la ventana. Los eventos cambian en v2.
- [ ] (Tauri 2) Alternar entre `faWindowMaximize` y `faWindowRestore`. Depende del estado real anterior.
- [ ] (Tauri 2) Definir si minimizar necesita algun estado visual adicional.
- [ ] (Tauri 2) Validar maximizar, restaurar, minimizar y reapertura desde la bandeja.

## Path Bar

### Comportamiento correcto

- El boton home, el campo de ruta y el cambio de vista funcionan.

### Bug confirmado en macOS

Pasos para reproducir:

1. Entrar en un volumen desde `Volumes`.
2. Navegar varios niveles dentro de carpetas.
3. Pulsar el boton atras.

Resultado actual:

- La aplicacion vuelve directamente a `Volumes` en lugar de regresar a la carpeta anterior.

Resultado esperado:

- La aplicacion debe volver un nivel o recuperar la ruta anterior del historial.

Causa identificada:

- `PathBar.tsx` divide la ruta usando `\\`, que es el separador de Windows.
- En macOS las rutas usan `/`, por lo que el calculo produce una ruta vacia.
- Una ruta vacia ejecuta `setPath('')` y envia la aplicacion a `Volumes`.

### Tareas detectadas

- [x] (ahora) Anadir una accion explicita para subir al directorio padre. Boton "subir" (`faArrowUp`) en `.controls`.
- [x] (ahora) Corregir atras y adelante para usar rutas multiplataforma. Se sustituye `split('\\')` por historial; `goUp` usa separador `/`.
- [x] (ahora) Sustituir `oldPath` por un historial que soporte mas de una ruta. Stack `{ stack, index }` estilo navegador en `PathBar.tsx`.
- [x] (ahora) Validar navegacion en la raiz, un nivel y varios niveles de profundidad.

## Apertura de archivos en macOS

### Problema critico

La accion `Open` intenta ejecutar la ruta mediante `sh -c` en lugar de pedir al sistema operativo que abra el archivo con su aplicacion asociada.

Casos observados:

- Una ruta con espacios como `Case of Study` se divide y produce `No such file or directory`.
- Una imagen como `Slack_page-0001.jpg` produce `cannot execute binary file`.
- El doble click sobre una imagen falla por la misma ruta de apertura.

### Tareas detectadas

- [ ] (Tauri 2) Sustituir la apertura por una implementacion nativa multiplataforma. En v2 usar el plugin `opener` (o `shell`).
- [ ] (Tauri 2) Tratar las rutas como argumentos, sin interpretarlas mediante shell.
- [ ] (Tauri 2) Validar archivos con espacios, imagenes, PDF, audio y documentos.
- [ ] (Tauri 2) Devolver errores del backend a la interfaz en vez de dejarlos solo en consola. Ligado a la reescritura de `invoke` en v2.

## Preview

### Comportamiento correcto

- El preview de imagen funciona desde el menu contextual.

### Tareas detectadas

- [ ] (ahora) Anadir navegacion anterior/siguiente dentro del preview.
- [ ] (ahora) Anadir soporte de teclado mediante flechas y Escape.
- [ ] (ahora) Decidir si el doble click debe abrir la aplicacion del sistema o el preview interno. Nota: la opcion "abrir app del sistema" depende de la apertura nativa (Tauri 2); la decision se puede tomar ahora.

## Context Menu

### Comportamiento correcto

- El menu aparece con click derecho.
- Las opciones responden visualmente al hover.

### Tareas detectadas

- [ ] (ahora) Aumentar ligeramente el espacio horizontal entre cada icono y su texto.
- [ ] (ahora) Definir un ancho consistente para la columna de iconos y alinear todas las etiquetas.
- [ ] (ahora) Definir estados disabled para acciones todavia no disponibles.
- [ ] (Tauri 2) Corregir `Open` en macOS. Misma causa que "Apertura de archivos".
- [ ] (Tauri 2) Implementar `Copy`. Requiere `@tauri-apps/plugin-fs` de v2.
- [ ] (Tauri 2) Implementar `Cut`. Requiere plugin-fs.
- [ ] (Tauri 2) Implementar `Rename`. Requiere plugin-fs.
- [ ] (Tauri 2) Implementar `Delete` con confirmacion. Requiere plugin-fs y `plugin-dialog` para confirmar.
- [ ] (Tauri 2) Implementar `Properties` o retirarlo temporalmente. Leer metadata depende de plugin-fs; retirarlo de forma temporal si se necesita antes de v2.

## Priorizacion propuesta

### Bucket ahora (frontend, sin esperar Tauri 2)

1. Corregir atras y adelante del Path Bar en macOS (bug de separador de rutas).
2. Implementar seleccion y foco de elementos.
3. Implementar navegacion por teclado y busqueda por letra.
4. Activar items y busqueda de la sidebar.
5. Ajustes visuales del menu contextual (espaciado, alineacion, estados disabled).
6. Anadir navegacion entre previews.
7. Anadir el modo colapsable de la sidebar.
8. Revisar presentacion de volumenes APFS.

### Bucket Tauri 2 (acoplado a APIs que cambian en v2)

1. Apertura nativa de archivos y rutas con espacios (plugin `opener`/`shell`).
2. Acciones de filesystem del menu contextual: Copy, Cut, Rename, Delete, Properties (plugin-fs, plugin-dialog).
3. Estado real de la ventana e iconos maximizar/restaurar (API window de v2).
4. Devolver errores del backend a la UI.

## Regla para la migracion Sass a CSS

Durante cada fase visual se comprobara que estos comportamientos no empeoran. No se corregiran dentro de la migracion Sass a CSS salvo que se acuerde expresamente, para mantener cada cambio aislado y verificable.
