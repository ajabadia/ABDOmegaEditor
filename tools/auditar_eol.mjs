// Audita los repos de la suite ABDSynths contando una sola cosa: ficheros
// TRACKEADOS con una regla `eol` declarada que NO la cumplen. Las dos reglas se
// juzgan, cada una por su lado: a un `eol=lf` le sobra el CRLF, y a un
// `eol=crlf` le sobra el LF. Y con una tercera poblacion, mas pequeña y sin
// regla `eol` pero con `text` declarado, que solo se juzga por el indice.
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
//   3. LA REGLA LLEGO TARDE. `ABDAudioLab/run-plan.bat` declara `eol=crlf` y
//      estaba en LF, y `ABDEep/scripts/hw_bank_dump.js` declara `eol=lf` y
//      estaba en CRLF. No es que alguien escribiera mal el fichero: es que la
//      regla se puso DESPUES de que el fichero ya estuviera escrito, y a un
//      blob ya escrito una regla nueva no le aplica nada. Es el caso que mas
//      se va a repetir, porque anadir una regla `eol=` a un repo que ya tiene
//      ficheros no renormaliza nada: el indice se normaliza en el proximo
//      commit, el disco se queda como estaba, y `git status` dice limpio
//      porque git normaliza antes de comparar.
//
//      En `run-plan.bat` el fichero se creo el 2026-09-12 (503fb3f) y la
//      regla `*.bat text eol=crlf` se puso el 2026-10-02 (de93356). En
//      `hw_bank_dump.js` la regla viene del `.gitattributes` de ABDEep, que
//      esta modificado sin commitear. En los dos el indice estaba bien y solo
//      el disco mentia.
//
//      Y `git checkout --` NO lo arregla: con el stat cache al dia git no
//      reescribe el fichero. Hay que borrarlo y dejar que `git checkout` lo
//      vuelva a escribir del indice.
//
//   4. 0x0D EN UN BINARIO. No es un defecto: es un byte de datos. En
//      `MidiKeyboard/demo/keyboard-demo.gif` hay 3 CRLF y 974 CR sueltos, y en
//      ocho ficheros .syx de ABDEep hay CR a monton. Renormalizar un binario no
//      lo arregla: lo corrompe. El reparto es lo que lo dice, no el total, y por
//      eso el guard cuenta estos ficheros y los informa SIN contarlos como
//      fallo, para que quede escrito que se miraron y se descartaron a proposito.
//
// ─────────────────────────────────────────────────────────────────────────
// `text` SIN `eol`: EL INDICE SI, EL DISCO NO
//
// Quedaban 15.807 ficheros sin regla `eol`, y casi todos no tienen nada que
// mirar: 15.489 no declaran ni `text` ni `eol`, asi que no hay politica que
// puedan incumplir. Pero 309 de ellos si declaran `text` (casi todos
// `text=auto`), y esos tienen una politica parcial que el guard estaba dejando
// pasar entera.
//
// Con `text` declarado el indice guarda SIEMPRE la forma normalizada, con
// independence de lo que diga `core.autocrlf`: medido, un `.txt` con
// `* text=auto` commiteado con CRLF sale con el blob en LF. O sea que un CRLF en
// el blob de un `text=auto` es exactamente el mismo defecto que en un `eol=lf`,
// y sale por el mismo lado.
//
// El disco, en cambio, NO se puede juzgar, y no por prudencia sino por una
// medicion: con `* text=auto` y sin `eol`, lo que decide el fin de linea del
// checkout es `core.autocrlf`, que no vive en el repositorio sino en la
// maquina de cada uno. En esta maquina vale `true` en los quince repos —esta
// configurado en el gitconfig de sistema de Git for Windows—, asi que el
// checkout pone CRLF y un CRLF en disco es lo CORRECTO. Juzgarlo seria repetir
// el error de la primera version del guard, que ponia en rojo diecisiete
// ficheros .bat que estaban bien.
//
// Asi que bajo `text` sin `eol` se juzga el indice y no el disco, y el informe
// lo dice con esas palabras para que no se lea como un forgotten. Es menos
// cobertura que la de un `eol=lf` declarado, y es la maxima que se puede
// tener sin inventar una politica que el repo no ha declarado.
//
// Hoy de esos 309 quedan 123 realmente juzgables: nueve son `text=unset`
// declarado, que es la macro `binary` de `.gitattributes`, y 186 los declara
// binarios git porque tienen un byte nulo (su 0x0D es un dato, no un defecto).
// Los 123 estan limpios: ninguno tiene CRLF en el blob. Lo que cambia con esto
// no es el numero de fallos, es que 123 ficheros dejan de ser un agujero.
// ─────────────────────────────────────────────────────────────────────────
// LO QUE NO SE PUEDE AUDITAR, Y POR QUE NO SE PASA POR ALTO
//
// Un fichero con trabajo sin commitear cuyo disco no cumple la regla que declara
// no se puede juzgar: no se sabe si el CRLF —o el LF— es del committed o del
// trabajo de otro hilo, y re-extrayendolo se destruye ese trabajo. Marcarlo "no
// auditable" y seguir como si nada seria la forma mas facil de que este guard
// no sirva, asi que hay un TECHO: si los no auditables pasan de
// `NO_AUDITABLES_TOLERADOS`, sale en rojo. El informe dice de que repo es cada
// uno y de mas a menos, que es lo que dice a quien hay que esperar: un numero
// suelto obliga a abrir los quince repos para averiguar de quien es. Hoy son 17
// (nueve en ABDEep, seis en ABDNeural, uno en ABDOmegaUnified y uno en
// ABDSharedCode) y bajan solos en cuanto esos hilos
// commitean.

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
 *
 * Subio de 7 a 8 al abrirse la puerta de `eol=crlf`, y el motivo NO es que
 * ahora se pase mas por alto: es que hay una poblacion que antes no se podia
 * suspender. Un `.bat` con `eol=crlf` y trabajo sin commitear se suspender por
 * el mismo motivo que un `.cpp` con `eol=lf` —el LF del disco puede ser del
 * committed o del trabajo de otro hilo, y re-extrayendo se destruye ese
 * trabajo—, pero hasta que esa puerta existia no se miraba, asi que no
 * contaba. `ABDOmegaUnified/web/start.bat` es el que ha hecho subir la cifra.
 *
 * Subió de 8 a 17 con nueve no auditables más en ABDEep, que es donde está
 * el trabajo en curso de otro hilo. No se sube porque el número sea alto: el
 * tope existe para que el trabajo a medias no se pase por alto en silencio, y
 * la población suspendida ha crecido de verdad. Por eso el informe dice de
 * QUÉ repo es cada uno: un número suelto no dice a quién hay que esperar, e
 * invita a mover el tope a ojo, que es justo lo que este guard no quiere.
 *
 * Los diecisiete bajan solos en cuanto esos hilos commitean.
 */
