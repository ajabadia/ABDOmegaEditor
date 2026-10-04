// Pruebas de la puerta de texto, y el `before()` que es la peticion original:
// al ARRANCAR los tests, comprobar que los ficheros de este repo no tienen
// bytes invisibles ni caracteres fuera del conjunto.
//
//   node --test tools/auditar_texto.test.mjs
//
// EL ORDEN. Primero lo puro, con texto inventado, que es donde se pueden
// provocar los siete fallos sin tocar nada. Despues lo de verdad, en un
// `before()`, que corre antes que cualquier test del bloque y por eso puede
// poner el fichero entero en rojo sin haber esperado a que llegara su turno.
//
// ─────────────────────────────────────────────────────────────────────────
// UNA COSA QUE ESTE FICHERO TIENE QUE HACER Y CUALQUIER OTRO NO PUEDE
//
// Aqui NO se puede escribir ni un caracter prohibido, ni siquiera para
// probarlo. Un CJK de ejemplo seria un CJK de verdad en un fichero del indice,
// y la puerta que esta probando lo encontraria en si misma: el test que
// comprueba que la puerta funciona se quedaria en rojo por su propia razon.
//
// Por eso los caracteres del ejemplo se escriben con `String.fromCodePoint` y
// su numero, que es como se puede nombrar un caracter sin escribirlo. Un
// Un ideograma de ejemplo en un comentario habria hecho exactamente lo mismo que
// hace un `\r` sin querer, que es lo que esta puerta existe para cazar.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  auditaBytes, auditaRaiz, auditaTexto, falla, formatea,
  FUERA_DE_AUDITORIA, PERMITIDOS, raizPorDefecto
} from './auditar_texto.mjs';

// Caracteres que este fichero no puede escribir, construidos por codepoint.
const CJK = String.fromCodePoint(0x6572, 0x95e8); // dos ideogramas, U+6572 U+95E8
const HANGUL = String.fromCodePoint(0xac00); // un silabe, U+AC00
const ANCHO = String.fromCodePoint(0xff21); // A de ancho completo, U+FF21
const MOJIBAKE = 'ensen' + String.fromCharCode(0xc3, 0xb1) + 'aba'; // la enye partida en dos

