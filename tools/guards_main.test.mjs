// ─────────────────────────────────────────────────────────────────────────
// LOS GUARDS EJECUTADOS DE VERDAD, como los ejecuta el runner.
//
// Los demas tests llaman a las funciones: les dan datos inventados y miran lo que
// devuelven. Eso va bien para la parte pura, pero deja sin cubrir justo lo que mas
// se rompe, que es el `main`. Un `exit` mal escrito no devuelve nada raro:
// sencillamente lanza, el `catch` que lo envuelve lo declara "no se pudo ni
// siquiera leer la suite" y sale con el 2. Los tests de funciones se quedan en
// verde y el guard no ha mirado nada.
//
// Asi que aqui el guard se ejecuta como proceso hijo, con su propio `main`, sus
// propios `process.exit` y su consola de verdad. Y se ejecuta sobre un clon MINIMO
// de la suite, montado en un temporal con git de verdad: por eso no hace falta ni
// la maquina entera ni un laboratorio, y por eso esto puede correr en el workflow
// y no solo cuando alguien se acuerda.
//
// La suite del temporal NO es una suite de mentira con repos inventados. Los
// repos llevan los nombres de `REPOS_OBLIGATORIOS`, porque el guard los echa de
// menos en cuanto uno falta y una suite sin ellos sale en rojo siempre: un arnes
// que solo puede decir "rojo" no puede comprobar que el 0 existe. Los repos
// pequenos y vacios de verdad, que es lo que hace que esto tarde segundos en vez
// de los cinco minutos que tarda la suite entera.
// ─────────────────────────────────────────────────────────────────────────

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPOS_OBLIGATORIOS, RAMAS_POR_REPO } from './puertas_de_ramas.mjs';
import { DEUDA_CONOCIDA } from './auditar_ignore_oculto.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));

/**
 * Los guards que se ejecutan como proceso hijo, y lo que TIENEN que salir en una
 * suite como la que monta este fichero.
 *
 * No todos pueden salir en 0, y el motivo esta al lado porque es el que decide si
 * el arnes sirve: este clon tiene quince repos con un par de ficheros cada uno, y
 * para `auditar_tamano` eso no es una suite pequena sino una suite ENCOGIDA, que es
 * justo lo que ese guard existe para detectar. Ponerlo en verde habria sido
 * falsear el arnes para que todo cuadrase.
 *
 * Y `deRamas` dice si este guard lleva la puerta de las ramas. No lo llevan todos, y
 * esa columna es la que decide quien se puede mirar en la prueba de la puerta y
 * quien no: un guard que no cuenta ramas sale en 0 con el clon de una sola rama,
 * y mirarle a el seria preguntar a quien no lo sabe.
 *
 * @typedef {{nombre: string, esperado: number, deRamas: boolean}} Guard
 * @type {Guard[]}
 */
const GUARDS = [
  { nombre: 'auditar_ignore_oculto.mjs', esperado: 0, deRamas: true },
  { nombre: 'auditar_eol.mjs', esperado: 0, deRamas: true },
  { nombre: 'auditar_justificacion_crlf.mjs', esperado: 0, deRamas: false },
  { nombre: 'auditar_tamano.mjs', esperado: 1, deRamas: false }
];

const temporales = [];

after(() => {
  for (const t of temporales) rmSync(t, { recursive: true, force: true });
});

/** Un directorio nuevo que se borra al terminar, aunque los tests fallen. */
function temporal () {
  const d = mkdtempSync(join(tmpdir(), 'guard-main-'));
  temporales.push(d);
  return d;
}

