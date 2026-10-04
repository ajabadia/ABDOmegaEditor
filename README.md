# ABDSynths — Workspace raíz

Raíz del **pnpm workspace** de la suite de sintetizadores ABDSynths y archivo
de la historia de **ABDOmegaEditor** (deprecado, sucesor: **ABDOmegaUnified**).

> Este repo NO es el repo de ningún proyecto activo: cada proyecto tiene su
> propio repositorio en `github.com/ajabadia/<Proyecto>` (ver mapa abajo).

## Rol de este repo

1. **Workspace pnpm** — `package.json`, `pnpm-workspace.yaml` y `pnpm-lock.yaml`
   compartidos por los paquetes web de la suite:

   | Paquete | Repo GitHub |
   |---|---|
   | `ABDSharedAssets` | [ajabadia/ABDSharedAssets](https://github.com/ajabadia/ABDSharedAssets) |
   | `ABDSharedCode/MidiKeyboard` | [ajabadia/ABDSharedCode](https://github.com/ajabadia/ABDSharedCode) |
   | `ABDMS2000` | [ajabadia/ABDMS2000](https://github.com/ajabadia/ABDMS2000) |
   | `ABDCZ101` | [ajabadia/ABDCZ101](https://github.com/ajabadia/ABDCZ101) |
   | `ABDEep` | [ajabadia/ABDEep](https://github.com/ajabadia/ABDEep) |

   `ABDBankManager` NO es miembro: es él mismo un workspace pnpm interno
   (`packages/{core,contracts,adapters,ui}`) y pnpm no soporta workspaces
   anidados. Su core C++ se integra por CMake
   (`add_subdirectory` / FetchContent, tag `v0.3.0-lib`).

2. **Archivo de ABDOmegaEditor** — el editor fue deprecado en favor de
   ABDOmegaUnified. Su working tree vive en `_Deprecados/ABDOmegaEditor/` y su
   historia preservada en
   [ajabadia/ABDOmegaEditor](https://github.com/ajabadia/ABDOmegaEditor).

## Ramas de este repo

El remoto `ajabadia/ABDOmegaEditor` contiene **tres historias distintas**, cada
una con su propia raíz. La rama local de este workspace es `workspace-history`
y hace upstream a `origin/workspace-history`.

| Rama (local y remota) | Raíz | Commits | Contenido |
|---|---|---|---|
| `workspace-history` **(la de este repo)** | `212c0ec` | 60 | Historia del workspace: el editor mientras vivía aquí, y desde `92c6c96` el workspace pnpm tal y como está hoy. **Rama activa.** |
| `master` | `212c0ec` | 23 | Historia del editor standalone. Se bifurca de `workspace-history` en `6852b1d` y termina en `90b8e48` (2026-06-18). **Congelada.** |
| `main` (default en GitHub) | `e88cb04` | 15 | OMEGA Manifest Editor, historia standalone **sin ancestro común** con las otras dos. **Congelada.** |

Notas:

- `master` y `workspace-history` comparten raíz y las primeras 23 confirmaciones;
  se separaron en `6852b1d`. `main` es una raíz totalmente aparte (`e88cb04`,
  "Initial commit: Standalone OMEGA Manifest Editor").
- La rama local se llama `workspace-history` (antes `master`, nombre que en el
  remoto designaba otra historia y hacía que `git status` contara commits de más).
- La `master` remota fue reescrita por fuerza el 2026-09-18:
  `ba96a67 → 90b8e48`. Ese `ba96a67` **no era historia del editor**: era el
  commit raíz de `@abdsynths/midi-keyb` (el repo
  [ajabadia/ABDMIDIKeyb](https://github.com/ajabadia/ABDMIDIKeyb)), empujado por
  error a esta rama. Sigue íntegro como `master` de su propio repo, así que el
  force-push no perdió trabajo.
- La rama por defecto del repo en GitHub es `main`, que **no** es la rama del
  workspace. Al abrir el repo hay que ir a `workspace-history`.

## Mapa de repos de la suite

| Proyecto | Repo GitHub | Notas |
|---|---|---|
| ABDAudioLab | [ajabadia/ABDAudioLab](https://github.com/ajabadia/ABDAudioLab) | Laboratorio de audio / NeuralAudio |
| ABDBankManager | [ajabadia/ABDBankManager](https://github.com/ajabadia/ABDBankManager) | Gestor de bancos embebible (workspace interno) |
| ABDCZ101 | [ajabadia/ABDCZ101](https://github.com/ajabadia/ABDCZ101) | Clon Casio CZ-101 |
| ABDEep | [ajabadia/ABDEep](https://github.com/ajabadia/ABDEep) | Clon DeepMind 12 |
| ABDJUNiO601 | [ajabadia/ABDJUNiO601](https://github.com/ajabadia/ABDJUNiO601) | Clon Roland Juno-106 |
| ABDMS2000 | [ajabadia/ABDMS2000](https://github.com/ajabadia/ABDMS2000) | Clon Korg MS2000 (anfitrión del Bank Manager) |
| ABDNeural | [ajabadia/ABDNeural](https://github.com/ajabadia/ABDNeural) | Neural audio |
| ABDOmegaUnified | [ajabadia/ABDOmegaUnified](https://github.com/ajabadia/ABDOmegaUnified) | **Sucesor de ABDOmegaEditor** |
| ABDPro008 | — (repo pendiente/privado) | Sin `.git` local |
| ABDScope | [ajabadia/ABDScope](https://github.com/ajabadia/ABDScope) | Osciloscopio |
| ABDSharedAssets | [ajabadia/ABDSharedAssets](https://github.com/ajabadia/ABDSharedAssets) | Assets/contratos compartidos (junctions) |
| ABDSharedCode | [ajabadia/ABDSharedCode](https://github.com/ajabadia/ABDSharedCode) | SynthCore (`abd::synth`), MidiKeyboard, WebView2Bridge… |
| ABDSynthsWeb | [ajabadia/ABDSynthWeb](https://github.com/ajabadia/ABDSynthWeb) | Web pública |
| ABDMIDIKeyb (archivado) | [ajabadia/ABDMIDIKeyb](https://github.com/ajabadia/ABDMIDIKeyb) | Teclado web standalone (`@abdsynths/midi-keyb`); el código vivo está en `ABDSharedCode/MidiKeyboard` |

> **ABDSuite** (`github.com/ajabadia/ABDSuite`) no pertenece a esta suite:
> es el monorepo SaaS multi-tenant (Turborepo) de la otra familia de proyectos ABD.

## Carpetas de archivo (excluidas de git)

Sin copia en GitHub — respaldo manual (disco externo) bajo tu responsabilidad:

| Carpeta | Contenido |
|---|---|
| `_Deprecados/` | ABDOmegaEditor, ABDOmega, ABDOmega plugins, ABDMIDIKeyb_old_backup, ABDEEP-1/2, ABDCZ101-main… |
| `_backups/` | Archivos `.zip` / `.rar` de la suite |
| `_RESOURCES/` | Material de referencia: synthClones, IA A TOPE, ui_componants… |

## Comandos habituales

```bash
pnpm install                          # instalar deps de todos los paquetes del workspace
pnpm -r <script>                      # ejecutar un script en todos los paquetes
git push                              # la rama local ya hace upstream a origin/workspace-history
node --test tools/auditar_ignore_oculto.test.mjs       # 33 tests
node --test tools/auditar_eol.test.mjs                 # 57 tests
node --test tools/auditar_justificacion_crlf.test.mjs  # 28 tests
node --test tools/auditar_texto.test.mjs               # 24 tests

node tools/auditar_ignore_oculto.mjs        # que ningun fichero trackeado este tapado por .gitignore
node tools/auditar_eol.mjs                  # que ningun fichero incumpla la regla eol que declara
node tools/auditar_justificacion_crlf.mjs   # que ninguna regla eol=crlf entre sin su porque
node tools/auditar_tamano.mjs               # que la suite no se haya encogido en silencio
node tools/auditar_texto.mjs                # que en tools/ no haya bytes invisibles ni caracteres raros
```

Los cinco se ejecutan tambien en cada push, en
[.github/workflows/guards.yml](.github/workflows/guards.yml), que corre en
Linux. No es un duplicado por si acaso: hay diferencias que en Windows no se
ven. La maquina de desarrollo tiene `core.ignorecase=true`, asi que el
emparejamiento de `.gitignore` no distingue de caja y una regla como
`!/scripts/` exime un directorio que se llame `SCRIPTS/`. En Linux esa regla
no exime nada y el guard lo ve. Por eso las reglas de exencion que dependen
de la caja llevan corchetes, y por eso un guard que pasa en local puede estar
rojo en CI.
