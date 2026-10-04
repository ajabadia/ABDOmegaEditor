// Puerta del TEXTO: que en disco, en este repositorio, haya el texto que alguien
// escribio y no el que dejo una herramienta por el camino.
//
//   node tools/auditar_texto.mjs [raiz]
//
// Sin argumento audita el repositorio en el que vive este fichero, que es lo
// que hace el workflow. Con un argumento audita ese otro directorio, que es lo
// que necesita el test para comprobar que la puerta se pone en rojo de verdad
// y no solo que la funcion devuelve hallazgos.
//
// Salida:
//   0  los ficheros versionados de la raiz estan limpios
//   1  hay un byte invisible, o un caracter que este repo no usa, o texto UTF-8
//      que se decodifica mal
//   2  no se pudo ni siquiera leer la suite (que es otro problema)
//
// EL 2 DICE ESTAS PALABRAS Y NO OTRAS, Y NO ES UNA CASUALIDAD. El arnes de
// `guards_main.test.mjs` comprueba que un fallo al LEER salga con el 2 y con un
// texto que lo diga, y no con el 1 de un hallazgo: el 1 manda a mirar un
// fichero, y si lo que paso es que no se pudo leer nada, a mirar un fichero
// que no tiene nada que ver. Ese 2 contra ese 1 es el contrato de los cinco y
// esta puerta lo firma tambien.
//
// ─────────────────────────────────────────────────────────────────────────
// ESTA NO ES LA QUINTA PUERTA DE LA SUITE, Y POR QUE ESTA DONDE ESTA
//
// Las otras cuatro auditan la SUITE: los repos hermanos, sus ficheros, sus
// reglas. Esta audita OTRA cosa, que es el propio repositorio raiz, y por eso
// no necesita que el workflow haya clonado los trece. Funciona igual en un
// checkout a pelo, que es lo que la hace distinta de todas las demas.
//
// Por eso vive dentro del paso de TESTS y no como paso propio. El encargo es
// que corra AL ARRANCAR los tests, y asi se cumple de la forma mas literal
// posible: es la primera linea de ese paso, de modo que un fichero con un CR
// colado pone el paso en rojo antes de que corra un solo test. Si corriera
// como un test mas, un byte invisible daria un fallo dentro de una cadena de
// texto o de un salto de linea, que es un fallo que se lee en la ultima linea
// de la salida, cuatro minutos despues, con el fichero equivocado delante.
//
// Y el `before()` de `auditar_texto.test.mjs` hace lo mismo en local, para que
// `node --test tools/auditar_texto.test.mjs` avise antes de empezar.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUE HACE FALTA, Y NO ES TEORIA: ES EL TERCIO DE LO QUE HA PASADO
//
// Estas reglas se escriben porque el fallo es real y tiene tres formas
// distintas, y las tres han pasado por aqui:
//
//   1. Un CR donde no deberia haberlo. El `.gitattributes` de la raiz pone
//      `* text=auto eol=lf`, asi que un fichero con CRLF tiene el blob
//      correcto y el disco sucio, y `git diff` sale VACIO porque normaliza
//      antes de comparar. Es el mismo caso "CRLF solo en el disco" que
//      `auditar_eol.mjs` ya tiene que mirar aparte, y por eso esta puerta
//      tambien lee bytes en vez de preguntarle a git.
//
//   2. Un CR-LF duplicado: dos CR en vez de uno. Se cuela porque un CR
//      escrito a mano encima de un CRLF existente no se ve, y porque un
//      replace que quita todos los CR se lleva el primero y deja el segundo.
//      El primero y el segundo los caza `auditar_eol.mjs`, pero solo en la
//      suite, no en la raiz.
//
//   3. Texto que se ha leido con la codificacion equivocada y se ha vuelto a
//      escribir. "ensenaba", con la enye y la ie acentuadas, leido como
//      latin-1 y guardado asi: sigue siendo texto, sigue siendo valido UTF-8
//      despues de escribirlo, y no lo detecta ni un linter de sintaxis ni el
//      diff, porque el cambio es "una palabra distinta" y no "un fichero
//      roto". Esto no lo caza nadie: no hay ninguna regla de este repositorio
//      que mire que los caracteres sean los que alguien escribio.
//
// Y el tercero tiene un efecto de bucle que conviene decir de entrada: si este
// fichero escribiera el ejemplo de mojibake tal cual, la puerta se saltaria a
// si misma. Los dos ejemplos van en hexadecimal y con codepoints, que es como
// se puede nombrar un caracter sin escribirlo. El test tiene la misma
// limitacion y hace lo mismo por el mismo motivo.
//
// ─────────────────────────────────────────────────────────────────────────
// CUAL ES "EL TEXTO QUE ALGUIEN ESCRIBIO", Y COMO SE SABE
//
// La respuesta ingenua es "solo ASCII", y es FALSA aqui, con datos: los
// diecinueve ficheros versionados que habia antes de que existiera este tenian
// 6.930 caracteres no-ASCII, y 6.771 de ellos son la caja de dibujo de los
// separadores de comentario. Poner "cero no-ASCII" habria puesto en rojo el
// repo entero en el commit en que se escribio esta puerta.
//
// Asi que la regla no es "cero no-ASCII" sino "el no-ASCII que este repo ha
// decidido usar, y nada mas". Y la lista no se inventa: esta medida con el
// codigo de abajo, sobre los diecinueve ficheros del indice de entonces, y son
// dieciseis codepoints:
//
//   U+2500  caja de dibujo       6.771  93 lineas, LAS 93 de comentario
//   U+2014  raya                    77  en comentarios y en el README
//   U+00ED  i acentuada             19  "codigo", "aqui", "asi"
//   U+00F1  n con tilde             13  "ano", "senal"
//   U+00D1  N con tilde             11  "MANANA"
//   U+00E9  e acentuada              7
//   U+00F3  o acentuada              6
//   U+00E1  a acentuada              6
//   U+00FA  u acentuada              5
//   U+00B7  punto medio              5  separador de las tablas de margenes
//   U+2026  puntos suspensivos        3  README
//   U+00BF  interrogacion             2  guards.yml y un mensaje de fallo
//   U+2192  flecha                   2  .gitignore y README
//   U+00C9  E acentuada              1  auditar_eol.mjs
//   U+00AB  comilla angular izq.     1  puertas_de_ramas.mjs
//   U+00BB  comilla angular der.     1  puertas_de_ramas.mjs
//
// Y de esos dieciseis, ocho son LETRAS acentuadas, que se tratan aparte y mas
// abajo. Los ocho que quedan son simbolos, y esos son los que viven en la
// lista `PERMITIDOS`, uno por uno, con el fichero donde se usa.
//
// ─────────────────────────────────────────────────────────────────────────
// LAS LETRAS ACENTUADAS: GENEROSAS A PROPOSITO
//
// En vez de listar una por una las 70 letras que puede llevar un comentario en
// castellano, frances o catalan, se permite TODO el bloque latino-1
// suplementario (U+00C0 a U+00FF menos los surrogados). Es una decision, no
// un descuido: escribir "aqui" con la i acentuada por error tiene que ser
// facil de arreglar sin que un guard obligue a escribir el nombre del
// codepoint.
//
// Y no se pierde nada por permitirlo, porque el mojibake no es una letra
// acentuada: es una letra acentuada SEGUIDA de un caracter del rango
// U+0080-U+00BF, que es lo que sale cuando un texto UTF-8 se lee como latin-1.
// La enye es U+00F1 y en UTF-8 son los bytes C3 B1; leidos como latin-1 esos
// dos bytes son U+00C3 y U+00B1, y ahi esta el fallo: dos caracteres donde
// habia uno. En castellano no hay NINGUNA letra acentuada seguida de un
// caracter de ese rango, y medido sobre los diecinueve ficheros de antes sale
// CERO.
// Esa es la regla `mojibake`, y es la unica de las tres capas que necesita
// mirar dos caracteres a la vez.
//
// Ojo con lo que casi sale de aqui, porque es el falso positivo que esta
// puerta casi se come: `compania` con enye e ie acentuadas, que es
// "compañía" escrito bien, sale como letra acentuada seguida de letra
// acentuada. Si la regla fuera "acentuada seguida de CUALQUIER cosa no-ASCII",
// ese par levantaria la mano y habria que permitirlo como excepcion, que es
// como las reglas empiezan a pudrirse. Con la regla estrecha —seguida de
// U+0080-U+00BF y no de lo que sea— no hay excepcion que mantener, porque
// `i` no esta en ese rango. Esta medido, y por eso hay un test que lo fija.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Los simbolos no-ASCII que este repo usa a proposito, y donde se usa cada uno.
 *
 * La razon no es decorativa: es la lista que hay que METER cuando aparece un
 * caracter nuevo, y tener que escribir de que fichero sale es lo que hace que
 * se mire dos veces antes de meterlo. Un test comprueba que ninguna entrada se
 * quede sin razon.
 *
 * Medido sobre el indice, no estimado. Ver la cabecera.
 *
 * @type {Map<number, string>}
 */
