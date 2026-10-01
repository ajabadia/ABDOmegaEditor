// Audita los repos de la suite ABDSynths contando una sola cosa: ficheros
// TRACKEADOS con una regla `eol=lf` declarada que NO la cumplen.
//
//   node tools/auditar_eol.mjs
//
// Salida:
//   0  ningun fichero incumple su regla, y los no auditables no pasan del tope
//   1  hay ficheros que incumplen su regla, o demasiados no auditables
//   2  no se pudo ni siquiera leer uno de los repos (que es otro problema)
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUE "QUE INCUMPLAN SU REGLA" Y NO "QUE TENGAN LF"
//
// Aqui NO se puede decir "ningun fichero de texto tiene CRLF", porque eso
// seria falso en cualquier maquina Windows con `core.autocrlf=true`, que es
// justo como esta el equipo: en cuatro repos hay 14 ficheros con CRLF en disco
// bajo `* text=auto` y estan PERFECTAMENTE, porque ahi el checkout tiene que
// poner CRLF. Un guard que los contara como fallo estorbaria todos los dias
// para no encontrar nada.
//
// Y no se puede decir "que el repositorio tenga LF" a secas, porque 15.803 de
// los 16.679 ficheros de la suite NO declaran ninguna regla `eol`. Sin politica
// declarada no hay nada que incumplir, y un guard que se quedase callado en
// esos repos direia "limpio" habiendo mirado 0. Por eso el informe dice
// cuantos ha auditado y cuantos no tienen politica, y el test pone un suelo:
// un guard que no puede ponerse verde por no mirar.
//
// ─────────────────────────────────────────────────────────────────────────
// LAS TRES COSAS QUE PARECEN LO MISMO Y SON TRES PUERTAS DISTINTAS
//
//   1. CRLF EN EL BLOB. Esta dentro del repositorio. Sobrevive a un clon, se ve
//      en un `git show`, lo puede commitar cualquiera. Es el defecto de verdad y
//      el unico que se arregla con un commit. En la suite hay UNO, y lo
//      encontre comparando el indice contra HEAD blob a blob: ocho lineas con
//      CRLF en `MidiKeyboard/README.md`, bajo una regla `*.md text eol=lf` que
//      ya existia. Entro commiteado desde un arbol de trabajo con CRLF; la regla
//      no se aplica a un blob que ya esta escrito.
//
//   2. CRLF SOLO EN EL DISCO. El blob esta en LF y el arbol de trabajo no. Git no
//      lo ve: normaliza antes de comparar, asi que el fichero sale limpio en
//      `git status` y en `git diff`. Git lo arregla solo en cuanto alguien toca
//      el fichero, y no se arregla con un commit, sino re-extrayendolo del
//      indice. Antes de este guard habia 230 en la suite.
//
//   3. 0x0D EN UN BINARIO. No es un defecto: es un byte de datos. En
//      `MidiKeyboard/demo/keyboard-demo.gif` hay 3 CRLF y 974 CR sueltos, y en
//      ocho ficheros .syx de ABDEep hay CR a monton. Renormalizar un binario no
//      lo arregla: lo corrompe. El reparto es lo que lo dice, no el total, y por
//      eso el guard cuenta estos ficheros y los informa SIN contarlos como
//      fallo, para que quede escrito que se miraron y se descartaron a proposito.
//
// ─────────────────────────────────────────────────────────────────────────
// LO QUE NO SE PUEDE AUDITAR, Y POR QUE NO SE PASA POR ALTO
//
// Un fichero con trabajo sin commitear cuyo disco trae CRLF no se puede juzgar:
// no se sabe si el CRLF es del committed o del trabajo de otro hilo, y
// re-extrayendolo se destruye ese trabajo. Marcarlo "no auditable" y seguir
// como si nada seria la forma mas facil de que este guard no sirva, asi que hay
// un TECHO: si los no auditables pasan de `NO_AUDITABLES_TOLERADOS`, sale en
// rojo. Hoy son 7 (seis en ABDNeural y uno en ABDSharedCode) y bajan solos en
// cuanto esos hilos commitean.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { raizDeSuite, reposDeSuite } from './auditar_ignore_oculto.mjs';

/** El caracter que se busca en los blobs. Va como argumento, no en el patron. */
export const CR = '\r';