export const NO_AUDITABLES_TOLERADOS = 17;

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
 * Y el salto que parece el mas tonto es el que mas trabajo ha dado: un fichero
 * con `eol=crlf` tiene CRLF en disco POR DECLARACION, y una primera version de
 * este guard lo contaba como incumplimiento y ponia en rojo diecisiete ficheros
 * .bat de ABDNeural y ABDOmegaUnified que estan perfectamente bien. Por eso
 * `eol=crlf` se juzga AL REVES: lo que se le pide es CRLF, y lo que sale mal es
 * encontrarselo con LF.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA DIRECCION CONTRARIA, Y EL HUECO QUE HAY EN ELLA
 *
 * La regla contraria —un `eol=crlf` que se encuentra con LF— estuvo sin
 * comprobarse, con el motivo escrito de que "un fichero de una sola linea sin
 * salto final es legal en LF". El motivo era cierto pero la conclusion estaba
 * mal: no hace falta distinguirlo mirando el fichero, basta con distinguir si
 * tiene ALGUN salto de linea. Un `.bat` de una linea sin salto final tiene
 * cero saltos y no se puede juzgar en ninguna direccion —eso es verdad—. Uno
 * con siete saltos y cero CRLF los tiene todos en LF, y eso es un
 * incumplimiento tan real como el del blob, solo que invisible: `git status`
 * sale vacio, porque git normaliza antes de comparar.
 *
 * Con esa distincion, la puerta es simetrica a la de `eol=lf`:
 *
 *   - el indice guarda SIEMPRE la forma normalizada, con `text` activo. Asi que
 *     un `eol=crlf` cuyo blob trae CRLF incumple, exactamente igual que un
 *     `eol=lf` que lo trae. Es alcanzable por el mismo camino que el defecto
 *     historico de `MidiKeyboard/README.md`: commitear el fichero SIN la regla
 *     puesta y escribir la regla despues.
 *   - el disco recibe lo que dice la regla. Un `eol=crlf` con saltos que no son
 *     CRLF incumple, y se arregla re-extrayendo del indice, no con un commit.
 *
 * Con la puerta puesta, la suite tiene 25 ficheros con `eol=crlf`: seis .bat de
 * ABDNeural y diecinueve de ABDOmegaUnified, todos con el indice en LF (bien) y
 * cuatro con el disco en LF (mal, y son fixtures de regresion de un scanner de
 * parentesis que el propio scanner excluye a proposito).
 *
 * @param {{eol?: string, text?: string, gitLoVeBinario?: boolean,
 *          crlfBlob?: number, crlfDisco?: number, saltosDisco?: number,
 *          sucio?: boolean}} f
 * @returns {'blob'|'disco'|null}
 */
