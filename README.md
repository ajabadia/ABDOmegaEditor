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
   historia completa está preservada en
   [ajabadia/ABDOmegaEditor](https://github.com/ajabadia/ABDOmegaEditor):

   | Rama | Contenido |
   |---|---|
   | `main` | Historia standalone del editor (congelada en 2026-06-18) |
   | `master` | Historia standalone alternativa |
   | `workspace-history` | Historia del editor tal y como vivía en este workspace (incluye los últimos commits de la era deprecada, hasta 2026-09-18) |

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
| ABDMIDIKeyb (archivado) | [ajabadia/ABDMIDIKeyb](https://github.com/ajabadia/ABDMIDIKeyb) | Teclado web standalone; el código vivo está en `ABDSharedCode/MidiKeyboard` |

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
pnpm install                     # instalar deps de todos los paquetes del workspace
pnpm -r <script>                 # ejecutar un script en todos los paquetes
git push origin master:workspace-history   # sincronizar la rama de archivo del editor
```
