// Pruebas del guard de `.gitignore` que tapa trabajo ya trackeado.
//
//   node --test tools/
//
// Sin dependencias, como el guard de ABDSharedCode: `node:test` y `assert` vienen
// en el runtime, y este repo no tiene runner.
//
// EL ORDEN, Y POR QUE IMPORTA. Primero el parseo con salidas inventadas, luego la
// interseccion, despues el descubrimiento, y solo al final dos cosas que son las
// que hacen que este guard sea posible: un repositorio de mentira donde se
// comprueba que el guard ENCUENTRA lo tapado, y la comprobacion de que el
// comando OBVIO no lo encuentra. Si un test de estos fallara, el diagnostico
// tiene que seguir siendo "¿el guard anda?" y no "adivina".
//
// AL FINAL, LA LINEA BASE. La suite arrastra 4.431 ficheros trackeados que su
// `.gitignore` tapa, todos de siempre y en repos en los que no se ha tocado nada.
// Por eso el test del final no exige cero: exige que ese numero no SUBA, y lo
// demas (la linea base, la mejora que no rompe) va con entradas inventadas, que
// es donde se puede comprobar que el rojo cae donde tiene que caer sin depender
// de como este la suite hoy.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  raizDeSuite, descubreRepos, reposDeSuite, auditaRepo, auditaSuite,
  camposDeCheckIgnore, tapaLosTrackeados, formatea,
  DEUDA_CONOCIDA, comparaConLineaBase, empeoran, formateaDesviaciones
} from './auditar_ignore_oculto.mjs';

/** El separador de `check-ignore -z`, escrito explicitamente. */
const NUL = '\u0000';

const temporales = [];

/** Un directorio nuevo que se borra al terminar la prueba. */
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
      // Un temporal que no se borra ensucia el disco de pruebas, pero no puede
      // hacer fallar una prueba que ya ha pasado: aqui no se decide nada.
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
  ], { cwd, encoding: 'utf8', ...opciones });
}

/**
 * Un repositorio de mentira con un fichero trackeado que una regla tapa.
 *
 * `git add -f` es necesario y no es un truco: sin el, el fichero no llega al
 * indice, que es justo lo que este guard NO busca. El caso que busca es el
 * contrario: el fichero entro antes de que existiera la regla, que es como
 * aparecio el `.pyc` de ABDSharedCode.
 */
function repoConTapado (patron = '*.log', nombreTocado = 'viejo.log') {
  const dir = temporal('sombra-');
  const sub = join(dir, 'repo');

  mkdirSync(sub);
  git(sub, ['init', '-q', '.']);
  writeFileSync(join(sub, '.gitignore'), patron + '\n');
  writeFileSync(join(sub, 'visible.txt'), 'hola\n');
  writeFileSync(join(sub, nombreTocado), 'tocado\n');
  git(sub, ['add', '-A']);
  git(sub, ['add', '-f', nombreTocado]);
  git(sub, ['commit', '-qm', 'inicio']);

  return sub;
}

// ─────────────────────────────────────────────────────────────────────────
// EL PARSEO, CON SALIDAS INVENTADAS
// ─────────────────────────────────────────────────────────────────────────

describe('el parseo de `check-ignore -z -v`, que son cuatro campos por fichero', () => {
  it('parte los campos de cuatro en cuatro, y da el patron que tapa cada ruta', () => {
    const salida = ['.gitignore', '7', '*.log', 'a.log',
      '.gitignore', '9', 'build/', 'b/c.txt'].join(NUL) + NUL;
    const campos = camposDeCheckIgnore(salida);

    assert.equal(campos.length, 2);
    assert.deepEqual(campos[0], { fuente: '.gitignore', linea: '7', patron: '*.log', ruta: 'a.log' });
    assert.deepEqual(campos[1], { fuente: '.gitignore', linea: '9', patron: 'build/', ruta: 'b/c.txt' });
  });

  it('aguanta un nombre con espacios, que en este suite no es exotico', () => {
    const salida = ['.gitignore', '1', '*.log', 'Nuevo Documento de texto.log']
      .join(NUL) + NUL;
    const campos = camposDeCheckIgnore(salida);

    assert.equal(campos[0].ruta, 'Nuevo Documento de texto.log');
  });

  it('LANZA si los campos no son multiplos de cuatro, porque un parseo roto da una lista vacia', () => {
    // Este es el fallo caro: si aqui se devolviera [], el guard pasaria sin
    // haber mirado un solo fichero, y no habria ninguna diferencia entre "no hay
    // nada tapado" y "no he entendido la salida".
    assert.throws(
      () => camposDeCheckIgnore(['.gitignore', '1', '*.log', 'a.log', 'sobra'].join(NUL)),
      /multiplos de cuatro/
    );
  });

  it('una salida vacia es una lista vacia, que es un resultado VALIDO', () => {
    assert.deepEqual(camposDeCheckIgnore(''), []);
  });
});