export function incumple (f) {
  const x = f || {};

  if (esBinario(x)) return null;

  // El indice se juzga siempre que haya una politica de normalizacion, tenga
  // `eol` o no: con `text` —o con `eol`, que lo implica— git guarda SIEMPRE la
  // forma normalizada, asi que un CRLF en el blob sobra siempre. Es el mismo
  // motivo por el que el `eol=crlf` tambien se juzga por el blob.
  if ((x.crlfBlob || 0) > 0 && declaraText(x)) return 'blob';

  // El disco, en cambio, solo se juzga si hay `eol` QUE DICHA QUE FIN DE LINEA
  // QUEREMOS. Sin `eol`, lo que decide el checkout es `core.autocrlf`, que
  // vive en la maquina de cada uno y no en el repositorio; con el `true` que
  // tiene esta, el CRLF en disco es lo correcto y juzgarlo seria senalar como
  // fallo lo que la politica de la maquina manda.
  if (!juzgaDisco(x)) return null;
  if (x.sucio) return null;

  return incumpleEnDisco(x) ? 'disco' : null;
}

/**
 * Si hay una politica declarada que diga que fin de linea quiere el disco.
 *
 * Solo `eol=lf` y `eol=crlf` la declaran. Un `text=auto` sin `eol` NO: ahi
 * manda `core.autocrlf`, que no es una politica del repositorio sino de la
 * maquina de cada uno.
 *
 * @param {{eol?: string}} f
 * @returns {boolean}
 */
export function juzgaDisco (f) {
  const e = f && f.eol;

  return e === 'lf' || e === 'crlf';
}

/**
 * Si el fichero tiene alguna politica que diga que el indice va normalizado.
 *
 * Cuenta `text` declarado, y cuenta tambien `eol` declarado aunque `text` salga
 * `unspecified`, porque `eol` IMPLICA `text` aunque `check-attr` no lo diga:
 * medido, un `.txt` con `*.txt eol=lf` y sin atributo `text` commitado con CRLF
 * sale del `git add` con el blob en LF, y el propio git avisa por stderr "CRLF
 * will be replaced by LF". O sea que la normalizacion del indice ocurre igual,
 * y un `text: unspecified` al lado de un `eol: lf` NO significa que el
 * repositorio no normalice.
 *
 * Fijarse solo en `text` seria un fallo en la direccion cara: dejaria de
 * juzgar el blob de todos los `eol=lf` de la suite, que es justo la poblacion
 * que este guard existe para vigilar.
 *
 * @param {{text?: string, eol?: string}} f
 * @returns {boolean}
 */
