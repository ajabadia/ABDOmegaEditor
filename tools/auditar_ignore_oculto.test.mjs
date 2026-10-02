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
// LA CAJA, EN MEDIO. `check-ignore` compara rutas con `core.ignorecase` de la
// maquina, que en Windows es `true` y en Linux `false`. Con el mismo repo y las
// mismas reglas, las dos lecturas no coinciden, y la que duele es la de Linux:
// una negacion con mayusculas es mas estrecha ahi, asi que un fichero
// `Readme.md` con `*.md` y `!README.md` esta limpio en la maquina y tapado en el
// runner. La seccion de la caja mide las dos lecturas en el mismo sitio, que es
// lo que faltaba para que eso se pudiera ver sin esperar a CI.
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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  raizDeSuite, descubreRepos, reposDeSuite, auditaRepo, auditaSuite,
  camposDeCheckIgnore, tapaLosTrackeados, formatea,
  DEUDA_CONOCIDA, comparaConLineaBase, empeoran, formateaDesviaciones, opcionesDeConsola,
  auditaArbol, auditaRamas, auditaRamasDeSuite, peorCasoPorRepo,
  comparaRamasConLineaBase, formateaRamas
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

/**
 * Un repositorio de mentira con `core.ignorecase` FIJADO a proposito.
 *
 * Sin este `config` el test dependeria de donde corra, que es justo lo que se
 * quiere evitar: en Windows `*.syx` tapa `1SOUNDS.SYX` y en Linux no, asi que el
 * mismo test daria dos respuestas distintas en la maquina de desarrollo y en el
 * runner. Con la clave puesta en el repo, la maquina decide lo que le toque y lo
 * unico que decide el test es si el interruptor del guard hace lo que dice.
 *
 * `git add -f` por lo de siempre: el fichero tiene que ESTAR trackeado, que es
 * la mitad del problema que se busca.
 */