describe('la interseccion, que es donde esta el criterio', () => {
  const campos = [
    { fuente: '.gitignore', linea: '3', patron: '*.log', ruta: 'viejo.log' },
    { fuente: '.gitignore', linea: '4', patron: '*.log', ruta: 'no-trackeado.log' },
    { fuente: '.gitignore', linea: '9', patron: 'build/', ruta: 'build/x.o' }
  ];

  it('solo cuenta lo que esta trackeado: lo demas no es trabajo que esconder', () => {
    const tapados = tapaLosTrackeados(['viejo.log', 'build/x.o', 'visible.txt'], campos);

    assert.deepEqual(tapados.map((t) => t.ruta).sort(), ['build/x.o', 'viejo.log']);
  });

  it('la regla sale con fichero y linea, que es lo que hace util el aviso', () => {
    const tapados = tapaLosTrackeados(['viejo.log'], campos);

    assert.equal(tapados[0].regla, '.gitignore:3 *.log');
  });

  it('una NEGACION no cuenta: `!patron` saca de la lista, no mete', () => {
    // Al reves de lo que parece: `!` significa "este si se versiona". La primera
    // version del guard las contaba como tapados, y en un repo que excluye casi
    // todo con `!src/**` eso da miles de falsos positivos.
    const conNegacion = [{ fuente: '.gitignore', linea: '2', patron: '!viejo.log', ruta: 'viejo.log' }];

    assert.deepEqual(tapaLosTrackeados(['viejo.log'], conNegacion), []);
  });

  it('cero trackeados y cero campos es cero tapados, no un error', () => {
    assert.deepEqual(tapaLosTrackeados([], []), []);
  });
});

