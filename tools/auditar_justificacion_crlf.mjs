// Segunda puerta del mismo tema que `auditar_eol.mjs`, pero del lado de la
// DECLARACION y no del cumplimiento: que ningun repo de la suite declare
// ficheros con `eol=crlf` sin decir por que.
//
//   node tools/auditar_justificacion_crlf.mjs
//
// Salida:
//   0  toda regla eol=crlf de la suite esta justificada en su .gitattributes
//   1  hay alguna regla eol=crlf sin justificacion
//   2  no se pudo leer uno de los repos (que es otro problema)
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUE ESTA PUERTA EXISTE, Y POR QUE NO LA HACE EL OTRO GUARD
//
// `auditar_eol.mjs` comprueba que los ficheros CUMPLAN la regla que declaran.
// Este comprueba que la regla este justificada, y son cosas distintas: un
// `.gitattributes` puede tener la regla correcta y aplicarla bien, y aun asi
// ser una regla que nadie sabe explicar. Eso no rompe nada hoy. Lo que rompe
// es dentro de seis meses, cuando alguien anada `*.ps1 text eol=crlf` porque
// "los .bat lo tienen", y nadie puede decir si los `.ps1` lo necesitan o si
// lo que se esta copiando es una costumbre.
//
// El `.bat` es el caso que hace que esto no sea teorico. Un `.bat` con LF
// funciona en Windows casi siempre y falla en casos raros: los `goto` con
// etiquetas, los bloques `for` con `%%a`, y los `if` de varias lineas. Es
// decir, falla de forma intermitente y en la maquina de otro, que es la peor
// forma de fallar. Un `eol=crlf` sobre `.bat` no es una mania del estilo, es
// una defensa, y por eso merece el mismo cuidado que cualquier otra.
//
// El fallo que esta puerta evita es el de la COPIA: la puerta de `eol=crlf`
// del otro guard ya obliga a que los 25 ficheros con esa regla la cumplan, pero
// no dice nada de POR QUE la declararon. Sin esta, la regla es una convencion
// sin origen, y las convenciones sin origen se propagan solas.
//
// ─────────────────────────────────────────────────────────────────────────
// QUE CUENTA COMO JUSTIFICADO, Y POR QUE ES UNA REGLA TAN ESTRECHA
//
// Se exige un comentario en las lineas INMEDIATAMENTE anteriores a la regla, y
// no "en algun sitio del fichero", por una razon que sale de mirar los dos
// `.gitattributes` que hay hoy:
//
//   - ABDOmegaUnified tiene dos lineas de comentario y ahi la regla que
//     cuentan es `*.bat text eol=crlf`. La segunda linea ("El repo almacena
//     LF...") explica el mecanismo; la primera explica el PORQUE. Las dos
//     juntas son UNA justificacion, y partirla en dos seria exigir algo que no
//     se puede exigir: que el porque quepa en una linea.
//   - ABDNeural explica su bloque `eol=crlf` con cinco lineas de comentario
//     seguidas. Tambien es una justificacion, y es la unica forma de explicar
//     bien algo que tiene dos partes.
//
// Asi que lo que se acepta es un BLOQUE de comentario pegado a la regla: una o
// mas lineas de comentario seguidas, sin nada entre medias, hasta la regla. La
// separacion —un comentario en la cabecera del fichero, a treinta lineas— no
// cuenta, porque ahi ya no se sabe a que regla se refiere la frase, y un guard
// que lo aceptara estaria midiendo la distancia en vez de la justificacion.
//
// Y aun asi es mas de lo que se puede comprobar de verdad, y hay que decirlo:
// que el comentario exista NO es que el por que este bien. Un "# porque si" pasa
// este guard. Lo que el guard garantiza es mas modesto y es lo unico que se
// puede garantizar sin hacer un juicio de valor sobre el texto: que la regla
// no se ha colado sin que nadie escribiera una frase al lado.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUE UN COMENTARIO EN LA MISMA LINEA TAMBIEN CUENTA
//
// Porque un `.gitattributes` puede traer la justificacion en la propia linea, que
// es donde se pone cuando hay varias reglas Parecidas y solo una se justifica:
//
//     *.bat  text eol=crlf   # fix #714: cmd.exe necesita CRLF
//     *.cmd  text eol=crlf
//
// Se acepta cualquiera de las dos formas. Lo que NO se acepta es un comentario
// al final de una linea de otra regla, ni una linea en blanco entre el
// comentario y la regla, porque ahi ya no se sabe a que regla se refiere la
// frase.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { raizDeSuite, reposDeSuite } from './auditar_ignore_oculto.mjs';

