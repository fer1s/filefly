# React 19 Migration Plan

## Objetivo

Migrar el proyecto de React 18.2 a React 19 de forma gradual, manteniendo el comportamiento actual y resolviendo primero las dependencias que bloquean o condicionan la actualizacion.

Analisis realizado el 20 de junio de 2026.

## Reglas de trabajo

1. Cambiar un grupo de dependencias cada vez.
2. Validar visual y funcionalmente cada fase antes de continuar.
3. No mezclar correcciones del backlog funcional con la migracion de dependencias.
4. El usuario ejecuta todos los comandos de instalacion, build y desarrollo.
5. El agente indica los comandos, revisa los cambios y modifica el codigo necesario.

## Veredicto de compatibilidad

React 19 es viable en este proyecto, pero no debe instalarse de forma aislada.

| Dependencia | Version actual | Compatibilidad con React 19 | Accion |
| --- | --- | --- | --- |
| `react` | 18.2.0 | Requiere actualizacion | Subir junto con `react-dom` |
| `react-dom` | 18.2.0 | Requiere actualizacion | Mantener la misma version que React |
| `@types/react` | 18.2.15 | No corresponde a React 19 | Subir a 19.x |
| `@types/react-dom` | 18.2.7 | No corresponde a React 19 | Subir a 19.x |
| `framer-motion` | 11.0.3 | Bloquea React 19 por peer dependency `^18` | Migrar a Motion 12 |
| `react-router-dom` | 6.21.3 | Compatible: acepta React `>=16.8` | Mantener inicialmente |
| `react-icons` | 4.11.0 | Compatible, pero se retirara antes | Migrar a Font Awesome |
| `@vitejs/plugin-react` | 4.0.3 | Sin restriccion directa sobre React | Mantener inicialmente |
| TypeScript | 5.0.2 | Compatible con los tipos React 19 para TS 5.0 | Mantener inicialmente |
| Tauri | 1.5.0 | Independiente de React | Sin cambios |

El proyecto ya usa el JSX transform moderno mediante `jsx: "react-jsx"`, requisito de React 19.

Fuentes:

- https://react.dev/blog/2024/04/25/react-19-upgrade-guide
- https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/package.json
- https://github.com/motiondivision/motion/blob/main/packages/framer-motion/package.json
- https://motion.dev/motion/guide-upgrade/

## Fase 0. Migrar React Icons a Font Awesome

Esta fase debe completarse antes de tocar Motion o React.

Estado: en progreso. `AppBar` y `PathBar` estan migrados y pendientes de validacion visual.

### Compatibilidad y decision de Node

La version moderna `@fortawesome/react-fontawesome` 3.x soporta React 18 o superior y Font Awesome 6/7, pero exige Node 20 o superior.

El README actual del proyecto indica Node 18.18. La opcion recomendada es elevar el requisito del proyecto a Node 20 para usar el wrapper moderno.

Si se mantiene Node 18, seria necesario usar `@fortawesome/react-fontawesome` 0.2.x. Esta alternativa mantiene compatibilidad heredada, pero no es la recomendada para una modernizacion de dependencias.

Fuentes:

- https://github.com/FortAwesome/react-fontawesome
- https://docs.fontawesome.com/web/use-with/react
- https://docs.fontawesome.com/web/use-with/react/add-icons/

### Dependencias propuestas

- `@fortawesome/fontawesome-svg-core`
- `@fortawesome/free-solid-svg-icons`
- `@fortawesome/react-fontawesome`

Se importaran iconos individuales. No se importara el pack completo `fas`, para permitir tree-shaking y evitar aumentar innecesariamente el bundle.

### Mapeo propuesto

| Archivo | React Icons actual | Font Awesome propuesto |
| --- | --- | --- |
| `src/pages/Directory.tsx` | `IoOpenOutline` | `faArrowUpRightFromSquare` |
| `src/pages/Directory.tsx` | `IoCopyOutline` | `faCopy` |
| `src/pages/Directory.tsx` | `IoInformation` | `faCircleInfo` |
| `src/pages/Directory.tsx` | `CgTerminal` | `faTerminal` |
| `src/pages/Directory.tsx` | `MdOutlineDriveFileRenameOutline` | `faFilePen` |
| `src/pages/Directory.tsx` | `MdDeleteOutline` | `faTrash` |
| `src/pages/Directory.tsx` | `MdOutlineContentCut` | `faScissors` |
| `src/pages/Directory.tsx` | `MdOutlinePreview` | `faEye` |
| `src/pages/Volumes.tsx` | `FaHardDrive` | `faHardDrive` |
| `src/pages/Volumes.tsx` | `AiFillUsb` | `faUsb` |
| `src/components/PathBar.tsx` | `RiHomeFill` | `faHouse` |
| `src/components/PathBar.tsx` | `FaArrowLeft` | `faArrowLeft` |
| `src/components/PathBar.tsx` | `FaArrowRight` | `faArrowRight` |
| `src/components/PathBar.tsx` | `HiViewList` | `faList` |
| `src/components/PathBar.tsx` | `HiViewGrid` | `faTableCellsLarge` |
| `src/components/SideBar.tsx` | `FaFolder` | `faFolder` |
| `src/components/SideBar.tsx` | `FaHardDrive` | `faHardDrive` |
| `src/components/SideBar.tsx` | `AiFillUsb` | `faUsb` |
| `src/components/DirEntry.tsx` | `FaFile` | `faFile` |
| `src/components/DirEntry.tsx` | `FaFolder` | `faFolder` |
| `src/components/AudioPreview.tsx` | `IoPlay` | `faPlay` |
| `src/components/AudioPreview.tsx` | `IoPause` | `faPause` |
| `src/components/AudioPreview.tsx` | `IoVolumeMedium` | `faVolumeHigh` |
| `src/components/AppBar.tsx` | `VscChromeMinimize` | `faMinus` |
| `src/components/AppBar.tsx` | `VscChromeMaximize` | `faWindowMaximize` |
| `src/components/AppBar.tsx` | `VscChromeClose` | `faXmark` |

