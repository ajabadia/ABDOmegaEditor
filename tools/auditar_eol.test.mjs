// Pruebas del guard de EOL: que ningun fichero incumpla la regla eol=lf que
// declara, distinguiendo CRLF en el blob, CRLF en el disco y 0x0D de binario.
//
//   node --test tools/auditar_eol.test.mjs
//
// Sin dependencias, como los otros dos guards: `node:test` y `assert` vienen en
// el runtime y este repo no tiene runner.
//
// EL ORDEN. Primero las funciones puras con ficheros inventados, que es donde se
// pueden provocar los tres estados (CRLF en blob, CRLF en disco, 0x0D de
// binario) sin montar un repositorio. Despues repos de mentira, para lo que no
// se puede inventar: que un blob commiteado con CRLF de verdad sale como
// incumplimiento, y que un fichero con trabajo sin commitear no se juzga. Y al
// final la suite real, con un suelo que impide que este guard se ponga verde
// por no mirar nada.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  auditaSuite, auditaFicheros, auditaRepo, camposDeLsFiles, esBinario,
  formatea, incumple, tablaDeCheckAttr, CR, NO_AUDITABLES_TOLERADOS
} from './auditar_eol.mjs';

const temporales = [];

/** Un directorio que se borra al terminar. */
function temporal (prefijo) {
  const dir = mkdtempSync(join(tmpdir(), prefijo));

  temporales.push(dir);
  return dir;
}

after(() => {
  for (const dir of temporales) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      console.warn('no se pudo borrar ' + dir + ': ' + e.message);
    }
  }
});

/** Git con identidad y sin firma, que es lo que hace falta para commitear de mentira. */
function git (cwd, args, opciones = {}) {
  return execFileSync('git', [
    '-c', 'user.email=guard@ejemplo.invalido',
    '-c', 'user.name=Guard',
    '-c', 'commit.gpgsign=false',
    ...args
  ], { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opciones });
}

/**
 * Un repo de mentira.
 *
 * `gitattributesDespues` es el interruptor importante, y sale de una sorpresa
 * medida: con `text eol=lf` declarado, `git add` normaliza SIEMPRE, y
 * `core.autocrlf=false` no lo evita, porque el atributo `text` manda sobre
 * autocrlf. O sea que un blob con CRLF no se puede fabricar con la regla puesta,
 * ni a proposito. Se fabrica como paso en el historico real: se commitea el
 * fichero SIN regla (con autocrlf=false, que si guarda el CRLF tal cual), y la
 * regla se escribe DESPUES. Eso es exactamente lo que paso en
 * `MidiKeyboard/README.md`.
 */
function repoDeMentira (opciones = {}) {
  const dir = temporal('eol-');

  git(dir, ['init', '-q', '.']);

  if (opciones.gitattributes !== undefined) {
    writeFileSync(join(dir, '.gitattributes'), opciones.gitattributes);
  }

  for (const [ruta, contenido] of Object.entries(opciones.ficheros || {})) {
    const completa = join(dir, ruta);

    mkdirSync(join(completa, '..'), { recursive: true });
    writeFileSync(completa, contenido);
  }

  if (opciones.sinAdd !== true) {
    git(dir, opciones.crlfAlCommitear
      ? ['-c', 'core.autocrlf=false', 'add', '-A']
      : ['add', '-A']);
  }

  if (opciones.sinCommit !== true) {
    git(dir, ['-c', 'core.autocrlf=false', 'commit', '-qm', 'inicio']);
  }

  if (opciones.gitattributesDespues !== undefined) {
    writeFileSync(join(dir, '.gitattributes'), opciones.gitattributesDespues);
  }

  return dir;
}

// ─────────────────────────────────────────────────────────────────────────
// QUE ES UN BINARIO
// ─────────────────────────────────────────────────────────────────────────