export const PERMITIDOS = new Map([
  [0x00ab, 'comilla angular de apertura, en la puerta de ramas'],
  [0x00bb, 'comilla angular de cierre, en la puerta de ramas'],
  [0x00b7, 'punto medio, separador de las tablas de margenes'],
  [0x00bf, 'interrogacion de apertura, en el workflow y en un mensaje de fallo'],
  [0x2014, 'raya, la que separa las frases largas de los comentarios'],
  [0x2026, 'puntos suspensivos, en el README'],
  [0x2192, 'flecha, que en el .gitignore significa "lo de aqui va ahi"'],
  [0x2500, 'caja de dibujo, la de los separadores de bloque de comentario']
]);

/**
 * Los ficheros del indice que esta puerta NO mira, y por que.
 *
 * Solo uno, y no por conveniencia: `pnpm-lock.yaml` son 123.777 bytes que
 * escribe `pnpm` a partir de lo que contesta el registro, no una persona. Un
 * nombre de paquete o un campo de metadatos con un caracter raro meteria este
 * paso en rojo sin que nadie de este repositorio pueda arreglarlo, y un guard
 * que se pone rojo por cosas que no son suyas es un guard que se apaga.
 *
 * Se ha medido que hoy tiene CERO no-ASCII, asi que la exclusion no esta
 * escondiendo nada: si mañana los tiene, es que los tiene el registro.
 *
 * @type {Set<string>}
 */
