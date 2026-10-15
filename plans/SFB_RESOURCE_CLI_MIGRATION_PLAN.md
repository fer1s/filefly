# SFB Resource CLI Migration Plan

Plan creado el 23 de julio de 2026.

Estado: primera entrega implementada; pendiente de build/tests y confirmación runtime por el
desarrollador.

## Objetivo

Dar a `sfb` una gramática estable y descubrible, inspirada en las CLIs orientadas a recursos:

```text
sfb <verbo> <recurso> [objetivo ...] [--opciones]
```

La migración no reemplaza los cores de filesystem ni duplica operaciones. Los comandos nuevos y
los nombres planos existentes resuelven al mismo ejecutor registrado en `src-tauri/src/bin/sfb.rs`.

## Contratos

- Los comandos actuales (`list`, `tags-get`, `smb-mounts`, `ui-state`, etc.) siguen funcionando.
- La salida conserva el envelope JSON `{ "ok", "data" | "error" }` y los exit codes actuales.
- Los argumentos con nombre siguen siendo válidos; la forma nueva puede aceptar objetivos
  posicionales definidos explícitamente por cada operación.
- `schema`, `help`, `api-resources` y `explain` se generan desde el mismo registro.
- `delete entry` sigue siendo permanente y exige `--force`; `trash entry` es la operación
  reversible.
- Las operaciones UI continúan indicando que requieren la aplicación/control socket.
- Las limitaciones de plataforma permanecen explícitas.

## Primera entrega

1. Añadir un mapa `OperationSpec` con `verb`, `resource`, aliases, argumentos posicionales, scope y
   seguridad sobre el registro existente; cada entrada apunta a un único ejecutor de `COMMANDS`.
2. Resolver primero `verbo + recurso` y después los nombres planos compatibles.
3. Añadir aliases de argumentos donde aclaren la intención (`--to`, `--values`, `--name`).
4. Enriquecer `schema` con la forma canónica y los metadatos operativos.
5. Añadir:
   - `sfb api-resources`;
   - `sfb explain <resource>`;
   - `sfb explain <verb> <resource>`;
   - ayuda agrupada por recursos.
6. Documentar la sintaxis y una tabla de equivalencias en `README.md`.

## Mapa canónico

| Comando existente | Forma verbo + recurso                        |
| ----------------- | -------------------------------------------- |
| `list`            | `get entries <path>`                         |
| `info`            | `get entry <path>`                           |
| `search`          | `find entries <path> --name <query>`         |
| `typeahead`       | `match entry <path> --query <prefix>`        |
| `dir-size`        | `get size <path>`                            |
| `recents`         | `get recents`                                |
| `copy`            | `copy entry <source> --to <dest-dir>`        |
| `compress`        | `create archive <source> --to <dest-dir>`    |
| `extract`         | `extract archive <archive> --to <dest-dir>`  |
| `move`            | `move entry <source> --to <dest-dir>`        |
| `rename`          | `rename entry <path> --name <name>`          |
| `mkdir`           | `create directory <parent>`                  |
| `trash`           | `trash entry <path>`                         |
| `restore`         | `restore entry <path>`                       |
| `delete`          | `delete entry <path> --force`                |
| `empty-trash`     | `empty trash --force`                        |
| `tags-get`        | `get entry-tags <path>`                      |
| `tags-set`        | `set entry-tags <path> --values <json>`      |
| `tags-find`       | `find tagged <tag>`                          |
| `tags-list`       | `get tags`                                   |
| `sftp-list`       | `get connections`                            |
| `sftp-add`        | `create connection ...`                      |
| `sftp-remove`     | `delete connection <id>`                     |
| `smb-diagnose`    | `diagnose share <host> [share]`              |
| `smb-mounts`      | `get mounts`                                 |
| `smb-shares`      | `get shares <host>`                          |
| `smb-connect`     | `connect share <host> <share>`               |
| `smb-save`        | `create share <host> <share>`                |
| `ui-state`        | `get app`                                    |
| `ui-windows`      | `get windows`                                |
| `ui-preview`      | `open preview <path>`                        |
| `ui-properties`   | `open properties <path>`                     |
| `ui-navigate`     | `navigate current-tab <path>`                |
| `ui-open-window`  | `create window <path>`                       |
| `ui-new-tab`      | `create tab [path]`                          |
| `ui-close-tab`    | `close tab [--id <id>                        | --index <index>]` |
| `ui-move-tab`     | `move tab --from <index> --to <index>`       |
| `ui-probe`        | `diagnose ui [--x ... --y ... --target ...]` |

## Fuera de esta entrega

- Cambiar el formato de salida predeterminado o añadir renderizado table/jsonl.
- Introducir manifests declarativos o un `apply` artificial donde no existe desired state.
- Unificar operaciones locales, SFTP y SMB bajo un dispatcher nuevo de URIs.
- Eliminar aliases antiguos.
- Cambiar los cores de filesystem o el protocolo del control socket.

Esas ampliaciones deben partir de este contrato una vez validada la ergonomía de la primera
entrega.