/**
 * Cuantas reglas `eol=crlf` puede tener un repo sin justificar.
 *
 * Mismo criterio que el tope de no auditables del otro guard, y por el mismo
 * motivo: un numero, no una lista de nombres. Asi no hay que tocar el guard
 * cada vez que aparece un repo nuevo, y a la vez no vale como excusa para dejar
 * la suite entera sin mirar.
 */
export const SIN_JUSTIFICAR_TOLERADOS = 0;

/**
 * Una linea de `.gitattributes` que DECLARA una regla `eol=crlf`.
 *
 * Se ignoran los comentarios y las lineas en blanco, que es lo que hace que
 * "la regla que aparece en el fichero" no signifique "la ultima linea no
 * vacia".
 *
 * @param {string} linea
 * @returns {boolean}
 */
export function esReglaCrlf (linea) {
  const sinComentario = String(linea).split('#')[0];

  return /(^|\s)eol=crlf(\s|$)/.test(sinComentario);
}

/**
 * El comentario que acompaña a una regla, y si viene pegado o en la linea de
 * antes.
 *
 * Se separa "viene en la misma linea" de "viene en el bloque de antes" porque
 * tienen distinta fuerza y hay que poder contarlos por separado en el informe:
 * una regla justificada al final de la linea esta mas atada a ella que una que
 * tiene un bloque entero encima, y esa diferencia es informacion.
 *
 * @param {string} linea
 * @returns {string} el comentario en la misma linea, o cadena vacia
 */
export function comentarioEnLinea (linea) {
  const corte = String(linea).indexOf('#');

  if (corte === -1) return '';

  return String(linea).slice(corte + 1).trim();
}

/**
 * Las reglas `eol=crlf` de un `.gitattributes` y si cada una esta justificada.
 *
 * El recorrido es linea a linea y el estado que se arrastra es el BLOQUE de
 * comentario acumulado, que se invalida en cuanto aparece una linea que NO es
 * un comentario. Esa invalidacion es lo que hace que un comentario al final del
 * fichero no justifique una regla de arriba: si no, bastaba con escribir "# por
 * que" al final y dejar el resto sin tocar.
 *
 * Y el bloque se vacia despues de usarse, con lo que dos reglas `eol=crlf`
 * seguidas NO comparten justificacion. Es deliberado, y es lo que evita que
 * `*.bat text eol=crlf` justificado sirva de Mastercard para `*.cmd text
 * eol=crlf` que viene justo debajo sin decir nada. Cada regla nueva es una
 * regla nueva, y si es la misma, repetir el porque no cuesta nada.
 *
 * @param {string} contenido
 * @returns {{reglas: number, justificadas: number, sinJustificar: number[],
 *           alFinalDeLinea: number, enBloque: number}}
 */
export function auditaGitattributes (contenido) {
  const out = {
    reglas: 0,
    justificadas: 0,
    sinJustificar: [],
    alFinalDeLinea: 0,
    enBloque: 0
  };

  let bloque = '';

  for (const [i, cruda] of String(contenido).split('\n').entries()) {
    const linea = cruda.replace(/\r$/, '');
    const lineaNum = i + 1;

    if (!esReglaCrlf(linea)) {
      // Una linea que no es comentario cierra el bloque pendiente. Una linea en
      // blanco tambien, y eso es lo que hace que el bloque tenga que estar
      // PEGADO a la regla.
      if (/^\s*#/.test(linea)) {
        bloque += linea.trim();
      } else {
        bloque = '';
      }
      continue;
    }

    out.reglas++;

    const pegado = comentarioEnLinea(linea);

    if (pegado !== '') {
      out.justificadas++;
      out.alFinalDeLinea++;
    } else if (bloque !== '') {
      out.justificadas++;
      out.enBloque++;
    } else {
      out.sinJustificar.push(lineaNum);
    }

    // La regla no conserva el bloque para la siguiente: si dos reglas seguidas
    // comparten justificacion, cada una tiene que decir la suya.
    bloque = '';
  }

  return out;
}

/**
 * Un repo medido: las reglas `eol=crlf` que declara y si estan justificadas.
 *
 * @param {string} repo
 * @returns {{repo: string, reglas: number, justificadas: number,
 *            sinJustificar: number[], alFinalDeLinea: number,
 *            enBloque: number, sinFichero: boolean}}
 */