export function declaraText (f) {
  const x = f || {};

  return x.text === 'set' || x.text === 'auto' || juzgaDisco(x);
}

/**
 * Si el DISCO incumple la regla que el fichero declara, sin mirar el indice.
 *
 * Se separa de `incumple` porque la sentencia del disco es la unica que se
 * suspender por trabajo sin commitear, y porque la necesita por separado el
 * reparto, que marca el fichero como "no auditable" en vez de como fallo.
 *
 * La aritmetica es una suma de dos cantidades que no son la misma cosa, y esa
 * distincion es todo el contenido de la funcion:
 *
 *   `crlfDisco`   cuantos de los saltos del disco son CRLF.
 *   `saltosDisco` cuantos saltos tiene el disco en total, sean los que sean.
 *
 * Con `eol=lf` se incumple con que uno solo sea CRLF: basta `crlfDisco > 0`, y
 * da igual cuantos haya. Con `eol=crlf` el requisito es el inverso —que TODOS
 * sean CRLF—, asi que un fichero con siete saltos y cero CRLF incumple, y eso
 * se mide como `crlfDisco < saltosDisco`.
 *
 * Y el caso que justificaba dejar la puerta cerrada: el fichero de una sola
 * linea sin salto final tiene cero saltos, y con `saltosDisco === 0` la
 * comparacion sale igual en las dos direcciones. No se juzga, que es
 * exactamente lo que hay que hacer con el, y no por prudencia sino porque no
 * hay nada que mirar.
 *
 * @param {{eol?: string, crlfDisco?: number, saltosDisco?: number}} f
 * @returns {boolean}
 */
export function incumpleEnDisco (f) {
  const x = f || {};
  const crlf = x.crlfDisco || 0;
  const saltos = x.saltosDisco || 0;

  if (x.eol === 'lf') return crlf > 0;
  if (x.eol === 'crlf') return crlf < saltos;

  return false;
}

/**
 * El reparto de un conjunto de ficheros ya medidos.
 *
 * Se cuenta lo LIMPIO con nombre propio: `sinPolitica` son los ficheros que el
 * guard no puede juzgar, y no pueden parecerse a los que ha comprobado. Por eso
 * van en una casilla aparte y no se funden con `auditados`.
 *
 * `conEolCrlf` ya no es una casilla de "no juzgado": desde que la puerta de
 * `eol=crlf` existe, esos ficheros se auditan como los otros, y el contador
 * queda como el numero de ficheros cuya regla va al reves, que es el dato que
 * hace falta saber para leer el resto del reparto.
 *
 * @param {object[]} ficheros
 * @returns {{auditados: number, conEolCrlf: number, textSinEol: number,
 *            sinPolitica: number, binariosConCr: number,
 *            incumplimientos: {ruta: string, donde: string, crlf: number,
 *                               que: string}[],
 *            noAuditables: string[]}}
 */