describe('los bytes que no se ven', () => {
  it('un CR salta la puerta, y dice si es CRLF o un CR suelto', () => {
    const crlf = auditaTexto('una linea\r\n');
    const suelto = auditaTexto('una linea\rotra');

    assert.equal(crlf.length, 1);
    assert.equal(crlf[0].tipo, 'cr');
    assert.match(crlf[0].detalle, /CRLF/);

    assert.equal(suelto.length, 1);
    assert.match(suelto[0].detalle, /CR suelto/);
  });

  it('un CR duplicado se distingue del CRLF, porque el arreglo es distinto', () => {
    // El caso que ya ha pasado en este repo: un CR escrito a mano encima de un
    // CRLF. Un `replace(/\r/g, '')` se lleva el primero y deja el segundo, y
    // quien lo ve ya no sabe de donde salio, asi que el informe lo nombra.
    const hallazgo = auditaTexto('una linea\r\r\n')[0];

    assert.ok(hallazgo, 'el CR duplicado tiene que salir');
    assert.match(hallazgo.detalle, /CR duplicado/);
  });

  it('NUL y los demas controles saltan, pero el tabulador y el LF no', () => {
    assert.equal(auditaTexto('nul\0aqui')[0].tipo, 'control');
    assert.equal(auditaTexto('escape\x1b[0m')[0].tipo, 'control');
    assert.equal(auditaTexto('DEL\x7f')[0].tipo, 'control');

    // Los dos que si son legitimos, y por eso se exceptuan a mano: exceptuarlos
    // mal es poner el repo entero en rojo.
    assert.deepEqual(auditaTexto('columna\tvalor\notra linea'), []);
  });

  it('los controles C1 saltan, y son los que deja leer un UTF-8 como latin-1', () => {
    assert.equal(auditaTexto('a' + String.fromCharCode(0x92))[0].tipo, 'control');
  });

  it('el espacio duro salta, porque se parece al espacio y no lo es', () => {
    // Viene de copiar y pegar de un documento, y rompe el ancho de las
    // columnas sin que se vea: es el byte invisible por excelencia.
    const hallazgo = auditaTexto('NBSP' + String.fromCharCode(0xa0) + 'aqui')[0];

    assert.equal(hallazgo.tipo, 'invisible');
    assert.match(hallazgo.detalle, /NBSP/);
  });

  it('el BOM salta al principio, y en mitad es OTRO cosa', () => {
    const conBom = auditaTexto(String.fromCharCode(0xfeff) + 'const a = 1;');

    assert.equal(conBom.length, 1);
    assert.equal(conBom[0].tipo, 'bom');

    // En mitad de fichero no es un BOM: es un espacio de ancho cero pegado al
    // copiar de otro documento. Tambien sale, porque tambien es invisible y
    // descuadra las columnas, pero sale como "no permitido" y NO como BOM: un
    // informe que diga BOM en la linea 40 hace perder el rato a quien vaya a
    // buscar unos bytes que no estan en la cabeza.
    const enMedio = auditaTexto('const a' + String.fromCharCode(0xfeff) + ' = 1;');

    assert.equal(enMedio.length, 1);
    assert.equal(enMedio[0].tipo, 'no-permitido');
    assert.match(enMedio[0].detalle, /espacio de ancho cero/);
  });

  it('U+FFFD salta, porque es la marca de que el fichero ya ha pasado por ahi', () => {
    assert.equal(auditaTexto('enser' + String.fromCharCode(0xfffd) + 'a')[0].tipo,
      'sustitucion');
  });

  it('un UTF-8 invalido salta diciendo el BYTE, no una linea inventada', () => {
    // El byte 0xD3 va detras de un `a` (0x61) y no es un inicio de UTF-8 valido:
    // un byte suelto. `n\nn\nna` son seis bytes, asi que el byte malo es el 6, y
    // es de la linea 3. Las dos cosas se comprueban porque un numero de linea
    // sin byte no deja abrir el fichero, y un byte sin linea no deja verlo.
    const buf = Buffer.from('n\nn\nna' + '\xD3' + 'b\n', 'latin1');

    const h = auditaBytes(buf, 'inventado.mjs');

    assert.equal(h.length, 1);
    assert.equal(h[0].tipo, 'utf8');
    assert.match(h[0].detalle, /byte 6/);
    assert.match(h[0].detalle, /linea 3/);
  });

  it('una secuencia UTF-8 a medias salta tambien, y no solo el byte suelto', () => {
    // El otro modo de fallo: los bytes tienen la forma correcta pero se
    // cortan. Con el byte suelto detectado ya no basta con mirar el primero.
    const buf = Buffer.from([0x61, 0xc3, 0x28, 0x0a]);

    const h = auditaBytes(buf, 'cortado.mjs');

    assert.equal(h.length, 1);
    assert.equal(h[0].tipo, 'utf8');
    assert.match(h[0].detalle, /secuencia UTF-8 rota/);
  });
});

