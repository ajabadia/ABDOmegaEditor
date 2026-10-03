// Audita los repos de la suite ABDSynths buscando una sola cosa: FICHEROS
// TRACKEADOS que una regla de `.gitignore` dice que no deberian estar ahi.
//
//   node tools/auditar_ignore_oculto.mjs
//
// Salida:
//   0  ningun repo ha superado los ficheros tapados que ya tenia (linea base),
//      ni en la rama que esta desplegada ni en ninguna de las demas
//   1  un repo tiene MAS ficheros trackeados tapados de los que tenia, tiene
//      tapados y no estaba en la linea base, o se han auditado menos ramas de las
//      que deben
//   2  no se pudo ni siquiera leer uno de los repos (que es otro problema)
//
// La linea base esta mas abajo, con el detalle de que regla tapa cada bloque.
// `node tools/auditar_ignore_oculto.mjs --linea-base` reimprime el numero actual
// de cada repo para rehacerla a mano.
//
// MIRA DOS COSAS, Y SOLO UNA ES LA QUE DICE EL NOMBRE DEL GUARD. La primera es la
// rama que esta desplegada, que es lo que hacia `auditaRepo` y lo que hacia el
// guard desde el principio. La segunda son TODAS las demas ramas del repo, que no
// se miraban y donde esta el 3.951 que hay en ABDJUNiO601. El techo es uno solo
// por repo y es el PEOR caso entre las dos, y la seccion de las ramas, mas abajo,
// explica como se le pregunta a git por un arbol que nadie ha comprobado.
//
// ─────────────────────────────────────────────────────────────────────────
// EL PROBLEMA, ENUNCIADO PARA NO DEJAR PASAR NADA
//
// Una regla de `.gitignore` no le hace nada a un fichero que ya esta trackeado:
// git lo dice asi de claro, y por eso la combinacion "fichero trackeado + regla
// que lo tapa" parece inocua. Es inocua HASTA que alguien corre `git rm --cached`
// de ese fichero, y a partir de ahi el fichero sigue en disco, sigue siendo
// trabajo de alguien, y ha desaparecido del `git status` para siempre. Nadie lo
// va a notar, porque no hay ningun sitio donde se note: no aparece en el
// `git status`, no aparece en el diff, y el unico rastro es que un fichero que
// alguien escribio ya no esta.
//
// Ocurre en este suite. En ABDSharedCode estaba `Certification/__pycache__/
// CertificationAuditor.cpython-311.pyc` trackeado mientras el `.gitignore` del
// propio repo prohibia `__pycache__/` y `*.pyc`: el fichero entro antes de que
// existiera la regla, y `.gitignore` no mira el historial. Se ha visto igual con
// un `.gitignore` recien escrito que tapa el `.gitattributes` entero, o con un
// `node_modules/` que se cuela en un repo donde hay codigo.
//
// ─────────────────────────────────────────────────────────────────────────
// LA TRAMPA DEL `check-ignore`, Y POR QUE ESTE GUARD NO PODRIA EXISTIR SIN ELLA
//
// El comando obvio no sirve:
//
//     git ls-files | git check-ignore -v --stdin      NO DICE NADA
//
// Por defecto `check-ignore` MIRA EL INDICE, y un fichero que esta en el indice
// se salta antes de comparar nada con las reglas. O sea: la herramienta que
// tiene que encontrar el problema es, por construccion, incapable de verlo, y
// devuelve verde siempre. Es el peor tipo de fallo: uno que no se puede
// distinguir de un resultado correcto.
//
// Con `--no-index` si que sale, y con `-v` ademas dice QUE REGLA tapa cada
// fichero, que es lo que hace el diagnostico util ("lo tapa la linea 47 de
// `.gitignore`") en vez de un "hay un problema" sin destino.
//
// LA SEGUNDA TRAMPA, MAS SENCILLA Y MAS BARATA DE COMETER. Con `-z`, el `--stdin`
// tambien pasa a Separar por NUL: los `\n` dejan de ser separadores y se
// convierten en parte de la ruta. Pipear `git ls-files` (que separa con `\n`)
// hacia `git check-ignore -z` no da error: da una lista VACIA, que es otra forma
// de verde falso. Con `-z` hay que pipear `git ls-files -z`.

// ─────────────────────────────────────────────────────────────────────────
// LA CAJA, QUE HACE QUE ESTE GUARD DIGA UNA COSA U OTRA SEGUN DONDE CORRA
//
// `check-ignore` no compara rutas: las compara con `core.ignorecase` de la
// maquina, que en Windows es `true` y en Linux es `false`. La misma suite, con el
// mismo `.gitignore` y los mismos ficheros, da dos respuestas distintas, y no es
// una teoria: en ABDCZ101 la regla `*.syx` tapa 194 ficheros como
// `1SOUNDS.SYX` en Windows y no tapa ninguno en Linux. El guard ve 314 tapados
// en la maquina y 120 en el runner, y el informe del runner lo cuenta como una
// MEJORA — "ABDCZ101: ha BAJADO de 314 a 120" —, que es exactamente lo que no
// es. Una bajada que solo la ha hecho el sistema de ficheros.
//
// El otro sentido duele mas, porque es el que no se ve hasta que CI lo dice. Una
// negacion con mayusculas es MAS ESTRECHA en Linux que en Windows: con `*.md` y
// `!README.md`, el fichero `Readme.md` esta visible en Windows, porque la
// negacion lo alcanza, y esta TAPADO en Linux, porque el unico patron que lo
// alcanza es `*.md`. En la maquina parece limpio y en el runner es deuda.
//
// Por eso `auditaRepo` y `auditaSuite` aceptan `cajaSensible: true`, que pasa
// `-c core.ignorecase=false` y devuelve la respuesta que daria Linux. No cambia
// lo que el guard decide por defecto, que es lo que hace el runner: lo que
// permite es plantear en local la pregunta que hasta ahora solo se podia hacer
// esperando a CI.

import { execFileSync } from 'node:child_process';
// La puerta de las ramas. Vive fuera porque la comparten este guard y el de EOL, y
// porque `auditar_eol` ya importa de aqui: si este importase de ahi, los dos se
// importarian mutuamente. La cabecera de `puertas_de_ramas.mjs` lo explica entero.
import { auditableDe, diagnosticoDeRamas, formateaDiagnostico, ramasDeRepo,
  resumenDeRamas } from './puertas_de_ramas.mjs';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync,
  rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