export function auditaRepo (repo) {
  const nombre = basename(repo.replace(/[\\/]+$/, '')) || repo;

  let contenido;

  try {
    contenido = readFileSync(join(repo, '.gitattributes'), 'utf8');
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'EISDIR')) {
      // Un repo SIN `.gitattributes` no puede declarar `eol=crlf`, asi que no
      // tiene nada que justificar. No es un fallo del guard, y decirlo aqui
      // evita que un repo sin el fichero se cuente como si tuviera reglas sin
      // justificar.
      return {
        repo: nombre, reglas: 0, justificadas: 0, sinJustificar: [],
        alFinalDeLinea: 0, enBloque: 0, sinFichero: true
      };
    }

    throw new Error('no se pudo leer .gitattributes de ' + repo + ': ' + e.message);
  }

  return { repo: nombre, ...auditaGitattributes(contenido), sinFichero: false };
}

/** Git con la excepcion de `safe.directory`, que en esta maquina hace falta. */
function gitSeguro (repo, args) {
  try {
    return execFileSync('git', [
      '-c', 'safe.directory=' + repo.replace(/\\/g, '/').replace(/\/+$/, ''), ...args
    ], { cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    if (e.status !== undefined && e.status !== null) throw e;

    const stderr = (e.stderr || '').toString().trim();
    throw new Error('`git ' + args.join(' ') + '` ni llego a ejecutarse en ' + repo + ': '
      + (stderr === '' ? (e.message || String(e)) : stderr.split('\n')[0]));
  }
}

/** El informe de la suite entera. */
export function auditaSuite (raiz = raizDeSuite()) {
  if (raiz === null) {
    throw new Error('no encuentro la raiz de la suite');
  }

  return reposDeSuite(raiz).map((repo) => auditaRepo(repo));
}

/** Un informe que no puede dar el verde por no haber mirado. */
export function formatea (porRepo) {
  const suma = {
    repos: 0, conReglas: 0, reglas: 0, justificadas: 0,
    pegadas: 0, enBloque: 0, sinJustificar: 0
  };
  const malos = [];

  for (const r of porRepo) {
    suma.repos++;

    if (r.reglas === 0) continue;

    suma.conReglas++;
    suma.reglas += r.reglas;
    suma.justificadas += r.justificadas;
    suma.pegadas += r.alFinalDeLinea;
    suma.enBloque += r.enBloque || 0;
    suma.sinJustificar += r.sinJustificar.length;

    if (r.sinJustificar.length > 0) {
      malos.push({ repo: r.repo, lineas: r.sinJustificar });
    }
  }

  const lineas = [
    'repos revisados                                  : ' + suma.repos,
    'repos que declaran eol=crlf                       : ' + suma.conReglas,
    'reglas eol=crlf declaradas                       : ' + suma.reglas,
    '  justificadas al final de la linea               : ' + suma.pegadas,
    '  justificadas en el bloque de comentario de antes: ' + suma.enBloque,
    'SIN justificar                                    : ' + suma.sinJustificar
      + ' (tope ' + SIN_JUSTIFICAR_TOLERADOS + ')'
  ];

  if (malos.length === 0) {
    lineas.push('');
    lineas.push('toda regla eol=crlf dice por que.');
    return lineas.join('\n');
  }

  lineas.push('');
  lineas.push('REGLAS eol=crlf SIN EXPLICAR:');
  for (const m of malos) {
    lineas.push('  ' + m.repo + '/.gitattributes  lineas '
      + m.lineas.join(', ') + '   <- anade un comentario justo antes');
  }

  return lineas.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const porRepo = auditaSuite();

    console.log(formatea(porRepo));

    const sinJustificar = porRepo.reduce((a, r) => a + r.sinJustificar.length, 0);

    if (sinJustificar > SIN_JUSTIFICAR_TOLERADOS) {
      console.error('');
      console.error('auditar_justificacion_crlf: ' + sinJustificar
        + ' regla(s) eol=crlf sin explicar, de un tope de ' + SIN_JUSTIFICAR_TOLERADOS + '.');
      process.exit(1);
    }

    process.exit(0);
  } catch (e) {
    console.error('auditar_justificacion_crlf: no se pudo ni siquiera leer la suite.');
    console.error(e.message);
    process.exit(2);
  }
}
