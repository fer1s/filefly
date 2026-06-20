# Baseline Backlog

## Proposito

Registrar el comportamiento observado antes de migrar Sass a CSS. Estos puntos son deuda funcional previa y no deben confundirse con regresiones causadas por la migracion visual.

Baseline validado el 20 de junio de 2026.

## Volumes

### Comportamiento correcto

- Los elementos muestran respuesta visual en hover mediante un borde sutil.
- El doble click permite entrar en un volumen.

### Tareas detectadas

- [ ] Revisar por que `Macintosh HD` aparece como `/` y `/System/Volumes/Data`, y decidir si la UI debe agrupar o diferenciar mejor ambos volumenes APFS.
- [ ] Definir seleccion visual con un click simple.
- [ ] Decidir si entrar debe mantenerse en doble click o cambiarse a click simple.

## Directory

### Comportamiento correcto

- El hover sobre carpetas y archivos responde visualmente.
- El doble click permite entrar en carpetas.
- El popup de metadata aparece y muestra tipo, ruta y extension.

### Tareas detectadas

- [ ] Implementar seleccion y foco con click simple.
- [ ] Implementar navegacion por teclado entre elementos.
- [ ] Implementar busqueda incremental por letra para localizar archivos o directorios.
- [ ] Definir un estilo claro para el elemento seleccionado.

## Sidebar

### Bugs funcionales

- Los items visuales de la sidebar no ofrecen todas las acciones esperadas al hacer click.
- El item fijado `Downloads` es solo visual y no navega a la carpeta.
- El campo `Search` es solo visual: no mantiene una consulta ni filtra el directorio actual.

### Tareas detectadas

- [ ] Conectar los items fijados con rutas reales y permitir navegar al hacer click.
- [ ] Revisar y validar el click de todos los items de la sidebar.
- [ ] Implementar la busqueda sobre el contenido del directorio actual.
- [ ] Definir el comportamiento cuando no hay resultados.
- [ ] Permitir limpiar la busqueda y recuperar el listado completo.

### Mejora propuesta: sidebar colapsable

- [ ] Anadir un control para colapsar y expandir la sidebar.
- [ ] Definir una vista colapsada basada en iconos.
- [ ] Ajustar el area principal para aprovechar el espacio liberado.
- [ ] Mantener accesibles las acciones mediante labels o tooltips.
- [ ] Decidir si el estado colapsado debe persistirse entre sesiones.

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

- [ ] Anadir una accion explicita para subir al directorio padre.
- [ ] Corregir atras y adelante para usar rutas multiplataforma.
- [ ] Sustituir `oldPath` por un historial que soporte mas de una ruta.
- [ ] Validar navegacion en la raiz, un nivel y varios niveles de profundidad.

## Apertura de archivos en macOS

### Problema critico

La accion `Open` intenta ejecutar la ruta mediante `sh -c` en lugar de pedir al sistema operativo que abra el archivo con su aplicacion asociada.

Casos observados:

- Una ruta con espacios como `Case of Study` se divide y produce `No such file or directory`.
- Una imagen como `Slack_page-0001.jpg` produce `cannot execute binary file`.
- El doble click sobre una imagen falla por la misma ruta de apertura.

### Tareas detectadas

- [ ] Sustituir la apertura por una implementacion nativa multiplataforma.
- [ ] Tratar las rutas como argumentos, sin interpretarlas mediante shell.
- [ ] Validar archivos con espacios, imagenes, PDF, audio y documentos.
- [ ] Devolver errores del backend a la interfaz en vez de dejarlos solo en consola.

## Preview

### Comportamiento correcto

- El preview de imagen funciona desde el menu contextual.

### Tareas detectadas

- [ ] Anadir navegacion anterior/siguiente dentro del preview.
- [ ] Anadir soporte de teclado mediante flechas y Escape.
- [ ] Decidir si el doble click debe abrir la aplicacion del sistema o el preview interno.

## Context Menu

### Comportamiento correcto

- El menu aparece con click derecho.
- Las opciones responden visualmente al hover.

### Tareas detectadas

- [ ] Corregir `Open` en macOS.
- [ ] Implementar `Copy`.
- [ ] Implementar `Cut`.
- [ ] Implementar `Rename`.
- [ ] Implementar `Delete` con confirmacion.
- [ ] Implementar `Properties` o retirarlo temporalmente.
- [ ] Definir estados disabled para acciones todavia no disponibles.

## Priorizacion propuesta

1. Corregir apertura nativa de archivos y rutas con espacios.
2. Corregir atras y adelante del Path Bar en macOS.
3. Implementar seleccion y foco de elementos.
4. Implementar navegacion por teclado y busqueda por letra.
5. Activar items y busqueda de la sidebar.
6. Completar las acciones del menu contextual.
7. Anadir navegacion entre previews.
8. Anadir el modo colapsable de la sidebar.
9. Revisar presentacion de volumenes APFS.

## Regla para la migracion Sass a CSS

Durante cada fase visual se comprobara que estos comportamientos no empeoran. No se corregiran dentro de la migracion Sass a CSS salvo que se acuerde expresamente, para mantener cada cambio aislado y verificable.