export const FUERA_DE_AUDITORIA = new Set([
  'pnpm-lock.yaml'
]);

// El rango de los bytes que, leidos como latin-1, son la mitad de un caracter
// UTF-8 partido. En castellano no hay ni un caracter de este rango en una
// palabra, y por eso es la segunda mitad de la regla de mojibake.
const MEDIA_BYTE = (c) => c >= 0x80 && c <= 0xbf;

// Un caracter del rango latino-1 suplementario que sea una LETRA. Los
// surrogados (0xD800-0xDFFF) estan dentro del rango numerico y no son letras:
// son los dos medias palabras de un emoji, asi que se quitan aparte.
function esLetraLatina (cp) {
  return cp >= 0xc0 && cp <= 0xff && !(cp >= 0xd800 && cp <= 0xdfff);
}

/** Un nombre corto y legible para un caracter, para el informe. */
export function nombreDe (cp) {
  if (PERMITIDOS.has(cp)) return 'permitido';
  if (cp === 0x000d) return 'CR';
  if (cp === 0x000a) return 'LF';
  if (cp === 0x0009) return 'TAB';
  if (cp === 0x00a0) return 'espacio duro (NBSP)';
  if (cp === 0xfffd) return 'caracter de sustitucion (U+FFFD)';
  // OJO: aqui no se llama BOM a proposito. El U+FEFF de la POSICION 0 es un BOM
  // y lo comprueba su propio hallazgo, con su propio mensaje; uno en mitad de
  // fichero no es un BOM, es un espacio de ancho cero pegado desde otro
  // documento, que es invisible y descuadra cualquier cosa que cuente columnas.
  if (cp === 0xfeff) return 'espacio de ancho cero';
  if (esLetraLatina(cp)) return 'letra latina-' + cp.toString(16).toUpperCase();
  if (cp >= 0x80 && cp <= 0x9f) return 'control C1';
  if (cp >= 0x80 && cp <= 0xbf) return 'medio byte latin-1';
  if (cp >= 0x2e80 && cp <= 0x9fff) return 'c chino/japones';
  if (cp >= 0xac00 && cp <= 0xd7af) return 'coreano hangul';
  if (cp >= 0xff00 && cp <= 0xffef) return 'ancho completo';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'cirilico';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'griego';
  if (cp >= 0x0590 && cp <= 0x05ff) return 'hebreo';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'arabe';
  if (cp >= 0x0900 && cp <= 0x097f) return 'devanagari';
  if (cp >= 0x0e00 && cp <= 0x0e7f) return 'tai';

  return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
}

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE PURA: lee texto, devuelve hallazgos. No toca el disco, y por eso el
// test puede darle un `\r` o un caracter raro sin montar nada.