describe('el informe dice lo que encuentra', () => {
  it('sin hallazgos, lo dice sin historietas', () => {
    const texto = formatea([{ repo: 'ABDEep', trackeados: 985, tapados: [] }]);

    assert.match(texto, /repos revisados: 1/);
    assert.match(texto, /ningun fichero trackeado esta tapado/);
  });

  it('con hallazgos, nombra repo, fichero y regla', () => {
    const texto = formatea([
      { repo: 'ABDSharedCode', trackeados: 198, tapados: [{ ruta: 'x.pyc', regla: '.gitignore:55 *.pyc' }] }
    ]);

    assert.match(texto, /ABDSharedCode\/x\.pyc\s+<- \.gitignore:55 \*\.pyc/);
    assert.match(texto, /git rm --cached/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// EL DESCUBRIMIENTO DE REPOS, que es lo que evita que la lista se quede vieja
// ─────────────────────────────────────────────────────────────────────────

describe('descubrir repos en vez de listarlos', () => {
  it('la raiz de la suite se deduce de donde esta el script, y la hay', () => {
    const raiz = raizDeSuite();

    assert.ok(raiz, 'no se ha encontrado la raiz de la suite');
    assert.ok(existsSync(join(raiz, 'ABDSharedAssets')));
    assert.ok(existsSync(join(raiz, 'ABDEep')));
  });

  it('sin ancla no hay raiz, y se dice en vez de devolver una ruta inventada', () => {
    const vacio = temporal('sin-ancla-');

    assert.equal(raizDeSuite(vacio), null);
  });

  it('encuentra los repos de los dos primeros niveles, y se salta node_modules', () => {
    const base = temporal('arbol-');

    mkdirSync(join(base, 'RepoA', '.git'), { recursive: true });
    mkdirSync(join(base, 'RepoB', 'Sub', '.git'), { recursive: true });
    mkdirSync(join(base, 'RepoC', 'node_modules', 'Falso', '.git'), { recursive: true });
    mkdirSync(join(base, 'RepoD', 'Profundo', 'Mas', 'Profundo', '.git'), { recursive: true });

    const hallados = descubreRepos(base).map((r) => r.replace(/\\/g, '/').split('/').pop());

    assert.deepEqual(hallados.sort(), ['RepoA', 'Sub']);
  });

  it('la suite real tiene mas repos de los que parece, y todos se revisan', () => {
    const repos = reposDeSuite();

    // No es una lista cerrada: lo que importa es que incluya la raiz y a los
    // hermanos de siempre. El numero exacto cambia con la suite, y un test que
    // lo fijara seria un test que hay que actualizar cada vez que se anade un
    // repo, que es justo la rigidez que hace que la lista se quede vieja.
    assert.ok(repos.length >= 5, 'solo se han encontrado ' + repos.length + ' repos');
    assert.ok(repos.some((r) => r.endsWith('ABDSharedCode')));
    assert.ok(repos.some((r) => r.endsWith('ABDEep')));
    assert.ok(repos.some((r) => r.endsWith('ABDAudioLab')));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LAS DOS TRAMPAS DE GIT, QUE SON LO QUE HACE POSIBLE (O IMPOSIBLE) EL GUARD
// ─────────────────────────────────────────────────────────────────────────

describe('por que el comando obvio no encuentra nada, medido', () => {
  it('SIN `--no-index`, `check-ignore` no dice NADA de un fichero trackeado', () => {
    // Esto es lo que hace posible escribir el guard MAL: el comando que suena
    // obvio devuelve verde siempre, y no hay forma de distinguirlo de un
    // resultado correcto sin comparar contra el mismo repo con `--no-index`.
    const repo = repoConTapado();

    const conIndice = gitOpcional(repo, ['check-ignore', '-v', '--stdin'],
      { input: git(repo, ['ls-files']) });

    assert.equal(conIndice.trim(), '',
      'check-ignore sin --no-index deberia callarse sobre lo trackeado');
  });

  it('CON `--no-index`, el mismo repo dice que regla tapa cada fichero', () => {
    const repo = repoConTapado();
    const salida = git(repo, ['check-ignore', '--no-index', '-v', '--stdin'],
      { input: git(repo, ['ls-files']) });

    assert.match(salida, /\.gitignore:1:\*\.log\tviejo\.log/);
    assert.equal(salida.includes('visible.txt'), false,
      'un fichero que ninguna regla tapa no puede salir en la lista');
  });

  it('CON `-z` en el pipe, la lista sale vacia sin dar ningun error', () => {
    // La trampa segunda, y la mas barata de cometer: con `-z`, el `--stdin` pasa
    // a separar por NUL, asi que los `\n` de `git ls-files` se vuelven parte de
    // la ruta y no casa nada. No hay error, no hay aviso, hay una lista vacia.
    const repo = repoConTapado();

    const conNewline = gitOpcional(repo, ['check-ignore', '--no-index', '-z', '--stdin'],
      { input: git(repo, ['ls-files']) });

    assert.equal(conNulo(conNewline), '', 'con \\n y -z se esperaba una lista vacia');

    const conNuloReal = git(repo, ['check-ignore', '--no-index', '-z', '--stdin'],
      { input: git(repo, ['ls-files', '-z']) });

    assert.match(conNuloReal, /viejo\.log\0/);
  });
});

function conNulo (salida) {
  return salida.split(NUL).filter((t) => t !== '').join('');
}

/**
 * `git check-ignore` sale con 1 cuando no encuentra NINGUN path, y con mas de
 * 1 cuando git falla de verdad. Para las pruebas que LOOK for el silencio hace
 * falta distinguir las dos cosas, porque si no el codigo 1 revienta como un
 * error y el test pasa por el motivo equivocado.
 */
function gitOpcional (cwd, args, opciones = {}) {
  try {
    return git(cwd, args, opciones);
  } catch (e) {
    if (e.status === 1) return '';
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// EL GUARD DE VERDAD, sobre repos de mentira y sobre la suite
// ─────────────────────────────────────────────────────────────────────────

describe('el guard sobre un repo de verdad', () => {
  it('encuentra el fichero trackeado que su .gitignore tapa, y dice cual es la regla', () => {
    const repo = repoConTapado();
    const resultado = auditaRepo(repo);

    assert.equal(resultado.repo, 'repo');
    assert.deepEqual(resultado.tapados.map((t) => t.ruta), ['viejo.log']);
    assert.equal(resultado.tapados[0].regla, '.gitignore:1 *.log');
  });

  it('un repo cuya regla queda anulada por un `!` sale limpio, que es lo correcto', () => {
    const repo = repoConTapado('*.log\n!viejo.log');
    const resultado = auditaRepo(repo);

    assert.deepEqual(resultado.tapados, []);
  });

  it('un repo sin nada tapado sale con la lista vacia, no con una excepcion', () => {
    const repo = repoConTapado('*.wav');
    const resultado = auditaRepo(repo);

    assert.deepEqual(resultado.tapados, []);
    assert.equal(resultado.trackeados, 3);
  });

  it('la defensa muerde: cambiar la regla para que tapar algo mas lo hace aparecer', () => {
    const repo = repoConTapado('*.wav');

    // Antes de tocar nada no hay nada tapado; despues de escribir una regla que
    // tapa lo que ya esta ahi, tiene que aparecer. Sin este test, el guard
    // podria estar llamando siempre sin que nadie se entere.
    assert.equal(auditaRepo(repo).tapados.length, 0);

    writeFileSync(join(repo, '.gitignore'), '*.wav\n*.txt\n');
    const despues = auditaRepo(repo);

    assert.deepEqual(despues.tapados.map((t) => t.ruta), ['visible.txt']);
  });

  it('un repo que git no puede leer LANZA, en vez de salir con cero tapados', () => {
    // El fallo caro de este guard: un error propio disfrazado de repo limpio.
    // Un `spawn` fallido no tiene `status`, asi que "si el codigo no es 1, es
    // que no hay nada" convertia cualquier error mio en un verde.
    assert.throws(
      () => auditaRepo(join(temporal('no-existe-'), 'tampoco')),
      /ni llego a ejecutarse en/
    );
  });

  it('un repo sin commits no se confunde con un repo limpio', () => {
    // Sin indice, `ls-files` sale vacio y `check-ignore` puede fallar. Lo que no
    // puede pasar es que eso se traduzca en "cero tapados" con la misma cara que
    // un repo de verdad sin tapados.
    const repo = temporal('vacio-');

    mkdirSync(join(repo, 'repo'));
    git(repo, ['init', '-q', '.']);

    const resultado = auditaRepo(join(repo, 'repo'));

    assert.equal(resultado.trackeados, 0);
    assert.deepEqual(resultado.tapados, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LA LINEA BASE. Un guard que exige cero tapados seria un guard en rojo desde
// el primer dia, porque la suite arrastra deuda de siempre; uno que solo informa
// no seria un guard. Este es el punto medio: la linea base es un TECHO, y solo
// se sube a proposito.
// ─────────────────────────────────────────────────────────────────────────

describe('la linea base, que es un techo y no un suelo', () => {
  /** Un repo del informe con `n` ficheros tapados. */
  function conTapados (repo, n) {
    return {
      repo,
      trackeados: 100,
      tapados: Array.from({ length: n }, (_, i) => ({ ruta: 'x' + i, regla: '.gitignore:1 *.log' }))
    };
  }

  it('un repo que se queda igual no dice nada', () => {
    assert.deepEqual(comparaConLineaBase([conTapados('A', 3)], { A: 3 }), []);
  });

  it('un repo con MAS tapados que los de la linea base sale como `empeora`', () => {
    // El caso que tiene que ponerse rojo. Un numero que solo sube es un numero
    // que nadie vigila: el aviso tiene que existir antes de que sea tarde.
    const desv = comparaConLineaBase([conTapados('A', 5)], { A: 3 });

    assert.deepEqual(desv, [{ repo: 'A', antes: 3, ahora: 5, tipo: 'empeora' }]);
    assert.deepEqual(empeoran(desv).map((d) => d.repo), ['A']);
  });

  it('un repo con tapados que NO estaba en la linea base sale como `nuevo`', () => {
    // Peor que empeorar, porque ni siquiera hay un numero al que compararse: es
    // deuda que nadie ha mirado nunca, y por eso va con `antes: 0`.
    const desv = comparaConLineaBase([conTapados('Nuevo', 2)], { A: 3 });

    assert.deepEqual(desv, [{ repo: 'Nuevo', antes: 0, ahora: 2, tipo: 'nuevo' }]);
    assert.equal(empeoran(desv).length, 1);
  });

  it('un repo con menos tapados sale como `mejora`, que avisa pero NO rompe', () => {
    // Arreglar deuda no puede poner el guard en rojo: seria la manera de
    //DISCUADIR que se arregle. Lo que hace esavisar de que el numero esta alto.
    const desv = comparaConLineaBase([conTapados('A', 1)], { A: 3 });

    assert.deepEqual(desv, [{ repo: 'A', antes: 3, ahora: 1, tipo: 'mejora' }]);
    assert.deepEqual(empeoran(desv), []);
  });

  it('un repo limpio que no esta en la linea base es el estado normal, no un hallazgo', () => {
    // Si esto saliera como desviacion, la linea base habria que crecer con cada
    // repo sano de la suite, que es al reves de lo que se quiere.
    assert.deepEqual(comparaConLineaBase([conTapados('Sano', 0)], { A: 3 }), []);
  });

  it('el informe dice que repo y cuanto, y el numero de mas se ve', () => {
    const texto = formateaDesviaciones(comparaConLineaBase([conTapados('A', 5)], { A: 3 }));

    assert.match(texto, /A: ha SUBIDO de 3 a 5 \(\+2\)/);
    assert.match(formateaDesviaciones([]), /linea base respetada/);
  });
});

describe('la suite real, que es a quien este guard tiene que vigilar', () => {
  it('ningun repo ha superado los ficheros trackeados tapados que ya tenia', () => {
    // Este es EL test del encargo. El guard no exige cero: exige que la regla de
    // ignore no tape MAS trabajo del que ya tapaba, que es exactamente el
    // "una regla no puede esconder trabajo existente" con la deuda de fondo
    // descontada.
    const rojos = empeoran(comparaConLineaBase(auditaSuite()));

    assert.deepEqual(rojos.map((d) => d.repo + ': ' + d.tipo + ' (' + d.antes + ' -> ' + d.ahora + ')'), []);
  });

  it('y la linea base nombra los repos que tienen deuda, y solo esos', () => {
    // Mantiene la linea base y la verdad en el mismo sitio. Si alguien arregla un
    // repo, este test pide bajar su numero; si aparece deuda en uno nuevo, pide
    // anadirlo. Es la parte incomoda del ratchet, y es a proposito.
    const conTapados = auditaSuite()
      .filter((r) => r.tapados.length > 0)
      .map((r) => r.repo)
      .sort();

    assert.deepEqual(conTapados, Object.keys(DEUDA_CONOCIDA).sort(),
      'la linea base no coincide con lo que hay: corrige DEUDA_CONOCIDA con '
      + '`node tools/auditar_ignore_oculto.mjs --linea-base`');
  });

  it('los repos del encargo (ABDEep, ABDSharedAssets, ABDSharedCode) siguen limpios', () => {
    // Los tres donde se ha trabajado el guard de verdad tienen que estar a cero
    // TAPADOS, sin linea base de por medio: ahi la deuda se arreglo, no se
    // tapo con un numero.
    const limpios = auditaSuite()
      .filter((r) => ['ABDEep', 'ABDSharedAssets', 'ABDSharedCode'].includes(r.repo));

    assert.equal(limpios.length, 3, 'faltan repos del encargo en la suite');
    for (const r of limpios) {
      assert.deepEqual(r.tapados.map((t) => r.repo + '/' + t.ruta + ' <- ' + t.regla), []);
    }
  });

  it('y mira de verdad: entre todos, mas de mil ficheros trackeados', () => {
    const total = auditaSuite().reduce((a, r) => a + r.trackeados, 0);

    // El numero bajo es el sintoma de un guard que no mira: si `ls-files`
    // fallara en todos los repos, el total seria 0 y todos los tests de arriba
    // seguirian en verde.
    assert.ok(total > 1000, 'solo se han visto ' + total + ' ficheros trackeados');
  });
});