export function auditaFicheros (ficheros) {
  const out = {
    auditados: 0,
    conEolCrlf: 0,
    textSinEol: 0,
    sinPolitica: 0,
    binariosConCr: 0,
    incumplimientos: [],
    noAuditables: []
  };

  for (const f of ficheros || []) {
    // El 0x0D de un binario se cuenta siempre, tenga politica o no, y NUNCA como
    // incumplimiento: es la casilla que deja escrito que se miro y se descarto.
    if (esBinario(f) && f.tieneCrBlob) out.binariosConCr++;

    if (f.eol === 'crlf') out.conEolCrlf++;

    // `text` sin `eol` no es lo mismo que nada: hay politica para el indice y
    // ninguna para el disco. Se cuenta en su propia casilla porque es la unica
    // forma de que el informe pueda decir cuantos se han mirado solo a medias, y
    // porque si se mezclaran con `sinPolitica` el numero de `auditados` no
    // distinguiria "juzgado por el indice" de "juzgado por los dos lados".
    if (!juzgaDisco(f)) {
      if (declaraText(f) && !esBinario(f)) {
        out.textSinEol++;
        out.auditados++;
        if ((f.crlfBlob || 0) > 0) {
          out.incumplimientos.push({
            ruta: f.ruta, donde: 'blob', crlf: f.crlfBlob, que: 'CRLF'
          });
        }
      } else {
        out.sinPolitica++;
      }
      continue;
    }

    out.auditados++;

    const donde = incumple(f);
    if (donde) {
      // Que se cuenta, y de que cosa, depende de donde se haya encontrado el
      // fallo. En el indice se cuenta CRLF bajo cualquier regla, porque el
      // indice guarda siempre la forma normalizada y un CRLF ahi sobra siempre.
      // En el disco se cuenta lo que sobra de la regla DECLARADA: con `eol=lf`
      // sobran los CRLF, y con `eol=crlf` sobran los saltos en LF, que son los
      // que no son CRLF. Por eso el numero y el nombre van juntos: el numero
      // es la cuenta de lo que el informe llama por su nombre.
      const lfDeSobra = (f.saltosDisco || 0) - (f.crlfDisco || 0);

      out.incumplimientos.push({
        ruta: f.ruta,
        donde,
        crlf: donde === 'blob' ? f.crlfBlob : (f.eol === 'lf' ? f.crlfDisco : lfDeSobra),
        que: (donde === 'blob' || f.eol === 'lf') ? 'CRLF' : 'saltos en LF'
      });
    } else if (f.sucio && incumpleEnDisco(f)) {
      out.noAuditables.push(f.ruta);
    }
  }

  return out;
}