/**
 * Un hallazgo: donde esta y que es.
 *
 * `tipo` es el nombre corto que sale en el informe; `detalle` es la frase que
 * lo explica, porque "linea 4" no dice si hay que borrar un caracter o
 * reescribir un fichero entero.
 *
 * @typedef {{tipo: string, linea: number, columna: number, detalle: string}} Hallazgo
 */

/**
 * Todos los hallazgos de un TEXTO, con su linea y su columna.
 *
 * Las columnas son indices de CARACTER dentro de la linea, contando desde
 * uno. No son offsets de byte, y se dice porque en un fichero con acentos no
 * son lo mismo: quien vaya a mirar el fichero con un editor ve la columna que
 * dice el informe, que es justo para eso que se cuenta en caracteres.
 *
 * @param {string} texto
 * @param {{enArchivo?: string}} [opciones]
 * @returns {Hallazgo[]}
 */
export function auditaTexto (texto, opciones = {}) {
  const archivo = opciones.enArchivo || 'el texto';
  const hallazgos = [];

  const anota = (tipo, linea, columna, detalle) => {
    hallazgos.push({ tipo, linea, columna, detalle: archivo + ': ' + detalle });
  };

  // UNA SOLA PASADA POR EL TEXTO ENTERO, Y NO UN `split('\n')`.
  //
  // La razon es el CR. Con un `split('\n')` el salto de linea se lo come el
  // reparto y el CR de un CRLF se queda sin vecino, o sea que el caso MAS
  // COMUN de todos —el fichero que ha pasado por una maquina de Windows— se
  // reportaba como "CR suelto", que no es lo que es y lleva a mirar el sitio
  // equivocado. Para distinguir un CR-LF de un CR a secas hay que ver los dos
  // caracteres juntos, y para eso no puede haber un reparto por lineas de por
  // medio.
  //
  // El numero de linea y el de columna se llevan a mano mientras se avanza.
  let linea = 1;
  let columna = 1;

  // Un `\r\r\n` son DOS hallazgos si no se recuerda: el primero dice "duplicado"
  // y el segundo, que ve el CR que queda delante del LF, dira "CRLF". Se
  // recuerda con esta bandera para contar el problema una vez y no dos.
  let vaDetrasDeUnDuplicado = false;

  for (let i = 0; i < texto.length;) {
    const cp = texto.codePointAt(i);
    const ancho = cp > 0xffff ? 2 : 1;
    const siguiente = i + ancho < texto.length ? texto.codePointAt(i + ancho) : null;

    if (cp === 0x000d) {
      if (siguiente === 0x000d) {
        vaDetrasDeUnDuplicado = true;

        anota('cr', linea, columna, 'CR duplicado en la linea ' + linea
          + '. Hay dos CR donde deberia haber uno: se cuela al escribir a mano'
          + ' encima de un CRLF, y quitar todos los CR con una sustitucion'
          + ' se lleva el primero y deja el segundo.');
      } else if (siguiente === 0x000a && vaDetrasDeUnDuplicado) {
        vaDetrasDeUnDuplicado = false;
      } else {
        const forma = siguiente === 0x000a ? 'CRLF' : 'CR suelto';

        anota('cr', linea, columna, forma + ' en la linea ' + linea
          + '. Los ficheros de este repo son LF: el .gitattributes pone eol=lf,'
          + ' y git no lo ve porque normaliza antes de comparar.');
      }

      i += ancho;
      continue;
    }

    if (cp === 0x000a) {
      linea++;
      columna = 1;
      i += ancho;
      continue;
    }

    if (cp < 0x20 && cp !== 0x0009) {
      anota('control', linea, columna, 'byte de control U+'
        + cp.toString(16).toUpperCase().padStart(4, '0') + ' en la linea ' + linea
        + '. En un fichero de texto solo hay salto de linea y tabulador.');
    } else if (cp === 0x007f) {
      anota('control', linea, columna, 'DEL (U+007F) en la linea ' + linea
        + ', que no se ve ni seleccionandolo.');
    } else if (cp === 0x00a0) {
      anota('invisible', linea, columna, 'espacio duro (NBSP) en la linea ' + linea
        + '. Se parece al espacio y no lo es: viene de copiar y pegar de un'
        + ' documento, y rompe el ancho de las columnas.');
    } else if (cp >= 0x80 && cp <= 0x9f) {
      anota('control', linea, columna, 'control C1 U+'
        + cp.toString(16).toUpperCase().padStart(4, '0') + ' en la linea ' + linea
        + '. Sale de leer un fichero UTF-8 como latin-1.');
    } else if (cp === 0xfffd) {
      anota('sustitucion', linea, columna, 'U+FFFD en la linea ' + linea
        + '. Es el caracter que pone quien NO puede leer los bytes, o sea que el'
        + ' fichero ya ha pasado por una decodificacion equivocada.');
    } else if (cp > 0x7f && i !== 0) {
      // El `i !== 0` es el BOM de cabeza: se comprueba abajo, con su propio
      // mensaje, porque "caracter no permitido" no le dice a nadie que lo que
      // tiene delante de la primera linea es invisible.
      if (!esLetraLatina(cp) && !PERMITIDOS.has(cp)) {
        anota('no-permitido', linea, columna, nombreDe(cp) + ' en la linea ' + linea
          + ' (columna ' + columna + '). Este repo solo usa los no-ASCII de'
          + ' PERMITIDOS y las letras acentuadas.');
      } else if (esLetraLatina(cp) && siguiente !== null && MEDIA_BYTE(siguiente)) {
        anota('mojibake', linea, columna, 'letra acentuada seguida de un caracter'
          + ' de U+0080-U+00BF en la linea ' + linea + ' (columna ' + columna
          + '). Eso es texto UTF-8 leido como latin-1: decodificalo otra vez en'
          + ' UTF-8 y se arregla.');
      }
    }

    columna++;
    i += ancho;
  }

  // El BOM se mira aparte y al final porque solo vale en la POSICION 0: un
  // U+FEFF en mitad de fichero no es un BOM, es un espacio de ancho cero que
  // alguien ha pegado, y el mensaje tiene que decir eso.
  if (texto.charCodeAt(0) === 0xfeff) {
    anota('bom', 1, 1, 'BOM al principio del fichero. Este repo no lo usa en'
      + ' ningun sitio y hace que la primera linea no sea lo que parece.');
  }

  return hallazgos;
}

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE DE BYTES: lo que un `split('\n')` ya no puede ver.
//
// El UTF-8 invalido se mira ANTES de decodificar, porque decodificar sin
// `fatal` lo que hace es inventarse un U+FFFD en el sitio malo y seguir: el
// aviso llegaria con la linea equivocada y el byte perdido. Con `fatal` se
// sabe que el byte es invalido, y a partir de ahi se decodifica sin `fatal`
// solo para poder seguir contando lineas, avisando de que las posiciones
// siguientes ya no son de fiar.