describe('que se cuenta como binario', () => {
  it('`text: unset` es binario declarado, que es lo que escribe la macro binary', () => {
    assert.equal(esBinario({ text: 'unset' }), true);
  });

  it('tambien lo es si lo decide git, que es quien aplica los filtros', () => {
    // Preguntarle a git y no decidir aqui por una razon: si el guard tiene un
    // fichero por texto y git por binario, es un fichero al que git no le va a
    // aplicar la regla que el guard le esta juzgando.
    assert.equal(esBinario({ text: 'auto', gitLoVeBinario: true }), true);
  });

  it('un fichero de texto no es binario, y no pasar nada no es binario', () => {
    assert.equal(esBinario({ text: 'set', gitLoVeBinario: false }), false);
    assert.equal(esBinario({}), false);
    assert.equal(esBinario(null), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LOS TRES ESTADOS, QUE SE CONFUNDEN
// ─────────────────────────────────────────────────────────────────────────

describe('donde incumple un fichero, y donde no incumple nada', () => {
  it('sin regla eol declarada no hay nada que incumplir, aunque tenga CRLF', () => {
    // Este es el salto que hace que el guard sea usable en Windows: con
    // `* text=auto` y `core.autocrlf=true`, el checkout pone CRLF y esta bien.
    assert.equal(incumple({ eol: 'unspecified', crlfDisco: 300 }), null);
    assert.equal(incumple({ eol: undefined, crlfBlob: 2, crlfDisco: 2 }), null);
  });

  it('un `eol=crlf` con CRLF en DISCO cumple su regla, no la incumple', () => {
    // El bug que encontro el propio guard en su primera version: diecisiete
    // ficheros .bat de ABDNeural y ABDOmegaUnified con `eol=crlf` salen en rojo
    // porque tienen CRLF en disco, que es exactamente lo que se les pidio.
    assert.equal(incumple({ eol: 'crlf', crlfDisco: 460, saltosDisco: 460 }), null);
  });

  it('un `eol=crlf` con el BLOB en CRLF incumple: el indice guarda la forma normalizada', () => {
    // La direccion que faltaba. Con `text` activo el indice SIEMPRE guarda LF,
    // ny con la regla que diga `eol=crlf` — esa regla solo gobierna el checkout.
    // Asi que un CRLF en el blob de un `eol=crlf` es tan anomalo como en un
    // `eol=lf`, y sale por el mismo lado.
    assert.equal(incumple({ eol: 'crlf', crlfBlob: 460 }), 'blob');
    assert.equal(incumple({ eol: 'crlf', crlfBlob: 2, crlfDisco: 2, saltosDisco: 2 }), 'blob');
  });

  it('un `eol=crlf` con saltos en LF en el DISCO incumple, y git tampoco lo ve', () => {
    // El caso real que motivo la puerta: cuatro fixtures .bat de ABDOmegaUnified
    // con siete, seis, nueve y siete saltos, todos en LF, bajo `*.bat eol=crlf`.
    assert.equal(incumple({ eol: 'crlf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 7 }), 'disco');
  });

  it('un `eol=crlf` con MEZCLA de CRLF y LF en disco incumple', () => {
    // Ni todo CRLF ni todo LF: el peor de los dos, porque el fichero parece
    // normalizado a cualquiera de los dos Reyes y no lo es.
    assert.equal(incumple({ eol: 'crlf', crlfDisco: 5, saltosDisco: 9 }), 'disco');
  });

  it('un fichero SIN NINGUN salto de linea no se juzga en ninguna direccion', () => {
    // El caso que justificaba dejar la puerta cerrada, y que sigue sin juzgar:
    // un fichero de una sola linea sin salto final tiene cero saltos, y no hay
    // forma de decir si sus lineas acaban en LF o en CRLF porque no hay lineas
    // que acaben. No es prudencia: es que no hay nada que mirar.
    assert.equal(incumple({ eol: 'crlf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 0 }), null);
    assert.equal(incumple({ eol: 'lf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 0 }), null);
  });

  it('un `eol=crlf` con trabajo sin commitear el disco no se juzga, por lo de siempre', () => {
    // El LF del disco puede ser del committed o del trabajo del otro hilo, y
    // re-extrayendo se destruye ese trabajo. Es el mismo motivo que suspende el
    // `eol=lf`, y por eso el reparto lo manda a no auditables y no a fallos.
    assert.equal(incumple({ eol: 'crlf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 7, sucio: true }), null);
  });

  it('un `eol=lf` con CRLF en el BLOB incumple, y es el defecto de verdad', () => {
    // El blob sobrevive a un clon y lo puede commitar cualquiera. Sale antes que
    // la comprobacion de trabajo pendiente, porque el blob es el repositorio y
    // el trabajo del otro hilo esta en el disco, no en el indice.
    assert.equal(incumple({ eol: 'lf', crlfBlob: 8, sucio: true }), 'blob');
  });

  it('un `eol=lf` con CRLF solo en el DISCO incumple, pero git no lo ve', () => {
    assert.equal(incumple({ eol: 'lf', crlfBlob: 0, crlfDisco: 12, saltosDisco: 12 }), 'disco');
  });

  it('con trabajo sin commitear el disco no se juzga: no se sabe de quien es el CRLF', () => {
    assert.equal(incumple({ eol: 'lf', crlfBlob: 0, crlfDisco: 40, sucio: true }), null);
  });

  it('un binario con 0x0D no incumple nada, porque su byte 0x0D es un dato', () => {
    assert.equal(incumple({ eol: 'lf', text: 'unset', crlfBlob: 3, crlfDisco: 3 }), null);
    assert.equal(incumple({ eol: 'lf', gitLoVeBinario: true, crlfBlob: 1, crlfDisco: 1 }), null);
  });

  it('un fichero que cumple sale en null, y sin datos no es un fallo', () => {
    assert.equal(incumple({ eol: 'lf', crlfBlob: 0, crlfDisco: 0 }), null);
    assert.equal(incumple(), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// EL REPARTO, QUE ES LO QUE HACE QUE EL INFORME NO MIENTA
// ─────────────────────────────────────────────────────────────────────────

describe('el reparto de un conjunto de ficheros', () => {
  const ficheros = [
    { ruta: 'cumple.cpp', eol: 'lf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 10 },
    { ruta: 'sucio.cpp', eol: 'lf', crlfBlob: 0, crlfDisco: 40, saltosDisco: 40, sucio: true },
    { ruta: 'blob.md', eol: 'lf', crlfBlob: 8, crlfDisco: 0, saltosDisco: 0 },
    { ruta: 'disco.md', eol: 'lf', crlfBlob: 0, crlfDisco: 3, saltosDisco: 3 },
    { ruta: 'leeme.txt', eol: 'unspecified', crlfDisco: 40, saltosDisco: 40 },
    { ruta: 'build.bat', eol: 'crlf', crlfBlob: 0, crlfDisco: 460, saltosDisco: 460 },
    { ruta: 'batEnLf.bat', eol: 'crlf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 7 },
    { ruta: 'batSucio.bat', eol: 'crlf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 12, sucio: true },
    { ruta: 'demo.gif', eol: 'unspecified', text: 'unset', tieneCrBlob: true }
  ];

  it('separa lo limpiado de lo que no tiene regla, que no es lo mismo', () => {
    const r = auditaFicheros(ficheros);

    assert.equal(r.auditados, 7);
    assert.equal(r.sinPolitica, 2);
    assert.equal(r.conEolCrlf, 3);
  });

  it('los que incumplen se nombran, con su numero y con QUE se contaron', () => {
    const r = auditaFicheros(ficheros);

    // El par numero/nombre es lo que impide que el informe mienta: en
    // `batEnLf.bat` lo que sobra son 7 saltos en LF, y decir "7 CRLF" seria
    // justo lo contrario de lo que pasa.
    assert.deepEqual(r.incumplimientos, [
      { ruta: 'blob.md', donde: 'blob', crlf: 8, que: 'CRLF' },
      { ruta: 'disco.md', donde: 'disco', crlf: 3, que: 'CRLF' },
      { ruta: 'batEnLf.bat', donde: 'disco', crlf: 7, que: 'saltos en LF' }
    ]);
  });

  it('la regla contraria tambien suspende el juicio por trabajo sin commitear', () => {
    // `batSucio.bat` esta en la misma situation que `sucio.cpp`: el LF puede ser
    // del committed o del trabajo del otro hilo. Va a no auditables, no a fallos.
    assert.deepEqual(
      auditaFicheros(ficheros).noAuditables,
      ['sucio.cpp', 'batSucio.bat']
    );
  });

  it('el que tiene trabajo sin commitear va a su propia lista, no a la de fallos', () => {
    assert.deepEqual(auditaFicheros(ficheros).noAuditables, ['sucio.cpp', 'batSucio.bat']);
  });

  it('los binarios con 0x0D se cuentan y NO son incumplimiento', () => {
    const r = auditaFicheros(ficheros);

    assert.equal(r.binariosConCr, 1);
    assert.equal(r.incumplimientos.some((i) => i.ruta === 'demo.gif'), false);
  });

  it('sin ficheros no es un error: son todos los contadores a cero', () => {
    const r = auditaFicheros([]);

    assert.deepEqual(r, {
      auditados: 0, conEolCrlf: 0, sinPolitica: 0, binariosConCr: 0,
      incumplimientos: [], noAuditables: []
    });
    assert.deepEqual(auditaFicheros(), auditaFicheros([]));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LOS PARSEOS, DONDE UN FALLO TIENE QUE SER FALLO
// ─────────────────────────────────────────────────────────────────────────

describe('los parseos de la salida de git', () => {
  /** Una entrada de `ls-files -s -z` tal como la emite git: modo, blob, TAB, ruta, NUL. */
  const linea = (modo, blob, ruta) => modo + ' ' + blob + '\t' + ruta + '\0';

  it('`ls-files -s -z` se parte en modo, blob y ruta', () => {
    const entradas = camposDeLsFiles(
      linea('100644', '8a9df20a', 'dsp/DspCore.h') + linea('100644', '1b2c3d4e', 'docs/guia.md')
    );

    assert.equal(entradas.length, 2);
    assert.equal(entradas[0].ruta, 'dsp/DspCore.h');
    assert.equal(entradas[0].blob, '8a9df20a');
    assert.equal(entradas[1].ruta, 'docs/guia.md');
  });

  it('una ruta con tabulador no se parte por la mitad: el tabulador NO es separador', () => {
    // El `-z` es lo que hace posible esto. Sin el, el separador seria el TAB y
    // una ruta con un tabulador dentro se partiria en dos ficheros que no existen.
    const entradas = camposDeLsFiles(linea('100644', 'abc123', 'docs/weird\tname.md'));

    assert.equal(entradas.length, 1);
    assert.equal(entradas[0].ruta, 'docs/weird\tname.md');
  });

  it('LANZA si una linea no trae modo y blob, porque un parseo roto da una lista vacia', () => {
    // El fallo caro: devolver [] seria un guard que dice "no hay ficheros" sin
    // haber mirado ninguno, y no habria forma de distinguirlo de un repo vacio.
    assert.throws(
      () => camposDeLsFiles('esto-no-es-una-entrada'),
      /modo y blob/
    );
  });

  it('`check-attr` se lee de tres en tres, y `unspecified` NO es lo mismo que ausente', () => {
    const tabla = tablaDeCheckAttr(
      ['a.cpp', 'text', 'set', 'a.cpp', 'eol', 'lf',
        'b.txt', 'text', 'auto', 'b.txt', 'eol', 'unspecified'].join('\0') + '\0'
    );

    assert.equal(tabla['a.cpp'].eol, 'lf');
    assert.equal(tabla['b.txt'].text, 'auto');
    // La distincion que hace que un repo sin `.gitattributes` no parezca uno
    // donde todo esta bien: si `unspecified` se tratara como "sin valor", el
    // fichero se podria contar como auditado y el guard poneria verde de mentira.
    assert.equal(tabla['b.txt'].eol, 'unspecified');
    assert.notEqual(tabla['b.txt'].eol, undefined);
    assert.equal(tabla['no-existe'], undefined);
  });
});

describe('el informe dice lo que ha mirado', () => {
  it('dice cuantos ha auditados y cuantos no tienen regla, para que no pueda mentir', () => {
    const texto = formatea([
      { repo: 'A', ficheros: 100, auditados: 10, conEolCrlf: 2, sinPolitica: 88,
        binariosConCr: 4, incumplimientos: [], noAuditables: [] }
    ]);

    assert.match(texto, /auditados\)\s+: 10/);
    assert.match(texto, /SIN regla eol \(nada que juzgar\)\s+: 88/);
    assert.match(texto, /binarios con 0x0D \(informativo, NO es fallo\)\s+: 4/);
  });

  it('y cuando hay incumplimientos, dice donde esta y QUE se conto', () => {
    const texto = formatea([
      { repo: 'A', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, noAuditables: [],
        incumplimientos: [{ ruta: 'x.md', donde: 'blob', crlf: 8, que: 'CRLF' }] }
    ]);

    assert.match(texto, /A\/x\.md\s+<- 8 CRLF en el BLOB/);
  });

  it('y en un `eol=crlf` el numero y el nombre no pueden contradecirse', () => {
    // El informe tiene que decir "saltos en LF" cuando lo que sobra son LF. Si
    // aqui saliera "7 CRLF", el que lo leyera creeria que hay siete CRLF en un
    // fichero cuya regla es justo tenerlos, y se llevaria la conclusion
    // contraria de la real.
    const texto = formatea([
      { repo: 'A', ficheros: 10, auditados: 2, conEolCrlf: 1, sinPolitica: 7,
        binariosConCr: 0, noAuditables: [],
        incumplimientos: [{ ruta: 'a.bat', donde: 'disco', crlf: 7, que: 'saltos en LF' }] }
    ]);

    assert.match(texto, /A\/a\.bat\s+<- 7 saltos en LF en el DISCO/);
    assert.doesNotMatch(texto, /7 CRLF/);
  });

  it('el tope de no auditables sale en el informe, que es informacion de este run', () => {
    const texto = formatea([
      { repo: 'A', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: ['a.cpp', 'b.cpp'] }
    ]);

    assert.match(texto, new RegExp('no auditables.*: 2 \\(tope ' + NO_AUDITABLES_TOLERADOS + '\\)'));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// REPOS DE MENTIRA: LO QUE NO SE PUEDE INVENTAR
// ─────────────────────────────────────────────────────────────────────────

describe('el guard sobre un repo de verdad', () => {
  it('un repo sin `.gitattributes` no tiene nada que auditar, y eso NO es estar limpio', () => {
    const repo = repoDeMentira({ ficheros: { 'a.txt': 'uno\r\n' } });
    const r = auditaRepo(repo);

    assert.equal(r.auditados, 0);
    assert.equal(r.sinPolitica, 1);
    assert.deepEqual(r.incumplimientos, []);
  });

  it('un blob commiteado con CRLF incumple, y se ve que esta en el BLOB', () => {
    // El historico real: el fichero se commitea sin regla (con autocrlf=false,
    // que guarda el CRLF tal cual) y la regla se escribe despues. Con la regla
    // puesta en el momento del commit esto NO se puede fabricar, porque `git add`
    // normaliza siempre.
    const repo = repoDeMentira({
      ficheros: { 'a.txt': 'uno\r\ndos\r\n' },
      crlfAlCommitear: true,
      gitattributesDespues: '*.txt text eol=lf\n'
    });
    const r = auditaRepo(repo);

    assert.deepEqual(r.incumplimientos, [{ ruta: 'a.txt', donde: 'blob', crlf: 2, que: 'CRLF' }]);
  });

  it('el mismo repo sale limpio si el blob se commiteo normalizado', () => {
    const repo = repoDeMentira({
      gitattributes: '*.txt text eol=lf\n',
      ficheros: { 'a.txt': 'uno\ndos\n' },
      crlfAlCommitear: false
    });

    assert.deepEqual(auditaRepo(repo).incumplimientos, []);
  });

  it('CRLF escrito en el disco con el blob limpio incumple, aunque `git diff` no lo vea', () => {
    const repo = repoDeMentira({
      gitattributes: '*.txt text eol=lf\n',
      ficheros: { 'a.txt': 'uno\ndos\n' }
    });

    writeFileSync(join(repo, 'a.txt'), 'uno\r\ndos\r\n');

    // Lo que se mide, medido en laboratorio y no de memoria: `git diff` normaliza
    // al comparar y sale VACIO. `git status` si lo marca, pero `git add` lo deja
    // limpio sin stagear nada, porque el blob sigue en LF. Y hay una tercera
    // cosa: si el indice guardaba el stat de cuando se hizo el checkout, ni
    // siquiera `git status` lo ve. Por eso no hay ninguna forma de fiarse de
    // git para esto, y por eso hace falta un guard que mire los bytes.
    assert.equal(git(repo, ['diff', '--stat']), '');

    git(repo, ['add', '-A']);
    assert.equal(git(repo, ['diff', '--cached', '--stat']), '',
      'tras el `git add` el indice sigue igual: el blob no cambia');

    // Y despues de eso, el unico rastro del CRLF son los bytes del disco.
    const r = auditaRepo(repo);

    assert.deepEqual(r.incumplimientos, [{ ruta: 'a.txt', donde: 'disco', crlf: 2, que: 'CRLF' }]);
  });

  it('un binario con 0x0D se cuenta y no se incumple', () => {
    const repo = repoDeMentira({
      gitattributes: '*.bin binary\n',
      ficheros: { 'datos.bin': 'AB' + CR + 'CD' + CR + CR + 'EF' },
      crlfAlCommitear: true
    });
    const r = auditaRepo(repo);

    assert.deepEqual(r.incumplimientos, []);
    assert.equal(r.binariosConCr, 1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // LA DIRECCION CONTRARIA, MEDIDA SOBRE UN REPO DE VERDAD
  //
  // Los tests de arriba usan ficheros inventados, y un fichero inventado no
  // pasa por `git add`. Aqui se mide lo que de verdad hace git, que es la unica
  // forma de saber si la puerta de `eol=crlf` esta bien puesta o solo bien
  // escrita.
  // ─────────────────────────────────────────────────────────────────────

  it('un `.bat` con `eol=crlf` y LF en disco incumple, aunque su blob este bien', () => {
    const repo = repoDeMentira({
      gitattributes: '*.bat text eol=crlf\n',
      ficheros: { 'a.bat': 'uno\ndos\ntres\n' }
    });
    const r = auditaRepo(repo);

    // Lo que se comprueba aqui, en tres pasos que son los tres hechos:
    //
    //  1. El BLOB esta en LF, que es lo correcto: con `text` activo el indice
    //     guarda siempre la forma normalizada. Asi que el indice NO es el
    //     problema, y el guard no puede senalar el blob.
    //  2. El DISCO esta en LF, cuando la regla pide CRLF. Ese es el defecto.
    //  3. `git status` sale VACIO, porque git normaliza antes de comparar. Es
    //     el mismo silencio que en el caso de `eol=lf`, y por eso hace falta un
    //     guard: no hay ninguna forma de fiarse de git para esto.
    assert.equal(git(repo, ['cat-file', 'blob', ':a.bat']).indexOf(CR), -1,
      'el blob deberia estar normalizado a LF');
    assert.equal(git(repo, ['status', '--porcelain']), '',
      'git no ve este incumplimiento: por eso hay que mirar los bytes');

    assert.deepEqual(r.incumplimientos,
      [{ ruta: 'a.bat', donde: 'disco', crlf: 3, que: 'saltos en LF' }]);
  });

  it('el mismo `.bat` sale limpio con CRLF en disco, y el indice no cambia', () => {
    const repo = repoDeMentira({
      gitattributes: '*.bat text eol=crlf\n',
      ficheros: { 'a.bat': 'uno\ndos\ntres\n' }
    });

    // Re-extrayendo del indice: es el arreglo, y es lo que hace la puerta
    // decir "se arregla re-extrayendo" en vez de "con un commit". No toca el
    // repositorio: el blob sigue siendo el mismo.
    const blobAntes = git(repo, ['rev-parse', ':a.bat']);
    rmSync(join(repo, 'a.bat'));
    git(repo, ['checkout-index', '-f', '--', 'a.bat']);

    assert.equal(git(repo, ['rev-parse', ':a.bat']), blobAntes,
      'el indice no debe cambiar al re-extrayer');
    assert.deepEqual(auditaRepo(repo).incumplimientos, []);
  });

  it('un `.bat` con `eol=crlf` y el BLOB en CRLF incumple por el blob, no por el disco', () => {
    // Al reves del anterior, y por el mismo camino que el defecto historico de
    // `MidiKeyboard/README.md`: el fichero se commitea SIN la regla (con
    // autocrlf=false, que guarda el CRLF tal cual) y la regla se escribe
    // despues. El indice se queda con el CRLF que ya estaba escrito.
    const repo = repoDeMentira({
      ficheros: { 'a.bat': 'uno\r\ndos\r\n' },
      crlfAlCommitear: true,
      gitattributesDespues: '*.bat text eol=crlf\n'
    });
    const r = auditaRepo(repo);

    assert.deepEqual(r.incumplimientos,
      [{ ruta: 'a.bat', donde: 'blob', crlf: 2, que: 'CRLF' }]);
  });

  it('un `.bat` de UNA LINEA sin salto final no se juzga, ni en un sentido ni en el otro', () => {
    // El caso que el comentario del guard daba como motivo para dejar la puerta
    // cerrada. Aqui se mide que la distincion por `saltosDisco` lo separa bien:
    // el fichero tiene cero saltos, y no hay forma de afirmar nada sobre como
    // acaban sus lineas porque no hay lineas que acaben.
    const repo = repoDeMentira({
      gitattributes: '*.bat text eol=crlf\n',
      ficheros: { 'a.bat': '@echo off' }
    });

    assert.deepEqual(auditaRepo(repo).incumplimientos, []);
  });

  it('con trabajo sin commitear el fichero no se juzga, pero se cuenta como no auditable', () => {
    const repo = repoDeMentira({
      gitattributes: '*.txt text eol=lf\n',
      ficheros: { 'a.txt': 'uno\n' }
    });

    writeFileSync(join(repo, 'a.txt'), 'cambiado por otro hilo\r\n');
    const r = auditaRepo(repo);

    assert.deepEqual(r.incumplimientos, []);
    assert.deepEqual(r.noAuditables, ['a.txt']);
  });

  it('la defensa muerde: anadir la regla hace aparecer el incumplimiento', () => {
    const repo = repoDeMentira({
      ficheros: { 'a.txt': 'uno\r\ndos\r\n' },
      crlfAlCommitear: true
    });

    // Sin `.gitattributes` no hay nada que juzgar, y el fichero con CRLF en el
    // blob pasa desapercibido.
    assert.deepEqual(auditaRepo(repo).incumplimientos, []);

    writeFileSync(join(repo, '.gitattributes'), '*.txt text eol=lf\n');
    const despues = auditaRepo(repo);

    assert.deepEqual(despues.incumplimientos, [{ ruta: 'a.txt', donde: 'blob', crlf: 2, que: 'CRLF' }]);
  });

  it('un repo que git no puede leer LANZA, en vez de salir con cero incumplimientos', () => {
    // El fallo caro de cualquier guard: un error propio disfrazado de "limpio".
    assert.throws(
      () => auditaRepo(join(temporal('no-existe-'), 'tampoco')),
      /ni llego a ejecutarse en/
    );
  });

  it('un repo sin commits sale con los contadores a cero, no con una excepcion', () => {
    const repo = repoDeMentira({ ficheros: { 'a.txt': 'uno\n' }, sinAdd: true, sinCommit: true });
    const r = auditaRepo(repo);

    // Sin indice no hay ficheros trackeados, que es distinto de "todo bien":
    // se ve en que `ficheros` es 0.
    assert.equal(r.ficheros, 0);
    assert.equal(r.auditados, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LA SUITE REAL, CON UN SUELO QUE IMPIDE PONERSE VERDE POR NO MIRAR
// ─────────────────────────────────────────────────────────────────────────

describe('la suite real', () => {
  it('ningun fichero incumple la regla eol que declara', () => {
    const porRepo = auditaSuite();

    assert.deepEqual(porRepo.flatMap((r) => r.incumplimientos
      .map((i) => r.repo + '/' + i.ruta + ' <- ' + i.crlf + ' ' + i.que + ' en ' + i.donde)), []);
  });

  it('y los no auditables no pasan del tope', () => {
    const sinAuditar = auditaSuite().reduce((a, r) => a + r.noAuditables.length, 0);

    assert.ok(sinAuditar <= NO_AUDITABLES_TOLERADOS,
      sinAuditar + ' ficheros sin auditar, de un tope de ' + NO_AUDITABLES_TOLERADOS);
  });

  it('y los ficheros con `eol=crlf` se juzgan de verdad, no se cuentan y ya', () => {
    // El suelo de la puerta contraria. Sin el, `auditados` podria seguir dando
    // verde con la puerta de `eol=crlf` desconectada de la logica, porque el
    // numero de `auditados` no contaria los 25 ficheros con esa regla.
    const conCrlf = auditaSuite().reduce((a, r) => a + r.conEolCrlf, 0);

    assert.ok(conCrlf >= 25, 'solo ha visto ' + conCrlf + ' ficheros con eol=crlf');
  });

  it('y mira de verdad: mas de quinientos ficheros con regla eol declarada', () => {
    // El suelo. Sin el, este guard podria ponerse verde mirando tres repos, y
    // el numero de repos revisados no lo delata porque descubrir no es mirar.
    // El suelo sube de 500 a 880 porque `auditados` ahora cuenta las DOS
    // direcciones: antes solo contaba los `eol=lf` y hoy son 887.
    const auditados = auditaSuite().reduce((a, r) => a + r.auditados, 0);

    assert.ok(auditados > 880, 'solo ha auditado ' + auditados + ' ficheros');
  });

  it('y de mas de quince mil ficheros trackeados en la suite', () => {
    const ficheros = auditaSuite().reduce((a, r) => a + r.ficheros, 0);

    assert.ok(ficheros > 15000, 'solo ha visto ' + ficheros + ' ficheros trackeados');
  });

  it('y mira al menos diez repos', () => {
    assert.ok(auditaSuite().length >= 10);
  });
});