function repoConCaja (patron, nombreTocado, ignorecase) {
  const dir = temporal('caja-');
  const sub = join(dir, 'repo');

  mkdirSync(sub);
  git(sub, ['init', '-q', '.']);
  git(sub, ['config', 'core.ignorecase', String(ignorecase)]);
  writeFileSync(join(sub, '.gitignore'), patron + '\n');
  writeFileSync(join(sub, 'visible.txt'), 'hola\n');
  writeFileSync(join(sub, nombreTocado), 'tocado\n');
  git(sub, ['add', '-A', '-f']);
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
// LA CAJA. El mismo repo, las mismas reglas y dos respuestas distintas, segun
// `core.ignorecase` de la maquina. Todo lo que hay aqui es para poder medir las
// dos en el mismo sitio, que es lo que hacia que un problema de caja solo se
// viera cuando el runner se quejaba.
// ─────────────────────────────────────────────────────────────────────────

describe('la caja: un repo, dos lecturas, y el interruptor para elegir', () => {
  it('una negacion con mayusculas la ve Windows limpia y la ve Linux tapada', () => {
    // El sentido que duele, porque es el que no se ve hasta que CI lo dice. La
    // negacion `!README.md` es MAS ANCHA en Windows: alcanza tambien a
    // `Readme.md`. En Linux es mas estrecha, y el unico patron que alcanza a
    // `Readme.md` es `*.md`. O sea: en la maquina el repo parece limpio y en el
    // runner es trabajo escondido.
    const repo = repoConCaja('*.md\n!README.md', 'Readme.md', true);

    assert.deepEqual(auditaRepo(repo).tapados, [],
      'con la semantica de Windows la negacion alcanza a Readme.md');

    const comoLinux = auditaRepo(repo, { cajaSensible: true });

    assert.deepEqual(comoLinux.tapados.map((t) => t.ruta), ['Readme.md']);
    assert.equal(comoLinux.tapados[0].regla, '.gitignore:1 *.md');
  });

  it('y al reves: una regla en minusculas que en Windows tapa mas cosas que en Linux', () => {
    // El caso de ABDCZ101, en pequeno: la regla `*.syx` alcanza a `1SOUNDS.SYX`
    // en Windows y no lo alcanza en Linux. Aqui el repo sale con deuda en la
    // lectura de la maquina y limpio en la de Linux, que es al reves del anterior.
    const repo = repoConCaja('*.syx', '1SOUNDS.SYX', true);

    assert.deepEqual(auditaRepo(repo).tapados.map((t) => t.ruta), ['1SOUNDS.SYX']);
    assert.deepEqual(auditaRepo(repo, { cajaSensible: true }).tapados, []);
  });

  it('el interruptor no cambia NADA cuando la caja no interviene', () => {
    // Sin este test, `cajaSensible` podria estar metiendo una bandera que
    // check-ignore ignora en cualquier repo, y los dos tests de arriba pasarian
    // por la regla en minusculas en vez de por el interruptor.
    const repo = repoConCaja('*.log', 'viejo.log', false);

    assert.equal(auditaRepo(repo, { cajaSensible: true }).tapados.length, 1);
    assert.deepEqual(auditaRepo(repo, { cajaSensible: true }).tapados,
      auditaRepo(repo).tapados);
  });

  it('sin el interruptor el guard se comporta EXACTAMENTE como antes', () => {
    // La garantia de que esto no ha roto el camino por defecto: un repo con caja
    // irrelevante tiene que dar el mismo numero de tapados con y sin la opcion.
    const repo = repoConCaja('*.log\n*.txt', 'viejo.log', false);

    assert.deepEqual(auditaRepo(repo).tapados.map((t) => t.ruta),
      auditaRepo(repo, { cajaSensible: false }).tapados.map((t) => t.ruta));
  });

  it('la linea de comandos pide la caja sensible, y sin flag no la pide', () => {
    // Sin esto el flag podria existir y no hacer nada, que es la forma mas
    // comfortable de tener una puerta que no cierra nada.
    assert.deepEqual(opcionesDeConsola([]), { cajaSensible: false });
    assert.deepEqual(opcionesDeConsola(['--caja-sensible']), { cajaSensible: true });

    // Y con lo otro que acepta la consola, que convive con el.
    assert.deepEqual(opcionesDeConsola(['--linea-base', '--caja-sensible']),
      { cajaSensible: true });
  });

  it('y el paso de CI le pasa el flag, que si no el interruptor no llega a existir', () => {
    // El test que ata las dos mitades. El interruptor sin el flag en el workflow
    // es codigo muerto; el flag sin el interruptor es un argumento que nadie
    // escucha. Lo que hace falta son los dos, asi que se comprueban los dos.
    const workflow = join(raizDeSuite(), '.github', 'workflows', 'guards.yml');

    assert.ok(existsSync(workflow), 'no se encuentra el workflow de los guards');

    const linea = readFileSync(workflow, 'utf8')
      .split('\n')
      .find((l) => l.includes('run: node tools/auditar_ignore_oculto.mjs'));

    assert.ok(linea, 'el workflow no ejecuta el guard de .gitignore');
    assert.match(linea, /--caja-sensible/,
      'el paso de CI no pasa --caja-sensible, asi que en una maquina con caja mediria distinto');
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

  it('la linea base nombra todo repo con deuda, y la deuda no pasa de la que dice', () => {
    // Mantiene la linea base y la verdad en el mismo sitio. Si aparece deuda en
    // un repo que no esta en la linea base, pide anadirlo; si un repo tiene mas
    // de lo que dice, lo dice. Es la parte incomoda del ratchet, y es a proposito.
    //
    // Lo que NO se comprueba es que los repos de la linea base sigan teniendo
    // deuda: en la maquina de desarrollo se cumple, pero en CI no puede, porque
    // cada repo se audita en su rama por defecto y la maquina trabaja en ramas
    // de desarrollo. ABDJUNiO601 esta en `feature/fidelity-certified` con 3951
    // ficheros tapados y en `main` no tiene ninguno, asi que la igualdad exacta
    // que habia aqui era imposible de cumplir en el runner.
    //
    // Un repo con menos deuda del que dice no es un defecto: es un repo
    // arreglado. El guard lo dice en su informe ("puedes bajar la linea base") y
    // sale verde, que es lo correcto.
    const porRepo = auditaSuite();
    const conTapados = porRepo
      .filter((r) => r.tapados.length > 0)
      .map((r) => r.repo)
      .sort();

    // Deuda que no esta en la linea base: un repo que nadie ha mirado nunca.
    const sinLineaBase = conTapados.filter((repo) => !(repo in DEUDA_CONOCIDA));

    assert.deepEqual(sinLineaBase, [],
      'repos con deuda que no estan en DEUDA_CONOCIDA: ' + sinLineaBase.join(', ')
      + '. Corrige DEUDA_CONOCIDA con '
      + '`node tools/auditar_ignore_oculto.mjs --linea-base`');

    // Deuda por encima de la linea base: el ratchet sigue apretando.
    const pases = porRepo
      .filter((r) => DEUDA_CONOCIDA[r.repo] !== undefined
        && r.tapados.length > DEUDA_CONOCIDA[r.repo])
      .map((r) => r.repo + ': ' + r.tapados.length + ' de ' + DEUDA_CONOCIDA[r.repo]);

    assert.deepEqual(pases, [], 'repos con mas deuda que la linea base: ' + pases.join(', '));
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

  it('y aguanta tambien la lectura de Linux, que es la que hace el runner', () => {
    // La puerta que hace falta para que un problema de caja no se vea solo en CI.
    // El guard decide con la semantica de la maquina, asi que en una maquina
    // con Windows una negacion demasiado estrecha pasa por limpia y el runner
    // la encuentra tarde. Con esta segunda lectura, la misma pregunta se hace en
    // local con la respuesta del runner.
    const porRepo = auditaSuite(undefined, { cajaSensible: true });

    const sinLineaBase = porRepo.filter((r) => r.tapados.length > 0 && !(r.repo in DEUDA_CONOCIDA));

    assert.deepEqual(sinLineaBase.map((r) => r.repo), [],
      'repos con deuda en Linux que no estan en DEUDA_CONOCIDA: '
      + sinLineaBase.map((r) => r.repo).join(', '));

    const pases = porRepo
      .filter((r) => DEUDA_CONOCIDA[r.repo] !== undefined
        && r.tapados.length > DEUDA_CONOCIDA[r.repo])
      .map((r) => r.repo + ': ' + r.tapados.length + ' de ' + DEUDA_CONOCIDA[r.repo]);

    assert.deepEqual(pases, [],
      'repos que en Linux pasan de la linea base: ' + pases.join(', '));
  });

  it('la caja solo cambia la respuesta donde ya sabemos, y en ningun sitio mas', () => {
    // El ratchet de la caja. Una diferencia entre las dos lecturas significa que
    // el `.gitignore` de ese repo decide con la caja, y eso tiene una consecuencia
    // concreta y mala: el numero que ve el runner no es comparable con el numero
    // que ve la maquina, asi que la linea base se puede "bajar" a un valor que
    // en local es mas alto. Es lo que ha pasado con ABDCZ101, que tiene la regla
    // `*.syx` y 194 ficheros `.SYX`: en Windows son 314 tapados y en Linux 120, y
    // el runner lleva dias anunciando "ha BAJADO de 314 a 120 (puedes bajar la
    // linea base)" sin que nada se haya arreglado.
    //
    // Lo que se permite es BAJAR: arreglar el `.gitignore` de ABDCZ101 lo deja
    // en cero y el test sigue en verde. Lo que no puede pasar es que OTRO repo
    // empiece a depender de la caja sin que se note.
    const DIFERENCIA_DE_CAJA = { ABDCZ101: 194 };

    const porDefecto = new Map(auditaSuite().map((r) => [r.repo, r.tapados.length]));
    const diferencias = auditaSuite(undefined, { cajaSensible: true })
      .map((r) => [r.repo, Math.abs(porDefecto.get(r.repo) - r.tapados.length)])
      .filter(([, d]) => d > 0);

    const nuevas = diferencias.filter(([repo, d]) => !(repo in DIFERENCIA_DE_CAJA));

    assert.deepEqual(nuevas.map(([r, d]) => r + ': ' + d), [],
      'repos cuya deuda depende de la caja y no estan en DIFERENCIA_DE_CAJA: '
      + nuevas.map(([r, d]) => r + ': ' + d).join(', '));

    // Y el techo: la diferencia de un repo conocido solo puede BAJAR.
    const pases = diferencias
      .filter(([repo, d]) => d > DIFERENCIA_DE_CAJA[repo])
      .map(([repo, d]) => repo + ': ' + d + ' de ' + DIFERENCIA_DE_CAJA[repo]);

    assert.deepEqual(pases, [], 'diferencias de caja por encima de las conocidas: ' + pases.join(', '));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LAS RAMAS QUE NO SON LA QUE ESTA DESPLEGADA
//
// El caso que este bloque persigue esta medido y es grande: ABDJUNiO601 tiene
// 3.951 ficheros tapados en `origin/feature/fidelity-certified` y NINGUNO en
// `main`, porque el `.gitignore` que los tapa es el de la rama y en `main` hay
// otras reglas. El guard de la rama desplegada no es que este mal: es que estaba
// mirando el arbol equivocado y dando un numero que no era el de la suite.
//
// Y por el camino aparece un repo que no estaba en la linea base: ABDOmega, que en
// `main` no tiene nada tapado y en `origin/master` tiene cuatro. Eso es una deuda
// REAL que no se veia, y por si sola justifica el trabajo.
//
// ─────────────────────────────────────────────────────────────────────────

/**
 * Un repo con la rama limpia desplegada y una rama sucia subida al remoto.
 *
 * Es la situacion del runner: el clon se queda en la rama por defecto, que es la
 * que no tiene nada, y la deuda esta en una rama que nadie ha comprobado. Montar
 * esto cuesta mas que los fixtures de un solo arbol porque el caso lo es: sin un
 * remoto al que subir la rama, `auditaRamas` no tiene nada que mirar salvo el
 * `refs/heads`, que el runner nunca tiene.
 *
 * El `core.ignorecase` va FIJADO en el repo de mentira, y el clon tambien, porque
 * la respuesta a "que regla tapa que" depende de la maquina y el test tiene que
 * dar lo mismo en un Windows y en un Linux. El `autocrlf=false` va en el `add` y
 * no solo en el commit, por lo mismo que en los fixtures de ramas del guard de EOL:
 * con el `autocrlf=true` de la maquina, el `\r\n` se normaliza al añadir y el
 * defecto que el test quiere ver desaparece solo.
 */
function repoConRamaSucia (patron = '/build/', nombreTapado = 'build/x.txt') {
  const dir = temporal('ramas-');
  const sub = join(dir, 'repo');
  const remoto = join(dir, 'remoto.git');

  mkdirSync(sub);
  mkdirSync(remoto);

  const g = (args, opciones) => git(sub, ['-c', 'core.autocrlf=false', ...args], opciones);

  g(['init', '-q', '--initial-branch=main', '.']);
  g(['config', 'core.ignorecase', 'false']);
  execFileSync('git', ['init', '-q', '--bare', remoto], { stdio: 'ignore' });
  g(['remote', 'add', 'origen', remoto]);

  // La rama por defecto: limpia. Sin `.gitignore` y sin ficheros tapados.
  writeFileSync(join(sub, 'base.txt'), 'hola\n');
  g(['add', '-A']);
  g(['commit', '-qm', 'raiz limpia']);
  g(['push', '-q', '-u', 'origen', 'main']);

  // La rama sucia: la regla `/build/` entra DESPUES del commit del repositorio
  // limpio, y el fichero se mete con `add -f` porque con la regla puesta el `add`
  // normal no lo dejaria entrar. Es exactamente el caso "la regla llego tarde",
  // que es el que el guard busca.
  g(['checkout', '-q', '-b', 'sucia']);
  writeFileSync(join(sub, 'base.txt'), 'hola\n');
  writeFileSync(join(sub, '.gitignore'), patron + '\n');
  g(['add', '-A']);
  mkdirSync(join(sub, 'build'), { recursive: true });
  writeFileSync(join(sub, nombreTapado), 'tapo\n');
  g(['add', '-f', nombreTapado]);
  g(['commit', '-qm', 'regla que tapa lo ya trackeado']);
  g(['push', '-q', '-u', 'origen', 'sucia']);

  // Y se vuelve a la limpia, que es como esta el runner.
  g(['checkout', '-q', 'main']);

  return { sub, remoto };
}

describe('el metodo del repo de mentira, que es donde esta el riesgo', () => {
  it('pregunta lo mismo por un arbol que por el arbol de trabajo', () => {
    // EL TEST QUE SOSTIENE TODO. `auditaArbol` monta otro repo con las reglas de
    // la rama para que sea git el que case, y si eso no da exactamente lo mismo
    // que `auditaRepo` sobre el arbol de trabajo, todo lo que sale de ahi es un
    // numero inventado con paso deauditado.
    //
    // Aqui se compara la rama DESPLEGADA contra si misma, que es el caso en el que
    // las dos respuestas tienen que coincidir sin que haya ninguna excuse: las
    // reglas son las mismas, los ficheros son los mismos y el unico camino
    // distinto es el repo donde se han montado.
    const { sub } = repoConRamaSucia();
    const desplegada = auditaRepo(sub, { cajaSensible: true });
    const porArbol = auditaArbol(sub, 'origen/main', { cajaSensible: true });

    assert.equal(porArbol.ficheros, desplegada.trackeados,
      'el numero de ficheros del arbol no es el del indice: se estan contando cosas distintas');
    assert.deepEqual(porArbol.tapados.map((t) => t.ruta + ' <- ' + t.regla),
      desplegada.tapados.map((t) => t.ruta + ' <- ' + t.regla));
    assert.deepEqual(porArbol.tapados, [], 'el fixture deberia tener la rama limpia limpia');
  });

  it('y encuentra en la rama sucia lo que la rama limpia no tiene', () => {
    const { sub } = repoConRamaSucia();

    assert.deepEqual(auditaRepo(sub, { cajaSensible: true }).tapados, [],
      'la rama desplegada deberia estar limpia');
    assert.equal(auditaArbol(sub, 'origen/sucia', { cajaSensible: true }).tapados.length, 1);
  });

  it('y las reglas con barra final casan sin que haya nada en el disco', () => {
    // Lo que hace posible el metodo y lo que se midio: `/build/` es una regla que
    // solo aplica a directorios, y el repo de mentira no tiene ni un directorio.
    // Medido en la suite entera: con y sin esqueleto de directorios salen los
    // mismos 3.951 de `feature/fidelity-certified`. Si esto dejara de pasar, el
    // repo de mentira empezaria a responder cosas que un checkout de verdad no.
    const { sub } = repoConRamaSucia('/build/');

    assert.equal(auditaArbol(sub, 'origen/sucia', { cajaSensible: true }).tapados.length, 1);
  });

  it('y un repo sin ninguna rama mas no inventa ramas', () => {
    const { sub } = repoConRamaSucia();

    const ramas = auditaRamas(sub, { cajaSensible: true }).filter((r) => r.rama === 'origen/sucia');

    assert.equal(ramas.length, 1);
    assert.equal(ramas[0].auditoria.tapados.length, 1);
  });

  it('y la rama desplegada no se audita dos veces', () => {
    // `auditaRamas` se salta la rama que esta comprobada porque `auditaRepo` ya la
    // ha mirado, y volver a mirarla daria el mismo numero por el doble de trabajo.
    const { sub } = repoConRamaSucia();
    const ramas = auditaRamas(sub, { cajaSensible: true }).map((r) => r.rama);

    assert.deepEqual(ramas.includes('origen/main'), false, 'la desplegada no deberia salir');
    assert.deepEqual(ramas, ['origen/sucia']);
  });

  it('y un temporal que se queda a medias no deja el repo de mentira por el suelo', () => {
    // El temporal se borra en un `finally`. Un repo de mentira que sobrevive a un
    // fallo no rompe nada, pero se va acumulando en el disco del runner uno por
    // rama y por push, y un runner lleno de basura es un runner lento.
    const { sub } = repoConRamaSucia();

    try {
      auditaArbol(sub, 'origen/rama-que-no-existe', { cajaSensible: true });
      assert.fail('una rama que no existe deberia fallar');
    } catch (e) {
      assert.match(e.message, /rama-que-no-existe/, e.message);
    }

    assert.deepEqual(auditaArbol(sub, 'origen/sucia', { cajaSensible: true }).tapados.length, 1,
      'despues del fallo, el metodo sigue funcionando');
  });
});

describe('el peor caso, que tiene que incluir la rama desplegada', () => {
  it('es el maximo entre la desplegada y las demas ramas', () => {
    const desplegada = [{ repo: 'A', tapados: new Array(5).fill({ ruta: 'x' }) }];
    const ramas = [{ repo: 'A', rama: 'origen/sucia', auditoria: { ficheros: 3, tapados: [{}] } }];

    const peor = peorCasoPorRepo(ramas, desplegada);

    assert.equal(peor.length, 1);
    assert.equal(peor[0].tapados, 5);
    assert.equal(peor[0].deRama, false, 'el peor caso venia de la desplegada');
  });

  it('y si una rama tiene mas que la desplegada, gana la rama', () => {
    const desplegada = [{ repo: 'A', tapados: [{}] }];
    const ramas = [{ repo: 'A', rama: 'origen/sucia', auditoria: { ficheros: 9, tapados: new Array(9).fill({}) } }];

    const peor = peorCasoPorRepo(ramas, desplegada);

    assert.equal(peor[0].tapados, 9);
    assert.equal(peor[0].deRama, true);
    assert.equal(peor[0].rama, 'origen/sucia');
  });

  it('y sale ordenado de mas tapados a menos', () => {
    const ramas = [
      { repo: 'A', rama: 'r1', auditoria: { ficheros: 1, tapados: [{}] } },
      { repo: 'B', rama: 'r2', auditoria: { ficheros: 9, tapados: new Array(9).fill({}) } }
    ];

    assert.deepEqual(peorCasoPorRepo(ramas, []).map((p) => p.repo), ['B', 'A']);
  });
});

describe('el techo por repo, que es lo que hace que el veredicto tenga sentido', () => {
  it('una rama que sube el techo de su repo sale en rojo, con el nombre de la rama', () => {
    const ramas = [{ repo: 'A', rama: 'origen/sucia', auditoria: { ficheros: 6, tapados: new Array(6).fill({}) } }];

    const rojas = empeoran(comparaRamasConLineaBase(ramas, { A: 5 }));

    assert.deepEqual(rojas, [{ repo: 'A', antes: 5, ahora: 6, tipo: 'empeora', rama: 'origen/sucia' }]);
  });

  it('un repo con deuda que no estaba en el techo sale en rojo', () => {
    const ramas = [{ repo: 'Nuevo', rama: 'origen/main', auditoria: { ficheros: 2, tapados: [{}, {}] } }];

    const rojas = empeoran(comparaRamasConLineaBase(ramas, {}));

    assert.deepEqual(rojas, [{ repo: 'Nuevo', antes: 0, ahora: 2, tipo: 'nuevo', rama: 'origen/main' }]);
  });

  it('y con menos no es un fallo: es un repo arreglado', () => {
    const ramas = [{ repo: 'A', rama: 'origen/x', auditoria: { ficheros: 1, tapados: [{}] } }];

    assert.deepEqual(empeoran(comparaRamasConLineaBase(ramas, { A: 9 })), []);
    assert.equal(comparaRamasConLineaBase(ramas, { A: 9 })[0].tipo, 'mejora');
  });

  it('y el techo se mide contra el peor caso, no contra una rama cualquiera', () => {
    // La trampa en la que se cae si el veredicto solo mira las ramas no
    // desplegadas: ABDJUNiO601 esta al techo con 3.951 en la rama que tiene la
    // maquina desplegada, y sus otras ramas tienen 81 y 38. Sin traer la
    // desplegada, el guard anunciaria "puedes bajar la linea base a 81" al lado de
    // los 3.951 que estan a tres clicks de distancia.
    const desplegada = [{ repo: 'A', tapados: new Array(3951).fill({}) }];
    const ramas = [{ repo: 'A', rama: 'origen/x', auditoria: { ficheros: 81, tapados: new Array(81).fill({}) } }];

    const desviaciones = comparaRamasConLineaBase(ramas, { A: 3951 }, desplegada);

    assert.deepEqual(desviaciones, [],
      'con 3951 en la desplegada, 81 en la otra rama NO es una mejora de la linea base');

    // Y si el techo estuviera mal puesto —porque alguien lo midio solo sobre las
    // ramas no desplegadas— sale en rojo diciendo la verdad: el techo decia 81 y lo
    // que hay son 3.951.
    const conTechoMalo = empeoran(comparaRamasConLineaBase(ramas, { A: 81 }, desplegada));

    assert.deepEqual(conTechoMalo.map((d) => [d.antes, d.ahora, d.tipo]),
      [[81, 3951, 'empeora']]);
  });

  it('y la raiz no se juzga, porque su nombre es el de la carpeta', () => {
    // En la maquina la carpeta es `ABDSynths` y en el runner es el nombre del
    // repo. Una entrada de techo nombrada por la raiz no puede funcionar en los
    // dos sitios, asi que la raiz no entra en el veredicto: sale en el informe de
    // ramas, que es donde un dato que no puede juzgar debe estar.
    const raiz = join(temporal('raiz-'), 'carpeta-que-se-llame-como-se-llame');
    const ramas = [{ repo: 'carpeta-que-se-llame-como-se-llame', rama: 'origen/master',
      auditoria: { ficheros: 4, tapados: new Array(4).fill({}) } }];

    assert.deepEqual(comparaRamasConLineaBase(ramas, {}, [], raiz), []);
    assert.deepEqual(comparaRamasConLineaBase(ramas, {}, []).map((d) => d.tipo), ['nuevo'],
      'y sin saber cual es la raiz, si se juzga: por eso hay que pasarle la raiz');
  });
});

describe('el informe de las ramas', () => {
  it('el desglose por regla es de la rama, no del repo', () => {
    // Si el desglose fuera comun a las ramas del repo, una linea diria un numero
    // que no es de ninguna de las dos y habria que volver a la rama a saber cual.
    const ramas = [
      { repo: 'A', rama: 'origen/una', auditoria: { ficheros: 10, tapados: [{ ruta: 'a', regla: '.gitignore:2 web/' }, { ruta: 'b', regla: '.gitignore:2 web/' }] } },
      { repo: 'A', rama: 'origen/dos', auditoria: { ficheros: 5, tapados: [{ ruta: 'c', regla: '.gitignore:9 tmp/' }] } }
    ];

    const texto = formateaRamas(ramas).join('\n');

    assert.match(texto, /origen\/una/);
    assert.match(texto, /origen\/dos/);
    // El `2 web/` tiene que salir pegado a `una` y el `1 tmp/` a `dos`, y no
    // mezclados: se comprueba contando que hay dos lineas de regla y que cada
    // rama tiene la suya.
    const lineasDeRegla = texto.split('\n').filter((l) => /^ {9}\s*\d+\s+\.gitignore/.test(l));

    assert.equal(lineasDeRegla.length, 2, texto);
    assert.match(texto, /2  \.gitignore:2 web\//);
    assert.match(texto, /1  \.gitignore:9 tmp\//);
  });

  it('y solo detalla las ramas con deuda, pero cuenta todas', () => {
    const ramas = [
      { repo: 'A', rama: 'origen/con-deuda', auditoria: { ficheros: 4, tapados: [{}, {}] } },
      { repo: 'A', rama: 'origen/sin-deuda', auditoria: { ficheros: 4, tapados: [] } },
      { repo: 'B', rama: 'origen/vacia', auditoria: { ficheros: 0, tapados: [] } }
    ];

    const texto = formateaRamas(ramas).join('\n');

    assert.match(texto, /ramas auditadas ademas de la que esta deployada : 2/);
    assert.match(texto, /con ficheros tapados {17}: 1/);
    assert.equal(texto.includes('origen/sin-deuda'), false);
    assert.equal(texto.includes('origen/vacia'), false,
      'una rama sin ficheros no es una rama limpia: no hay nada que decir de ella');
  });

  it('y una rama sin ficheros sale con su cuenta de ficheros al lado', () => {
    // El numero de ficheros es la mitad del aviso: 3.951 de 6.008 es una regla
    // que tapa casi todo el repo, y 3.951 de 40.000 es un olvido.
    const ramas = [{ repo: 'A', rama: 'origen/x', auditoria: { ficheros: 6008, tapados: [{}] } }];

    assert.match(formateaRamas(ramas).join('\n'), /6008 ficheros en la rama/);
  });
});

/**
 * La medicion de las ramas de la suite real, UNA vez por semantica de caja.
 *
 * Auditar las ramas cuesta unos quince segundos porque son quince repos por
 * quince `git init` de mentira, y la seccion de abajo la pide nueve veces. Sin
 * esto el fichero tarda mas de dos minutos en comprobar lo mismo nueve veces, que
 * es el tiempo que hace que un test lento deje de mirarse cuando algo se rompe.
 *
 * Se memoiza en vez de calcularse al importar el fichero para que un test que no
 * toca la suite real no la pague.
 */
let cacheDeRamas = null;

function ramasDeLaSuite (cajaSensible) {
  if (cacheDeRamas === null) {
    cacheDeRamas = {
      conLinux: auditaRamasDeSuite(raizDeSuite(), { cajaSensible: true }),
      conLaMaquina: auditaRamasDeSuite(raizDeSuite())
    };
  }

  return cajaSensible ? cacheDeRamas.conLinux : cacheDeRamas.conLaMaquina;
}

/**
 * La rama desplegada de todos los repos, con la misma lectura de caja que las
 * ramas a las que se va a comparar.
 *
 * Mezclar las dos lecturas daria un peor caso de dos medidas distintas: con las
 * ramas medidas en Linux y la desplegada en Windows, ABDCZ101 dira 120 y 314 en el
 * mismo numero. El guard de la linea de comandos pasa el mismo flag a las dos, y
 * esto tambien.
 */
let cacheDeSuite = null;

function suiteDesplegada (cajaSensible) {
  if (cacheDeSuite === null) cacheDeSuite = {};

  const clave = cajaSensible ? 'linux' : 'maquina';

  if (cacheDeSuite[clave] === undefined) {
    cacheDeSuite[clave] = auditaSuite(undefined, cajaSensible ? { cajaSensible: true } : {});
  }

  return cacheDeSuite[clave];
}

/** El nombre de la carpeta de la raiz, que es el del repo en el runner. */
function nombreDeLaRaiz () {
  // La clase de caracteres lleva los DOS separadores: en una ruta de Windows solo
  // hay barra invertida, y con una clase que solo tiene la barra normal esta
  // funcion devuelve la ruta entera y no el nombre de la carpeta. Luego el filtro
  // de la raiz no excluye a la raiz y el test dice que la raiz no tiene techo.
  return raizDeSuite().replace(/[\\/]+$/, '').split(/[\\/]/).pop();
}

describe('la suite real, ahora con las ramas de verdad', () => {
  it('ninguna rama ha superado el techo de su repo', () => {
    // EL TEST DEL ENCARGO, y el que puede poner el guard en rojo el primer dia en
    // que se ejecuta. El techo es por repo y es el PEOR caso de todas sus ramas,
    // con la desplegada dentro: sin traerla, el veredicto seria sobre un
    // subconjunto de los arboles y el numero que se compara con el techo no seria
    // el numero de la suite.
    const porRama = ramasDeLaSuite(true);

    const rojas = empeoran(comparaRamasConLineaBase(porRama, undefined, suiteDesplegada(true), raizDeSuite()));

    assert.deepEqual(rojas.map((d) => d.repo + (d.rama ? ' @ ' + d.rama : '')
      + ': ' + d.tipo + ' (' + d.antes + ' -> ' + d.ahora + ')'), []);
  });

  it('y la rama que traia 3.951 sigue siendo la que las tiene', () => {
    // El numero grande del encargo, comprobado contra el techo. No se comprueba
    // el 3.951 exacto —que depende de la maquina, porque la maquina tiene mas
    // ramas y distinta rama desplegada— sino que la PEOR rama de ABDJUNiO601 esta
    // al menos tan alta como el techo, que es lo que significa "el techo es el
    // peor caso y no un numero de otra cosa".
    const peor = peorCasoPorRepo(ramasDeLaSuite(true), suiteDesplegada(true));

    const deJuni = peor.find((p) => p.repo === 'ABDJUNiO601');

    assert.ok(deJuni, 'no se ha encontrado ABDJUNiO601 entre los repos');
    assert.ok(deJuni.tapados >= DEUDA_CONOCIDA.ABDJUNiO601,
      'la peor rama de ABDJUNiO601 tiene ' + deJuni.tapados
      + ' y el techo es ' + DEUDA_CONOCIDA.ABDJUNiO601);
  });

  it('y ABDOmega esta en el techo, que antes no estaba porque no se miraba', () => {
    // El repo que aparecio al mirar las ramas y que no aparecia antes. Vive en
    // `_Deprecados/`, su rama desplegada no tiene nada tapado, y en `origin/master`
    // tiene cuatro. El techo no estaba mal puesto: estaba bien puesto para la
    // pregunta que se hacia, y la pregunta era incompleta.
    assert.ok('ABDOmega' in DEUDA_CONOCIDA,
      'ABDOmega deberia estar en DEUDA_CONOCIDA: su deuda solo se ve en ramas');

    const peor = peorCasoPorRepo(ramasDeLaSuite(true), suiteDesplegada(true));
    const deOmega = peor.find((p) => p.repo === 'ABDOmega');

    assert.ok(deOmega, 'no se ha encontrado ABDOmega entre los repos');
    assert.equal(deOmega.tapados, DEUDA_CONOCIDA.ABDOmega,
      'el techo de ABDOmega tiene que ser su peor rama, no otra cosa');
  });

  it('y el techo no se puede vaciar de repos sin que nadie se entere', () => {
    // El techo y la verdad en el mismo sitio, como en la linea base de la rama
    // desplegada. Lo que se comprueba es lo mismo que alli: que ningun repo con
    // deuda en alguna rama se quede fuera del techo.
    const conDeuda = peorCasoPorRepo(ramasDeLaSuite(true))
      .filter((p) => p.tapados > 0)
      .map((p) => p.repo);

    const sinTecho = conDeuda.filter((repo) => !(repo in DEUDA_CONOCIDA) && repo !== nombreDeLaRaiz());

    assert.deepEqual(sinTecho, [], 'repos con deuda en alguna rama y sin techo: ' + sinTecho.join(', '));
  });

  it('y la raiz sale en el informe de las ramas aunque no se juzgue', () => {
    // Lo que no puede juzgar tiene que estar a la vista. La raiz tiene cuatro
    // ficheros tapados en `origin/master` en la maquina, y no se puede meter en el
    // techo porque en el runner la carpeta se llama de otra manera; quitarlo del
    // informe seria esconderlo.
    const texto = formateaRamas(ramasDeLaSuite(true)).join('\n');

    // Si la raiz no tiene deuda en ninguna rama, no sale y el test no dice nada:
    // se comprueba que el texto es coherente, no que aparezca siempre.
    const raizEnElTexto = texto.includes(' ' + nombreDeLaRaiz() + ' @ ');

    assert.equal(raizEnElTexto, texto.includes(nombreDeLaRaiz() + ' @'),
      'si la raiz se nombra, se nombra una vez y con su rama');
  });

  it('y la caja: la lectura de Linux tambien para las ramas', () => {
    // El mismo interruptor que en la rama desplegada, aplicado a las ramas. El
    // techo es UN numero por repo, y si dos maquinas miden dos cosas distintas no
    // se puede ni comparar ni bajar.
    //
    // Y hay dos repos donde la caja importa, y por motivos DISTINTOS, que es lo que
    // hace que la lista no se pueda fijar entera:
    //
    //   ABDOmega: viene de las RAMAS. El repo de mentira fija `core.ignorecase` a
    //     proposito, asi que el numero se mueve en cualquier maquina. Su
    //     `.gitignore` es `/*` seguido de una negacion con otra caja: en Windows la
    //     negacion anula la regla y no tapa nada, y en Linux quedan cuatro ficheros
    //     de `SCRIPTS/`.
    //
    //   ABDCZ101: viene de la rama DESPLEGADA. `*.syx` tapa 194 ficheros `.SYX`
    //     que Linux no ve. Pero solo se mueve si la maquina que corre el test tiene
    //     un sistema de ficheros que no distingue caja: en el runner las dos
    //     lecturas dan 120 y no hay diferencia. ABDCZ101 ademas no tiene ninguna
    //     rama mas, asi que su parte de ramas no existe en ninguno de los dos
    //     entornos.
    //
    // Por eso lo que se comprueba no es la lista exacta sino sus dos bordes: ABDOmega
    // esta SIEMPRE — porque su numero sale de un `core.ignorecase` fijado a mano — y
    // nadie mas puede aparecer. Un repo nuevo que dependa de la caja sale con un
    // techo que no es comparable entre maquinas, y eso hay que verlo.
    const peorConLinux = Object.fromEntries(
      peorCasoPorRepo(ramasDeLaSuite(true), suiteDesplegada(true)).map((p) => [p.repo, p.tapados]));
    const peorConLaMaquina = Object.fromEntries(
      peorCasoPorRepo(ramasDeLaSuite(false), suiteDesplegada(false)).map((p) => [p.repo, p.tapados]));

    const distintos = Object.keys(peorConLinux)
      .filter((repo) => peorConLinux[repo] !== peorConLaMaquina[repo])
      .sort();

    assert.ok(distintos.includes('ABDOmega'),
      'ABDOmega deberia moverse con la caja en cualquier maquina: su numero sale de las ramas, '
      + 'donde `core.ignorecase` esta fijado a proposito');
    assert.deepEqual(distintos.filter((r) => !['ABDCZ101', 'ABDOmega'].includes(r)), [],
      'ningun repo mas puede depender de la caja: su techo no seria comparable entre maquinas. '
      + 'Se mueven estos: ' + distintos.join(', '));

    assert.equal(peorConLinux.ABDOmega, DEUDA_CONOCIDA.ABDOmega,
      'y el techo de ABDOmega tiene que ser el numero de la lectura de Linux, que es la de CI');
  });
});

describe('los dientes del techo por repo, con las ramas de verdad', () => {
  it('bajar el techo de ABDOmega a la mitad lo pone en rojo con el nombre de la rama', () => {
    // El diente que importa: si alguien baja el techo a la mitad "porque la rama
    // buena tiene menos", sale en rojo diciendo CUAL rama tiene mas, que es el
    // dato que hace falta para arreglarlo.
    const porRama = ramasDeLaSuite(true);
    const conTechoBajado = Object.assign({}, DEUDA_CONOCIDA, { ABDOmega: 1 });

    const rojas = empeoran(comparaRamasConLineaBase(porRama, conTechoBajado, suiteDesplegada(true), raizDeSuite()));

    // Dos ramas de ABDOmega empatan a cuatro y cual de las dos sale primero no es
    // un contrato: lo que importa es que salga el repo y una rama, no una rama
    // concreta. Fijar `origin/master` haria que el test se rompiera el dia que
    // esa rama se borrara, y seria el test el que estuviera mal.
    assert.deepEqual(rojas.map((d) => d.repo), ['ABDOmega']);
    assert.equal(rojas[0].ahora, DEUDA_CONOCIDA.ABDOmega,
      'y que salga la deuda REAL de la rama, no la del techo inventado');
  });

  it('y vaciar el techo del todo saca a todos los que tienen deuda', () => {
    const porRama = ramasDeLaSuite(true);
    const sinTecho = comparaRamasConLineaBase(porRama, {}, suiteDesplegada(true), raizDeSuite());

    const conDeuda = peorCasoPorRepo(porRama, suiteDesplegada(true))
      .filter((p) => p.tapados > 0 && p.repo !== nombreDeLaRaiz()).length;

    assert.equal(empeoran(sinTecho).length, conDeuda,
      'todo repo con deuda sale en rojo si el techo esta vacio');
  });

  it('y sin traer la rama desplegada, el veredicto diria una mejora que no es', () => {
    // El fallo de diseño que casi se cuela: si el techo se midiera solo sobre las
    // ramas no desplegadas, en la maquina ABDJUNiO601 "bajaria" a 81 mientras que
    // los 3.951 estan en la rama que tiene delante de los ojos.
    const porRama = ramasDeLaSuite(true);
    const soloLasNoDesplegadas = comparaRamasConLineaBase(porRama, DEUDA_CONOCIDA, [], raizDeSuite());
    const conTodo = comparaRamasConLineaBase(porRama, DEUDA_CONOCIDA, suiteDesplegada(true), raizDeSuite());

    const junioSin = soloLasNoDesplegadas.find((d) => d.repo === 'ABDJUNiO601');
    const junioCon = conTodo.find((d) => d.repo === 'ABDJUNiO601');

    if (junioSin !== undefined && junioSin.tipo === 'mejora') {
      assert.notEqual(junioCon !== undefined && junioCon.tipo, 'mejora',
        'si solo con las ramas no desplegadas hay una mejora, con la desplegada no puede haberla');
      assert.equal(junioCon, undefined,
        'con la desplegada de por medio, ABDJUNiO601 esta exactamente en su techo: ni sube ni baja');
    }
  });
});