const DECODIFICADOR_ESTRICTO = new TextDecoder('utf-8', { fatal: true });
const DECODIFICADOR = new TextDecoder('utf-8');

/**
 * Los hallazgos de un BUFFER entero, leyendo los bytes primero.
 *
 * @param {Buffer|Uint8Array} buf
 * @param {string} nombre
 * @returns {Hallazgo[]}
 */
export function auditaBytes (buf, nombre) {
  const hallazgos = [];
  let texto;

  try {
    texto = DECODIFICADOR_ESTRICTO.decode(buf);
  } catch (e) {
    const donde = primerByteInvalido(buf);

    hallazgos.push({
      tipo: 'utf8',
      linea: lineaDeByte(buf, donde.byte),
      columna: donde.byte - donde.linea + 1,
      detalle: nombre + ': UTF-8 invalido en el byte ' + donde.byte
        + ' de la linea ' + (donde.linea + 1) + ' (' + donde.que + ').'
        + ' El fichero no se puede leer como el texto que dice ser.'
    });

    texto = DECODIFICADOR.decode(buf);
  }

  for (const h of auditaTexto(texto, { enArchivo: nombre })) {
    // Los hallazgos que ya se han dicho con el byte exacto no se repiten: el
    // U+FFFD que pone la decodificacion laxa no es un hallazgo nuevo, es la
    // consecuencia del anterior, y verlo dos veces desorienta.
    if (h.tipo === 'sustitucion') continue;
    hallazgos.push(h);
  }

  return hallazgos;
}