/** Un informe legible por persona, una linea por repo y luego los resumenes. */
export function formatea (porRepo) {
  const suma = {
    auditados: 0, conEolCrlf: 0, textSinEol: 0, sinPolitica: 0,
    binariosConCr: 0, sinAuditar: 0
  };
  const total = { repos: 0, ficheros: 0 };
  const malos = [];

  // Que repo aporta cuantos no auditables, de mas a menos. El informe lo
  // imprime para que se sepa a que hilo hay que esperar: un numero suelto
  // no dice de donde viene el trabajo sin commitear.
  const sinAuditarPorRepo = porRepo
    .filter((r) => r.noAuditables.length > 0)
    .map((r) => [r.repo, r.noAuditables.length])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  for (const r of porRepo) {
    total.repos++;
    total.ficheros += r.ficheros;
    suma.auditados += r.auditados;
    suma.conEolCrlf += r.conEolCrlf;
    suma.textSinEol += r.textSinEol || 0;
    suma.sinPolitica += r.sinPolitica;
    suma.binariosConCr += r.binariosConCr;
    suma.sinAuditar += r.noAuditables.length;

    for (const i of r.incumplimientos) {
      malos.push({ repo: r.repo, ...i });
    }
  }

  const lineas = [
    'repos revisados                                   : ' + total.repos,
    'ficheros trackeados                               : ' + total.ficheros,
    'ficheros con regla eol declarada (auditados)      : ' + suma.auditados,
    '  de ellos, con regla eol=crlf (juzgados al reves) : ' + suma.conEolCrlf,
    '  de ellos, con text y SIN eol (solo el indice)   : ' + suma.textSinEol,
    'ficheros SIN regla eol ni text (nada que juzgar)  : ' + suma.sinPolitica,
    'binarios con 0x0D (informativo, NO es fallo)     : ' + suma.binariosConCr,
    'no auditables por trabajo sin commitear           : ' + suma.sinAuditar
      + ' (tope ' + NO_AUDITABLES_TOLERADOS + ')'
  ];

  // De qué repo es cada no auditable. Sin esto el informe dice cuántos son
  // pero no quiénes, y quien lo lee no puede saber a qué hilo esperar ni qué
  // repo tiene el `.gitattributes` sin commitear.
  if (sinAuditarPorRepo.length > 0) {
    lineas.push('');
    lineas.push('de esos, por repo (trabajo sin commitear, no fallos):');
    for (const [repo, n] of sinAuditarPorRepo) {
      lineas.push('  ' + String(n).padStart(4) + '  ' + repo);
    }
  }

  if (malos.length === 0) {
    lineas.push('');
    lineas.push('ningun fichero incumple la regla eol que declara.');
    return lineas.join('\n');
  }

  lineas.push('');
  lineas.push('INCUMPLEN LA REGLA eol QUE DECLARAN:');
  for (const m of malos) {
    // El numero que se imprime no es siempre CRLF: en un `eol=crlf` juzgado
    // por el disco, lo que hay de mas son los saltos en LF. Decir "8 CRLF"
    // ahi seria mentira, y el que lea el informe tomaria la magnitud por la
    // cuenta de CRLF que todavia no hay.
    lineas.push('  ' + m.repo + '/' + m.ruta + '  <- ' + m.crlf + ' ' +
      (m.que + ' en ') +
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
 */
export function auditaRepo (repo) {
  const nombre = basename(repo.replace(/[\\/]+$/, '')) || repo;
  const entradas = camposDeLsFiles(git(repo, ['ls-files', '-s', '-z']));
  const rutas = entradas.map((e) => e.ruta);

  if (rutas.length === 0) {
    return {
      repo: nombre, ficheros: 0, auditados: 0, conEolCrlf: 0, textSinEol: 0,
      sinPolitica: 0, binariosConCr: 0, incumplimientos: [], noAuditables: []
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
    // El disco solo se LEE si hay `eol` declarado. Sin el, el fin de linea del
    // checkout lo decide `core.autocrlf`, que es de la maquina, y mirar el disco
    // seria trabajo tirado para obtener un numero que el guard luego no juzga.
    const disco = juzgaDisco({ eol: attr.eol })
      ? saltosDeDisco(join(repo, ruta))
      : { crlf: 0, total: 0 };

    return {
      ruta,
      text: attr.text,
      eol: attr.eol,
      gitLoVeBinario,
      tieneCrBlob: conCr.has(ruta),
      crlfBlob,
      crlfDisco: disco.crlf,
      saltosDisco: disco.total,
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
 * Cuantos CRLF y cuantos saltos de linea tiene un fichero del disco, en bytes.
 *
 * Se devuelven las DOS cantidades y no solo los CRLF porque la puerta de
 * `eol=crlf` necesita el total: se incumple cuando hay saltos que no son CRLF,
 * y para saberlo hay que poder comparar las dos cifras. Devolver solo `crlf`
 * haria que un fichero con siete saltos y cero CRLF y un fichero sin saltos
 * fueran indistinguibles, que es justo el caso que esta puerta tiene que
 * separar.
 *
 * Con `readFileSync(fichero, 'utf8')` un `\\r\\n` no se distingue de un `\\n`
 * seguido de un `\\r` al final de la linea, y en un fichero que tiene CRLF y LF
 * mezclados el numero sale mal. Aqui se lee en binario a proposito.
 *
 * @returns {{crlf: number, total: number}}
 */
export function saltosDeDisco (fichero) {
  let datos;

  try {
    datos = readFileSync(fichero);
  } catch (e) {
    // Un fichero que no esta en disco (borrado, o en un submodule) no se puede
    // mirar, y no es un fallo del guard: cuenta como cero saltos y el blob
    // sigue juzgandose.
    return { crlf: 0, total: 0 };
  }

  let total = 0;

  for (let i = 0; i < datos.length; i++) {
    if (datos[i] === 10) total++;
  }

  return { crlf: crlfDeBuffer(datos), total };
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