# Keybindings Plan (atajos configurables)

## Objetivo

Pasar de atajos de teclado hardcodeados a un **keymap central**: un mapeo `accion -> tecla(s)` del que salen todos los atajos. A futuro ese mapeo sera configurable por el usuario (overrides persistidos), pero el diseno se introduce sin cambiar el comportamiento actual.

Plan creado el 20 de junio de 2026. Estado global: pendiente (no implementado; los atajos siguen hardcodeados a proposito).

## Inventario actual (hardcodeado)

| Accion                          | Tecla                       | Scope     | Donde                            |
| ------------------------------- | --------------------------- | --------- | -------------------------------- |
| Mover seleccion derecha         | ArrowRight                  | directory | `Directory.tsx` nav effect       |
| Mover seleccion izquierda       | ArrowLeft                   | directory | `Directory.tsx` nav effect       |
| Mover seleccion abajo           | ArrowDown                   | directory | `Directory.tsx` nav effect       |
| Mover seleccion arriba          | ArrowUp                     | directory | `Directory.tsx` nav effect       |
| Abrir item                      | Enter                       | directory | `Directory.tsx` nav effect       |
| Limpiar seleccion               | Escape                      | directory | `Directory.tsx` nav effect       |
| Buscar por letra (type-to-find) | caracteres imprimibles      | directory | `Directory.tsx` nav effect       |
| Copiar                          | Cmd/Ctrl + C                | directory | `Directory.tsx` shortcuts effect |
| Cortar                          | Cmd/Ctrl + X                | directory | `Directory.tsx` shortcuts effect |
| Pegar                           | Cmd/Ctrl + V                | directory | `Directory.tsx` shortcuts effect |
| Borrar a Papelera               | Cmd/Ctrl + Backspace/Delete | directory | `Directory.tsx` shortcuts effect |
| Preview anterior                | ArrowLeft                   | preview   | `Preview.tsx`                    |
| Preview siguiente               | ArrowRight                  | preview   | `Preview.tsx`                    |
| Cerrar preview                  | Escape                      | preview   | `Preview.tsx`                    |

Notas:

- ArrowLeft/Right y Escape se reutilizan en dos scopes (directory vs preview). Hoy se resuelve porque el nav de directory hace `return` cuando el preview esta abierto y el preview maneja las suyas. El keymap debe modelar esto con **scopes**.
- Los caracteres imprimibles (type-to-find) NO son atajos: no deben entrar al keymap, se quedan como caso aparte y siempre tienen prioridad mas baja que un atajo con modificador.

## Diseno propuesto

### 1. Tipos

```ts
type Shortcut = {
  key: string; // valor de KeyboardEvent.key normalizado, p.ej. 'c', 'ArrowLeft', 'Backspace'
  mod?: boolean; // Cmd en macOS / Ctrl en otros (se resuelve por plataforma)
  shift?: boolean;
  alt?: boolean;
};

type ActionId =
  | "nav.left"
  | "nav.right"
  | "nav.up"
  | "nav.down"
  | "item.open"
  | "selection.clear"
  | "clipboard.copy"
  | "clipboard.cut"
  | "clipboard.paste"
  | "fs.delete"
  | "preview.prev"
  | "preview.next"
  | "preview.close";

type Scope = "directory" | "preview";

type Keymap = Record<ActionId, Shortcut[]>; // varias combinaciones por accion (p.ej. Backspace y Delete)
```

### 2. Keymap por defecto

Una constante `DEFAULT_KEYMAP: Keymap` que reproduce exactamente la tabla de arriba. Unica fuente de verdad de los defaults.

### 3. Matcher

```ts
// Resuelve el modificador segun plataforma (Cmd en mac, Ctrl en el resto).
const isMod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey

const matches = (e: KeyboardEvent, s: Shortcut) =>
   e.key.toLowerCase() === s.key.toLowerCase() &&
   !!s.mod === isMod(e) &&
   !!s.shift === e.shiftKey &&
   !!s.alt === e.altKey

// Dado un evento y un scope, devuelve la accion (o null).
const resolveAction = (e: KeyboardEvent, keymap: Keymap, scope: Scope): ActionId | null
```

`resolveAction` filtra por las acciones validas en el scope activo, evitando el solape ArrowLeft directory/preview.

### 4. Registro de handlers

Cada componente registra el handler de cada `ActionId` que le compete:

```ts
const actions: Partial<Record<ActionId, () => void>> = {
  "clipboard.copy": () => copyTargets(selectedIDs),
  "fs.delete": () => deleteTargets(selectedIDs),
  // ...
};
```

Un solo listener de `keydown` por scope hace: `const a = resolveAction(e, keymap, scope); if (a && actions[a]) { e.preventDefault(); actions[a]() }`. El type-to-find se evalua despues, solo si no hubo accion y la tecla es imprimible sin modificador.

### 5. Hook reutilizable

```ts
useKeybindings(scope: Scope, actions, { enabled }): void
```

Encapsula el listener, el matcher y la guarda de inputs (ignorar si el foco esta en INPUT/TEXTAREA). Sustituye a los effects de teclado actuales.

## Fases

1. **Tipos + DEFAULT_KEYMAP + matcher** en `src/keybindings.ts`. Sin tocar componentes (no cambia comportamiento).
2. **Refactor de `Directory.tsx`** para usar `resolveAction` + tabla de actions, manteniendo type-to-find aparte. Verificar paridad de todos los atajos.
3. **Refactor de `Preview.tsx`** al mismo esquema (scope `preview`).
4. **Overrides de usuario**: cargar un keymap parcial desde `localStorage` y mergear sobre `DEFAULT_KEYMAP`. API `getKeymap()/setBinding(action, shortcut)`.
5. **(Futuro) UI de configuracion** para reasignar teclas, con deteccion de conflictos y boton "restaurar por defecto". Persistencia: `localStorage` ahora; mas adelante archivo de config via `tauri-plugin-fs`/store si se quiere sincronizar.

## Consideraciones

- **Cross-platform**: guardar el modificador como `mod` abstracto; resolver a Cmd/Ctrl en runtime. No hardcodear `metaKey`.
- **Normalizacion**: comparar `e.key` en minusculas; cuidado con `key` dependiente de layout (considerar `e.code` para letras si surge problema con teclados no-QWERTY).
- **Conflictos**: al permitir overrides, validar que una combinacion no quede asignada a dos acciones del mismo scope.
- **Reservadas del SO/WebView**: evitar overrides que pisen atajos del sistema; avisar en la UI.
- **type-to-find**: nunca en el keymap; prioridad mas baja; solo caracteres imprimibles sin modificador.
- **Scopes**: el preview, cuando esta abierto, tiene prioridad y consume ArrowLeft/Right/Escape antes que el directory.

## Criterio de exito

- Todos los atajos actuales salen de `DEFAULT_KEYMAP` (cero `e.key === ...` sueltos en componentes salvo type-to-find).
- Cambiar un atajo es editar el mapa (o, a futuro, la config del usuario), sin tocar la logica de cada accion.
- Comportamiento identico al actual tras el refactor (fases 1-3).