/** El primer byte que no es UTF-8 valido, con su linea. */
function primerByteInvalido (buf) {
  // Se busca por fuerza bruta desde el principio porque el caso es raro y no
  // merece un indice: el fichero mas grande del repo son 123 KB y ni se nota.
  for (let i = 0; i < buf.length;) {
    const b = buf[i];

    if (b < 0x80) { i += 1; continue; }

    const largo = b >= 0xf0 ? 4 : (b >= 0xe0 ? 3 : (b >= 0xc0 ? 2 : 0));

    if (largo === 0) {
      return { byte: i, linea: lineaDeByte(buf, i), que: 'byte suelto 0x' + hex(b) };
    }

    const siguen = buf.slice(i + 1, i + largo);

    if (siguen.length < largo - 1 || [...siguen].some((c) => c < 0x80 || c > 0xbf)) {
      return { byte: i, linea: lineaDeByte(buf, i), que: 'secuencia UTF-8 rota' };
    }

    i += largo;
  }

  return { byte: 0, linea: 0, que: 'sin bytes invalidos' };
}

/** Cuantas lineas hay antes de este byte. */
function lineaDeByte (buf, byte) {
  let linea = 0;
  for (let i = 0; i < byte && i < buf.length; i++) {
    if (buf[i] === 0x0a) linea++;
  }

  return linea;
}

function hex (b) {
  return b.toString(16).toUpperCase().padStart(2, '0');
}

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE QUE TOCA EL DISCO: el indice de ESTE repositorio.
//
// Y aqui hay una diferencia con las otras cuatro puertas, que es a proposito:
// estas miran la raiz para encontrar la suite, y eso exige que `ABDSharedAssets`
// este al lado. Esta no: la raiz se deduce de donde vive este fichero, que es
// `tools/` dentro del repo, y el unico requisito es que haya un `.git` donde
// toca. Por eso es la unica que funciona en un checkout sin suite.