/**
 * La raiz de la suite, deducida de donde esta ESTE fichero y no escrita a mano.
 *
 * Sube hasta la carpeta que contiene `ABDSharedAssets`, que es el ancla que usa
 * tambien `tools/auditar_hermanos.py`: si un dia se renombra, los dos scripts
 * avisan a la vez en vez de uno por su cuenta.
 */
export function raizDeSuite (desde = aqui) {
  let d = desde;

  while (d && d !== dirname(d)) {
    if (existsSync(join(d, 'ABDSharedAssets'))) return d;
    d = dirname(d);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE PURA: lee texto, devuelve estructuras. Nada toca el disco ni git,
// y por eso el test puede darle la salida de un comando inventada.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Los campos de `git check-ignore --no-index -v -z`, que vienen de cuatro en
 * cuatro y todos terminados en NUL: fuente, linea, patron, ruta.
 *
 * Sin `-v` solo vendrian las rutas, y con -v pero sin -z seria
 * `fuente:linea:patron<TAB>ruta`. El `-z` de las dos cosas a la vez es lo que
 * hace que un nombre con espacios o con acentos no rompa el parseo, y un nombre
 * con espacios no es exotico: este suite tiene `Nuevo Documento de texto.txt` y
 * `Factory Banks V1.1.2`.
 *
 * @param {string} salida la salida cruda del comando.
 * @returns {{fuente: string, linea: string, patron: string, ruta: string}[]}
 */
export function camposDeCheckIgnore (salida) {
  const trozos = String(salida).split('\0').filter((t) => t !== '');

  if (trozos.length % 4 !== 0) {
    throw new Error('`git check-ignore -z -v` devolvio ' + trozos.length + ' campos, que no son '
      + 'multiplos de cuatro: se esperaba fuente/linea/patron/ruta por cada fichero. Sin esto, '
      + 'un parseo roto devolveria una lista vacia, que es un guard que pasa sin mirar.');
  }

  const entradas = [];

  for (let i = 0; i < trozos.length; i += 4) {
    entradas.push({
      fuente: trozos[i],
      linea: trozos[i + 1],
      patron: trozos[i + 2],
      ruta: trozos[i + 3]
    });
  }

  return entradas;
}

/**
 * Los ficheros trackeados que una regla de ignore tapa.
 *
 * Se cruzan las dos listas por ruta, y no al reves: el comando dice QUE reglas
 * tapan que rutas, pero solo de las que se le pasaron, asi que la interseccion se
 * hace sobre los trackeados. Un fichero que no este en `trackeados` no aparece
 * en el resultado aunque una regla lo tape, que es lo correcto: si no esta
 * trackeado, no hay trabajo que esconder.
 *
 * @param {string[]} trackeados rutas que git tiene versionadas.
 * @param {{fuente: string, linea: string, patron: string, ruta: string}[]} campos
 * @returns {{ruta: string, regla: string}[]} con la regla que tapa cada una.
 */
export function tapaLosTrackeados (trackeados, campos) {
  const dentro = new Set(trackeados || []);

  return (campos || [])
    .filter((c) => dentro.has(c.ruta))
    // UNA NEGACION NO TAPA NADA: `!patron` saca de la lista de ignorados lo que
    // el patron anterior habia metido. `check-ignore -v` la imprime igual, con su
    // `!` delante, y contarla como un tapado invierte el sentido de la regla.
    //
    // Esto no es un detalle de los repos de aqui: en ABDJUNiO601 y ABDOmegaUnified
    // hay `.gitignore` que excluyen casi todo y vuelven a incluir con `!src/**`,
    // `!ui/**` y compañía. Sin este filtro el guard(find 8.087 tapados y solo
    // informational un puñado, porque los `!` son al reves: el guard no puede ser
    // el que decide, y su lista tiene que ser fidedigna o no sirve de puerta.
    .filter((c) => !c.patron.startsWith('!'))
    .map((c) => ({ ruta: c.ruta, regla: c.fuente + ':' + c.linea + ' ' + c.patron }));
}

/**
 * Una linea por repos, y el total. Es lo que imprime el runner, asi que vive
 * aqui para que el test pueda comprobar que el informe DICE lo que encuentra, y
 * no solo que el numero cuadre.
 */
export function formatea (porRepo) {
  const lineas = [];
  const tapados = porRepo.flatMap((r) => r.tapados.map((t) => ({ repo: r.repo, ...t })));

  lineas.push('repos revisados: ' + porRepo.length);
  lineas.push('ficheros trackeados: ' +
    porRepo.reduce((a, r) => a + r.trackeados, 0));

  if (tapados.length === 0) {
    lineas.push('');
    lineas.push('ningun fichero trackeado esta tapado por una regla de .gitignore.');
    return lineas.join('\n');
  }

  lineas.push('');
  lineas.push('TRACKEADOS Y TAPADOS: si alguien corre `git rm --cached` sobre estos,');
  lineas.push('desaparecen del `git status` sin dejar rastro:');
  for (const t of tapados) {
    lineas.push('  ' + t.repo + '/' + t.ruta + '   <- ' + t.regla);
  }

  return lineas.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// LA DEUDA YA EXISTENTE, Y POR QUE EL GUARD NO ES "CERO TAPADOS" SINO UN
// TRACKER QUE NO PUEDE SUBIR
//
// El guard, tal y como se pidio, Busca ficheros TRACKEADOS que una regla de
// ignore tapa. Al enchufarlo a la suite entera encuentra 4.431, y ninguno es un
// error de este guard: es deuda de siempre de repos en los que no se ha tocado
// nada. Reparto, con la regla que tapa cada bloque, porque un numero suelto no
// dice nada dentro de seis meses:
//
//   ABDAudioLab       17   *.png (14), exports/ (2), __pycache__/ (1)
//   ABDBankManager  107   fixtures/
//   ABDCZ101         314   *.syx (233), *.txt (40), bundle_code/ (38), *.zip (3)
//   ABDJUNiO601    3.951   /CMake/ (3.947), exports/ (3), .idea/ (1)
//   ABDMS2000        42   DOCS/ (41), implementation_plan*.md (1)
//
// Hay tres salidas honestas y todas tienen un coste. Arreglar los cinco repos es
// tocar trabajo de otros hilos, y varias de esas reglas (`*.syx`, `fixtures/`)
// probablemente estan a proposito: el fichero se trackeo antes de que existiera
// la regla. Dejar el test en rojo rompe cualquier suite que se corra. Y poner el
// guard en modo "solo informa" es lo mas tentador y lo peor: un guard que avisa
// sin puerta deja de avisar.
//
// Lo que queda es un RATCHET, y es lo unico que no necesita permiso para nada:
// la linea base de abajo es el techo, no el suelo. Hoy el guard esta en verde
// porque nadie ha EMPEORADO nada, y en cuanto alguien añada un `*.png` mas al
// `.gitignore` de ABDAudioLab, el guard se pone rojo diciendo por quien y en que
// repos. Y si alguien arregla un repo, esto le dice que baje el numero.
//
// Que no sea "cero tapados" es una decision, no un atajo: queda escrito aqui
// para que dentro de un año se sepa que el numero se puede tocar a proposito y
// solo a proposito.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Repos que hoy tienen ficheros trackeados tapados, y cuantos.
 *
 * Se sube o se baja a mano, nunca solo. Para rehacerla con lo que hay ahora:
 *
 *   node tools/auditar_ignore_oculto.mjs --linea-base
 *
 * Que imprima el objeto entero, y pegarlo aqui, es deliberado: bajar la linea
 * base es una decision que se toma leyendo, no algo que le pase a alguien por
 * abrir el fichero.
 */
export const DEUDA_CONOCIDA = Object.freeze({
  ABDAudioLab: 17,
  ABDBankManager: 107,
  ABDCZ101: 314,
  ABDJUNiO601: 3951,
  ABDMS2000: 42,
  // Esta no estaba antes, y no por un cambio en el repo: estaba porque NO SE
  // MIRABA. ABDOmega vive en `_Deprecados/` y su rama desplegada no tiene nada
  // tapado, asi que su numero era 0 y de verdad lo era. En `origin/master` y en
  // `origin/feature/aseptic-rack-stabilization` tiene 4, y todos de la misma
  // regla `/*` de la linea 2, que se come el repo entero. El 4 es el peor caso
  // de todas sus ramas, que es lo que compara `comparaRamasConLineaBase`.
  ABDOmega: 4
});

/**
 * Como queda el estado medido respecto a la linea base.
 *
 * Solo hay tres salidas posibles y las tres dicen algo:
 *
 *   - `nuevo`:   un repo con tapados que no estaba en la linea base. Es el caso
 *                grave, porque significa deuda que nadie ha mirado nunca. Rojo.
 *   - `empeora`: el mismo repo con mas tapados que antes. Rojo.
 *   - `mejora`:  el mismo repo con menos. No es un problema: es un aviso de que
 *                la linea base esta alta y se puede bajar.
 *
 * Un repo con cero tapados que no esta en la linea base no aparece: es el
 * estado normal y el que se quiere.
 *
 * @param {{repo: string, tapados: {ruta: string, regla: string}[]}[]} porRepo
 * @param {Record<string, number>} base
 * @returns {{repo: string, antes: number, ahora: number, tipo: string}[]}
 */
export function comparaConLineaBase (porRepo, base = DEUDA_CONOCIDA) {
  const salida = [];

  for (const r of porRepo) {
    const ahora = r.tapados.length;
    const antes = base[r.repo];

    if (antes === undefined) {
      if (ahora > 0) salida.push({ repo: r.repo, antes: 0, ahora, tipo: 'nuevo' });
      continue;
    }

    if (ahora > antes) salida.push({ repo: r.repo, antes, ahora, tipo: 'empeora' });
    else if (ahora < antes) salida.push({ repo: r.repo, antes, ahora, tipo: 'mejora' });
  }

  return salida;
}

/** Los repos que han empeorado o aparecen con deuda por primera vez. */
export function empeoran (desviaciones) {
  return desviaciones.filter((d) => d.tipo !== 'mejora');
}

/** Las desviaciones contadas, para que el runner no tenga que saber contarlas. */
export function formateaDesviaciones (desviaciones, ambito = 'en la rama desplegada') {
  if (desviaciones.length === 0) {
    return 'linea base respetada: ningun repo tiene mas ficheros tapados de los que habia ('
      + ambito + ').';
  }

  return 'linea base (' + ambito + '):'
    + '\n'
    + desviaciones
      .map((d) => {
        const flecha = d.tipo === 'mejora'
          ? 'ha BAJADO de ' + d.antes + ' a ' + d.ahora + ' (puedes bajar la linea base)'
          : (d.tipo === 'nuevo'
            ? 'APARECE CON ' + d.ahora + ' y no estaba en la linea base'
            : 'ha SUBIDO de ' + d.antes + ' a ' + d.ahora + ' (+' + (d.ahora - d.antes) + ')');

        // Cuando la desviacion viene de una rama, el nombre de la rama es la
        // mitad del aviso: un repo que sube no se puede arreglar sin saber que
        // rama lo ha subido, y hay quince ramas por repo. Si el peor caso ha
        // salido de la rama DESPLEGADA no se pone nombre, porque el informe de
        // arriba ya ha dicho cuantos tiene y el nombre no anade nada.
        const donde = d.rama === undefined ? '' : ' @ ' + d.rama;

        return '  ' + d.repo + donde + ': ' + flecha;
      })
      .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE QUE HABLA CON GIT Y CON EL DISCO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Los repos de la suite: los que estan en disco con su `.git`.
 *
 * Se DESCUBREN, no se listan. `tools/auditar_hermanos.py` tiene una lista fija
 * de repos, y esa lista es la parte que se queda vieja: un repo nuevo no lo
 * audita nadie hasta que alguien se acuerda de anadirlo, y mientras tanto este
 * guard dira que lo ha revisado todo cuando solo ha mirado los que ya conocia.
 * Aqui la pregunta es "que hay en disco con .git", que no se queda vieja sola.
 *
 * Se baja dos niveles porque hay subrepos (`ABDSharedCode/MidiKeyboard`), y se
 * saltan `node_modules` y `.git`, que son la forma de gastar cinco minutos
 * recorriendo Dependencies.
 */
export function descubreRepos (raiz, profundidad = 2) {
  const vistos = [];

  const baja = (dir, nivel) => {
    let entradas;

    try {
      entradas = readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entrada of entradas) {
      if (!entrada.isDirectory()) continue;
      if (entrada.name === 'node_modules' || entrada.name === '.git') continue;

      const ruta = join(dir, entrada.name);

      if (existsSync(join(ruta, '.git'))) {
        vistos.push(ruta);
        continue;
      }

      if (nivel > 1) baja(ruta, nivel - 1);
    }
  };

  baja(raiz, profundidad);
  return vistos.sort();
}

/** Los repos de la suite con la raiz dentro, en el orden en que se recorren. */
export function reposDeSuite (raiz = raizDeSuite()) {
  if (raiz === null) return [];

  return [raiz, ...descubreRepos(raiz)];
}

/**
 * Un subcomando de git con la excepcion de `safe.directory` puesta, porque en
 * esta maquina los repos los creo otro usuario y sin eso git se niega a leerlos.
 *
 * La excepcion va en el comando, no en la configuracion global: cambiar el
 * equipo entero de maquina para que un guard funcione no se ve al leer el codigo.
 */
/**
 * Un subcomando de git, o un error que diga QUE repo y QUE subcomando.
 *
 * El envoltorio no es cosmology: un `spawnSync git ENOENT` a secas no dice si
 * fue el repo equivocado, el `git` que no esta en el PATH, o un typo en el
 * subcomando, y en un guard que mira quince repos cualquiera de las tres
 * cosas es un diagnostico inutil.
 */
function git (repo, args, opciones = {}) {
  try {
    return execFileSync('git', [
      '-c', 'safe.directory=' + repo.replace(/\\/g, '/').replace(/\/+$/, ''), ...args
    ], {
      cwd: repo,
      // `encoding: 'buffer'` NO es una codificacion valida para execFileSync en
      // Node 24: lanza ERR_UNKNOWN_ENCODING antes de que git llegue a existir.
      // Se leia como "devuelve bytes" y en realidad era un modo de fallo que
      // aparecio disfrazado de repositorio limpio.
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...opciones
    });
  } catch (e) {
    // Un fallo de spawn no tiene status, o lo tiene a null: las dos cosas
    // significan que git ni llego a ejecutarse, que es lo que hay que decir.
    if (e.status !== undefined && e.status !== null) throw e;

    const stderr = (e.stderr || '').toString().trim();
    const porQue = stderr === '' ? (e.message || String(e)) : stderr.split('\n')[0];

    throw new Error('`git ' + args.join(' ') + '` ni llego a ejecutarse en ' + repo + ': '
      + porQue);
  }
}

/**
 * Los ficheros trackeados y tapados de UN repo, con la regla que tapa cada uno.
 *
 * Los dos comandos van con `-z` y pipeados entre si, por lo dicho arriba: sin
 * `-z` en los dos lados, la lista sale vacia y el guard pasa sin mirar.
 *
 * `cajaSensible` fuerza `core.ignorecase=false`, que es lo que hace el runner de
 * Linux, para poder correr la misma auditoria con la respuesta que daria alla.
 * Ver la seccion de LA CAJA, mas abajo, para por que esto no es un detalle.
 *
 * @param {string} repo ruta absoluta del repositorio.
 * @param {{cajaSensible?: boolean}} opciones
 * @returns {{repo: string, trackeados: number, tapados: {ruta: string, regla: string}[]}}
 */
export function auditaRepo (repo, opciones = {}) {
  const nombre = repo.split(/[\\/]/).filter((p) => p !== '').pop() || repo;
  // Los DOS comandos reciben la misma cosa. No basta con `check-ignore`: si los
  // dos lados no hablan de la misma lista de rutas, la interseccion que hace
  // `tapaLosTrackeados` mezcla dos mundos y el resultado no es ni el de la
  // maquina ni el de Linux, sino uno que no existe.
  const antes = opciones.cajaSensible === true ? ['-c', 'core.ignorecase=false'] : [];
  const listados = git(repo, [...antes, 'ls-files', '-z']);
  const trackeados = listados.split('\0').filter((t) => t !== '');

  let crudos = '';

  try {
    crudos = git(repo, [...antes, 'check-ignore', '--no-index', '-v', '-z', '--stdin'],
      { input: listados });
  } catch (e) {
    // `git check-ignore` sale con 0 si encuentra alguno y con 1 si no encuentra
    // NINGUNO, que no es un error: es la respuesta. Cualquier otro fallo tiene
    // que loudar.
    //
    // Y AQUI ESTA EL PUNTO DEL QUE HAY QUE TENER CUIDADO. La primera version de
    // este catch decia `if (e.status > 1) throw`, lo que de paso hacia pasar un
    // fallo que NO tiene status —como un `spawn` que ni llega a ejecutar— como
    // si fuera "no hay nada tapado". Con eso, un error mio de codigo salia
    // como un repositorio limpio, que es el peor resultado que puede dar un
    // guard: verde y mentira. Solo el 1 DE VERDAD se convierte en lista vacia.
    if (e.status !== 1) {
      const stderr = (e.stderr || '').toString().trim();
      const porQue = stderr === '' ? (e.message || String(e)) : stderr.split('\n')[0];

      throw new Error('git check-ignore fallo en ' + repo + ' con codigo '
        + (e.status === undefined ? 'sin codigo (ni se llego a ejecutar)' : e.status)
        + ': ' + porQue);
    }
  }

  return {
    repo: nombre,
    trackeados: trackeados.length,
    tapados: tapaLosTrackeados(trackeados, camposDeCheckIgnore(crudos))
  };
}

/**
 * El informe completo de la suite.
 *
 * @param {string} raiz
 * @param {{cajaSensible?: boolean}} opciones se pasa entero a `auditaRepo`.
 */
export function auditaSuite (raiz = raizDeSuite(), opciones = {}) {
  if (raiz === null) {
    throw new Error('no encuentro la raiz de la suite: no hay ningun ABDSharedAssets por encima '
      + 'de ' + aqui);
  }

  return reposDeSuite(raiz).map((repo) => auditaRepo(repo, opciones));
}

/**
 * Lo que pide la linea de comandos, y nada mas.
 *
 * `--caja-sensible` es lo unico que hay: medir con la semantica de Linux desde
 * cualquier maquina, para que el numero que imprime el guard signifique lo mismo
 * en todas partes. Es un no-op en un runner de Linux, que es donde corre hoy, y
 * es lo que hace que el numero siga siendo comparable con la linea base cuando
 * alguien corre el guard en un Windows.
 *
 * Se lee aqui y no dentro de `auditaSuite` porque `process.argv` dentro de una
 * libreria es un disparo lateral: un `import` no deberia cambiar lo que hace un
 * `auditaSuite()`.
 *
 * @param {string[]} args argumentos de la linea de comandos, sin el node.
 * @returns {{cajaSensible: boolean}}
 */
export function opcionesDeConsola (args = process.argv.slice(2)) {
  return { cajaSensible: args.includes('--caja-sensible') };
}

// ─────────────────────────────────────────────────────────────────────────
// LAS RAMAS QUE NO SON LA QUE ESTA DESPLEGADA, Y POR QUE AQUI SI IMPORTA
//
// El guard de EOL ya mira las ramas, y cuando se hizo, la conclusion fue que no
// pasaba nada: cero incumplimientos en veintisiete ramas. Con el guard de
// `.gitignore` la conclusion es la contraria, y muy distinta:
//
//   ABDJUNiO601 @ origin/feature/fidelity-certified   3.951 tapados
//   ABDJUNiO601 @ origin/fix/webui-final-complete         81
//   ABDJUNiO601 @ origin/fix/webui-source-only           38
//   ABDJUNiO601 @ origin/feature/juno-vcf-upgrade        37
//   ABDOmega    @ origin/feature/aseptic-rack-...         4
//   ABDOmega    @ origin/master                           4
//   ABDOmega    @ origin/feat/oscilloscope-...            2
//
// De esos 3.951, la rama `main` no tiene NINGUNO. El `.gitignore` que los tapa es
// el de la rama, y en `main` ese fichero tiene otras reglas. O sea que el guard
// estaba mirando la rama equivocada sin que se notara, que es la forma mas
// comoda de tener un punto ciego.
//
// Y el caso de ABDOmega es el que mas duele, porque no es el mismo repo grande
// con mucho de todo: son cuatro ficheros, y no estaban en la linea base porque
// en ninguna rama desplegada hay deuda ninguna de ABDOmega. El numero de la
// linea base era 0 y de verdad lo era, para la rama que se miraba.
//
// ─────────────────────────────────────────────────────────────────────────
// COMO SE PREGUNTA A GIT POR UN ARBOL QUE NADIE HA COMPROBADO
//
// `check-ignore` NO tiene forma de leer las reglas de ignore de un arbol: las lee
// del arbol de trabajo, que es el de la rama desplegada. Sin `--source`, que es lo
// que hizo falta en el guard de EOL con `check-attr`, aqui no hay atajo.
//
// Reimplementar el matcher de `.gitignore` en JavaScript es justo lo que no hay
// que hacer: gitignore tiene negaciones, patrones anclados, `**`, reglas que solo
// aplican a directorios y la regla de que no se puede reincluir un fichero si su
// directorio padre esta excluido. Una reimplementacion parcial no da un numero
// distinto, da un numero RARO, y un guard que a veces se equivoca no vigila.
//
// Lo que se hace es dejar que sea GIT el que casa, y darle un sitio donde las
// reglas de la rama existan de verdad:
//
//   1. un repo de mentira, vacio, en un temporal;
//   2. dentro, los `.gitignore` de la rama, en sus rutas, sacados del ARBOL con
//      `git show <rama>:<ruta>` y no del disco;
//   3. la lista de ficheros de la rama por `--stdin`, como hace `auditaRepo`;
//   4. el mismo `check-ignore --no-index -v -z` y el mismo `camposDeCheckIgnore`
//      y el mismo `tapaLosTrackeados` que la rama desplegada.
//
// Que el resultado sea el de verdad esta medido, no supuesto: para
// `feature/fidelity-certified` este metodo devuelve 3.951 con el mismo desglose de
// reglas que el guard ve en la maquina con esa rama desplegada. Es el mismo numero
// por el mismo camino, que es lo unico que hace comparables las dos columnas.
//
// LO QUE NO HACE FALTA, Y SE MIDIO. Lo obvio seria montar tambien el esqueleto de
// directorios del arbol, para que `/CMake/` supiera que `CMake` es un directorio.
// Medido con y sin: los dos dan 3.951 con el mismo desglose, porque git no mira el
// disco para decidir si un patron con barra final casa, sino el patron. De ahi que
// no se monten, que son cuatrocientos y cincuenta directorios por rama y nada
// mas.
//
// LO QUE SI SE COPIA, Y POR QUE. El `.git/info/exclude` del repo de verdad, porque
// si uno escribiera ahi una regla, el repo de mentira no la veria y el numero
// saldria mas bajo que el real. Hoy ningun repo de la suite tiene nada ahi, asi que
// esto no cambia ningun numero; se hace para que el dia que alguien lo escriba, el
// guard no se quedecon la respuesta equivocada en silencio.
export function auditaArbol (repo, rama, opciones = {}) {
  const rutas = git(repo, ['ls-tree', '-r', '--full-tree', '--name-only', '-z', rama])
    .split('\0')
    // `ls-tree -r` sale con los arboles como `ruta/` si no se pide `-r`; con `-r`
    // tambien los cuelga al final, y no son ficheros.
    .filter((r) => r !== '' && !r.endsWith('/'));

  // Las reglas de la rama, y solo ellas: se busca por nombre de fichero, no por
  // prefijo, para que un `docs/.gitignore` cuente igual que el de la raiz.
  const rutasDeReglas = git(repo, ['ls-tree', '-r', '--name-only', rama])
    .split('\n')
    .filter((f) => f !== '' && f.split('/').pop() === '.gitignore');

  const temporal = mkdtempSync(join(tmpdir(), 'ignore-arbol-'));

  try {
    execFileSync('git', ['init', '-q', '.'], { cwd: temporal, stdio: 'ignore' });

    // La caja se fija en el repo de mentira por la misma razon que se fija en los
    // fixtures de los tests: la respuesta tiene que ser la misma en un Windows y
    // en un Linux, y `core.ignorecase` decide la respuesta.
    execFileSync('git', ['config', 'core.ignorecase',
      opciones.cajaSensible === true ? 'false' : 'true'],
    { cwd: temporal, stdio: 'ignore' });

    for (const regla of rutasDeReglas) {
      const destino = join(temporal, regla);

      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, git(repo, ['show', rama + ':' + regla]));
    }

    const excludeDeVerdad = join(repo, '.git', 'info', 'exclude');
    if (existsSync(excludeDeVerdad)) {
      copyFileSync(excludeDeVerdad, join(temporal, '.git', 'info', 'exclude'));
    }

    let crudos = '';

    try {
      crudos = execFileSync('git', ['check-ignore', '--no-index', '-v', '-z', '--stdin'], {
        cwd: temporal,
        input: rutas.join('\0') + '\0',
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024
      });
    } catch (e) {
      // El mismo 1 que no es un error, por el mismo motivo que en `auditaRepo`.
      if (e.status !== 1) {
        const stderr = (e.stderr || '').toString().trim();

        throw new Error('git check-ignore fallo en ' + repo + ' @ ' + rama + ' con codigo '
          + (e.status === undefined ? 'sin codigo (ni se llego a ejecutar)' : e.status)
          + ': ' + (stderr === '' ? (e.message || String(e)) : stderr.split('\n')[0]));
      }
    }

    return {
      rama,
      ficheros: rutas.length,
      tapados: tapaLosTrackeados(rutas, camposDeCheckIgnore(crudos))
    };
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
}

/**
 * Todas las ramas de un repo, menos la que ya se ha auditado.
 *
 * La que se salta es la que esta comprobada: `auditaRepo` ya ha mirado su indice
 * y su disco, y volver a mirar el mismo commit montando otro repo daria el mismo
 * numero y costaria lo mismo. Se compara por COMMIT y no por nombre, porque el
 * nombre de la rama desplegada depende de como se clono.
 *
 * @param {string} repo
 * @param {{cajaSensible?: boolean}} opciones
 * @returns {{repo: string, rama: string, sha: string, auditoria: object}[]}
 */
export function auditaRamas (repo, opciones = {}) {
  const nombre = repo.split(/[\\/]/).filter((p) => p !== '').pop() || repo;
  const head = git(repo, ['rev-parse', 'HEAD']).trim();
  const vistos = new Set([head]);

  const ramas = git(repo, ['for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/remotes'])
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => {
      const [r, sha] = l.split(' ');

      return { rama: r, sha };
    })
    // `origin` a secas es el symref de la rama por defecto, no una rama, y
    // `origin/HEAD` suele ser el mismo symref duplicado. Los dos se cuelan si no
    // se quitan, y los dos apuntan al commit que ya se audito como desplegado.
    .filter((r) => r.rama !== 'origin' && !r.rama.endsWith('/HEAD'))
    // Y las que apuntan al mismo commit que otra ya auditada: `ABDOmega` tiene
    // `origin/master` y una rama de trabajo con el mismo commit, y auditar las dos
    // es medir lo mismo dos veces.
    .filter((r) => !vistos.has(r.sha) && vistos.add(r.sha));

  return ramas.map((r) => ({
    repo: nombre,
    rama: r.rama,
    sha: r.sha,
    auditoria: auditaArbol(repo, r.rama, opciones)
  }));
}

/**
 * El recuento de ramas de ESTE guard, que cuenta todas las que ha auditado.
 *
 * El de EOL cuenta solo las que tienen ficheros, porque para el suyo una rama sin
 * ficheros no se ha auditado de nada. Aqui no: el recuento de este guard es de
 * ficheros tapados, y una rama vacia de ficheros puede tenerlos, asi que toda
 * rama que ha pasado por `auditaArbol` cuenta. Los SUELOS son los mismos, que es
 * justo lo que hace comparables los dos numeros.
 *
 * @param {{repo: string, rama: string, auditoria: object}[]} porRama
 */
export function resumenDeRamasAuditadas (porRama) {
  return resumenDeRamas(porRama, () => true);
}

/**
 * De quantas ramas remotas viene cada repo, para la puerta que mide la cobertura.
 *
 * `extra` es cuantas de esas se han auditado como ramas, y `remotas` cuantas
 * existen. La puerta necesita las dos: con cero ramas auditadas no hay ni un solo
 * incumplimiento posible y este guard sale en verde sin haber mirado nada, que es
 * el modo de fallo mas barato que tiene un guard.
 *
 * LA CUENTA SALE DE `ramasDeRepo`, LA MISMA QUE USA EL GUARD DE EOL, y no de la
 * lista que este guard audita arriba. Aqui se listan `refs/remotes` enteros y en
 * corto, y alli solo `refs/remotes/origin`. Son casi lo mismo y no del todo, y si
 * cada guard contase con el suyo la puerta seria una puerta y su hermana otra:
 * dos numeros para la misma pregunta. La de la puerta sale del sitio comun.
 *
 * @param {string} raiz
 * @returns {{repo: string, remotas: number, extra: number, esRaiz: boolean}[]}
 */
export function estadoDeRamasDeSuite (raiz = raizDeSuite()) {
  if (raiz === null) {
    throw new Error('no encuentro la raiz de la suite: no hay ningun ABDSharedAssets por encima '
      + 'de ' + aqui);
  }

  return reposDeSuite(raiz).map((repo, i) => {
    const nombre = repo.split(/[\\/]/).filter((p) => p !== '').pop() || repo;
    const head = git(repo, ['rev-parse', 'HEAD']).trim();
    // Una sola llamada: `ramasDeRepo` habla con git, y la lista de ramas no cambia
    // entre las dos lineas.
    const remotas = ramasDeRepo(repo);

    return {
      repo: nombre,
      remotas: remotas.length,
      extra: auditableDe(head, remotas).length,
      esRaiz: i === 0
    };
  });
}

/**
 * Todas las ramas de todos los repos de la suite, en una lista PLANA.
 *
 * Plana y no `{repo: [...]}` porque la pregunta que hay que responder es "que
 * rama rompe que", y una lista plana se puede ordenar por gravedad sin aplanar
 * nada primero.
 *
 * @param {string} raiz
 * @param {{cajaSensible?: boolean}} opciones
 * @returns {{repo: string, rama: string, sha: string, auditoria: object}[]}
 */
export function auditaRamasDeSuite (raiz = raizDeSuite(), opciones = {}) {
  if (raiz === null) {
    throw new Error('no encuentro la raiz de la suite: no hay ningun ABDSharedAssets por encima '
      + 'de ' + aqui);
  }

  const porRama = [];

  for (const repo of reposDeSuite(raiz)) porRama.push(...auditaRamas(repo, opciones));

  return porRama;
}

/**
 * El peor caso de cada repo: el numero mas alto de tapados de entre todas sus
 * ramas Y el de la rama que esta desplegada.
 *
 * El techo es POR REPO y no por rama a proposito. Con techo por rama, borrar una
 * rama habria que pedirle a alguien que editase la linea base, y con techo por
 * rama una rama con menos deuda que su hermana sigue haciendo numero por su
 * cuenta. Lo que hay que vigilar es el PEOR caso de cada repo: mientras ese numero
 * no suba, nada ha empeorado, y da igual que la rama que lo produce se renombre o
 * se borre.
 *
 * Y LA RAMA DESPLEGADA CUENTA, aunque no venga en `porRama`. `auditaRamas` se salta
 * a proposito la rama que esta comprobada, porque `auditaRepo` ya la ha mirado, y
 * si no se_trajera aqui el veredicto seria sobre un subconjunto: con la peor
 * ramadeployada en el runner (81 en `fix/webui-final-complete`) y la de la maquina
 * con 3.951, un veredicto que solo mirase las ramas no desplegadas anunciaria
 * "puedes bajar la linea base a 81" en el sitio donde los 3.951 estan a tres
 * clicks. Menos de las ramas solo es mas que ninguna de ellas si se trae la
 * desplegada.
 *
 * @param {{repo: string, rama: string, auditoria: object}[]} porRama
 * @param {{repo: string, tapados: {ruta: string}[]}[]} porRepo la rama desplegada.
 * @returns {{repo: string, rama: string, tapados: number, deRama: boolean}[]}
 */
export function peorCasoPorRepo (porRama, porRepo = []) {
  const peores = new Map();

  const anotar = (repo, rama, tapados, deRama) => {
    const actual = peores.get(repo);

    if (actual === undefined || tapados > actual.tapados) {
      peores.set(repo, { repo, rama, tapados, deRama });
    }
  };

  for (const d of porRepo) anotar(d.repo, null, d.tapados.length, false);
  for (const r of porRama) anotar(r.repo, r.rama, r.auditoria.tapados.length, true);

  return [...peores.values()]
    .sort((a, b) => b.tapados - a.tapados || (a.repo < b.repo ? -1 : 1));
}

/**
 * Las ramas contra la linea base, que es un techo y no un suelo.
 *
 * `comparaConLineaBase` hace esta misma pregunta para la rama desplegada. Aqui se
 * pregunta para el PEOR caso de cada repo, ramas y desplegada juntas, y con el
 * mismo trichotomy: `nuevo` si el repo tiene deuda en algun arbol y no estaba en
 * la linea base, `empeora` si el peor caso tiene mas de lo que decia, `mejora` si
 * tiene menos.
 *
 * LA RAIZ SE QUEDA FUERA DEL VEREDICTO, y por el mismo motivo que la deja fuera
 * el guard de tamano: el repositorio raiz se nombra como se llame la carpeta donde
 * esta, que en la maquina es `ABDSynths` y en el runner es el nombre del repo. Una
 * entrada de la linea base nombrada por la raiz no puede funcionar en los dos
 * sitios a la vez. El informe de las ramas SI la nombra y SI muestra sus numeros,
 * que es donde un dato que no puede juzgar debe estar: a la vista y sin veredicto.
 *
 * @param {{repo: string, rama: string, auditoria: object}[]} porRama
 * @param {Record<string, number>} base
 * @param {{repo: string, tapados: {ruta: string}[]}[]} porRepo la rama desplegada.
 * @param {string} raiz la carpeta de la raiz, para no juzgarla por su nombre.
 * @returns {{repo: string, antes: number, ahora: number, tipo: string, rama: (string|null)}[]}
 */
export function comparaRamasConLineaBase (porRama, base = DEUDA_CONOCIDA, porRepo = [],
  raiz = null) {
  const salida = [];
  const nombreDeLaRaiz = raiz === null
    ? null
    : (raiz.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || raiz);

  for (const p of peorCasoPorRepo(porRama, porRepo)) {
    if (nombreDeLaRaiz !== null && p.repo === nombreDeLaRaiz) continue;

    const antes = base[p.repo];

    // `rama` se pone SOLO si el peor caso ha salido de una rama. Cuando ha salido
    // de la desplegada se omite el campo entero, y no se deja en `null`, porque
    // `formateaDesviaciones` lo usa para decidir si pone `@ <rama>` y un `null` se
    // imprimiria tal cual: el log de CI acababa con `ABDCZ101 @ null`.
    const donde = p.rama === null ? {} : { rama: p.rama };

    if (antes === undefined) {
      if (p.tapados > 0) {
        salida.push({ repo: p.repo, antes: 0, ahora: p.tapados, tipo: 'nuevo', ...donde });
      }
      continue;
    }

    if (p.tapados > antes) {
      salida.push({ repo: p.repo, antes, ahora: p.tapados, tipo: 'empeora', ...donde });
    } else if (p.tapados < antes) {
      salida.push({ repo: p.repo, antes, ahora: p.tapados, tipo: 'mejora', ...donde });
    }
  }

  return salida;
}

/**
 * El informe de las ramas.
 *
 * De veintisiete ramas, el resumen y el detalle solo de las que tienen deuda. Un
 * informe con una linea por rama es un informe que nadie lee, y el detalle entero
 * de tres mil novecientos cincuenta ficheros en el caso de que lo haya no cabe ni
 * en una pantalla.
 *
 * El desglose por regla es POR RAMA y no por repo, porque el numero de la rama es
 * justo lo que se esta mirando: si una rama tiene 113 de `WebUI/` y su hermana 38,
 * mezclar los dos en un desglose comun deja un numero que no es de ninguna y
 * hace falta volver a la rama para saber cual.
 *
 * @param {{repo: string, rama: string, auditoria: object}[]} porRama
 * @returns {string[]}
 */
export function formateaRamas (porRama) {
  const conFicheros = porRama.filter((r) => r.auditoria.ficheros > 0);
  const conDeuda = conFicheros.filter((r) => r.auditoria.tapados.length > 0)
    .sort((a, b) => b.auditoria.tapados.length - a.auditoria.tapados.length);

  const lineas = [
    'ramas auditadas ademas de la que esta deployada : ' + conFicheros.length,
    '  de ellas, con ficheros tapados                 : ' + conDeuda.length
  ];

  for (const r of conDeuda) {
    const porRegla = new Map();

    for (const t of r.auditoria.tapados) {
      porRegla.set(t.regla, (porRegla.get(t.regla) || 0) + 1);
    }

    lineas.push('');
    lineas.push('  ' + String(r.auditoria.tapados.length).padStart(5) + '  '
      + r.repo + ' @ ' + r.rama
      + '   (' + r.auditoria.ficheros + ' ficheros en la rama)');

    for (const [regla, n] of [...porRegla.entries()].sort((a, b) => b[1] - a[1])) {
      lineas.push('         ' + String(n).padStart(5) + '  ' + regla);
    }
  }

  return lineas;
}

// El `main` va debajo del `if` para que importar este fichero en el test no
// ejecute la auditoria entera por el casual de que el test quiera sus datos.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const porRepo = auditaSuite(undefined, opcionesDeConsola());

    // La reimpresion de la linea base va PRIMERO y sale antes: si lo que se
    // quiere es pegarla en el fuente, no hace falta que salga delante el informe
    // de cuatro mil ficheros.
    if (process.argv.includes('--linea-base')) {
      const actual = Object.fromEntries(
        porRepo.filter((r) => r.tapados.length > 0).map((r) => [r.repo, r.tapados.length])
      );

      console.log(JSON.stringify(actual, null, 2));
      process.exit(0);
    }

    console.log(formatea(porRepo));

    const tapados = porRepo.reduce((a, r) => a + r.tapados.length, 0);

    if (tapados > 0) {
      console.error('');
      console.error('ficheros trackeados y tapados ahora mismo: ' + tapados
        + ' (deuda ya existente, repartida en: '
        + porRepo.filter((r) => r.tapados.length > 0).map((r) => r.repo).join(', ') + ')');
    }

    const desviaciones = comparaConLineaBase(porRepo);

    console.error('');
    console.error(formateaDesviaciones(desviaciones));

    // Y ahora las ramas que no son la que esta desplegada. Va aparte y no como un
    // extra del de arriba porque mide otra cosa: `auditaRepo` mira el indice y el
    // disco de LO QUE ESTA COMPROBADO, y esto mira arboles que nadie ha comprobado.
    // Se audita UNA vez y se imprime lo mismo que se juzga, porque un informe que
    // dice una cosa y el veredicto decide sobre otra es peor que no tener informe.
    const raiz = raizDeSuite();
    const porRama = auditaRamasDeSuite(raiz, opcionesDeConsola());

    console.log('');
    console.log(formateaRamas(porRama).join('\n'));

    // El veredicto de las ramas es sobre la PEOR rama de cada repo, no sobre la que
    // esta desplegada. Con solo la desplegada, ABDJUNiO601 daba 0 en el runner y
    // 3.951 en la maquina: el mismo repo, verde en un sitio y con casi cuatro mil
    // ficheros tapados en el otro, porque se estaba mirando una rama distinta.
    const desviacionesDeRamas = comparaRamasConLineaBase(porRama, undefined, porRepo, raiz);

    console.error('');
    console.error(formateaDesviaciones(desviacionesDeRamas,
      'en la peor rama de cada repo'));

    // Y la MISMA puerta de ramas que tiene el guard de EOL, con los mismos suelo. Y
    // no como una copia: si el `clone` del workflow se queda sin
    // `--no-single-branch`, los dos guards se quedan sin ramas a la vez, y con el
    // `clone` arreglado los dos vuelven a mirarlas. Una puerta aqui distinta de la
    // de alla no seria una segunda puerta, seria una puerta que se contradice.
    const resumen = resumenDeRamasAuditadas(porRama);
    const causas = diagnosticoDeRamas(estadoDeRamasDeSuite(raiz));
    const causasGravesDeRamas = causas.filter((c) => c.grave);

    if (resumen.porDebajo.length > 0) {
      console.error('');
      console.error('ignore_oculto: se han auditado menos ramas de las que deben: '
        + resumen.porDebajo.join(', ') + '.');
      console.error('  Ramas auditadas ademas de la desplegada: ' + resumen.auditadas
        + ', en ' + resumen.repos.length + ' repo(s).');
      console.error('  Repos que aportan: ' + resumen.repos.join(', ') + '.');
    }

    // El suelo va en el `exit` y no solo en el informe, igual que en el guard de
    // EOL. Aqui solo miraban las causas graves, y asi el suelo podia cruzarse sin
    // poner a nadie en rojo: la puerta avisaba y se dejaba seguir. Un suelo que
    // avisa y no para nada es un suelo que el proximo commit borra.
    //
    // Y cuando se cruza sin ninguna causa grave, no se puede decir POR QUE, que
    // es justo lo que hace falta para arreglarlo: se ha perdido cobertura en
    // varias partes a la vez, o los suelos estan altos.
    if (causasGravesDeRamas.length === 0 && resumen.porDebajo.length > 0) {
      console.error('');
      console.error('ignore_oculto: el suelo de ramas se ha cruzado y ningun repo esta por');
      console.error('  debajo del suyo, asi que no se sabe por que. Se ha perdido');
      console.error('  cobertura en varias partes a la vez, o los suelos estan altos.');
    }

    if (causas.length > 0) {
      console.error('');
      for (const linea of formateaDiagnostico(causas, 'ignore_oculto')) console.error(linea);
    }

    if (empeoran(desviaciones).length > 0 || empeoran(desviacionesDeRamas).length > 0
        || resumen.porDebajo.length > 0 || causasGravesDeRamas.length > 0) {
      console.error('');
      console.error('ignore_oculto: el guard esta en rojo por lo de arriba, no por la deuda de antes.');
      process.exit(1);
    }

    process.exit(0);
  } catch (e) {
    // Un fallo al LEER los repos no es un hallazgo del guard, y decir la
    // diferencia es la mitad del trabajo: si se mezclan, el primero que lee el
    // rojo busca reglas de ignore que estan bien.
    console.error('ignore_oculto: no se pudo ni siquiera leer la suite.');
    console.error(e.message);
    process.exit(2);
  }
}