El icono comentado `CgToolbox` se mapearia a `faToolbox` si vuelve a activarse.

### Orden de migracion de iconos

1. Confirmar o actualizar Node a version 20 o superior.
2. Instalar las tres dependencias de Font Awesome.
3. Migrar iconos por componente, empezando por `AppBar` y `PathBar`.
4. Validar tamanos, alineacion, hover y estados en cada componente.
5. Migrar `Directory`, que contiene la mayor cantidad de iconos.
6. Confirmar que no quedan imports `react-icons/*`.
7. Desinstalar `react-icons`.
8. Ejecutar build y smoke test Tauri.

### Criterios de validacion

- Los iconos mantienen significado y legibilidad.
- No cambian el alto de botones, filas o tarjetas.
- Los estados hover conservan colores y transiciones.
- Los iconos de ventana siguen centrados.
- Los iconos de carpetas, archivos, discos y USB mantienen jerarquia visual.
- El bundle no incluye packs completos de Font Awesome.

## Fase 1. Migrar Framer Motion 11 a Motion 12

### Motivo

`framer-motion` 11.0.3 declara peers `react: ^18.0.0` y `react-dom: ^18.0.0`. No es compatible formalmente con React 19.

Motion 12 declara compatibilidad con React 18 y 19. La guia oficial indica que Motion for React 12 no introduce breaking changes para la API React.

### Cambios

- Desinstalar `framer-motion`.
- Instalar `motion` 12.
- Cambiar cinco imports de `framer-motion` a `motion/react`:
  - `src/components/AudioPreview.tsx`
  - `src/components/ContextMenu.tsx`
  - `src/components/DetailsPopup.tsx`
  - `src/components/SideBar.tsx`
  - `src/components/Preview.tsx`

### Donde probar

- Entrada escalonada de drives en la sidebar.
- Apertura y cierre del menu contextual.
- Popup de metadata.
- Preview de imagen y Markdown.
- Reproductor y popup de volumen de audio.

## Fase 2. Puente React 18.3

La guia oficial de React recomienda actualizar primero a React 18.3. Esta version se comporta como React 18.2, pero muestra avisos sobre APIs que deben corregirse antes de React 19.

### Cambios

- Subir `react` y `react-dom` a 18.3.1.
- Alinear temporalmente `@types/react` y `@types/react-dom` con 18.3.
- Revisar consola durante el smoke test.

### Criterio de salida

- Build correcto.
- Sin warnings de APIs eliminadas o JSX transform antiguo.
- Aplicacion Tauri funcional.

## Fase 3. Migrar a React 19

### Cambios

- Subir `react` y `react-dom` juntos a React 19.2.x estable.
- Subir `@types/react` y `@types/react-dom` juntos a 19.x.
- Mantener TypeScript 5.0.2 inicialmente para aislar el cambio.

### Compatibilidad del codigo actual

El proyecto no usa:

- `ReactDOM.render`
- `findDOMNode`
- string refs
- `useRef()` sin argumento
- callback refs con retorno implicito
- acceso inseguro a `ReactElement.props`
- extensiones manuales del namespace global `JSX`

Por tanto, no se espera necesitar el codemod general de React 19.

## Fase 4. Ajustes de tipos React 19

### Cambios previstos

- Cambiar `React.RefObject<HTMLDivElement>` a `React.RefObject<HTMLDivElement | null>` en `src/components/DirEntry.tsx`.
- Eliminar `ref` de `ContextMenuProps` en `src/components/ContextMenu.tsx`, porque `forwardRef` ya gestiona esa referencia.
- Mantener `forwardRef` durante esta migracion para reducir alcance; React 19 lo soporta aunque el nuevo modelo permite recibir `ref` como prop.
- Corregir cualquier error adicional que exponga TypeScript despues de instalar los tipos 19.

### Donde probar

- Posicionamiento y cierre del menu contextual.
- Hover y metadata de archivos.
- Audio y previews.
- Navegacion entre volumenes y directorios.

## Fase 5. Validacion final

El usuario ejecutara los comandos indicados en cada fase.

Validaciones finales:

1. Build TypeScript y Vite.
2. Inicio de Tauri en desarrollo.
3. Recorrido `Volumes` a `Directory`.
4. Cambio `grid/list`.
5. Menu contextual.
6. Preview de imagen, Markdown y audio.
7. Botones de ventana y animaciones Motion.
8. Revision de consola para warnings React 19.

## Criterio de exito

La migracion se considera completa cuando:

- React y React DOM estan alineados en 19.x.
- Los tipos React estan alineados en 19.x.
- Motion declara compatibilidad con React 19.
- `react-icons` y `framer-motion` ya no estan instalados.
- No hay errores de TypeScript ni peer dependencies.
- Build y smoke test Tauri funcionan.
- La interfaz mantiene su aspecto y comportamiento previo.