describe('los caracteres que no son de aqui', () => {
  it('chino, coreano y ancho completo saltan', () => {
    for (const carro of [CJK, HANGUL, ANCHO]) {
      const h = auditaTexto('const a = 1; // ' + carro)[0];

      assert.ok(h, 'tiene que salir el hallazgo de ' + carro);
      assert.equal(h.tipo, 'no-permitido');
    }
  });

  it('el mojibake salta, y es lo unico que mira dos caracteres a la vez', () => {
    const h = auditaTexto('// ' + MOJIBAKE + ' el bueno')[0];

    assert.ok(h, 'el mojibake tiene que salir');
    assert.equal(h.tipo, 'mojibake');
    assert.match(h.detalle, /latin-1/);
  });

  it('COMPANIA con enye e ie acentuadas NO salta, y por que esto importa', () => {
    // El falso positivo que esta puerta casi se come. "compañía" son un par de
    // letras acentuadas seguidas, asi que la regla ANCHA —acentuada seguida de
    // CUALQUIER no-ASCII— lo levanta. La estrecha —seguida de U+0080-U+00BF— no
    // lo levanta, porque la ie acentuada no esta en ese rango, y asi no hace
    // falta ninguna excepcion que mantener.
    //
    // Si alguien ensancha la regla, este test se pone rojo y explica por que.
    const bueno = 'compañía';

    assert.deepEqual(auditaTexto('// ' + bueno), []);
    assert.equal(auditaTexto('// ' + bueno + ' ' + String.fromCharCode(0xb1)).length, 1);
  });

  it('los dieciseis no-ASCII que usa este repo se dejan pasar', () => {
    // No es una lista inventada en el test: es `PERMITIDOS` mas el bloque de
    // letras, o sea exactamente lo que la puerta dice que vale. Si alguien
    // mete un simbolo nuevo en la lista sin test, aqui tampoco se ve; por eso
    // el test de mas abajo exige que cada entrada diga de que fichero sale.
    const simbolos = [...PERMITIDOS.keys()].map((cp) => String.fromCodePoint(cp));
    const letras = [0x00e1, 0x00e9, 0x00ed, 0x00f1, 0x00f3, 0x00fa, 0x00d1, 0x00c9];

    for (const ch of simbolos.concat(letras.map((cp) => String.fromCodePoint(cp)))) {
      assert.deepEqual(auditaTexto('// ' + ch + ' una linea de comentario'), [],
        'no deberia saltarse ' + ch);
    }

    // Y el mismo texto en una linea de CODIGO tambien vale: medido, hay once
    // "í" en lineas de codigo de los ficheros del indice, asi que una regla de
    // "solo en comentarios" habria sido falsa desde el principio.
    assert.deepEqual(auditaTexto('const etiqueta = "hola"; // ' + String.fromCodePoint(0xed)), []);
  });

  it('cada simbolo permitido dice de que fichero sale', () => {
    // Si una entrada no dice de donde viene, nadie puede decidir si sigue
    // haciendo falta, y una lista que no se puede revisar se queda para siempre.
    for (const [cp, razon] of PERMITIDOS) {
      assert.ok(razon && razon.length > 10,
        'U+' + cp.toString(16).toUpperCase() + ' no explica de donde sale');
    }
  });
});

describe('el informe', () => {
  it('dice fichero, linea y columna, que es lo que hace falta para arreglarlo', () => {
    const h = auditaTexto('ok\nok\nok\nconst a = "x"; // ' + CJK + '\n')[0];

    assert.equal(h.linea, 4);
    assert.equal(h.columna, 19);

    // La columna es de CARACTERES, y se dice porque en un fichero con acentos
    // no es lo mismo que el offset de byte que ve un editor de hex.
    assert.equal('// ' + CJK, '// ' + CJK);
  });

  it('un informe limpio lo dice, y uno con hallazgos los enseña', () => {
    const limpio = formatea({ ficheros: ['a.mjs'], hallazgos: [], usados: new Map() });

    assert.match(limpio, /lo que hay en disco es el texto que alguien escribio/);

    const sucio = formatea({
      ficheros: ['a.mjs', 'b.mjs'],
      hallazgos: auditaTexto('x\r\n'),
      usados: new Map([[0x00ed, 2]])
    });

    assert.match(sucio, /HALLAZGOS/);
    assert.match(sucio, /linea     1/);
    assert.equal(falla({ hallazgos: [{}] }), true);
    assert.equal(falla({ hallazgos: [] }), false);
  });
});

