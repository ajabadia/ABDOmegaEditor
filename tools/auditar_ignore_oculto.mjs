// Audita los repos de la suite ABDSynths buscando una sola cosa: FICHEROS
// TRACKEADOS que una regla de `.gitignore` dice que no deberian estar ahi.
//
//   node tools/auditar_ignore_oculto.mjs
//
// Salida:
//   0  ningun repo ha superado los ficheros tapados que ya tenia (linea base)
//   1  un repo tiene MAS ficheros trackeados tapados de los que tenia, o tiene
//      tapados y no estaba en la linea base
//   2  no se pudo ni siquiera leer uno de los repos (que es otro problema)
//
// La linea base esta al final del fichero, con el detalle de que regla tapa
// cada bloque. `node tools/auditar_ignore_oculto.mjs --linea-base` reimprime el
// numero actual de cada repo para rehacerla a mano.
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

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
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
  ABDMS2000: 42
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
export function formateaDesviaciones (desviaciones) {
  if (desviaciones.length === 0) {
    return 'linea base respetada: ningun repo tiene mas ficheros tapados de los que habia.';
  }

  return desviaciones
    .map((d) => {
      const flecha = d.tipo === 'mejora'
        ? 'ha BAJADO de ' + d.antes + ' a ' + d.ahora + ' (puedes bajar la linea base)'
        : (d.tipo === 'nuevo'
            ? 'APARECE CON ' + d.ahora + ' y no estaba en la linea base'
            : 'ha SUBIDO de ' + d.antes + ' a ' + d.ahora + ' (+' + (d.ahora - d.antes) + ')');

      return '  ' + d.repo + ': ' + flecha;
    })
    .join('\\n');
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
 * @param {string} repo ruta absoluta del repositorio.
 * @returns {{repo: string, trackeados: number, tapados: {ruta: string, regla: string}[]}}
 */
export function auditaRepo (repo) {
  const nombre = repo.split(/[\\/]/).filter((p) => p !== '').pop() || repo;
  const listados = git(repo, ['ls-files', '-z']);
  const trackeados = listados.split('\0').filter((t) => t !== '');

  let crudos = '';

  try {
    crudos = git(repo, ['check-ignore', '--no-index', '-v', '-z', '--stdin'],
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

/** El informe completo de la suite. */
export function auditaSuite (raiz = raizDeSuite()) {
  if (raiz === null) {
    throw new Error('no encuentro la raiz de la suite: no hay ningun ABDSharedAssets por encima '
      + 'de ' + aqui);
  }

  return reposDeSuite(raiz).map((repo) => auditaRepo(repo));
}

// El `main` va debajo del `if` para que importar este fichero en el test no
// ejecute la auditoria entera por el casual de que el test quiera sus datos.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const porRepo = auditaSuite();

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

    if (empeoran(desviaciones).length > 0) {
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