/**
 * Cuantos ficheros con trabajo sin commitear se pueden dejar sin auditar.
 *
 * No es una lista de nombres, es un numero: asi no hay que tocar el
 * guard cada vez que un hilo commitea, y a la vez no vale como excusa para
 * dejar sin mirar media suite.
 */
export const NO_AUDITABLES_TOLERADOS = 7;

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE PURA. Nada toca el disco ni git, y por eso el test puede darle
// ficheros inventados y comprobar cada rama sin montar un repositorio.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Si un fichero es binario, para este guard.
 *
 * Hay dos formas de serlo y se cuentan las dos. Una es declararla:
 * `text: unset`, que es lo que escribe la macro `binary` de `.gitattributes`.
 * La otra es que lo decida git, que es el que va a decidir al aplicar los
 * filtros y al hacer un diff, y que detecta un binario por tener un byte nulo.
 *
 * Se pregunta a git y no se decide aqui por una razon: un fichero que el guard
 * tiene por texto y git por binario es un fichero al que git no le va a aplicar
 * la regla `eol=lf` que el guard le esta juzgando.
 *
 * @param {{text?: string, gitLoVeBinario?: boolean}} f
 * @returns {boolean}
 */
export function esBinario (f) {
  if (f && f.text === 'unset') return true;

  return Boolean(f && f.gitLoVeBinario);
}

/**
 * Donde incumple un fichero su regla, o `null` si no incumple ninguna.
 *
 * El orden de las comprobaciones NO es el orden en que estan escritas por
 * comodidad, y cada salto es un caso distinto:
 *
 *  - Sin `eol=lf` declarada no hay nada que incumplir. Un fichero con CRLF bajo
 *    `* text=auto` y `core.autocrlf=true` esta bien, y sin este salto el guard
 *    estaria rojo en cuanto alguien commitease en Windows.
 *  - Un binario no incumple nada, porque sus CR son datos.
 *  - El blob se juzga SIEMPRE, incluso con trabajo sin commitear: el blob es el
 *    repositorio, y el trabajo del otro hilo esta en el disco, no ahi.
 *  - El disco solo se juzga si no hay trabajo pendiente, por lo de arriba.
 *
 * Y el salto que parece el mas tonto es el que mas trabajo ha dado: aqui solo se
 * juzga la regla `eol=lf`. Un fichero con `eol=crlf` tiene CRLF en disco POR
 * DECLARACION, y una primera version de este guard lo contaba como
 * incumplimiento y ponia en rojo diecisiete ficheros .bat de ABDNeural y
 * ABDOmegaUnified que estan perfectamente bien. La regla contraria —un
 * `eol=crlf` que se encuentra con LF— no se comprueba: un fichero de una sola
 * linea sin salto final es legal en LF y haria falta distinguirlo de un
 * incumplimiento de verdad, y esa comprobacion va en su propia casilla.
 *
 * @param {{eol?: string, text?: string, gitLoVeBinario?: boolean,
 *          crlfBlob?: number, crlfDisco?: number, sucio?: boolean}} f
 * @returns {'blob'|'disco'|null}
 */
export function incumple (f) {
  const x = f || {};

  if (x.eol !== 'lf') return null;
  if (esBinario(x)) return null;
  if ((x.crlfBlob || 0) > 0) return 'blob';
  if (x.sucio) return null;
  if ((x.crlfDisco || 0) > 0) return 'disco';

  return null;
}

/**
 * El reparto de un conjunto de ficheros ya medidos.
 *
 * Se cuenta lo LIMPIO con nombre propio: `sinPolitica` son los ficheros que el
 * guard no puede juzgar, y no pueden parecerse a los que ha comprobado. Por eso
 * van en una casilla aparte y no se funden con `auditados`.
 *
 * @param {object[]} ficheros
 * @returns {{auditados: number, conEolCrlf: number, sinPolitica: number,
 *            binariosConCr: number,
 *            incumplimientos: {ruta: string, donde: string, crlf: number}[],
 *            noAuditables: string[]}}
 */