/** Git de verdad, con la excepcion de `safe.directory` que pide esta maquina. */
function git (cwd, args) {
  return execFileSync('git', ['-c', 'safe.directory=*', ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
}

/**
 * Un repo con un commit, y opcionalmente con su remoto.
 *
 * El remoto es lo unico que hace que existan `refs/remotes/origin/*`, y por tanto lo
 * unico que hace que el guard vea ramas. Un repo sin remoto no vale para esta
 * prueba: el guard contaria cero ramas, que es el caso que sale por el suelo y no
 * por la puerta.
 *
 * @param {string} dondePadre
 * @param {string} nombre
 * @param {number} ramasExtra cuantas ramas aparte de la desplegada.
 */
function repo (dondePadre, nombre, ramasExtra = 0) {
  const conRemoto = ramasExtra > 0;
  const origen = join(dondePadre, nombre + '-origen.git');
  const ruta = join(dondePadre, nombre);

  if (conRemoto) {
    git(dondePadre, ['init', '--bare', '-b', 'main', origen]);
    git(dondePadre, ['clone', origen, ruta]);
  } else {
    mkdirSync(ruta);
    git(dondePadre, ['init', '-b', 'main', ruta]);
  }

  git(ruta, ['config', 'user.email', 'prueba@abadsynths.local']);
  git(ruta, ['config', 'user.name', 'prueba']);

  writeFileSync(join(ruta, 'leeme.txt'), 'fichero de ' + nombre + '\n');
  git(ruta, ['add', '.']);
  git(ruta, ['commit', '-m', 'el primero']);

  if (!conRemoto) return ruta;

  git(ruta, ['push', 'origin', 'main']);

  for (let i = 0; i < ramasExtra; i++) {
    git(ruta, ['checkout', '-b', 'rama' + i]);
    writeFileSync(join(ruta, 'leeme.txt'), 'fichero ' + i + ' de ' + nombre + '\n');
    git(ruta, ['commit', '-am', 'la rama ' + i]);
    git(ruta, ['push', 'origin', 'rama' + i]);
  }

  git(ruta, ['checkout', 'main']);

  return ruta;
}

/**
 * Vuelve a clonar un repo como lo haria el runner sin `--no-single-branch`: solo
 * la rama por defecto.
 *
 * @param {string} raiz
 * @param {string} nombre
 */
function dejaSoloLaDesplegada (raiz, nombre) {
  const ruta = join(raiz, nombre);

  rmSync(ruta, { recursive: true, force: true });
  git(raiz, ['clone', '-b', 'main', '--single-branch',
    join(raiz, nombre + '-origen.git'), nombre]);
}

/**
 * Copia los guards a `tools/` de la suite, que es de donde deduce donde vive.
 *
 * Se copian TODOS los `.mjs` que no sean tests, y no solo los de `GUARDS`, porque
 * un guard puede importar un modulo comun que todavia no es un guard: si solo se
 * copiase la lista, faltaria justo el modulo que se acaba de escribir, que es
 * cuando un modulo nuevo no encuentra su sitio.
 */
function copiaGuards (raiz) {
  mkdirSync(join(raiz, 'tools'), { recursive: true });

  for (const nombre of readdirSync(aqui)) {
    if (!nombre.endsWith('.mjs') || nombre.endsWith('.test.mjs')) continue;
    copyFileSync(join(aqui, nombre), join(raiz, 'tools', nombre));
  }

  return join(raiz, 'tools');
}

/**
 * Una suite minima con la puerta de ramas en verde.
 *
 * Los repos llevan los nombres de `REPOS_OBLIGATORIOS`, y los que la puerta les
 * pone un minimo se les dan JUSTO ese minimo de ramas remotas, ni una mas. El
 * numero sale de la tabla y no de aqui, y por eso si un dia suben un suelo esta
 * suite se queda en rojo y el test lo dice, en vez de dar por bueno un suelo que ya
 * no es el de los guards. Es ademas el reparto mas barato: cada rama de mas es una
 * auditoria entera mas que el guard tiene que hacer.
 *
 * @param {{extra?: number}} opciones `extra` de ramas de mas en el repo mas grande.
 * @returns {string} la raiz de la suite.
 */
function suiteEnVerde (opciones = {}) {
  const base = temporal();
  const raiz = join(base, 'suite');
  const extra = opciones.extra === undefined ? 0 : opciones.extra;

  mkdirSync(raiz);
  git(base, ['init', '-b', 'main', raiz]);
  git(raiz, ['config', 'user.email', 'prueba@abadsynths.local']);
  git(raiz, ['config', 'user.name', 'prueba']);

  // La raiz tambien es un repo que el guard audita, y le hace `rev-parse HEAD`
  // como a los demas. Sin ningun commit no hay HEAD, y ahi se va por el 2 de "no se
  // pudo ni siquiera leer": el arnes tiene que montar una suite que de verdad se
  // pueda leer, no una que se rompa por el camino.
  writeFileSync(join(raiz, 'raiz.txt'), 'la raiz de la suite\n');
  git(raiz, ['add', 'raiz.txt']);
  git(raiz, ['commit', '-m', 'la raiz']);

  for (const nombre of REPOS_OBLIGATORIOS) {
    // Solo los repos con minimo necesitan remoto y ramas; el resto pueden quedarse
    // en `main`, que es lo mas barato de montar y no estorba a ninguna puerta.
    const minimo = RAMAS_POR_REPO[nombre];
    repo(raiz, nombre, minimo === undefined ? 0 : minimo - 1);
  }

  if (extra > 0) {
    // Las ramas de mas van a un repo que ya trae, rehecho desde cero porque no se
    // pueden anadir ramas a un clon ya montado y porque el remoto se genera con el.
    rehace(raiz, CON_MINIMO[0], RAMAS_POR_REPO[CON_MINIMO[0]] - 1 + extra);
  }

  copiaGuards(raiz);

  return raiz;
}

/** Borra un repo con su remoto y lo vuelve a montar, para cambiarle las ramas. */
function rehace (raiz, nombre, ramasExtra) {
  rmSync(join(raiz, nombre), { recursive: true, force: true });
  rmSync(join(raiz, nombre + '-origen.git'), { recursive: true, force: true });
  repo(raiz, nombre, ramasExtra);
}

/**
 * Las suites, montadas una vez y compartidas por los tests que las necesitan.
 *
 * Montar quince repos con git cuesta mas que correr un guard, y varios tests
 * miran la MISMA suite. Sin esto el fichero tardaba cuatro minutos; con esto, cada
 * suite se paga una vez y cada guard se corre una vez por suite.
 */
const suites = new Map();

function suite (clave, opciones = {}) {
  if (!suites.has(clave)) suites.set(clave, suiteEnVerde(opciones));
  return suites.get(clave);
}

/**
 * La suite como la deja el runner sin `--no-single-branch`: los repos que la puerta
 * vigila se quedan con la rama por defecto y el resto, intactos.
 *
 * Se rehacen solo los que tienen un minimo en la tabla, porque son los unicos que
 * pueden quedarse cortos. Rehacerlos todos seria mas fiel al fallo real y mucho mas
 * lento, y el resultado para la puerta es el mismo.
 *
 * @returns {string} la raiz de la suite.
 */
function suiteDeUnaRama () {
  if (!suites.has('una-rama')) {
    const raiz = suiteEnVerde();

    for (const nombre of CON_MINIMO) dejaSoloLaDesplegada(raiz, nombre);
    suites.set('una-rama', raiz);
  }

  return suites.get('una-rama');
}

/**
 * La suite con un fichero trackeado que su `.gitignore` tapa, en un repo que no
 * tiene linea base.
 *
 * @returns {string} la raiz de la suite.
 */
function suiteConTapados () {
  if (!suites.has('tapado')) {
    const raiz = suiteEnVerde();

    assert.ok(SIN_LINEA_BASE !== undefined,
      'todos los repos de la suite tienen ya linea base de tapados: este arnes necesita '
      + 'uno sin ella para poder comprobar que la deuda nueva se ve en rojo, y no se '
      + 'puede inventar el nombre porque la puerta accuse alrepo que falte');

    const ruta = join(raiz, SIN_LINEA_BASE);

    writeFileSync(join(ruta, '.gitignore'), 'tapados/\n');
    mkdirSync(join(ruta, 'tapados'));
    writeFileSync(join(ruta, 'tapados', 'secreto.txt'), 'no deberia estar trackeado\n');
    git(ruta, ['add', '-f', '.gitignore', 'tapados/secreto.txt']);
    git(ruta, ['commit', '-m', 'un fichero tapado y trackeado']);

    suites.set('tapado', raiz);
  }

  return suites.get('tapado');
}

/**
 * Corre un guard como proceso hijo, que es la unica forma de mirar su `exit`.
 *
 * Se juntan stdout y stderr porque el veredicto va repartido entre los dos, y lo
 * que se comprueba es el conjunto: un guard que imprime el motivo por un sitio y
 * sale por otro no se puede leer de otra manera.
 *
 * @param {string} raiz
 * @param {string} guard nombre del fichero dentro de `tools/`.
 * @returns {{salida: number, texto: string}}
 */
function correr (raiz, guard) {
  const r = spawnSync(process.execPath, [join(raiz, 'tools', guard)], {
    encoding: 'utf8', timeout: 240000
  });

  if (r.error) throw r.error;
  assert.equal(r.signal, null, guard + ' ha muerto con la senal ' + r.signal + '\n' + r.stderr);

  return { salida: r.status, texto: (r.stdout || '') + (r.stderr || '') };
}

/** Las corridas de un guard sobre una suite, una sola vez por pareja. */
const memorizadas = new Map();

function corre (raiz, guard) {
  const clave = raiz + '|' + guard;
  if (!memorizadas.has(clave)) memorizadas.set(clave, correr(raiz, guard));
  return memorizadas.get(clave);
}

/** Los repos de la puerta que tienen un minimo, que son los que se pueden quedar cortos. */
const CON_MINIMO = Object.keys(RAMAS_POR_REPO);

/**
 * Un repo de la suite que no esta en la linea base de tapados.
 *
 * Se busca en vez de escribirse porque es una pregunta de la tabla, no una
 * constante: si un dia todos los repos tienen linea base, este helper tiene que
 * decir que no encuentra ninguno en lugar de apuntar a un repo que ya no sirve.
 */
const SIN_LINEA_BASE = REPOS_OBLIGATORIOS.find((n) => DEUDA_CONOCIDA[n] === undefined);

describe('un guard de verdad, ejecutado de verdad', () => {
  it('cada guard sale con el codigo que le toca, y dice por que en el 2', () => {
    // LA PRUEBA QUE HACE FALTA. Todo lo demas de este fichero se apoya en esta: si
    // el `main` de un guard tiene un `exit` que lanza, aqui sale con el 2 y el
    // nombre de la excepcion, y se ve sin montar un laboratorio.
    const raiz = suite('verde');

    for (const guard of GUARDS) {
      const { salida, texto } = corre(raiz, guard.nombre);

      assert.equal(salida, guard.esperado,
        guard.nombre + ' deberia salir en ' + guard.esperado + ' con esta suite, y salio en '
          + salida + ':\n' + texto);
      assert.equal(texto.includes('no se pudo ni siquiera leer la suite'), false,
        guard.nombre + ' no deberia declarar que no puede ni leer una suite que si puede:\n' + texto);

      if (guard.esperado === 0) {
        assert.equal(texto.includes('el guard esta en rojo'), false,
          guard.nombre + ' no deberia quejarse de nada en una suite limpia:\n' + texto);
      }
    }
  });

  it('un fallo al LEER es el 2 y lo dice, no el 1 de un hallazgo', () => {
    // Los dos codigos que se confundian con el typo de `empreoran`: un `catch`
    // generico convierte cualquier fallo de programacion en "no se pudo leer la
    // suite", que es una verdad a medias y manda a mirar git cuando lo que estaba
    // roto era el propio guard.
    const base = temporal();
    const raiz = join(base, 'suelta');

    mkdirSync(raiz);
    copiaGuards(raiz);

    for (const guard of GUARDS) {
      const { salida, texto } = correr(raiz, guard.nombre);

      // Sin `ABDSharedAssets` por encima, `raizDeSuite()` no encuentra la suite.
      assert.equal(salida, 2,
        guard.nombre + ' sin ancla deberia salir en 2, y salio en ' + salida + '\n' + texto);
      assert.ok(texto.includes('no se pudo ni siquiera leer la suite'),
        guard.nombre + ' deberia decir que no ha podido ni leer:\n' + texto);
      assert.equal(texto.includes('el guard esta en rojo'), false,
        guard.nombre + ' no ha encontrado un hallazgo: es que no ha podido leer.\n' + texto);
    }
  });
});

describe('la puerta de las ramas, ejecutada desde el main del guard', () => {
  it('un clon de una sola rama pone en rojo a quien lleva esa puerta, y dice el suelo', () => {
    // El fallo que la puerta existe para cazar: el clon del runner se queda con
    // `--depth 1`, se pierde media suite, y el guard sale en verde sin haber mirado
    // la mitad de lo que deberia.
    const raiz = suiteDeUnaRama();

    for (const guard of GUARDS) {
      // El de tamano ya esta en rojo por la suite encogida, que es otra cosa, y el
      // de CRLF no lleva esta puerta: preguntar a cualquiera de los dos por las
      // ramas seria mirar dos rojos a la vez, o preguntar a quien no lo sabe.
      if (!guard.deRamas) continue;
      const { salida, texto } = corre(raiz, guard.nombre);

      assert.equal(salida, 1,
        guard.nombre + ' con los repos de minimo de una sola rama deberia salir en 1, y salio en '
          + salida + '\n' + texto);
      assert.ok(texto.includes('se han auditado menos ramas de las que deben'),
        guard.nombre + ' deberia decir que faltan ramas:\n' + texto);
      assert.ok(/de un suelo de \d+/.test(texto),
        guard.nombre + ' deberia decir cual es el suelo que se ha cruzado:\n' + texto);
      assert.ok(texto.includes(CON_MINIMO[0]),
        guard.nombre + ' deberia nombrar el repo que se ha quedado corto:\n' + texto);
      assert.ok(texto.includes('UNA_SOLO_RAMA'),
        guard.nombre + ' deberia diagnosticar el clon de una sola rama:\n' + texto);
    }
  });

  it('cada causa sale con el nombre del guard que la imprime', () => {
    // Si el diagnostico saliera siempre con el nombre del otro, el que lee este rojo
    // iria a mirar un log que en ese momento estaba en verde.
    const raiz = suiteDeUnaRama();

    const ignore = corre(raiz, 'auditar_ignore_oculto.mjs');
    const eol = corre(raiz, 'auditar_eol.mjs');

    assert.ok(ignore.texto.includes('ignore_oculto: UNA_SOLO_RAMA'),
        'el guard de .gitignore tiene que nombrar sus propias causas:\n' + ignore.texto);
    assert.ok(eol.texto.includes('auditar_eol: UNA_SOLO_RAMA'),
        'el guard de EOL tiene que nombrar las suyas:\n' + eol.texto);
    assert.equal(ignore.texto.includes('auditar_eol: UNA_SOLO_RAMA'), false,
      'el guard de .gitignore no puede imprimir el nombre del otro:\n' + ignore.texto);
  });

  it('sobran ramas NO pone a nadie en rojo: la puerta perdona lo que sobra', () => {
    // El otro borde, y el que hace que la puerta no sea una trampa: mas ramas de las
    // de la tabla no es un problema, es la suite creciendo o un repo nuevo.
    const raiz = suite('sobran', { extra: 25 });
    const { salida, texto } = corre(raiz, 'auditar_ignore_oculto.mjs');

    assert.equal(salida, 0, 'con ramas de sobra no deberia quejarse:\n' + texto);
    assert.equal(texto.includes('se han auditado menos ramas'), false,
      'con ramas de sobra no puede haber cruzado el suelo:\n' + texto);
  });
});

describe('un hallazgo de verdad, ejecutado desde el main del guard', () => {
  it('un fichero tapado y trackeado en un repo sin linea base sale en 1', () => {
    // La mitad que no es de ramas: el veredicto de siempre, comprobado por su `exit`
    // y no por el valor que devuelve una funcion.
    //
    // El repo es uno que NO esta en `DEUDA_CONOCIDA`, a proposito. En uno que si
    // esta, un solo fichero tapado sale como "ha BAJADO de 17 a 1", y bajar no es un
    // fallo: es una mejora. Para poner el guard en rojo hay que superar el numero
    // que ya se conocia, y lo unico que se comprueba aqui es la salida.
    const raiz = suiteConTapados();
    const { salida, texto } = corre(raiz, 'auditar_ignore_oculto.mjs');

    assert.equal(salida, 1, 'un fichero tapado y trackeado tiene que poner el guard en rojo:\n' + texto);
    assert.ok(texto.includes('secreto.txt'),
      'el rojo tiene que decir QUE fichero mirar:\n' + texto);
    assert.ok(texto.includes('tapados/'),
      'el rojo tiene que decir que regla lo tapa:\n' + texto);
    assert.ok(texto.includes('el guard esta en rojo por lo de arriba'),
      'el guard tiene que distinguir su rojo del que ya estaba:\n' + texto);
  });

  it('un fichero que baja la linea base NO pone a nadie en rojo', () => {
    // El borde de enfrente, y el mas facil de romper por las prisas: arreglar deuda
    // no puede poner el guard en rojo, o el guard acabaria empujando a que se
    // arregle. En la suite limpia de arriba los catorce repos tienen menos tapados
    // que la linea base real, asi que el informe sale lleno de "ha BAJADO" y aun asi
    // el guard esta en verde. Es el mismo `exit` que la prueba de arriba, y por eso
    // no hace falta montar otra suite para decirlo.
    const raiz = suite('verde');
    const { salida, texto } = corre(raiz, 'auditar_ignore_oculto.mjs');

    assert.equal(salida, 0,
      'tener menos tapados que la linea base es una mejora, no un fallo:\n' + texto);
    assert.ok(texto.includes('ha BAJADO'),
      'el informe tiene que decir que ha bajado, para poder bajar la linea base:\n' + texto);
  });
});

describe('la puerta del encogimiento, ejecutada desde el main de su guard', () => {
  it('una suite minima ES una suite encogida, y sale en rojo diciendo que hacer', () => {
    // El unico guard de la lista cuyo 1 es el comportamiento normal con este clon.
    // Los otros tres miran contenido y aqui no hay nada que mirar; este mira el
    // denominador, y un denominador de quince repos con un fichero cada uno es
    // exactamente lo que la puerta existe para frenar.
    //
    // Y lo que se comprueba no es solo el codigo: un rojo que no dice QUE hacer es
    // un rojo que se ignora. Este dice las dos cosas que se pueden hacer, y estan
    // en el texto porque escribirlas en el codigo no es lo mismo que leerlas.
    const raiz = suite('verde');
    const { salida, texto } = corre(raiz, 'auditar_tamano.mjs');

    assert.equal(salida, 1, 'una suite de quince ficheros no puede pasar el suelo de ficheros:\n' + texto);
    assert.ok(texto.includes('la suite se ha encogido o le falta un repo'),
      'el rojo tiene que decir que es un encogimiento, no cualquier cosa:\n' + texto);
    assert.ok(texto.includes('REPOS_OBLIGATORIOS'),
      'el rojo tiene que decir donde se arregla un repo que falta:\n' + texto);
    assert.ok(texto.includes('FICHEROS_POR_REPO'),
      'el rojo tiene que decir donde se arregla un repo que ha perdido ficheros:\n' + texto);
  });
});

describe('la puerta de las reglas sin explicar, ejecutada desde el main de su guard', () => {
  it('una regla eol=crlf sin explicar pone en rojo, y con la explicacion al lado no', () => {
    // El contrato entero de este guard en un solo caso: se abre sin que nadie
    // escriba una frase al lado de la regla, y se cierra en cuanto la frase esta.
    // Se comprueba de las dos formas sobre la MISMA suite y sin memoizar, porque
    // lo que importa es el cambio de estado entre una corrida y la otra.
    const raiz = suite('crlf');
    const ruta = join(raiz, SIN_LINEA_BASE);

    // Sin justificar: la regla sola en su linea.
    writeFileSync(join(ruta, '.gitattributes'), '*.bat text eol=crlf\n');
    git(ruta, ['add', '.gitattributes']);
    git(ruta, ['commit', '-m', 'una regla sin explicar']);

    const rojo = correr(raiz, 'auditar_justificacion_crlf.mjs');

    assert.equal(rojo.salida, 1,
      'una regla eol=crlf sin frase al lado tiene que parar el guard:\n' + rojo.texto);
    assert.ok(rojo.texto.includes('sin explicar'),
      'el rojo tiene que decir que lo que falta es la explicacion:\n' + rojo.texto);

    // Y con la frase en el bloque de encima, que es donde el guard la busca.
    writeFileSync(join(ruta, '.gitattributes'),
      '# cmd.exe se rompe con LF en los bloques for y en los goto.\n'
      + '*.bat text eol=crlf\n');
    git(ruta, ['commit', '-am', 'y su explicacion']);

    const verde = correr(raiz, 'auditar_justificacion_crlf.mjs');

    assert.equal(verde.salida, 0,
      'una regla explicada es una puerta cerrada: no puede seguir poniendo en rojo:\n' + verde.texto);
    assert.ok(verde.texto.includes('toda regla eol=crlf dice por que'),
      'y tiene que decir que ya estan todas justificadas, no solo callarse:\n' + verde.texto);
  });
});

describe('los guards que se ejecutan aqui son los que hay', () => {
  /** Los guards del repo: los `auditar_*.mjs` que NO son tests. */
  function guardsDelRepo () {
    return readdirSync(aqui)
      .filter((f) => /^auditar_.*\.mjs$/.test(f) && !f.endsWith('.test.mjs'));
  }

  it('la lista no se queda vieja: lo que se ejecuta existe', () => {
    // Si alguien borra un guard y no lo quita de `GUARDS`, esta prueba lo dice.
    const enElRepo = guardsDelRepo();

    for (const guard of GUARDS) {
      assert.ok(enElRepo.includes(guard.nombre),
        'se ejecuta ' + guard.nombre + ' y no esta en tools/: la lista de guards esta vieja');
    }
  });

  it('y ningun guard del repo se queda fuera, que es la mitad de que la lista sirva', () => {
    // La prueba anterior va en un sentido: lo que esta en la lista existe. Esta va
    // en el otro, que es el que duele: un guard nuevo sin anadir a la lista se
    // queda sin ejecutar en el workflow y nadie se entera hasta que se rompe algo.
    //
    // Los `.test.mjs` se quedan fuera a proposito, como en `copiaGuards`: un test no
    // es un guard, y meterlos aqui haria que esta prueba pidiera ejecutarlos.
    for (const nombre of guardsDelRepo()) {
      assert.ok(GUARDS.some((g) => g.nombre === nombre),
        nombre + ' esta en tools/ y no se ejecuta como proceso hijo: anadelo a GUARDS');
    }
  });
});