/** La raiz de este repositorio, deducida de donde vive este fichero. */
export function raizPorDefecto () {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

/** Los ficheros del indice de la raiz, menos los que quedan fuera. */
export function ficherosAuditables (raiz = raizPorDefecto()) {
  const salida = execFileSync('git', [
    '-c', 'safe.directory=' + raiz.replace(/\\/g, '/').replace(/\/+$/, ''),
    'ls-files', '-z'
  ], {
    cwd: raiz,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });

  return salida.split('\0').filter((f) => f !== '' && !FUERA_DE_AUDITORIA.has(f));
}

/**
 * La auditoria entera del repositorio raiz.
 *
 * @param {string} [raiz]
 * @returns {{raiz: string, ficheros: string[], hallazgos: Hallazgo[], usados: Map<number, number>}}
 */
export function auditaRaiz (raiz = raizPorDefecto()) {
  const ficheros = ficherosAuditables(raiz);
  const hallazgos = [];
  const usados = new Map();

  for (const rel of ficheros) {
    const buf = readFileSync(join(raiz, rel));
    const losDeste = auditaBytes(buf, rel);

    hallazgos.push(...losDeste);

    if (!losDeste.some((h) => h.tipo === 'utf8')) {
      for (const ch of DECODIFICADOR.decode(buf)) {
        const cp = ch.codePointAt(0);
        if (cp > 0x7f) usados.set(cp, (usados.get(cp) || 0) + 1);
      }
    }
  }

  return { raiz, ficheros, hallazgos, usados };
}

/** Si el informe es un hallazgo o no. */
export function falla (informe) {
  return informe.hallazgos.length > 0;
}

/** Un informe legible, con el fallo primero si hay fallo. */
export function formatea (informe) {
  const usados = [...informe.usados.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]);

  const lineas = [
    'ficheros versionados revisados                    : ' + informe.ficheros.length,
    'caracteres no-ASCII en ellos                      : '
      + usados.reduce((a, u) => a + u[1], 0),
    'no-ASCII distintos                               : ' + usados.length
      + ' ('
      + usados.filter((u) => esLetraLatina(u[0])).length + ' letras acentuadas, '
      + usados.filter((u) => PERMITIDOS.has(u[0])).length + ' simbolos permitidos)',
    'hallazgos                                         : ' + informe.hallazgos.length
  ];

  if (informe.hallazgos.length === 0) {
    lineas.push('');
    lineas.push('lo que hay en disco es el texto que alguien escribio.');
    return lineas.join('\n');
  }

  lineas.push('');
  lineas.push('HALLAZGOS:');

  // Se agrupa por fichero y se ordena por linea, porque quien arregla esto
  // va a abrir ficheros, y saber que hay cuatro en el mismo antes que la lista
  // en orden de descubrimiento ahorra el trabajo de agruparlos a mano.
  const porFichero = new Map();

  for (const h of informe.hallazgos) {
    if (!porFichero.has(h.detalle.split(':')[0])) porFichero.set(h.detalle.split(':')[0], []);
    porFichero.get(h.detalle.split(':')[0]).push(h);
  }

  for (const [fichero, suyos] of porFichero) {
    lineas.push('  ' + fichero);
    for (const h of suyos.sort((a, b) => a.linea - b.linea || a.columna - b.columna)) {
      lineas.push('    linea ' + String(h.linea).padStart(5)
        + ', col ' + String(h.columna).padStart(4) + '  ' + h.tipo
        + '  ' + h.detalle.split(': ').slice(1).join(': '));
    }
  }

  return lineas.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    // El `cwd` NO se usa para decidir que raiz es, y es a proposito: si se usara,
    // ejecutada desde otra parte de la suite miraria el repositorio equivocado
    // sin avisar. La raiz es la de este fichero, salvo que se diga otra cosa.
    const informe = auditaRaiz(process.argv[2] || raizPorDefecto());

    console.log(formatea(informe));

    if (falla(informe)) {
      console.error('');
      console.error('auditar_texto: ' + informe.hallazgos.length
        + ' hallazgo(s) en los ficheros versionados de la raiz.');
      console.error('  Un CR, un byte de control o un caracter de otro idioma en un');
      console.error('  fichero de este repo es SIEMPRE un accidente: no hay ninguna');
      console.error('  razon por la que aquí sea raro. Arregla el fichero y ya.');
      console.error('  Si el caracter es legitimo, anadelo a PERMITIDOS en');
      console.error('  tools/auditar_texto.mjs diciendo de que fichero sale.');
      process.exit(1);
    }

    process.exit(0);
  } catch (e) {
    console.error('auditar_texto: no se pudo ni siquiera leer la suite.');
    console.error(e.message);
    process.exit(2);
  }
}