export function auditaFicheros (ficheros) {
  const out = {
    auditados: 0,
    conEolCrlf: 0,
    sinPolitica: 0,
    binariosConCr: 0,
    incumplimientos: [],
    noAuditables: []
  };

  for (const f of ficheros || []) {
    // El 0x0D de un binario se cuenta siempre, tenga politica o no, y NUNCA como
    // incumplimiento: es la casilla que deja escrito que se miro y se descarto.
    if (esBinario(f) && f.tieneCrBlob) out.binariosConCr++;

    if (f.eol === 'crlf') {
      out.conEolCrlf++;
      continue;
    }

    if (f.eol !== 'lf') {
      out.sinPolitica++;
      continue;
    }

    out.auditados++;

    const donde = incumple(f);
    if (donde) {
      out.incumplimientos.push({
        ruta: f.ruta,
        donde,
        crlf: donde === 'blob' ? f.crlfBlob : f.crlfDisco
      });
    } else if (f.sucio && (f.crlfDisco || 0) > 0) {
      out.noAuditables.push(f.ruta);
    }
  }

  return out;
}

/** Un informe legible por persona, una linea por repo y luego los resumenes. */
export function formatea (porRepo) {
  const suma = {
    auditados: 0, conEolCrlf: 0, sinPolitica: 0, binariosConCr: 0, sinAuditar: 0
  };
  const total = { repos: 0, ficheros: 0 };
  const malos = [];

  for (const r of porRepo) {
    total.repos++;
    total.ficheros += r.ficheros;
    suma.auditados += r.auditados;
    suma.conEolCrlf += r.conEolCrlf;
    suma.sinPolitica += r.sinPolitica;
    suma.binariosConCr += r.binariosConCr;
    suma.sinAuditar += r.noAuditables.length;

    for (const i of r.incumplimientos) {
      malos.push({ repo: r.repo, ...i });
    }
  }

  const lineas = [
    'repos revisados                              : ' + total.repos,
    'ficheros trackeados                          : ' + total.ficheros,
    'ficheros con regla eol=lf (los auditados)    : ' + suma.auditados,
    'ficheros con regla eol=crlf (no juzgados)    : ' + suma.conEolCrlf,
    'ficheros SIN regla eol (nada que juzgar)     : ' + suma.sinPolitica,
    'binarios con 0x0D (informativo, NO es fallo) : ' + suma.binariosConCr,
    'no auditables por trabajo sin commitear      : ' + suma.sinAuditar
      + ' (tope ' + NO_AUDITABLES_TOLERADOS + ')'
  ];

  if (malos.length === 0) {
    lineas.push('');
    lineas.push('ningun fichero incumple la regla eol=lf que declara.');
    return lineas.join('\n');
  }

  lineas.push('');
  lineas.push('INCUMPLEN SU REGLA eol=lf:');
  for (const m of malos) {
    lineas.push('  ' + m.repo + '/' + m.ruta + '  <- ' + m.crlf + ' CRLF en ' +
      (m.donde === 'blob' ? 'el BLOB (sobrevive a un clon)'
        : 'el DISCO (git no lo ve, se arregla re-extrayendo)'));
  }

  return lineas.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE QUE HABLA CON GIT Y CON EL DISCO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Un subcomando de git, o un error que diga QUE repo y QUE subcomando.
 *
 * El envoltorio de `tools/auditar_ignore_oculto.mjs` esta comentado alli y no se
 * repite: aqui solo se anade `gitOpcional`, que hace falta porque `git grep`
 * sale con 1 cuando no encuentra NADA, igual que `check-ignore` cuando no
 * encuentra ninguna regla tapada. Absorber ese 1 es correcto; absorberlo sin
 * mirar el resto de codigos seria como que un fallo de red saliera como
 * "este repo no tiene ni un CR".
 */
function git (repo, args, opciones = {}) {
  try {
    return execFileSync('git', [
      '-c', 'safe.directory=' + repo.replace(/\\/g, '/').replace(/\/+$/, ''), ...args
    ], {
      cwd: repo,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      // Sin esto, `execFileSync` manda el stderr del hijo al stderr del padre.
      // Git escribe ahi avisos de conversion de fin de linea en cuanto toca un
      // fichero, y en una suite con quince repos eso son cientos de lineas
      // intercaladas en el informe del guard.
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opciones
    });
  } catch (e) {
    if (e.status !== undefined && e.status !== null) throw e;

    const stderr = (e.stderr || '').toString().trim();
    const porQue = stderr === '' ? (e.message || String(e)) : stderr.split('\n')[0];

    throw new Error('`git ' + args.join(' ') + '` ni llego a ejecutarse en ' + repo + ': '
      + porQue);
  }
}

/** Como `git`, pero el codigo 1 se convierte en cadena vacia. */
function gitOpcional (repo, args, opciones = {}) {
  try {
    return git(repo, args, opciones);
  } catch (e) {
    if (e.status === 1) return '';

    const stderr = (e.stderr || '').toString().trim();
    throw new Error('git ' + args.join(' ') + ' fallo en ' + repo + ' con codigo ' + e.status
      + ': ' + (stderr === '' ? (e.message || String(e)) : stderr.split('\n')[0]));
  }
}

/** `ls-files -s -z`: ruta y blob, que es lo que hace falta para leer el indice. */
export function camposDeLsFiles (salida) {
  const entradas = [];

  for (const trozo of String(salida).split('\0')) {
    if (trozo === '') continue;
    const [meta, ...resto] = trozo.split('\t');
    const partes = meta.split(/\s+/);

    if (partes.length < 2) {
      throw new Error('`git ls-files -s -z` devolvio una linea que no es modo y blob: '
        + trozo);
    }

    entradas.push({ ruta: resto.join('\t'), modo: partes[0], blob: partes[1] });
  }

  return entradas;
}

/**
 * La tabla de `.gitattributes` de un repo, en la forma que sale de `check-attr`.
 *
 * El detalle que hace esto no trivial: `check-attr` devuelve `unspecified`, NO
 * cadena vacia, cuando no hay ninguna regla que aplique. Comparar contra `''` o
 * contra `null` da el mismo resultado para los dos casos y hace que un repo sin
 * `.gitattributes` parezca uno donde todo esta correcto.
 */
export function tablaDeCheckAttr (salida) {
  const campos = String(salida).split('\0').filter((t) => t !== '');
  const tabla = {};

  for (let i = 0; i + 2 < campos.length; i += 3) {
    if (!tabla[campos[i]]) tabla[campos[i]] = {};
    tabla[campos[i]][campos[i + 1]] = campos[i + 2];
  }

  return tabla;
}

/**
 * Un repo medido: los atribulos de cada fichero y el reparto.
 *
 * Los blobs se leen SOLO de los que `git grep` dice que tienen un CR. Leer los
 * 16.679 de la suite uno a uno seria lento y no aportaria nada: si no hay CR en
 * el blob, el numero de CRLF es cero y ya esta. Por eso el grupo de candidatos
 * sale de git y no de aqui.
 * y no de aqui.
 */
export function auditaRepo (repo) {
  const nombre = basename(repo.replace(/[\\/]+$/, '')) || repo;
  const entradas = camposDeLsFiles(git(repo, ['ls-files', '-s', '-z']));
  const rutas = entradas.map((e) => e.ruta);

  if (rutas.length === 0) {
    return {
      repo: nombre, ficheros: 0, auditados: 0, conEolCrlf: 0, sinPolitica: 0,
      binariosConCr: 0, incumplimientos: [], noAuditables: []
    };
  }

  const tabla = tablaDeCheckAttr(git(repo,
    ['check-attr', '-z', 'text', 'eol', '--stdin'],
    { input: (rutas.join('\0') + '\0') }
  ));

  // Quien tiene un CR en el blob, y de esos quien NO es binario para git. La
  // diferencia son los binarios con 0x0D, que es informacion, no un fallo.
  //
  // El `-z` no es cosmetico: sin el, git entrecomilla las rutas que tienen algo
  // fuera de ASCII (`"\303\251.md"`), y esa cadena entrecomillada no coincide
  // con ninguna ruta del `ls-files`, con lo que el fichero se contaria como si
  // no tuviera CR. Un fallo silencioso en la direccion de "todo bien".
  const conCr = new Set(
    gitOpcional(repo, ['grep', '--cached', '-l', '-z', '-e', CR, '--', '.'])
      .split('\0').filter((s) => s !== '')
  );
  const conCrDeTexto = new Set(
    gitOpcional(repo, ['grep', '--cached', '-I', '-l', '-z', '-e', CR, '--', '.'])
      .split('\0').filter((s) => s !== '')
  );

  const sucios = new Set(
    gitOpcional(repo, ['diff', '--name-only', '-z'])
      .split('\0').filter((s) => s !== '')
  );

  const hashPorRuta = new Map(entradas.map((e) => [e.ruta, e.blob]));

  const medidos = rutas.map((ruta) => {
    const attr = tabla[ruta] || {};
    const gitLoVeBinario = conCr.has(ruta) && !conCrDeTexto.has(ruta);
    const binario = esBinario({ text: attr.text, gitLoVeBinario });

    // El blob solo se LEE para los ficheros de texto. Para un binario ya se
    // sabe que tiene CR porque `git grep` lo ha dicho, y contar cuantos CRLF
    // tiene no cambia ninguna conclusion: su byte 0x0D es un dato. Leerlos es
    // ademas un disparate de memoria, que en ABDCZ101 solo son un `.zip` de mas
    // de un megabyte y 292 `.syx`.
    const crlfBlob = conCr.has(ruta) && !binario
      ? crlfDeBuffer(gitBuffer(repo, ['cat-file', 'blob', hashPorRuta.get(ruta)]))
      : 0;
    const conRegla = attr.eol === 'lf' || attr.eol === 'crlf';

    return {
      ruta,
      text: attr.text,
      eol: attr.eol,
      gitLoVeBinario,
      tieneCrBlob: conCr.has(ruta),
      crlfBlob,
      crlfDisco: conRegla ? crlfDeDisco(join(repo, ruta)) : 0,
      sucio: sucios.has(ruta)
    };
  });

  const reparto = auditaFicheros(medidos);

  return {
    repo: nombre,
    ficheros: rutas.length,
    ...reparto
  };
}

/**
 * Un subcomando de git que devuelve BYTES, no texto.
 *
 * Sin `encoding`, `execFileSync` devuelve un Buffer. Y no se puede pedir
 * `encoding: 'buffer'`: eso no es una codificacion valida y Node 24 lanza
 * ERR_UNKNOWN_ENCODING antes de que git llegue a ejecutarse.
 */
function gitBuffer (repo, args) {
  try {
    return execFileSync('git', [
      '-c', 'safe.directory=' + repo.replace(/\\/g, '/').replace(/\/+$/, ''), ...args
    ], { cwd: repo, maxBuffer: 128 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    if (e.status !== undefined && e.status !== null) throw e;

    const stderr = (e.stderr || '').toString().trim();
    throw new Error('`git ' + args.join(' ') + '` ni llego a ejecutarse en ' + repo + ': '
      + (stderr === '' ? (e.message || String(e)) : stderr.split('\n')[0]));
  }
}

/** Cuantos CRLF hay en unos bytes, contando byte a byte y no con un regex. */
function crlfDeBuffer (datos) {
  let n = 0;

  for (let i = 0; i + 1 < datos.length; i++) {
    if (datos[i] === 13 && datos[i + 1] === 10) n++;
  }

  return n;
}

/**
 * Cuantos CRLF tiene un fichero del disco, leyendo bytes y no texto.
 *
 * Con `readFileSync(fichero, 'utf8')` un `\\r\\n` no se distingue de un `\\n`
 * seguido de un `\\r` al final de la linea, y en un fichero que tiene CRLF y LF
 * mezclados el numero sale mal. Aqui se lee en binario a proposito.
 */
function crlfDeDisco (fichero) {
  let datos;

  try {
    datos = readFileSync(fichero);
  } catch (e) {
    // Un fichero que no esta en disco (borrado, o en un submodule) no se puede
    // mirar, y no es un fallo del guard: cuenta como cero CR en disco y el blob
    // sigue juzgandose.
    return 0;
  }

  return crlfDeBuffer(datos);
}

/** El informe de la suite entera. */
export function auditaSuite (raiz = raizDeSuite()) {
  if (raiz === null) {
    throw new Error('no encuentro la raiz de la suite');
  }

  return reposDeSuite(raiz).map((repo) => auditaRepo(repo));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const porRepo = auditaSuite();

    console.log(formatea(porRepo));

    const demasiados = porRepo.reduce((a, r) => a + r.incumplimientos.length, 0);
    const sinAuditar = porRepo.reduce((a, r) => a + r.noAuditables.length, 0);

    if (demasiados > 0 || sinAuditar > NO_AUDITABLES_TOLERADOS) {
      console.error('');
      console.error('auditar_eol: ' + demasiados + ' incumplimiento(s), ' + sinAuditar
        + ' no auditable(s) de un tope de ' + NO_AUDITABLES_TOLERADOS + '.');
      process.exit(1);
    }

    process.exit(0);
  } catch (e) {
    console.error('auditar_eol: no se pudo ni siquiera leer la suite.');
    console.error(e.message);
    process.exit(2);
  }
}