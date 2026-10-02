// Pruebas del guard de justificacion: que ninguna regla `eol=crlf` de la suite
// entre sin que alguien escribiera un porque al lado.
//
//   node --test tools/auditar_justificacion_crlf.test.mjs
//
// Sin dependencias, como los otros guards: `node:test` y `assert` vienen en el
// runtime y este repo no tiene runner.
//
// EL ORDEN. Primero la funcion pura con `.gitattributes` inventados, que es
// donde se pueden provocar todos los casos —con justificacion, sin ella,
// justificada al final de la linea, con un bloque, con una linea en blanco por
// medio— sin montar un repositorio. Despues la suite real, con suelos que
// impiden que el guard se ponga verde por no mirar.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  auditaGitattributes, auditaRepo, auditaSuite, comentarioEnLinea,
  esReglaCrlf, formatea, SIN_JUSTIFICAR_TOLERADOS
} from './auditar_justificacion_crlf.mjs';

const temporales = [];

/** Un directorio que se borra al terminar. */
function temporal (prefijo) {
  const dir = mkdtempSync(join(tmpdir(), prefijo));

  temporales.push(dir);
  return dir;
}

/** Un "repo" con un `.gitattributes` y nada mas. */
function repoCon (contenido) {
  const dir = temporal('justif-');

  mkdirSync(dir, { recursive: true });
  if (contenido !== null) writeFileSync(join(dir, '.gitattributes'), contenido);

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

// ─────────────────────────────────────────────────────────────────────────
// QUE ES UNA REGLA eol=crlf, Y QUE NO
// ─────────────────────────────────────────────────────────────────────────

describe('que cuenta como regla eol=crlf', () => {
  it('una regla que declara eol=crlf, venga sola o con mas atributos', () => {
    assert.equal(esReglaCrlf('*.bat text eol=crlf'), true);
    assert.equal(esReglaCrlf('*.cmd  text  eol=crlf  '), true);
    assert.equal(esReglaCrlf('* eol=crlf'), true);
  });

  it('un comentario que MENCIONA eol=crlf no es una regla', () => {
    // El caso que separa el guard de una cuenta de subcadenas. Sin esto, el
    // propio comentario que explica el porque contaria como regla sin
    // justificar, y el guard no podria dar verde nunca.
    assert.equal(esReglaCrlf('# por que eol=crlf y no eol=lf'), false);
    assert.equal(esReglaCrlf('#   *.bat text eol=crlf'), false);
  });

  it('una regla con eol=lf, o sin eol, no es de las que este guard vigila', () => {
    assert.equal(esReglaCrlf('*.h text eol=lf'), false);
    assert.equal(esReglaCrlf('* text=auto'), false);
    assert.equal(esReglaCrlf(''), false);
  });

  it('no se confunde eol=crlf con un valor que lo contiene', () => {
    assert.equal(esReglaCrlf('*.x eol=crlfmas'), false);
    assert.equal(esReglaCrlf('*.x eol=mecrlf'), false);
  });

  it('el comentario de la propia linea se saca sin comerse el resto', () => {
    assert.equal(comentarioEnLinea('*.bat text eol=crlf  # fix #714'), 'fix #714');
    assert.equal(comentarioEnLinea('*.bat text eol=crlf'), '');
    assert.equal(comentarioEnLinea('*.bat text eol=crlf#sin espacio'), 'sin espacio');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LA PUERTA, MEDIDA SOBRE FICHEROS INVENTADOS
// ─────────────────────────────────────────────────────────────────────────

describe('una regla eol=crlf esta justificada', () => {
  it('si el comentario va justo en la linea de antes', () => {
    const r = auditaGitattributes('# porque si\n*.bat text eol=crlf\n');

    assert.equal(r.reglas, 1);
    assert.equal(r.justificadas, 1);
    assert.deepEqual(r.sinJustificar, []);
  });

  it('si el comentario va al final de la propia regla', () => {
    const r = auditaGitattributes('*.bat text eol=crlf  # porque si\n');

    assert.equal(r.justificadas, 1);
    assert.equal(r.alFinalDeLinea, 1);
    assert.equal(r.enBloque, 0);
  });

  it('y NO si no hay comentario, que es el fallo que este guard busca', () => {
    const r = auditaGitattributes('*.bat text eol=crlf\n');

    assert.equal(r.reglas, 1);
    assert.equal(r.justificadas, 0);
    assert.deepEqual(r.sinJustificar, [1]);
  });

  it('y NO si el comentario esta en la cabecera, lejos de la regla', () => {
    // El comentario de la linea 1 puede hablar de `* text=auto` y no tener
    // nada que ver con el `eol=crlf` de la linea 20. Aceptarlo seria medir la
    // distancia en vez de la justificacion.
    const r = auditaGitattributes([
      '# Normalizar line endings, este repo es cross-platform.',
      '* text=auto',
      '*.bat text eol=crlf'
    ].join('\n'));

    assert.deepEqual(r.sinJustificar, [3]);
  });

  it('y NO si hay una linea en blanco entre el comentario y la regla', () => {
    const r = auditaGitattributes('# porque si\n\n*.bat text eol=crlf\n');

    assert.deepEqual(r.sinJustificar, [3]);
  });

  it('y NO si la regla anterior la justifico: cada regla dice la suya', () => {
    // Esta es la regla que hace que el guard MUERDA, y no es arbitraria: si
    // `*.bat` justificado sirviera para `*.cmd` que viene debajo, bastaria con
    // escribir el porque de la primera vez y anadir reglas nuevas sin decir
    // nada, que es justo la costumbre que este guard quiere cerrar.
    const r = auditaGitattributes([
      '# porque si',
      '*.bat text eol=crlf',
      '*.cmd text eol=crlf'
    ].join('\n'));

    assert.equal(r.reglas, 2);
    assert.equal(r.justificadas, 1);
    assert.deepEqual(r.sinJustificar, [3]);
  });

  it('pero un BLOQUE de comentario si justifica, y es una justificacion', () => {
    // Los dos `.gitattributes` reales de la suite explican en varias lineas, y
    // partir eso en "solo cuenta la ultima" seria exigir que el porque quepa en
    // una linea, que no es una exigencia razonable.
    const r = auditaGitattributes([
      '# Batch scripts: convencion CRLF.',
      '# El repo almacena LF; el checkout produce CRLF.',
      '*.bat text eol=crlf'
    ].join('\n'));

    assert.equal(r.justificadas, 1);
    assert.equal(r.enBloque, 1);
    assert.deepEqual(r.sinJustificar, []);
  });

  it('el recuento por tipo de justificacion cuadra con el total', () => {
    const r = auditaGitattributes([
      '# bloque de una linea',
      '*.bat text eol=crlf',
      '*.cmd text eol=crlf  # al final de la linea',
      '*.ps1 text eol=crlf'
    ].join('\n'));

    // El array tiene cuatro entradas y `join` no anade salto final, asi que la
    // cuarta linea es la linea 4. El numero se cuenta sobre el fichero tal y
    // como se leeria en un editor, que es donde lo va a mirar alguien.
    assert.equal(r.reglas, 3);
    assert.equal(r.justificadas, 2);
    assert.equal(r.alFinalDeLinea, 1);
    assert.equal(r.enBloque, 1);
    assert.deepEqual(r.sinJustificar, [4]);
  });

  it('las lineas se cuentan como las ve un humano, empezando en 1', () => {
    // El numero que va en el informe lo va a leer alguien en un editor, con las
    // lineas empezando en 1. Sacar 0 seria una molestia pequena y diaria.
    const r = auditaGitattributes('\n\n*.bat text eol=crlf\n');

    assert.deepEqual(r.sinJustificar, [3]);
  });

  it('aguanta CRLF en el propio `.gitattributes`, que en Windows es lo normal', () => {
    // Un `.gitattributes` con `text=auto` en una maquina con autocrlf llega con
    // CRLF, y un `split('\n')` a secas deja un `\r` pegado al final de cada
    // linea. Si eso hiciera fallar el matcher, el guard se pondria en rojo solo
    // en Windows.
    const r = auditaGitattributes('# porque si\r\n*.bat text eol=crlf\r\n');

    assert.equal(r.reglas, 1);
    assert.equal(r.justificadas, 1);
  });

  it('un fichero vacio, o sin ninguna regla crlf, sale con todo a cero', () => {
    const vacio = auditaGitattributes('');

    assert.equal(vacio.reglas, 0);
    assert.deepEqual(vacio.sinJustificar, []);

    const soloLf = auditaGitattributes('# porque si\n*.h text eol=lf\n');

    assert.equal(soloLf.reglas, 0);
    assert.equal(soloLf.justificadas, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UN REPO DE VERDAD, PARA LO QUE NO SE PUEDE INVENTAR
// ─────────────────────────────────────────────────────────────────────────

describe('el guard sobre un repo de verdad', () => {
  it('un repo SIN `.gitattributes` no tiene nada que justificar', () => {
    // Y no es un fallo: no puede declarar `eol=crlf` si no tiene fichero donde
    // declararlo. Contarlo como "reglas sin justificar" seria un rojo que
    // nadie podria arreglar.
    const r = auditaRepo(repoCon(null));

    assert.equal(r.reglas, 0);
    assert.deepEqual(r.sinJustificar, []);
    assert.equal(r.sinFichero, true);
  });

  it('el motivo del fallo sale con el numero de linea, no con el fichero entero', () => {
    // Aqui el comentario es un titulo de seccion, no una justificacion pegada a
    // la regla: entre medias hay un `* text=auto` que la cierra. Por eso la
    // regla sale sin justificar, que es justo lo que hay que ver.
    const r = auditaRepo(repoCon([
      '# Normalizar line endings.',
      '* text=auto',
      '*.bat text eol=crlf'
    ].join('\n')));

    assert.deepEqual(r.sinJustificar, [3]);
    assert.equal(r.sinFichero, false);
  });

  it('el nombre del repo es el del directorio, que es como se llama en la suite', () => {
    const r = auditaRepo(repoCon('# porque si\n*.bat text eol=crlf\n'));

    assert.match(r.repo, /^justif-/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// EL INFORME, QUE NO PUEDE MENTIR NI CALLARSE
// ─────────────────────────────────────────────────────────────────────────

describe('el informe dice lo que ha mirado', () => {
  it('dice cuantos repos declaran eol=crlf, no solo cuantos hay', () => {
    // Un guard que solo contara repos con reglas sin justificar podria dar
    // verde con quince repos y ninguno mirado. El numero de repos CON reglas
    // es el que delata que se ha recorrido algo.
    const texto = formatea([
      { repo: 'A', reglas: 2, justificadas: 2, sinJustificar: [],
        alFinalDeLinea: 1, enBloque: 1, sinFichero: false },
      { repo: 'B', reglas: 0, justificadas: 0, sinJustificar: [],
        alFinalDeLinea: 0, enBloque: 0, sinFichero: false }
    ]);

    assert.match(texto, /repos revisados\s+: 2/);
    assert.match(texto, /repos que declaran eol=crlf\s+: 1/);
    assert.match(texto, /reglas eol=crlf declaradas\s+: 2/);
  });

  it('separa las dos formas de justificarlas, que tienen distinta fuerza', () => {
    const texto = formatea([
      { repo: 'A', reglas: 3, justificadas: 3, sinJustificar: [],
        alFinalDeLinea: 1, enBloque: 2, sinFichero: false }
    ]);

    assert.match(texto, /al final de la linea\s+: 1/);
    assert.match(texto, /bloque de comentario de antes: 2/);
  });

  it('y cuando hay reglas sin explicar, dice DONDE', () => {
    const texto = formatea([
      { repo: 'A', reglas: 1, justificadas: 0, sinJustificar: [7],
        alFinalDeLinea: 0, enBloque: 0, sinFichero: false }
    ]);

    assert.match(texto, /A\/\.gitattributes\s+lineas 7/);
    assert.match(texto, /SIN justificar\s+: 1/);
  });

  it('el tope sale en el informe, que es informacion de este run', () => {
    const texto = formatea([
      { repo: 'A', reglas: 1, justificadas: 1, sinJustificar: [],
        alFinalDeLinea: 1, enBloque: 0, sinFichero: false }
    ]);

    assert.match(texto,
      new RegExp('SIN justificar\\s+: 0 \\(tope ' + SIN_JUSTIFICAR_TOLERADOS + '\\)'));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LA SUITE REAL, CON SUELOS QUE IMPIDEN PONERSE VERDE POR NO MIRAR
// ─────────────────────────────────────────────────────────────────────────

describe('la suite real', () => {
  it('ninguna regla eol=crlf entra sin su porque', () => {
    const porRepo = auditaSuite();

    assert.deepEqual(porRepo.flatMap((r) => r.sinJustificar
      .map((n) => r.repo + '/.gitattributes:' + n)), []);
  });

  it('y mira de verdad: encuentra repos que declaran eol=crlf', () => {
    // El suelo. Sin el, este guard podria dar verde con un `auditaSuite()` que
    // devolviese quince repos vacios, que es exactamente lo que pasaria si
    // `esReglaCrlf` no encontrase nunca nada.
    const conReglas = auditaSuite().filter((r) => r.reglas > 0);

    assert.ok(conReglas.length >= 2,
      'solo ha visto ' + conReglas.length + ' repos con reglas eol=crlf');
  });

  it('y mas de dos reglas eol=crlf declaradas, que son las que hay hoy', () => {
    // El dato por el otro lado: si `esReglaCrlf` se rompiera y dejara de
    // encontrar reglas, este numero caeria a cero sin que nada se pusiera rojo.
    const reglas = auditaSuite().reduce((a, r) => a + r.reglas, 0);

    assert.ok(reglas >= 3, 'solo ha visto ' + reglas + ' reglas eol=crlf');
  });

  it('y mas de una justificacion, que sin esto el guard no miraria el texto', () => {
    // Si `justificadas` fuera cero, el guard estaria pasando todo por
    // "sin justificar" y el test de arriba saltaria, pero este comprueba el
    // otro lado: que de verdad se lea el porque que alguien escribio.
    const justificadas = auditaSuite().reduce((a, r) => a + r.justificadas, 0);

    assert.ok(justificadas >= 3, 'solo ha visto ' + justificadas + ' reglas justificadas');
  });

  it('y mas de diez repos revisados', () => {
    assert.ok(auditaSuite().length >= 10);
  });
});
