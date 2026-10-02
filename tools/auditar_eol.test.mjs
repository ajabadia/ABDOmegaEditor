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
  auditaSuite, auditaFicheros, auditaRepo, camposDeLsFiles, declaraText,
  esBinario, formatea, incumple, juzgaDisco, tablaDeCheckAttr, CR,
  NO_AUDITABLES_TOLERADOS
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

  // ───────────────────────────────────────────────────────────────────────
  // `text` SIN `eol`: LA POLITICA PARCIAL
  //
  // Con `text` declarado, el indice guarda siempre la forma normalizada, y eso
  // se puede juzgar. El disco NO, porque sin `eol` lo que decide el checkout es
  // `core.autocrlf`, que es de la maquina. Estos tests separan las dos cosas.
  // ───────────────────────────────────────────────────────────────────────

  it('un `text=auto` sin `eol` con CRLF en el BLOB incumple', () => {
    // Es el mismo defecto que en un `eol=lf`, por el mismo motivo: con `text`
    // activo el indice guarda la forma normalizada y un CRLF ahi sobra.
    assert.equal(incumple({ text: 'auto', eol: 'unspecified', crlfBlob: 12 }), 'blob');
    assert.equal(incumple({ text: 'set', eol: 'unspecified', crlfBlob: 1 }), 'blob');
  });

  it('un `text=auto` sin `eol` con CRLF en el DISCO NO incumple, porque el disco no se juzga', () => {
    // La asimetria que hace que este guard siga siendo usable en Windows. Con
    // `core.autocrlf=true` —que es el valor de esta maquina en los quince
    // repos— el checkout pone CRLF, y ese CRLF es lo que la politica de la
    // maquina manda. Juzgarlo seria el error de la primera version del guard,
    // que ponia en rojo ficheros que estaban bien.
    assert.equal(
      incumple({ text: 'auto', eol: 'unspecified', crlfBlob: 0, crlfDisco: 460, saltosDisco: 460 }),
      null
    );
  });

  it('sin `text` ni `eol` no hay nada que juzgar, aunque el blob tenga CRLF', () => {
    // El caso de los 15.489 ficheros que no declaran nada. Sin politica no hay
    // incumplimiento, y contarlos como fallidos seria inventar una regla.
    assert.equal(incumple({ text: 'unspecified', eol: 'unspecified', crlfBlob: 30 }), null);
    assert.equal(incumple({ crlfBlob: 30 }), null);
  });

  it('`eol` declarado cuenta como politica aunque `text` salga unspecified', () => {
    // Medido: con `*.txt eol=lf` y SIN atributo `text`, `check-attr` devuelve
    // `text: unspecified` y `eol: lf`, pero el `git add` normaliza igual y el
    // propio git avisa "CRLF will be replaced by LF". O sea que `eol` implica
    // `text`. Fijarse solo en `text` dejaria de vigilar el blob de TODOS los
    // `eol=lf` de la suite, que es justo lo que este guard existe para mirar.
    assert.equal(declaraText({ eol: 'lf', text: 'unspecified' }), true);
    assert.equal(declaraText({ eol: 'crlf', text: 'unspecified' }), true);
    assert.equal(declaraText({ text: 'auto', eol: 'unspecified' }), true);
    assert.equal(declaraText({ text: 'unspecified', eol: 'unspecified' }), false);
    assert.equal(declaraText({}), false);

    assert.equal(incumple({ eol: 'lf', text: 'unspecified', crlfBlob: 8 }), 'blob');
  });

  it('solo `eol=lf` y `eol=crlf` gobiernan el disco', () => {
    assert.equal(juzgaDisco({ eol: 'lf' }), true);
    assert.equal(juzgaDisco({ eol: 'crlf' }), true);
    assert.equal(juzgaDisco({ eol: 'unspecified', text: 'auto' }), false);
    assert.equal(juzgaDisco({}), false);
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
    { ruta: 'leeme.txt', eol: 'unspecified', text: 'unspecified', crlfDisco: 40, saltosDisco: 40 },
    { ruta: 'contrato.json', eol: 'unspecified', text: 'auto', crlfBlob: 0, crlfDisco: 90, saltosDisco: 90 },
    { ruta: 'contratoCrlf.json', eol: 'unspecified', text: 'auto', crlfBlob: 6, crlfDisco: 0, saltosDisco: 0 },
    { ruta: 'icono.svg', eol: 'unspecified', text: 'auto', crlfBlob: 3 },
    { ruta: 'build.bat', eol: 'crlf', crlfBlob: 0, crlfDisco: 460, saltosDisco: 460 },
    { ruta: 'batEnLf.bat', eol: 'crlf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 7 },
    { ruta: 'batSucio.bat', eol: 'crlf', crlfBlob: 0, crlfDisco: 0, saltosDisco: 12, sucio: true },
    { ruta: 'demo.gif', eol: 'unspecified', text: 'unset', tieneCrBlob: true }
  ];

  it('separa lo limpiado de lo que no tiene regla, que no es lo mismo', () => {
    const r = auditaFicheros(ficheros);

    // Los tres ficheros con `text=auto` sin `eol` son auditados, no "sin
    // politica": tienen politica para el indice aunque no la tengan para el
    // disco. Si se contaran como `sinPolitica`, el guard podria ponerse verde
    // sin haber mirado 123 ficheros reales.
    assert.equal(r.auditados, 10);
    assert.equal(r.sinPolitica, 2);
    assert.equal(r.conEolCrlf, 3);
    assert.equal(r.textSinEol, 3);
  });

  it('un `text=auto` con CRLF en el blob sale como incumplimiento del indice', () => {
    const delIndice = auditaFicheros(ficheros).incumplimientos
      .filter((i) => i.ruta === 'icono.svg');

    assert.equal(delIndice.length, 1);
    assert.equal(delIndice[0].donde, 'blob');
    assert.equal(delIndice[0].crlf, 3);
  });

  it('los que incumplen se nombran, con su numero y con QUE se contaron', () => {
    const r = auditaFicheros(ficheros);

    // El par numero/nombre es lo que impide que el informe mienta: en
    // `batEnLf.bat` lo que sobra son 7 saltos en LF, y decir "7 CRLF" seria
    // justo lo contrario de lo que pasa.
    assert.deepEqual(r.incumplimientos, [
      { ruta: 'blob.md', donde: 'blob', crlf: 8, que: 'CRLF' },
      { ruta: 'disco.md', donde: 'disco', crlf: 3, que: 'CRLF' },
      { ruta: 'contratoCrlf.json', donde: 'blob', crlf: 6, que: 'CRLF' },
      { ruta: 'icono.svg', donde: 'blob', crlf: 3, que: 'CRLF' },
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
      auditados: 0, conEolCrlf: 0, textSinEol: 0, sinPolitica: 0, binariosConCr: 0,
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
      { repo: 'A', ficheros: 100, auditados: 10, conEolCrlf: 2, textSinEol: 3,
        sinPolitica: 85, binariosConCr: 4, incumplimientos: [], noAuditables: [] }
    ]);

    assert.match(texto, /regla eol declarada \(auditados\)\s+: 10/);
    assert.match(texto, /SIN regla eol ni text \(nada que juzgar\)\s+: 85/);
    assert.match(texto, /binarios con 0x0D \(informativo, NO es fallo\)\s+: 4/);
    // La casilla que separa "juzgado por el indice" de "juzgado por los dos
    // lados". Si no estuviera, los 3 ficheros con `text` sin `eol` estarian
    // camuflados entre los 85 que no tienen nada que mirar.
    assert.match(texto, /text y SIN eol \(solo el indice\)\s+: 3/);
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

  it('el informe dice de que repo es cada no auditable, que es para eso que sirve', () => {
    // El numero solo dice cuantos son. Quien lee el informe tiene que poder
    // saber a que hilo esperar sin abrir los 17 repos, y eso solo se puede si
    // el informe nombra el repo de cada uno.
    const texto = formatea([
      { repo: 'ABDEep', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: ['a.cpp', 'b.cpp', 'c.cpp'] },
      { repo: 'ABDNeural', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: ['d.cpp'] },
      { repo: 'Limpio', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: [] }
    ]);

    assert.match(texto, /de esos, por repo/);
    assert.match(texto, /ABDEep/);
    assert.match(texto, /ABDNeural/);
    // El repo que no aporta ninguno no se nombra:=listarlo seria ruido.
    assert.doesNotMatch(texto, /Limpio/);
  });

  it('el desglose va de mas a menos no auditables, que es como se lee un reparto', () => {
    const texto = formatea([
      { repo: 'Poco', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: ['a.cpp'] },
      { repo: 'Mucho', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [],
        noAuditables: ['b.cpp', 'c.cpp', 'd.cpp', 'e.cpp'] }
    ]);

    assert.ok(texto.indexOf('Mucho') < texto.indexOf('Poco'),
      'el repo con mas no auditables tiene que salir antes');
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
    // numero de `auditados` no contaria los ficheros con esa regla.
    //
    // El suelo es quince, y antes era veinte, porque de los veintidos que ve el
    // runner veinte son de un solo repo (ABDOmegaUnified) y los otros dos de
    // ABDAudioLab. Un suelo pegado a la medida no es un suelo: es una foto de
    // como esta la suite hoy, y en cuanto un hilo anade o quita un `.bat` sale
    // rojo sin que el guard haya dejado de mirar nada.
    const conCrlf = auditaSuite().reduce((a, r) => a + r.conEolCrlf, 0);

    assert.ok(conCrlf >= 15, 'solo ha visto ' + conCrlf + ' ficheros con eol=crlf');
  });

  it('y mira de verdad: mas de quinientos ficheros con regla eol declarada', () => {
    // El suelo. Sin el, este guard podria ponerse verde mirando tres repos, y
    // el numero de repos revisados no lo delata porque descubrir no es mirar.
    //
    // Y aqui hay que contar una historia, porque es la segunda vez que este
    // suelo se ajusta y la primera dio verguenza. Medido:
    //
    //   clon limpio de las ramas por defecto       667
    //   runner, run 37023946682                    674
    //   runner, run 37012783300 (unas horas antes) 1447
    //   maquina de desarrollo                     1051
    //
    // Los dos numeros del runner son la MISMA suite y el MISMO paso de clon,
    // byte a byte, y entre ellos se lleve mas de la mitad. La razon es que lo
    // que este suelo mide no es el guard sino el estado de los catorce repos
    // hermanos, que empuja gente distinta varias veces al dia. Un suelo
    // absoluto aqui no es una propiedad del codigo: es una fotografia.
    //
    // Asi que quinientos, por debajo de la medida mas pobre que se ha visto
    // (667) y con margen para que la suite se mueva. Y si algun dia esto se
    // vuelve a rozar, la respuesta no es bajar el suelo otra vez: es mirar si
    // un repo ha dejado de declarar reglas, que es lo unico que lo justificaria.
    const auditados = auditaSuite().reduce((a, r) => a + r.auditados, 0);

    assert.ok(auditados > 500, 'solo ha auditado ' + auditados + ' ficheros');
  });

  it('y de mas de diez mil ficheros trackeados en la suite', () => {
    // El suelo es el MENOR de los entornos, no el mayor. En la maquina de
    // desarrollo se ven 16716 ficheros y en el runner 11511: la maquina tiene
    // historia y ramas que el clon `--depth 1` no baja. Un suelo de quince mil
    // seria mas exigente que el runner, y un suelo que el runner no puede
    // cumplir no comprueba nada: en CI el test falla siempre y nadie lo lee
    // como un suelo, sino como ruido.
    //
    // Diez mil, y no once, por el mismo motivo que el de arriba: entre los dos
    // runs del runner se perdieron 726 ficheros sin que nadie tocara el guard,
    // y la cifra depende mucho de un solo repo (ABDJUNiO601 aporta 763
    // ficheros en el clon del runner y 6007 en la maquina, que tiene ramas que
    // el `--depth 1` no baja). Un suelo con un cuatro por ciento de margen
    // sobre la medida es un suelo que rompe solo.
    const ficheros = auditaSuite().reduce((a, r) => a + r.ficheros, 0);

    assert.ok(ficheros > 10000, 'solo ha visto ' + ficheros + ' ficheros trackeados');
  });

  it('y mira al menos diez repos', () => {
    assert.ok(auditaSuite().length >= 10);
  });

  it('y mas de cien ficheros con `text` sin `eol`, que se juzgan por el indice', () => {
    // El suelo de la ultima puerta. Si `declaraText` se rompiera y volviera a
    // exigir un `text` declarado que `check-attr` no devuelve, estos 123
    // ficheros volverian a la casilla de "nada que juzgar" y el numero de
    // `auditados` bajaria de 1.010 a 887 sin que nada se pusiera rojo. Este
    // test es lo que lo delata.
    const soloIndice = auditaSuite().reduce((a, r) => a + (r.textSinEol || 0), 0);

    assert.ok(soloIndice > 100, 'solo ha visto ' + soloIndice + ' ficheros con text sin eol');
  });
});