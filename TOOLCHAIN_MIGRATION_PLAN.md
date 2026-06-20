# Toolchain Migration Plan

## Objetivo

Modernizar TypeScript, Vite y `@vitejs/plugin-react` mediante checkpoints pequenos, manteniendo React 19 y el comportamiento actual de la aplicacion Tauri.

Plan creado el 20 de junio de 2026.

## Baseline

| Dependencia | Version inicial |
| --- | --- |
| Node.js | 20.20.0 |
| TypeScript | 5.0.2 |
| Vite | 4.4.4 |
| `@vitejs/plugin-react` | 4.0.3 |
| React | 19.2.7 |

La configuracion actual ya usa ESM, `moduleResolution: bundler`, `isolatedModules` y `jsx: react-jsx`.

## Reglas de trabajo

1. Cambiar un solo major por fase.
2. Actualizar el plugin React junto al major de Vite que lo requiera.
3. El usuario ejecutara instalaciones, build y Tauri; el agente no ejecutara scripts.
4. No corregir bugs del backlog durante esta migracion.
5. Hacer un checkpoint antes de pasar a la siguiente fase.

## Fase 1. TypeScript 5.9

Estado: completada y validada. TypeScript 5.9.3, build y smoke test Tauri correctos.

Cambios:

- Subir TypeScript de 5.0.2 a 5.9.3.
- Mantener Vite 4.4.4 y el plugin React 4.0.3 para aislar el compilador.
- Corregir solo errores o deprecaciones causados por TypeScript.

Donde probar:

- Build TypeScript y Vite.
- Inicio de Tauri.
- Volumes y Directory.
- Grid/list, menu contextual y previews.
- Consola sin errores nuevos.

## Fase 2. Vite 5

Estado: completada y validada. Vite 5.4.21, build y smoke test Tauri correctos.

Cambios:

- Subir Vite 4 a Vite 5.
- Alinear `@vitejs/plugin-react` con Vite 5.
- Revisar `vite.config.ts` y los scripts existentes sin cambiar sus nombres.

Donde probar:

- Inicio del servidor en el puerto fijo 1420.
- Build de produccion.
- Inicio de Tauri y carga de assets.
- Preview de imagen, Markdown y audio.

## Fase 3. Vite 6

Estado: completada y validada. Vite 6.4.3, build y smoke test Tauri correctos.

Cambios:

- Subir Vite 5 a Vite 6.
- Alinear el plugin React.
- Revisar warnings y opciones retiradas del major.

Donde probar:

- Mismo recorrido de la fase 2.
- Recarga durante desarrollo.
- Consola de Vite y consola del WebView.

## Fase 4. Vite 7

Estado: completada y validada. Vite 7.3.5, build y smoke test Tauri correctos.

Cambios:

- Subir Vite 6 a Vite 7.
- Alinear el plugin React.
- Confirmar Node.js 20.19 o superior antes de instalar.
- Revisar el nuevo browser target por defecto.

Donde probar:

- Build y arranque Tauri.
- Renderizado visual completo.
- Assets locales mediante el protocolo Tauri.

## Fase 5. Vite 8

Estado: completada y validada. Vite 8.0.16, plugin React 6.0.2, build y smoke test Tauri correctos.

Cambios:

- Evaluar y subir Vite 7 a Vite 8.
- Alinear el plugin React.
- Revisar la migracion de esbuild/Rollup a Rolldown/Oxc.
- No mezclar esta fase con TypeScript 6.
- Mantener la configuracion actual: no usa opciones ni plugins incompatibles con Rolldown.

Donde probar:

- Build limpio y comparacion del output.
- Servidor de desarrollo y recarga.
- Smoke test Tauri completo.
- Consola sin warnings del bundler.

## Fase 6. TypeScript 6

Estado: completada y validada. TypeScript 6.0.3, build y smoke test Tauri correctos.

Cambios:

- Subir TypeScript 5.9.3 a TypeScript 6.x estable.
- Resolver opciones retiradas y nuevos errores de tipos.
- Mantener sin cambios las dependencias de runtime.

Donde probar:

- Build completo.
- Smoke test Tauri completo.
- Menu contextual, referencias React y APIs Tauri.

## Criterio de exito

- TypeScript, Vite y el plugin React quedan alineados en versiones modernas compatibles.
- No hay errores de TypeScript, Vite ni peer dependencies.
- El puerto 1420 y la integracion de Tauri siguen funcionando.
- Build y smoke test Tauri son correctos en cada checkpoint.
- No se introducen regresiones visuales o funcionales.

## Referencias

- https://vite.dev/guide/migration
- https://www.typescriptlang.org/docs/
