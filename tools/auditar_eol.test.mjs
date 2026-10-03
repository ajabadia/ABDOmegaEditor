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
import { basename, join } from 'node:path';

import {
  auditaSuite, auditaFicheros, auditaRepo, camposDeLsFiles, declaraText,
  esBinario, formatea, incumple, juzgaDisco, tablaDeCheckAttr, CR,
  NO_AUDITABLES_TOLERADOS, reglasSinCommitearDe, REGLAS_SIN_COMMITEAR_TOLERADAS,
  auditaArbol, auditaRamas, auditaRamasDeSuite, formateaRamas, ramasDeRepo,
  resumenDeRamas, RAMAS_AUDITADAS_MINIMAS, REPOS_CON_RAMAS_MINIMOS,
  detalleDeRamas, diagnosticoDeRamas, formateaDiagnostico, RAMAS_POR_REPO,
  sinPrefijoDeRef,
  auditaSombras, auditaSombrasDeSuite, anidadosDe, anidadoQueManda, sombrasDe,
  sombrasQuePasan, formateaSombras, SOMBRAS_TOLERADAS
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

  it('las reglas sin commitear salen con su repo, su motivo y su techo', () => {
    // Con datos inventados, que es donde se puede comprobar las dos mitades: que
    // el bloque aparece cuando hay algo que decir, y que el techo de ese repo va
    // impreso al lado para que se sepa cuanto le queda antes de romperse.
    const texto = formatea([
      { repo: 'ABDNeural', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: [],
        reglasSinCommitear: [{ ruta: '.gitattributes', porQue: 'no esta trackeado' }] },
      { repo: 'Limpio', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: [], reglasSinCommitear: [] }
    ]);

    assert.match(texto, /reglas que git APLICA y no estan en ningun commit/);
    assert.match(texto, /ABDNeural\/\.gitattributes\s+<- no esta trackeado/);
    // El techo sale del mapa, no de un numero escrito aqui: el dato que importa
    // es que el informe diga CUAL es el techo de ese repo, porque asi se sabe si
    // lo que ha aparecido se lo come o lo pasa. Fijar el valor seria atar el test
    // a un estado transitorio de la suite.
    assert.match(texto, new RegExp('tope de ABDNeural: '
      + (REGLAS_SIN_COMMITEAR_TOLERADAS.ABDNeural || 0)));
    // El repo que no tiene ninguna tampoco se nombra, por lo mismo que antes.
    assert.doesNotMatch(texto, /Limpio/);
  });

  it('y si no hay ninguna, el bloque NO sale, porque un aviso vacio es ruido', () => {
    // El otro estado, que es el que vera el runner mientras ABDNeural y ABDEep
    // tengan a medias sus ficheros. Un bloque que se imprime siempre Habituala a
    // leerse sin leer, y ese es el modo de fallo de todos los avisos.
    const texto = formatea([
      { repo: 'ABDEep', ficheros: 10, auditados: 2, conEolCrlf: 0, sinPolitica: 8,
        binariosConCr: 0, incumplimientos: [], noAuditables: [], reglasSinCommitear: [] }
    ]);

    assert.doesNotMatch(texto, /reglas que git APLICA/);
    assert.match(texto, /repos con reglas eol SIN commitear\s+: 0/);
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

/**
 * Un repo con una rama extra, para lo que el clon de una sola rama no trae.
 *
 * Monta la rama en un clon de verdad y no con `update-ref` porque lo que hay que
 * probar es justo lo que cambia: una rama tiene un ARBOL y un COMMIT, y son las
 * dos cosas las que `--source` y el filtro por commit necesitan. Un ref al aire
 * pasaria el filtro y no tendria arbol, que es un test que pasa por el motivo
 * equivocado.
 */
function repoConRama (nombreRama, ficheros, reglaEnLaRama) {
  // Un fichero base, porque un repo sin nada no tiene commit y no se puede clonar.
  const repo = repoDeMentira({ ficheros: { 'base.txt': 'base' + String.fromCharCode(10) } });

  // El clon va a un temporal NUEVO cada vez y no a un hermano con nombre fijo: un
  // nombre fijo en el directorio temporal de la maquina es una colision esperando
  // a que dos tests lo pidan a la vez.
  const destino = join(temporal('clon-'), 'repo');

  // El clon va con `autocrlf=false` por lo mismo que va en el workflow: el
  // `core.autocrlf=true` del gitconfig de esta maquina pondria CRLF en el arbol
  // de trabajo, y el `add` de la rama se llevaria ese CRLF al indice y crearia
  // incumplimientos que no existen. El runner no tiene ese `autocrlf`, asi que
  // sin esto el fixture fabricaria en local lo que en CI no occurre.
  git(repo, ['-c', 'core.autocrlf=false', 'clone', '--quiet', '--no-single-branch',
    'file:///' + repo.replace(/\\/g, '/'), destino]);

  const inicial = git(destino, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();

  git(destino, ['checkout', '-q', '-b', nombreRama]);

  for (const f of ficheros) {
    mkdirSync(join(destino, f.ruta, '..'), { recursive: true });
    writeFileSync(join(destino, f.ruta), f.contenido);
  }

  // Los ficheros se commitean SIN la regla, con `core.autocrlf=false`, para poder
  // dejar CRLF en el indice. Con la regla puesta, `git add` normaliza siempre y
  // el incumplimiento se borra uno solo: es el caso "la regla llego tarde" que el
  // propio guard documenta, aqui usado como forma de fabricar el defecto.
  // El `false` va en EL ADD, no solo en el commit: con el `core.autocrlf=true`
  // que tiene esta maquina, `git add` normaliza al meter el blob y el CRLF se
  // pierde antes de que exista ningun commit. En el runner no hay ese
  // `autocrlf`, asi que sin esto el mismo test fabricaria el defecto en la
  // maquina y no en CI.
  git(destino, ['-c', 'core.autocrlf=false', 'add', '-A']);
  git(destino, ['-c', 'core.autocrlf=false', 'commit', '-qm', 'los ficheros']);

  // Y la regla se escribe DESPUES, en la rama y no en el repo de origen: si
  // viviera en el origen, estaria en el arbol deployado tambien y el test no
  // probaria que `check-attr` usa `--source`.
  if (reglaEnLaRama !== undefined) {
    writeFileSync(join(destino, '.gitattributes'), reglaEnLaRama);
    git(destino, ['add', '.gitattributes']);
    git(destino, ['commit', '-qm', 'y ahora la regla']);
  }

  // Se sube al remoto, porque es la unica forma de que exista el
  // `refs/remotes/origin/<rama>` que el guard lee. Una rama que solo existe en
  // local no la ve ni el guard ni el runner, y probarla asi seria probarse a si
  // mismo.
  git(destino, ['push', '-q', 'origin', nombreRama]);

  // Y se vuelve a la rama de origen, que es la que queda DESPLEGADA: es la
  // situacion del runner, la rama por defecto checkoutada y las demas solo como
  // ref. Al reves, la rama interesante seria HEAD y el guard la saltaria por estar
  // ya auditada, y el test pasaria sin probar nada.
  // Con `-f` porque el clon sale del checkout con el `core.autocrlf=true` de la
  // maquina y al volver a `master` los ficheros del disco son CRLF donde el arbol
  // espera LF. Sin forzar, el checkout se niega y el test falla por un motivo que
  // no tiene nada que ver con lo que esta probando.
  git(destino, ['checkout', '-q', '-f', inicial]);

  return destino;
}

// ─────────────────────────────────────────────────────────────────────────
// LAS REGLAS QUE NO ESTAN EN NINGUN COMMIT
// ─────────────────────────────────────────────────────────────────────────

describe('que reglas esta aplicando git que no estan en ningun commit', () => {
  it('un `.gitattributes` sin trackear sale, y sale dicho SIN TRACKEAR', () => {
    // El caso de ABDNeural, que es el que motivo la puerta: el fichero esta en
    // el disco, git lo aplica, y no hay ningun commit que lo contenga.
    assert.deepEqual(
      reglasSinCommitearDe({ sinTrackear: ['.gitattributes'] }),
      [{ ruta: '.gitattributes', porQue: 'no esta trackeado' }]
    );
  });

  it('un `.gitattributes` trackeado y cambiado sale por OTRO motivo', () => {
    // El caso de ABDEep, que es el otro sentido: el fichero existe en cualquier
    // clon, pero con menos reglas de las que se estan aplicando aqui.
    assert.deepEqual(
      reglasSinCommitearDe({ enIndice: ['.gitattributes'], sucios: ['.gitattributes'] }),
      [{ ruta: '.gitattributes', porQue: 'cambiado sin commitear' }]
    );
  });

  it('trackeado y sin cambios NO sale, porque ahi las reglas si estan en un commit', () => {
    assert.deepEqual(
      reglasSinCommitearDe({ enIndice: ['.gitattributes'], sucios: [] }),
      []
    );
  });

  it('un repo sin `.gitattributes` tampoco sale, y no es lo mismo que el de antes', () => {
    // Los dos casos que NO son un hallazgo: no declarar reglas no es tenerlas
    // sin commitear. Si esto saliera, la puerta seria un aviso perpetuo sobre
    // quince repos, que es como se acostumbra una puerta a que la dejen de
    // mirar.
    assert.deepEqual(reglasSinCommitearDe(), []);
    assert.deepEqual(reglasSinCommitearDe({ enIndice: ['README.md'], sucios: ['README.md'] }), []);
  });

  it('muele en los dos repos que hay, por los dos motivos', () => {
    // Los dos a la vez, que es como se los va a encontrar: uno por cada
    // sentido. Si esto no ve a los dos, la puerta no esta mirando lo que dice
    // mirar.
    const salida = reglasSinCommitearDe({
      enIndice: ['src/a.cpp', '.gitattributes'],
      sinTrackear: ['.gitattributes'],
      sucios: ['.gitattributes']
    });

    assert.deepEqual(salida, [
      { ruta: '.gitattributes', porQue: 'no esta trackeado' },
      { ruta: '.gitattributes', porQue: 'cambiado sin commitear' }
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// REPOS DE MENTIRA: LO QUE NO SE PUEDE INVENTAR
// ─────────────────────────────────────────────────────────────────────────

describe('las ramas que no son la que esta deployada', () => {
  /** La auditoria de UNA rama por su nombre, o un error que lo diga. */
  function rama (repo, nombre) {
    const todas = auditaRamas(repo);
    const encontrada = todas.find((r) => r.rama === 'origin/' + nombre);

    assert.ok(encontrada, 'no se ha auditado la rama ' + nombre + '; hay: '
      + todas.map((r) => r.rama).join(', '));

    return encontrada.auditoria;
  }

  it('`git grep` con una rama antepone `ref:` a cada ruta, y hay que quitarselo', () => {
    // El fallo que hacia que esta puerta fuera verde sin mirar: `git grep` con
    // una rama imprime `origin/main:src/a.cpp`, esa ruta no casa con ninguna del
    // `ls-tree`, y el resultado es que NINGUN blob tiene CR. O sea, todos los
    // repos limpios y ninguno mirado.
    assert.equal(sinPrefijoDeRef('origin/main:src/a.cpp', 'origin/main'), 'src/a.cpp');
    assert.equal(sinPrefijoDeRef('origin/main:v1.2/file.md', 'origin/main'), 'v1.2/file.md');

    // Y si el prefijo no esta, la ruta se queda como esta: quitar hasta el primer
    // `:` partiria `v1.2/file.md` en dos y volveria a no casar con nada.
    assert.equal(sinPrefijoDeRef('src/a.cpp', 'origin/main'), 'src/a.cpp');
    assert.equal(sinPrefijoDeRef('origin/otra:src/a.cpp', 'origin/main'), 'origin/otra:src/a.cpp');
  });

  it('la rama que esta comprobada NO se audita dos veces', () => {
    // El `auditaRepo` de este repo ya ha mirado su indice y su disco. Si aqui se
    // volviera a mirar el mismo commit con otros medios, el numero saldria igual
    // y el tiempo seria doble, que es la forma mas tonta de pagar por una puerta.
    const repo = repoConRama('feature/limpia',
      [{ ruta: 'sub/a.txt', contenido: 'sin CRLF\n' }]);

    const nombres = auditaRamas(repo).map((r) => r.rama);

    // El clon sale desplegado en `origin/master`, que es la que ya ha mirado
    // `auditaRepo`. La otra tiene que estar en la lista y la desplegada fuera: si
    // el filtro fuera "todo lo que no se llama como HEAD" en vez de "todo lo que
    // no es este commit", esto pasaria y estariamos midiendo otra cosa.
    assert.equal(nombres.includes('origin/master'), false,
      'la rama desplegada se audita en auditaRepo, no aqui');
    assert.equal(nombres.includes('origin/feature/limpia'), true);
  });

  it('una rama con CRLF bajo `eol=lf` incumple, y el arbol desplegado no lo ve', () => {
    // Este es EL test. El incumplimiento esta en el indice de una rama que nadie
    // ha comprobado, asi que `auditaRepo` —que mira el indice y el disco de lo que
    // esta deployado— no puede verlo. Si este test pasara con el repo entero
    // limpio, la puerta de las ramas no estaria mirando nada.
    //
    // Y la regla va puesta SOLO en la rama. Ahi esta el otro motivo del test:
    // si `check-attr` no llevara `--source`, responderia con el
    // `.gitattributes` del arbol deployado, que no declara nada para
    // `sub/`, y el fichero saldria sin politica.
    const repo = repoConRama('feature/con-crlf',
      [{ ruta: 'sub/todo.txt', contenido: 'uno\r\ndos\r\ntres\r\n' }],
      '*.txt text eol=lf\n');

    const arbol = rama(repo, 'feature/con-crlf');

    assert.deepEqual(arbol.incumplimientos.map((i) => i.ruta + ' ' + i.donde),
      ['sub/todo.txt blob']);

    // Y el repo que esta deployado sale limpio, porque el fichero de la rama no
    // existe en su arbol: la diferencia entre las dos respuestas es real.
    assert.deepEqual(auditaRepo(repo).incumplimientos, []);
  });

  it('la regla que se aplica es la DE ESA RAMA, no la del arbol deployado', () => {
    // La otra mitad del `--source`, en la direccion de los numeros: con la regla
    // puesta en la rama, el fichero cuenta como auditado. Si se usara el
    // `.gitattributes` del arbol deployado —que no declara nada para `sub/`—
    // saldrian cero auditados y el test veria un repo que nadie ha medido.
    const repo = repoConRama('feature/con-reglas',
      [{ ruta: 'sub/reglas.txt', contenido: 'sin CRLF\n' }],
      '*.txt text eol=lf\n');

    const arbol = rama(repo, 'feature/con-reglas');

    // Dos, no uno: la regla es `*.txt` y el repo de origen trae un `base.txt` que
    // tambien cae. Lo que importa es que no sean cero, que es lo que saldria si
    // `check-attr` preguntara al arbol deployado en vez de al de la rama.
    assert.equal(arbol.auditados, 2, 'la regla de la rama no ha llegado al auditado');
    assert.deepEqual(arbol.incumplimientos, []);
  });

  it('una rama sin ninguna regla sale con cero, y no se la juzga por el disco', () => {
    // Sin politica declarada no hay nada que pueda incumplir. Y el "CRLF solo en
    // el disco" no se puede ver en una rama que nadie ha comprobado, porque
    // todavia no hay disco: sale cuando alguien la comprueba.
    const repo = repoConRama('feature/sin-reglas',
      [{ ruta: 'sub/libre.txt', contenido: 'uno\r\ndos\r\n' }]);

    const arbol = rama(repo, 'feature/sin-reglas');

    assert.equal(arbol.auditados, 0);
    assert.equal(arbol.sinPolitica, 2, 'los dos ficheros se han contado como sin politica');
    assert.deepEqual(arbol.incumplimientos, []);
  });

  it('`origin` a secas NO es una rama, que es lo que se cuela sin querer', () => {
    // Sin este filtro, ABDOmega salia con `origin` y con `origin/main` como dos
    // ramas: `refs/remotes/origin` es un symref a la rama por defecto, no una
    // rama. Y `origin/HEAD` es el mismo symref con otro disfraz.
    const repo = repoConRama('feature/otra',
      [{ ruta: 'sub/a.txt', contenido: 'sin CRLF\n' }]);

    assert.equal(ramasDeRepo(repo).filter((r) => r.rama === 'origin').length, 0);
    assert.equal(ramasDeRepo(repo).filter((r) => r.rama.endsWith('/HEAD')).length, 0);
  });

  it('el informe de las ramas sale en resumen, y con detalle si hay algo roto', () => {
    const linea = {
      repo: 'A',
      rama: 'origin/x',
      auditoria: { ficheros: 10, auditados: 2, incumplimientos: [] }
    };
    const rota = {
      repo: 'A',
      rama: 'origin/y',
      auditoria: {
        ficheros: 10,
        auditados: 2,
        incumplimientos: [{ ruta: 'a.cpp', donde: 'blob', crlf: 4, que: 'CRLF' }]
      }
    };

    assert.match(formateaRamas([linea]).join('\n'),
      /incumplimientos de EOL en alguna rama\s+: 0/);
    assert.doesNotMatch(formateaRamas([linea]).join('\n'), /origin\/y/);

    const texto = formateaRamas([linea, rota]).join('\n');

    assert.match(texto, /incumplimientos de EOL en alguna rama\s+: 1/);
    assert.match(texto, /A @ origin\/y\s+->\s+a\.cpp\s+<-\s+4 CRLF en el blob/);
  });

  it('la suite real: ninguna rama incumple, y se miran todas menos la desplegada', () => {
    const { porRama } = auditaRamasDeSuite();

    const malos = porRama
      .filter((r) => r.auditoria.incumplimientos.length > 0)
      .map((r) => r.repo + ' @ ' + r.rama + ': '
        + r.auditoria.incumplimientos.map((i) => i.ruta).join(', '));

    assert.deepEqual(malos, [], 'ramas con incumplimientos de EOL: ' + malos.join('; '));

    // Y que no se haya quedado en mirar un par de ramas de catorce repos, que es
    // lo que hacia el clon de una sola rama. Medido en el remoto: 27 ramas en
    // total, de las que se miran todas menos la que esta deployada.
    assert.ok(porRama.length >= 8,
      'solo se han mirado ' + porRama.length + ' ramas: el clon sigue trayendose una');
  });
});

describe('el guard sobre un repo de verdad', () => {
  it('un `.gitattributes` sin trackear lo delata, y explica por que importa', () => {
    // El repo de ABDNeural entero, en pequeno: el fichero esta en el disco, git
    // lo APLICA, y no hay ningun commit que lo tenga. El guard no falla —no es
    // una regla rota— pero tiene que decirlo, porque los numeros que acaba de
    // imprimir son de esta maquina y no de la suite.
    const repo = repoDeMentira({
      ficheros: { 'a.txt': 'x\n', 'b.txt': 'y\n' },
      gitattributesDespues: '*.txt text eol=lf\n'
    });

    const resultado = auditaRepo(repo);

    assert.deepEqual(resultado.reglasSinCommitear,
      [{ ruta: '.gitattributes', porQue: 'no esta trackeado' }]);

    // Y no es decorativo: el numero de auditados depende de ese fichero, que es
    // justo el problema. Sin las reglas, estos dos ficheros no tienen nada que
    // juzgar; con ellas, son dos auditados que un clon no contaria.
    assert.equal(resultado.auditados, 2);

    writeFileSync(join(repo, '.gitattributes'), '');

    assert.equal(auditaRepo(repo).auditados, 0);
  });

  it('un `.gitattributes` commiteado NO lo delata, que es lo normal', () => {
    const repo = repoDeMentira({ gitattributes: '*.txt text eol=lf\n', ficheros: { 'a.txt': 'x\n' } });
    const resultado = auditaRepo(repo);

    assert.deepEqual(resultado.reglasSinCommitear, []);
    assert.equal(resultado.auditados, 1);
  });

  it('un `.gitattributes` trackeado y despues cambiado, sale como cambiado', () => {
    // El otro sentido, el de ABDEep: el fichero esta en el clon, pero con menos
    // reglas de las que se aplican aqui.
    const repo = repoDeMentira({ ficheros: { 'a.txt': 'x\n' } });

    writeFileSync(join(repo, '.gitattributes'), '*.txt text eol=lf\n');
    git(repo, ['add', '.gitattributes']);
    assert.deepEqual(auditaRepo(repo).reglasSinCommitear, [],
      'trackeado y sin cambios ya esta en el indice, y por tanto en un commit');

    writeFileSync(join(repo, '.gitattributes'), '*.txt text eol=lf\n*.md text eol=lf\n');

    assert.deepEqual(auditaRepo(repo).reglasSinCommitear,
      [{ ruta: '.gitattributes', porQue: 'cambiado sin commitear' }]);
  });
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
    //   runner sobre workspace-history              680
    //   runner sobre main                          1470
    //   maquina de desarrollo                     1051
    //
    // La primera vez que se calibro se tomo el 1447 de un run como si fuera la
    // medida buena, y era el numero de otro sitio. La raiz de la suite es uno
    // de los quince repos que se auditan, y su `.gitattributes` es una sola
    // regla que alcanza a todo lo que hay encima: `* text=auto eol=lf`. En
    // `main` la raiz es la aplicacion entera, 803 ficheros y los 803
    // auditados; en `workspace-history` son trece. Los catorce hermanos aportan
    // 667 en los dos casos, y la diferencia entera la hacia la rama que estaba
    // desplegada. El suelo no dependia de la suite, que es lo que parece, sino
    // de que rama se habia checkoutado.
    //
    // Asi que quinientos, por debajo de la medida mas pobre de las cuatro, con
    // margen para que la suite se mueva. La leccion que si se sostiene es que
    // una medida sola no es un suelo: 900 salia bien en `main` y rompia en
    // `workspace-history`, y solo se ve con los dos runs medidos a la vez. Y si
    // un dia esto vuelve a rozar, lo que hay que mirar es si un repo ha dejado
    // de declarar reglas, que es lo unico que lo justificaria.
    const auditados = auditaSuite().reduce((a, r) => a + r.auditados, 0);

    assert.ok(auditados > 500, 'solo ha auditado ' + auditados + ' ficheros');
  });

  it('y de mas de diez mil ficheros trackeados en la suite', () => {
    // El suelo es el MENOR de los entornos, no el mayor. En la maquina de
    // desarrollo se ven 16716 ficheros, en el runner sobre `workspace-history`
    // 11517 y sobre `main` 12307: la maquina tiene historia y ramas que el clon
    // `--depth 1` no baja. Un suelo de quince mil seria mas exigente que el
    // runner, y un suelo que el runner no puede cumplir no comprueba nada: en
    // CI el test falla siempre y nadie lo lee como un suelo, sino como ruido.
    //
    // Diez mil, y no once, por el mismo motivo que el de arriba: la cifra
    // depende de que rama esta desplegada (803 ficheros de raiz en `main` contra
    // trece en `workspace-history`) y de cuantos ficheros trackea cada hermano,
    // que es un numero que cambia con cada push. Un suelo con un cuatro por
    // ciento de margen sobre la medida es un suelo que rompe solo.
    const ficheros = auditaSuite().reduce((a, r) => a + r.ficheros, 0);

    assert.ok(ficheros > 10000, 'solo ha visto ' + ficheros + ' ficheros trackeados');
  });

  it('y mira al menos diez repos', () => {
    assert.ok(auditaSuite().length >= 10);
  });

  it('y mas de cien ficheros con `text` sin `eol`, que se juzgan por el indice', () => {
    // El suelo de la ultima puerta. Si `declaraText` se rompiera y volviera a
    // exigir un `text` declarado que `check-attr` no devuelve, estos 125
    // ficheros volverian a la casilla de "nada que juzgar" y el numero de
    // `auditados` bajaria de 680 a 555, que sigue por encima del suelo de
    // quinientos: o sea que el suelo de `auditados` NO lo delata, y este test
    // si. Por eso existe aparte y no como un detalle del otro.
    const soloIndice = auditaSuite().reduce((a, r) => a + (r.textSinEol || 0), 0);

    assert.ok(soloIndice > 100, 'solo ha visto ' + soloIndice + ' ficheros con text sin eol');
  });

  it('y ningun repo aplica reglas que no estan en ningun commit, mas alla del techo', () => {
    // El techo es POR REPO. Lo que hay que vigilar no es cuanto sino donde: que
    // un repo conocido lo tenga es una cosa pendiente y con nombre, y que lo
    // tenga un repo nuevo es la puerta cerrandose sobre lo unico que hacia que
    // la suite se midiera igual en todas partes. Por eso el techo es un mapa y
    // no un total, y por eso el informe nombra el repositorio.
    const conReglas = auditaSuite().filter((r) => (r.reglasSinCommitear || []).length > 0);

    const pases = conReglas
      .filter((r) => r.reglasSinCommitear.length > (REGLAS_SIN_COMMITEAR_TOLERADAS[r.repo] || 0))
      .map((r) => r.repo + ': ' + r.reglasSinCommitear.length + ' de '
        + (REGLAS_SIN_COMMITEAR_TOLERADAS[r.repo] || 0));

    assert.deepEqual(pases, [], 'repos con reglas sin commitear por encima del techo: ' + pases.join(', '));
  });

  it('y ningun repo con reglas sin commitear queda sin nombrar', () => {
    // La otra mitad de la misma idea, y aqui solo en un sentido. El techo es una
    // COTA, no una igualdad: puede quedarse una entrada de mas cuando el hilo
    // commitea y todavia nadie la ha borrado, y eso no es un defecto. Lo que no
    // puede es que un repo tenga reglas sin commitear y no este en el mapa,
    // porque ese repo pasaria con techo cero y ademas no tendria nombre.
    //
    // Con un clon limpio esto no mira nada, y es lo que tiene que pasar: en el
    // runner no hay trabajo a medias y la lista de repos con reglas sin
    // commitear es vacia de verdad.
    const conReglas = auditaSuite().filter((r) => (r.reglasSinCommitear || []).length > 0);

    const sinNombre = conReglas
      .filter((r) => !(r.repo in REGLAS_SIN_COMMITEAR_TOLERADAS))
      .map((r) => r.repo + ' (' + r.reglasSinCommitear.length + ')');

    assert.deepEqual(sinNombre, [],
      'repos con reglas sin commitear que no estan en REGLAS_SIN_COMMITEAR_TOLERADAS: '
      + sinNombre.join(', '));
  });

  it('y el informe nombra cada regla sin commitear que haya, con su repo y su motivo', () => {
    // Condicional a proposito: el informe imprime el bloque cuando hay algo que
    // decir y no lo imprime cuando no hay nada. Fijar que el bloque esta SIEMPRE
    // seria un test que obliga a la suite a estar sucia, que es al reves de lo
    // que se quiere.
    const porRepo = auditaSuite();
    const conReglas = porRepo.filter((r) => (r.reglasSinCommitear || []).length > 0);

    if (conReglas.length === 0) {
      assert.doesNotMatch(formatea(porRepo), /reglas que git APLICA/);
      return;
    }

    const texto = formatea(porRepo);

    assert.match(texto, /reglas que git APLICA y no estan en ningun commit/);

    for (const r of conReglas) {
      for (const g of r.reglasSinCommitear) {
        assert.match(texto, new RegExp(r.repo + '/' + g.ruta.replace(/\./g, '\\.')
          .replace(/\//g, '\\/') + '\\s+<- ' + g.porQue));
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// EL `.gitattributes` DE MAS CERCA, QUE ANULA EL DE LA RAIZ
//
// ─────────────────────────────────────────────────────────────────────────
// LO QUE SE BUSCA, Y POR QUE NO BASTA CONTAR LOS "SIN POLITICA"
//
// El caso es real y el codigo que lo caza no es el que parece. `check-attr` ya
// resuelve la precedencia, asi que un fichero al que le roban la regla sale con
// `eol` sin especificar y llevaba desde el primer dia contado en la casilla de
// "sin politica". Contar esa casilla da CERO en toda la suite, y cero es verdad y
// no dice nada.
//
// Los dos `.gitattributes` anidados que hay son de arboles de terceros y dicen
// `* text=auto`, que parece que deberia apagar la raiz. No lo apaga, porque los
// atributos se fusionan POR ATRIBUTO y no entre ficheros: el anidado no menciona
// `eol`, asi que el `eol=lf` de la raiz sigue mandando para ese atributo. Es lo
// que fijan los dos primeros tests de abajo con repos de verdad.
//
// Y el otro sentido tambien se mide, porque tambien es real: esos mismos dos
// anidados le ANADEN `text=auto` a 79 ficheros que la raiz no regulaba. Eso es
// cobertura nueva, y una puerta que pusiera en rojo una mejora acabaria apagada.

describe('los `.gitattributes` anidados, que se fusionan por atributo y no por fichero', () => {
  it('un anidado que no menciona `eol` deja el `eol` de la raiz', () => {
    // LA PRIMERA REGLA DEL FORMATO, y la que hace que contar los "sin politica" no
    // diga nada. Con la raiz a `* text=auto eol=lf` y un `sub/.gitattributes` a
    // `* text=auto`, el fichero de `sub/` sigue con `eol=lf`: el atributo que el
    // anidado menciona lo gana, y el que no menciona se sigue buscando hacia
    // arriba.
    const repo = repoDeMentira({
      gitattributes: '* text=auto eol=lf\n',
      ficheros: { 'b.cpp': 'x\n', 'sub/a.cpp': 'x\n', 'sub/.gitattributes': '* text=auto\n' }
    });

    assert.deepEqual(auditaSombras(repo).sombras, [],
      'un anidado que solo declara `text` no le quita el `eol` a nadie');
  });

  it('y uno que menciona `eol` para quitarlo se lo quita, y eso si es una sombra', () => {
    // El caso del encargo, medido con git y no supuesto: `* !eol` en el anidado
    // hace que `check-attr` deje de mirar hacia arriba para ESE atributo, y el
    // `eol=lf` de la raiz no vuelve a mandar. El fichero pasa a no tener politica
    // de fin de linea, el guard lo cuenta como sin politica y no lo juzga, y no
    // hay ningun paso que se ponga rojo por eso.
    const repo = repoDeMentira({
      gitattributes: '* text=auto eol=lf\n',
      ficheros: { 'b.cpp': 'x\n', 'sub/a.cpp': 'x\n', 'sub/.gitattributes': '* !eol\n' }
    });

    const r = auditaSombras(repo);

    // El propio `sub/.gitattributes` tambien pierde el `eol`, porque `*` casa
    // con el fichero de reglas y esta DENTRO de `sub/`. No se le hace una
    // excepcion: la regla se esta aplicando a si misma, que es cierto y es lo
    // que hace git. Filtarlo "porque no tiene sentido" seria una exception
    // hecha para que el numero saliera mas redondo, y ese numero es el que hay
    // que mirar cuando bajen los `auditados`.
    assert.deepEqual(r.sombras.map((s) => [s.ruta, s.atributo, s.sinEl, s.conEl, s.culpable]), [
      ['sub/.gitattributes', 'eol', 'lf', 'unspecified', 'sub/.gitattributes'],
      ['sub/a.cpp', 'eol', 'lf', 'unspecified', 'sub/.gitattributes']
    ]);
    assert.deepEqual(r.cambia, { 'sub/.gitattributes': 2 });
    assert.deepEqual(r.amplian, [],
      'y no anade nada: `text` lo sigue declarando la raiz para esos ficheros');
  });

  it('y el techo lo vuelve rojo nombrando el fichero exacto que hay que mirar', () => {
    // El dato que hace falta cuando el numero de `auditados` baje sin motivo es
    // QUE `.gitattributes` tapa la politica, no cuantos repos estan raros.
    const repo = repoDeMentira({
      gitattributes: '* text=auto eol=lf\n',
      ficheros: {
        'b.cpp': 'x\n',
        'sub/a.cpp': 'x\n',
        'sub/c.cpp': 'x\n',
        'sub/.gitattributes': '* !eol\n'
      }
    });

    const rojos = sombrasQuePasan([auditaSombras(repo)]);

    assert.deepEqual(rojos, [{
      repo: basename(repo.replace(/[\\/]+$/, '')),
      anidado: 'sub/.gitattributes',
      ahora: 3,
      tolerado: 0
    }]);
  });

  it('y declararlo en SOMBRAS_TOLERADAS lo deja en verde, con su nombre', () => {
    const repo = repoDeMentira({
      gitattributes: '* text=auto eol=lf\n',
      ficheros: { 'sub/a.cpp': 'x\n', 'sub/.gitattributes': '* !eol\n' }
    });
    const nombre = basename(repo.replace(/[\\/]+$/, ''));
    const medido = auditaSombras(repo);
    // El techo declarado es 1 y el medido es 2 porque el propio fichero de reglas
    // tambien pierde el `eol`, que es lo que se acaba de fijar arriba. Aqui el
    // techo va holgado a proposito: lo que se comprueba es que declararlo quita
    // el rojo, no que el numero coincida.
    const base = { [nombre + '/sub/.gitattributes']: 2 };

    assert.deepEqual(sombrasQuePasan([medido], base), [],
      'un anidado declarado y que no crece mas no es un problema');
    assert.deepEqual(sombrasQuePasan([medido], { [nombre + '/sub/.gitattributes']: 0 }).map((r) => r.ahora),
      [2], 'y con el techo a cero sigue en rojo: es lo que no se declara todavia');
  });

  it('un repo sin anidados no monta nada y no encuentra nada', () => {
    // Trece de los quince repos de la suite son esto, y el caso normal tiene que
    // ser barato: un temporal por repo para encontrar que no hay nada que medir
    // es trabajo por el motivo equivocado.
    const repo = repoDeMentira({
      gitattributes: '* text=auto eol=lf\n',
      ficheros: { 'a.cpp': 'x\n' }
    });

    const r = auditaSombras(repo);

    assert.deepEqual(r, {
      repo: basename(repo.replace(/[\\/]+$/, '')),
      anidados: [], sombras: [], amplian: [], cambia: {}, anade: {}
    });
  });

  it('y un anidado sin `.gitattributes` en la raiz no puede tapar nada', () => {
    // Al reves de lo que se busca: si no hay raiz, los anidados son lo unico que
    // hay. No hay a quien robarle politica, asi que no se pueden llamar sombra de
    // nada, aunque el numero de ficheros sea enorme.
    const repo = repoDeMentira({
      ficheros: { 'a.cpp': 'x\n', 'sub/b.cpp': 'x\n', 'sub/.gitattributes': '* !eol\n' }
    });

    const r = auditaSombras(repo);

    assert.deepEqual(r.anidados, ['sub/.gitattributes'], 'el anidado se ve igual');
    assert.deepEqual(r.sombras, []);
    assert.deepEqual(r.cambia, {});
  });
});

describe('el reparto, que es lo que decide de donde viene cada cambio', () => {
  it('el culpable es el `.gitattributes` mas cercano por directorio, no el primero', () => {
    // Con dos anidados, el de `a/b/` gana para lo que hay debajo: por eso se
    // cuentan los directorios de la ruta hacia arriba en vez de buscar por
    // subcadena, que haria que `docs/x/.gitattributes` saliera como culpable de
    // un fichero de `otros/docs/x/`.
    const anidados = ['a/.gitattributes', 'a/b/.gitattributes', 'a/b/c/.gitattributes'];

    assert.equal(anidadoQueManda('a/b/c/d.cpp', anidados), 'a/b/c/.gitattributes');
    assert.equal(anidadoQueManda('a/b/d.cpp', anidados), 'a/b/.gitattributes');
    assert.equal(anidadoQueManda('a/d.cpp', anidados), 'a/.gitattributes');
    assert.equal(anidadoQueManda('z/d.cpp', anidados), null);
    assert.equal(anidadoQueManda('.gitattributes', anidados), null,
      'el fichero de la raiz no esta debajo de ningun anidado');
  });

  it('solo cuenta los anidados, y el de la raiz nunca lo es', () => {
    assert.deepEqual(anidadosDe(['.gitattributes', 'a/b.txt', 'docs/x/.gitattributes', 'x/.gitattributes']),
      ['docs/x/.gitattributes', 'x/.gitattributes']);
    assert.deepEqual(anidadosDe(['.gitattributes']), []);
    assert.deepEqual(anidadosDe([]), []);
  });

  it('quita y anade son listas distintas, y el sentido importa', () => {
    // La primera version de esto comparaba las dos tablas y reportaba todo lo que
    // fuera distinto. Media ochenta ficheros, y el numero era el equivocado en el
    // sentido equivocado: los anidados de la suite ANADEN `text=auto` a ficheros
    // que la raiz no regulaba, que es cobertura nueva.
    const { sombras, amplian } = sombrasDe({
      rutas: ['sin-regla.ts', 'con-regla.cpp', 'quieto.cpp'],
      anidados: ['sub/.gitattributes'],
      efectivo: {
        'sin-regla.ts': { text: 'auto', eol: 'unspecified' },
        'con-regla.cpp': { text: 'auto', eol: 'unspecified' },
        'quieto.cpp': { text: 'auto', eol: 'lf' }
      },
      soloRaiz: {
        'sin-regla.ts': { text: 'unspecified', eol: 'unspecified' },
        'con-regla.cpp': { text: 'auto', eol: 'lf' },
        'quieto.cpp': { text: 'auto', eol: 'lf' }
      }
    });

    assert.deepEqual(sombras.map((s) => [s.ruta, s.atributo]),
      [['con-regla.cpp', 'eol']], 'solo el que PIERDE politica');
    assert.deepEqual(amplian.map((s) => [s.ruta, s.atributo]),
      [['sin-regla.ts', 'text']], 'el que la gana va a la otra lista, y no es un defecto');
  });

  it('`unset` no es perder politica, es declararla mas fuerte', () => {
    // `-text` en un arbol de binarios es una decision, no un olvido: el atributo
    // pasa a valer "falso", que es mas fuerte que "sin declarar", no menos.
    const { sombras, amplian } = sombrasDe({
      rutas: ['sub/a.bin'],
      anidados: ['sub/.gitattributes'],
      efectivo: { 'sub/a.bin': { text: 'unset', eol: 'lf' } },
      soloRaiz: { 'sub/a.bin': { text: 'auto', eol: 'lf' } }
    });

    assert.deepEqual(sombras, [], 'declarar mas fuerte no es quedarse sin politica');
    assert.deepEqual(amplian.map((s) => s.atributo), []);
  });

  it('y lo que no aparece en ninguna de las dos listas no se cuenta', () => {
    const todo = sombrasDe({
      rutas: ['a.cpp', 'sub/b.cpp'],
      anidados: [],
      efectivo: { 'a.cpp': { text: 'auto', eol: 'lf' }, 'sub/b.cpp': { text: 'auto', eol: 'lf' } },
      soloRaiz: { 'a.cpp': { text: 'auto', eol: 'lf' }, 'sub/b.cpp': { text: 'auto', eol: 'lf' } }
    });

    assert.deepEqual(todo, { sombras: [], amplian: [] });
  });
});

describe('el informe de las sombras', () => {
  it('dice cuantos anidados hay, cuantos tapan y cuantos anaden', () => {
    // Las dos listas van juntas en el fixture porque el informe las cuenta de
    // sitios distintos: `anade` es el reparto por `.gitattributes`, que es lo que
    // se ve en la lista de anidados, y `amplian` son las entradas, que es lo que
    // se suma. Un fixture con uno de los dos puesto y el otro vacio daria un
    // informe que en la vida real no se puede dar, que es como se cuelan los
    // errores de conteo.
    const texto = formateaSombras([
      {
        repo: 'A',
        anidados: ['x/.gitattributes'],
        sombras: [],
        amplian: [{}, {}, {}],
        cambia: {},
        anade: { 'x/.gitattributes': 3 }
      },
      { repo: 'B', anidados: [], sombras: [], amplian: [], cambia: {}, anade: {} }
    ]).join('\n');

    assert.match(texto, /\.gitattributes en subdirectorios\s+: 1/);
    assert.match(texto, /de ellos, dejando ficheros SIN politica\s+: 0/);
    assert.match(texto, /ficheros a los que un anidado les ANADE politica : 3/);
    assert.match(texto, /A\/x\/\.gitattributes {3}0 \/ 3/);
  });

  it('y el detalle sale solo cuando hay algo que detallar', () => {
    const conDefecto = formateaSombras([{
      repo: 'A',
      anidados: ['sub/.gitattributes'],
      sombras: [{ ruta: 'sub/a.cpp', atributo: 'eol', sinEl: 'lf', conEl: 'unspecified', culpable: 'sub/.gitattributes' }],
      amplian: [],
      cambia: { 'sub/.gitattributes': 1 },
      anade: {}
    }]).join('\n');

    assert.match(conDefecto, /FICHEROS QUE SE QUEDAN SIN POLITICA/);
    assert.match(conDefecto, /sub\/a\.cpp {2}eol: lf -> unspecified {2}<- sub\/\.gitattributes/);

    const sinDefecto = formateaSombras([{
      repo: 'A',
      anidados: ['sub/.gitattributes'],
      sombras: [],
      amplian: [{ ruta: 'sub/b.ts', atributo: 'text', sinEl: 'unspecified', conEl: 'auto', culpable: 'sub/.gitattributes' }],
      cambia: {},
      anade: { 'sub/.gitattributes': 1 }
    }]).join('\n');

    assert.equal(sinDefecto.includes('SE QUEDAN SIN POLITICA'), false,
      'anadir politica no es un defecto y no se detalla como si lo fuera');
  });
});

describe('la suite real, que es a quien este guard tiene que vigilar', () => {
  it('ningun `.gitattributes` anulado le quita la politica a un fichero', () => {
    // EL TEST DEL ENCARGO. En la maquina y en el runner, porque los dos leen el
    // `.gitattributes` de la raiz del DISCO, que es lo que el guard se aplica.
    const medido = auditaSombrasDeSuite();

    assert.deepEqual(sombrasQuePasan(medido).map((s) => s.repo + '/' + s.anidado + ': ' + s.ahora),
      [], 'ningun anidado deja ficheros sin politica sin estar declarado');
  });

  it('y toda entrada de SOMBRAS_TOLERADAS corresponde a algo que existe hoy', () => {
    // El otro sentido del ratchet, el que no se puede saltarse editando el mapa:
    // una entrada que no corresponde a nada medido es una puerta tapada a mano.
    // Hoy la lista esta vacia y esto no falla, asi que el test vale por lo que
    // hara el dia que alguien anada la primera: si el `.gitattributes` se borra
    // o se arregla, esta entrada sobra y hay que quitarla.
    const medido = auditaSombrasDeSuite();
    const existen = new Set(medido.flatMap((r) => r.anidados.map((a) => r.repo + '/' + a)));
    const sobran = Object.keys(SOMBRAS_TOLERADAS).filter((clave) => !existen.has(clave));

    assert.deepEqual(sobran, [],
      'entradas de SOMBRAS_TOLERADAS que no corresponden a ningun anidado existente: '
      + sobran.join(', '));
  });

  it('y los dos anidados que hay son inertes: anaden cobertura, no la quitan', () => {
    // El dato medido, y es la afirmacion que hace este guard. Los dos anidados de
    // la suite estan en `docs/` de ABDAudioLab y de ABDEep, los dos de arboles de
    // terceros, y los dos dicen `* text=auto`.
    const medido = auditaSombrasDeSuite();
    const conAnidados = medido.filter((r) => r.anidados.length > 0);

    assert.deepEqual(conAnidados.map((r) => r.repo).sort(), ['ABDAudioLab', 'ABDEep']);
    for (const r of conAnidados) {
      assert.deepEqual(r.cambia, {}, r.repo + ' tiene un anidado que quita politica');
      assert.ok(Object.keys(r.anade).length > 0,
        r.repo + ': un anidado que no cambia nada en ningun sentido no es lo que se midio');
    }
  });

  it('y el informe dice cuantos ficheros anaden, que es el numero que se ha medido', () => {
    const texto = formateaSombras(auditaSombrasDeSuite()).join('\n');
    const numeros = texto.match(/ANADE politica : (\d+)/);

    assert.ok(numeros, texto);
    // Setenta y nueve en la maquina. El numero exacto depende de la rama
    // desplegada de cada repo, asi que lo que se comprueba es que es un numero
    // grande y no cero: cero significaria que el metodo de comparacion no esta
    // comparando nada, que es el modo de fallo silencioso de este guard.
    assert.ok(Number(numeros[1]) > 50, 'solo ' + numeros[1] + ' ficheros con politica anadida');
  });
});

/**
 * El suelo de ramas, que es la puerta que se cierra sola.
 *
 * La unidad de estos tests son los BORDES del suelo, no el numero que sale en la
 * maquina: el numero de ramas depende de lo que la gente haya subido esta
 * semana, y un test que fija ese numero es un test que un dia se pone rojo solo.
 */
describe('el suelo de ramas auditadas', () => {
  /** `n` ramas inventadas, repartidas entre los repos dados. */
  function ramasDe (repos, n) {
    return Array.from({ length: n }, (_, i) => ({
      repo: repos[i % repos.length],
      rama: 'origin/r' + i,
      auditoria: { ficheros: 10, auditados: 2, incumplimientos: [] }
    }));
  }

  it('una rama sin ficheros no cuenta: no se ha auditado nada de ella', () => {
    // El caso limite de una rama que sale de `for-each-ref` pero que no trae
    // arbol. Contarla haria subir el numero del informe sin que nadie haya
    // mirado un byte, que es justo lo que este suelo viene a impedir.
    const vacia = {
      repo: 'A',
      rama: 'origin/vacia',
      auditoria: { ficheros: 0, auditados: 0, incumplimientos: [] }
    };
    const conFicheros = {
      repo: 'A',
      rama: 'origin/x',
      auditoria: { ficheros: 10, auditados: 2, incumplimientos: [] }
    };

    assert.equal(resumenDeRamas([vacia]).auditadas, 0);
    assert.equal(resumenDeRamas([vacia, conFicheros]).auditadas, 1);
  });

  it('justo en el suelo no se queja, y una rama menos si', () => {
    // El borde de verdad, en los dos suelos a la vez: repos de sobra y ramas
    // justas. Un suelo que saltase en su propio numero no serviria para nada.
    const enElSuelo = resumenDeRamas(ramasDe(['A', 'B', 'C', 'D'], RAMAS_AUDITADAS_MINIMAS));

    assert.deepEqual(enElSuelo.porDebajo, []);
    assert.equal(enElSuelo.repos.length, REPOS_CON_RAMAS_MINIMOS + 1);

    const unaMenos = resumenDeRamas(
      ramasDe(['A', 'B', 'C', 'D'], RAMAS_AUDITADAS_MINIMAS - 1));

    assert.equal(unaMenos.porDebajo.length, 1);
    assert.match(unaMenos.porDebajo[0],
      new RegExp('rama\\(s\\) de un suelo de ' + RAMAS_AUDITADAS_MINIMAS));
  });

  it('un clon de una sola rama es cero de las dos cosas, y se dice', () => {
    // El caso que motiva el suelo. `git clone --depth 1` sin `--no-single-branch`
    // se queda con la rama por defecto, que `auditaRepo` ya ha mirado, asi que
    // aqui no queda ni una: cero ramas y cero repos, sin un solo incumplimiento.
    const resumen = resumenDeRamas([]);

    assert.equal(resumen.auditadas, 0);
    assert.deepEqual(resumen.repos, []);
    assert.equal(resumen.porDebajo.length, 2);
    assert.match(resumen.porDebajo.join(' '),
      new RegExp('0 repo\\(s\\) con ramas de un suelo de ' + REPOS_CON_RAMAS_MINIMOS));
  });

  it('muchas ramas de un solo repo no cumplen el suelo de repos', () => {
    // El segundo suelo existe por este caso: trece ramas del mismo repo se
    // saltarian el primero sin que nada mas se quejara, y lo que se ha perdido
    // es la cobertura de los otros repos.
    const resumen = resumenDeRamas(ramasDe(['Unico'], 40));

    assert.ok(resumen.auditadas >= RAMAS_AUDITADAS_MINIMAS);
    assert.equal(resumen.porDebajo.length, 1);
    assert.match(resumen.porDebajo[0], /1 repo\(s\) con ramas/);
  });

  it('el informe enseña el suelo y, cuando se cruza, que se ha cruzado', () => {
    const bien = formateaRamas(ramasDe(['A', 'B', 'C', 'D'], RAMAS_AUDITADAS_MINIMAS + 2)).join('\n');

    assert.match(bien, /de ellas, en repos distintos\s+: 4/);
    assert.match(bien, new RegExp('suelo de ramas auditadas +: ' + RAMAS_AUDITADAS_MINIMAS));
    assert.doesNotMatch(bien, /POR DEBAJO/);

    const mal = formateaRamas(ramasDe(['A'], 1)).join('\n');

    assert.match(mal, /POR DEBAJO/);
  });

  it('la suite real no esta por debajo, con margen', () => {
    // Ni la lista de repos ni el numero exacto: lo que se comprueba es que el
    // suelo aguanta en CUALQUIER clon con ramas, que es la unica afirmacion
    // que es cierta en la maquina y en el runner a la vez.
    const resumen = resumenDeRamas(auditaRamasDeSuite().porRama);

    assert.deepEqual(resumen.porDebajo, [],
      'el suelo de ramas se ha cruzado en la suite real, y con el numero actual ('
        + resumen.auditadas + ' ramas en ' + resumen.repos.length + ' repos) el suelo quizas esta alto');
    assert.ok(resumen.auditadas > RAMAS_AUDITADAS_MINIMAS,
      'solo ' + resumen.auditadas + ' ramas: el suelo esta pegado al numero real y no avisaria de nada');
    assert.ok(resumen.repos.length > REPOS_CON_RAMAS_MINIMOS,
      'solo ' + resumen.repos.length + ' repos con ramas: el suelo de repos tambien esta pegado');
  });
});

/**
 * POR QUE han bajado las ramas, que es lo que hace falta para arreglarlas.
 *
 * Todos estos tests son de la parte PURA y el `estado` se inventa. Montar un clon
 * de una sola rama de verdad para cada causa sale, pero aqui no hace falta: lo
 * que se prueba es que los motivos se distinguen, y la firma de cada uno la da
 * un numero — cero remotas, una, o mas de una y por debajo de su suelo.
 */
describe('el diagnostico de por que han bajado las ramas', () => {
  /** Los repos dados, con las ramas que se le pidan; el primero es la raiz. */
  function estadoDe (nombres, remotas = 3) {
    return nombres.map((repo, i) => ({
      repo,
      remotas: typeof remotas === 'function' ? remotas(repo, i) : remotas,
      extra: 1,
      esRaiz: i === 0
    }));
  }

  it('un estado con cada repo en su suelo no produce ninguna causa', () => {
    // El estado de un clon completo: la raiz con lo que traiga, cada repo de la
    // tabla con su numero, y nada mas. Es el unico estado que no dice nada, y
    // que siga siendo asi es lo que hace que el aviso signifique algo.
    const hermanos = Object.keys(RAMAS_POR_REPO);
    const causas = diagnosticoDeRamas(
      estadoDe(['laCarpeta', ...hermanos], (repo) => RAMAS_POR_REPO[repo] ?? 3), hermanos);

    assert.deepEqual(causas, [], 'un clon completo no produce ninguna causa');
  });

  it('un repo con una sola rama por debajo de su suelo es un clon de una sola', () => {
    // El caso que sale en un runner. Lo que lo separa de los otros dos es el
    // numero: si es exactamente 1, el clon no trae las demas y el arreglo es el
    // `clone`.
    const repo = Object.keys(RAMAS_POR_REPO)[0];
    const causas = diagnosticoDeRamas(estadoDe(['laCarpeta', repo], (r) => (r === 'laCarpeta' ? 3 : 1)),
      [repo]);

    assert.equal(causas.length, 1);
    assert.equal(causas[0].codigo, 'UNA_SOLO_RAMA');
    assert.equal(causas[0].grave, true);
    assert.deepEqual(causas[0].repos, [repo]);
    assert.match(causas[0].detalle, new RegExp(repo + ' trae 1 de un minimo de ' + RAMAS_POR_REPO[repo]));
    assert.match(causas[0].detalle, /--no-single-branch/);
  });

  it('con mas de una rama por debajo del suelo, lo que se ha perdido son ramas', () => {
    // Un clon de una sola rama NUNCA llega aqui: tiene 1. Quedarse corto
    // teniendo mas de una no tiene explicacion que no sea que le han borrado
    // ramas de verdad, y ese es un commit de quien las borra.
    const conSuelo = Object.entries(RAMAS_POR_REPO).filter(([, n]) => n > 2);

    assert.ok(conSuelo.length > 0, 'la tabla tiene que tener un repo de mas de dos ramas');

    const [repo, minimo] = conSuelo[0];
    const causas = diagnosticoDeRamas(
      estadoDe(['laCarpeta', repo], (r) => (r === 'laCarpeta' ? 3 : minimo - 1)), [repo]);

    assert.equal(causas.length, 1);
    assert.equal(causas[0].codigo, 'RAMAS_BORRADAS');
    assert.equal(causas[0].grave, true);
    assert.match(causas[0].detalle, new RegExp('trae ' + (minimo - 1) + ' de un minimo de ' + minimo));
  });

  it('cero ramas remotas es su propia causa: eso no es un clon', () => {
    const repo = Object.keys(RAMAS_POR_REPO)[0];
    const causas = diagnosticoDeRamas(
      estadoDe(['laCarpeta', repo], (r) => (r === 'laCarpeta' ? 3 : 0)), [repo]);

    assert.equal(causas.length, 1);
    assert.equal(causas[0].codigo, 'SIN_REMOTO');
    assert.equal(causas[0].grave, true);
  });

  it('un repo que no esta en el clon es un repo que falta, no menos ramas', () => {
    const causas = diagnosticoDeRamas(estadoDe(['laCarpeta', 'Uno', 'Dos']), ['Uno', 'Dos', 'Tres']);

    assert.equal(causas.length, 1);
    assert.equal(causas[0].codigo, 'REPOS_FALTANTES');
    assert.deepEqual(causas[0].repos, ['Tres']);
    assert.equal(causas[0].grave, true);
  });

  it('un repo de mas avisa pero no pone el guard en rojo', () => {
    // Es la direccion buena: la suite ha crecido. Ponerlo rojo obligaria a
    // tocar el codigo cada vez que aparece un repo, y lo que hay que hacer es
    // anadirlo a la lista, que es un commit de una linea.
    const causas = diagnosticoDeRamas(estadoDe(['laCarpeta', 'Uno', 'Nuevo']), ['Uno']);

    assert.equal(causas.length, 1);
    assert.equal(causas[0].codigo, 'REPOS_NUEVOS');
    assert.equal(causas[0].grave, false);
    assert.deepEqual(causas[0].repos, ['Nuevo']);
  });

  it('la raiz ni se busca ni se acusa: su nombre es la carpeta', () => {
    // La raiz trae 3 ramas en la maquina y 0 en un clon de prueba. Con suelo
    // seria verde en un sitio y rojo en otro; sin suelo, tampoco puede
    // colarse como repo nuevo, que es el otro sitio por el que entraria.
    assert.deepEqual(diagnosticoDeRamas(estadoDe(['laCarpeta', 'Uno'], 1), ['Uno']), []);
    assert.ok(!diagnosticoDeRamas(estadoDe(['laCarpeta'], 3), ['Uno'])
      .some((c) => c.codigo === 'REPOS_NUEVOS'));
  });

  it('un repo sin suelo en la tabla no se acusa nunca', () => {
    // Once de los quince traen una rama y no estan en la tabla. Si uno de esos
    // se accusara, el diagnostico gritaria en cada clon de cada maquina.
    const sinSuelo = ['ABDCZ101', 'ABDBankManager', 'ABDNeural', 'ABDSharedAssets'];

    assert.ok(sinSuelo.every((r) => RAMAS_POR_REPO[r] === undefined));
    assert.deepEqual(diagnosticoDeRamas(estadoDe(['laCarpeta', ...sinSuelo], 1), sinSuelo), []);
  });

  it('cada causa sale con su motivo, sus repos y donde mirar', () => {
    const repo = Object.keys(RAMAS_POR_REPO)[0];
    const texto = formateaDiagnostico(diagnosticoDeRamas(
      estadoDe(['laCarpeta', repo], (r) => (r === 'laCarpeta' ? 3 : 1)), [repo])).join('\n');

    assert.match(texto, /auditar_eol: UNA_SOLO_RAMA/);
    assert.match(texto, new RegExp('Repos: ' + repo + '\.'));
    assert.match(texto, /git clone/);
    assert.match(texto, /--no-single-branch/);

    // El aviso informativo lleva otra marca, para que un rojo y un aviso no se
    // confundan leyendo el final del guard.
    const informativo = formateaDiagnostico(
      diagnosticoDeRamas(estadoDe(['laCarpeta', 'Uno', 'Nuevo']), ['Uno'])).join('\n');

    assert.match(informativo, /auditar_eol: aviso: REPOS_NUEVOS/);
  });

  it('la suite real no tiene ninguna causa grave', () => {
    // Ni lista de repos ni numero de ramas: lo que tiene que ser cierto en la
    // maquina y en el runner a la vez es que un clon completo no dispara nada.
    // Y al reves: un clon al que le falta un repo dispara dos, una por el que
    // falta y otra por sus ramas, que es justo lo que hacia invisible la falta.
    const graves = diagnosticoDeRamas(auditaRamasDeSuite().estado)
      .filter((c) => c.grave);

    assert.deepEqual(graves.map((c) => c.codigo + ': ' + c.repos.join(',')), [],
      'un clon completo no puede tener causas graves');
  });
});