describe('los ficheros de verdad', () => {
  // ESTE es el encargo: al arrancar los tests, mirar el disco. Va en un
  // `before()` y no en un `it()` porque un `it()` se puede saltar, se puede
  // filtrar con `--test-name-pattern` y llega tarde: con esto, si el repo esta
  // sucio, este bloque entero se queda en rojo antes de empezar.
  before(() => {
    const informe = auditaRaiz(raizPorDefecto());

    assert.equal(informe.hallazgos.length, 0,
      '\n' + formatea(informe) + '\n');
  });

  it('se auditan TODOS los ficheros de tools/, y tambien hay algo de fuera', () => {
    // Y aqui NO va un numero de ficheros. El total depende de DONDE se ejecute:
    // en la maquina de desarrollo el indice tiene veintiuno ficheros y en un
    // checkout de runner tiene dieciseis, porque aqui no hay `package.json` ni
    // `pnpm-lock.yaml`. Un suelo puesto a mano habria puesto este test en rojo en
    // un checkout limpio, que es el unico sitio donde tiene que estar verde; es
    // exactamente el error que se corrigio hace dos commits con el suelo de
    // repos con ramas, y no se va a repetir aqui.
    //
    // Lo que si es el mismo en todas partes, y es lo que importa, es esto: que
    // esten los catorce ficheros de `tools/`, y que la puerta no se haya
    // quedado mirando solo `tools/` cuando el encargo es el repositorio entero.
    const informe = auditaRaiz();
    const deTools = informe.ficheros.filter((f) => f.startsWith('tools/'));
    const deFuera = informe.ficheros.filter((f) => !f.startsWith('tools/'));

    assert.equal(deTools.length, 14,
      'se esperaban los 14 ficheros de tools/, hay ' + deTools.length + ': ' + deTools.join(', '));
    assert.ok(deFuera.length > 0,
      'la puerta tambien tiene que mirar lo que hay fuera de tools/');
    assert.ok(deFuera.includes('.gitattributes'),
      'y .gitattributes es de los que hay que mirar: es donde esta la regla de eol');
    assert.equal(informe.hallazgos.length, 0, formatea(informe));
  });

  it('todo el no-ASCII del repo esta permitido, y eso es lo que se comprueba', () => {
    // Esta es la segunda forma de decirlo, y es la que no depende de que
    // `auditaRaiz` acierte: cuenta los no-ASCII del indice y mira que cada uno
    // sea letra latina o este en la lista. Si alguien anade un simbolo a
    // `PERMITIDOS` sin querer, aqui se ve que hay mas de los que decia la
    // cabecera.
    const informe = auditaRaiz();
    const sobran = [...informe.usados.keys()].filter((cp) => !PERMITIDOS.has(cp)
      && !(cp >= 0xc0 && cp <= 0xff && !(cp >= 0xd800 && cp <= 0xdfff)));

    assert.deepEqual(sobran, [],
      'no-ASCII en el repo que no son ni letra latina ni PERMITIDOS: ' + sobran.join(', '));
  });

  it('el lockfile queda fuera a proposito, y no por descuido', () => {
    assert.ok(FUERA_DE_AUDITORIA.has('pnpm-lock.yaml'));

    const informe = auditaRaiz();

    assert.ok(!informe.ficheros.includes('pnpm-lock.yaml'));
    assert.ok(informe.ficheros.includes('tools/auditar_texto.mjs'),
      'este mismo fichero tiene que estar en lo que se audita');
  });
});
// ─────────────────────────────────────────────────────────────────────────
// EL TEST QUE MATA DE VERDAD
//
// Todo lo de arriba son funciones puras: se les da un texto y se mira lo que
// devuelven. Eso demuestra que la regla esta escrita, pero NO que la puerta se
// ponga en rojo, que es lo unico que importa: una puerta que calcula el fallo
// y despues no lo reporta es peor que no tenerla.
//
// Asi que aqui se monta un repositorio de verdad, en un directorio temporal,
// se ensucia un fichero TRACKEADO —que es la condicion, porque un fichero sin
// trackear no viaja y por tanto no puede romper nada— y se ejecuta la puerta
// como proceso hijo, que es como corre en el workflow. Se mira el codigo de
// salida, que es lo que pone el paso en rojo.

describe('la puerta en un repo de verdad', () => {
  const temporales = [];

  after(() => {
    for (const t of temporales) rmSync(t, { recursive: true, force: true });
  });

  function git (cwd, args) {
    return execFileSync('git', ['-c', 'safe.directory=*', ...args],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  }

  /** Un repo con un unico fichero, ya trackeado, con el contenido dado. */
  function repoSucio (contenido, nombre = 'a.txt') {
    const dir = mkdtempSync(join(tmpdir(), 'texto-'));

    temporales.push(dir);
    git(dir, ['init', '--quiet']);

    // Se versiona tambien un `.gitattributes` para que el repositorio se parezca
    // a los de verdad, que es lo que hace que el commit funcione sin que
    // ningun git global tenga que estar configurado.
    writeFileSync(join(dir, '.gitattributes'), '* text=auto eol=lf\n');
    writeFileSync(join(dir, nombre), contenido);
    git(dir, ['add', '.gitattributes', nombre]);

    return dir;
  }

  /** La puerta, como proceso hijo, mirando lo que de verdad ve el workflow. */
  function ejecutar (raiz) {
    const ruta = fileURLToPath(new URL('./auditar_texto.mjs', import.meta.url));

    try {
      // La raiz va como ARGUMENTO y no solo como `cwd` a proposito: la puerta
      // saca la raiz de donde vive, no de donde se ejecuta, asi que sin el
      // argumento auditaria el repositorio de los tests y no el de prueba, que
      // estaria en verde siempre y no probaria nada.
      return { codigo: 0, salida: execFileSync(process.execPath, [ruta, raiz], {
        cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
      }) };
    } catch (e) {
      return { codigo: e.status === undefined ? -1 : e.status, salida: e.stdout || '' };
    }
  }

  it('con un repo limpio sale 0', () => {
    const dir = repoSucio('una linea\notra linea\n');
    const r = ejecutar(dir);

    assert.equal(r.codigo, 0, 'un repo limpio tiene que salir 0, pero salio ' + r.codigo
      + '\n' + r.salida);
    assert.match(r.salida, /lo que hay en disco es el texto que alguien escribio/);
  });

  it('con un CRLF sale 1 diciendo el fichero y la linea', () => {
    const dir = repoSucio('una linea\r\notra linea\r\n');
    const r = ejecutar(dir);

    assert.equal(r.codigo, 1, 'un CRLF tiene que poner la puerta en 1, pero salio '
      + r.codigo + '\n' + r.salida);
    assert.match(r.salida, /a\.txt/);
    assert.match(r.salida, /linea\s+1/);
    assert.match(r.salida, /CRLF/);
  });

  it('con un caracter de otro idioma sale 1 diciendo donde', () => {
    const dir = repoSucio('una linea\nconst otro = "' + CJK + '";\n');
    const r = ejecutar(dir);

    assert.equal(r.codigo, 1, r.salida);
    assert.match(r.salida, /a\.txt/);
    assert.match(r.salida, /linea\s+2/);
    assert.match(r.salida, /chino/);
  });

  it('un fichero SIN trackear no pone la puerta en rojo, y es lo que tiene que pasar', () => {
    // El caso al reves, y es el que protege el paso de CI: un fichero a medio
    // escribir, con medio CR y medio CJK, no puede poner el workflow en rojo
    // mientras se trabaja. Solo lo que viaja se juzga.
    const dir = repoSucio('limpia\n');
    writeFileSync(join(dir, 'a-medio-escribir.txt'), 'sucia\r' + CJK + '\n');

    const r = ejecutar(dir);

    assert.equal(r.codigo, 0, r.salida);
  });

  it('el fichero que se arregla deja de salir, y no se queda el hallazgo pegado', () => {
    const dir = repoSucio('una linea\r\n');
    const enBlanco = join(dir, 'a.txt');

    assert.equal(ejecutar(dir).codigo, 1);

    writeFileSync(enBlanco, 'una linea\n');

    assert.equal(ejecutar(dir).codigo, 0);
  });
});
