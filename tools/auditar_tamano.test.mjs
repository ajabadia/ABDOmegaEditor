// Pruebas del guard que vigila que la suite NO SE HAYA ENCOGIDO.
//
//   node --test tools/
//
// Sin dependencias, como los otros dos guards: `node:test` y `assert` vienen en el
// runtime y este repo no tiene runner.
//
// QUE ES ESTE GUARD Y POR QUE NECESITA TANTOS CUIDADOS. Los otros tres guards
// preguntan por el CONTENIDO de la suite: si un fichero incumple la regla que
// declara, si una regla de ignore tapa trabajo ya trackeado, si una regla de eol
// explica su CR. Los tres son verdes con una suite a la que le han desaparecido
// tres repos, porque ninguno de los tres mira cuantos hay. Y no es una hipotesis:
// los repos de aqui son clones, un clon puede fallar, un repo se puede renombrar
// y un `.gitignore` de la raiz puede dejar de descubrir un hermano sin que nadie
// se entere. Una suite que encoge en silencio se audita mas rapido y mejor.
//
// EL ORDEN. Primero la parte que decide, con numeros inventados, que es donde se
// puede comprobar que el rojo cae donde tiene que caer sin depender de como este la
// suite hoy. Despues las tablas, que tienen una coherencia interna que se puede
// romper sin querer. Y al final la suite real y dos dientes.
//
// LA TRAMPA DE ESTE GUARD, Y POR QUE LOS SUELOS SON EL MENOR DE LOS DOS ENTORNOS.
// El numero de ficheros de un repo depende de que rama esta desplegada. La
// maquina de desarrollo trabaja en ramas de desarrollo y el runner clona la rama
// por defecto: ABDJUNiO601 tiene 763 ficheros en `main` y 6.007 en
// `feature/fidelity-certified`. Un suelo medido en la maquica haria fallar al
// runner siempre. Ese error ya se cometio una vez en este repo, con el suelo de
// ficheros auditados del guard de EOL, y el arreglo fue bajar el suelo despues de
// que el runner protestara. Aqui se mide en los dos sitios antes de escribir el
// numero, que es mas barato.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { raizDeSuite } from './auditar_ignore_oculto.mjs';
import {
  auditaTamano, comparaConSuelo, formatea, falla,
  SUELO_REPOS, SUELO_FICHEROS, REPOS_OBLIGATORIOS, FICHEROS_POR_REPO
} from './auditar_tamano.mjs';

/** Una medicion de mentira que pasa los tres filtros, para partir de ahi. */
function medidoSano () {
  return REPOS_OBLIGATORIOS.map((repo) => ({ repo, ficheros: FICHEROS_POR_REPO[repo] }));
}

/**
 * La medicion de la suite real, UNA vez.
 *
 * Siete tests la piden y cada `auditaRepo` tarda casi dos segundos porque son
 * quince repos y quince procesos de git. Sin esto el fichero tarda catorce
 * segundos en no comprobar nada, que es el tiempo que hace que nadie lo mire
 * cuando algo se rompe.
 *
 * Es una medicion y no un numero inventado: si el disco cambia mientras corren
 * los tests, esto es lo que habia al empezar, que es exactamente lo que se quiere
 * para no tener a un test depending de cuando se ha escrito.
 */
const REAL = auditaTamano();

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE QUE DECIDE, CON NUMEROS INVENTADOS
// ─────────────────────────────────────────────────────────────────────────

describe('el suelo, con numeros inventados', () => {
  it('una suite con cada repo en su suelo no falla', () => {
    // En su suelo, no por encima. Si el suelo se cumpliese solo estando por
    // encima, el test siguiente no probaria nada.
    const informe = comparaConSuelo(medidoSano());

    assert.deepEqual(informe.faltan, []);
    assert.deepEqual(informe.encogidos, []);
    assert.equal(falla(informe), false);
  });

  it('un repo por debajo de su suelo sale en `encogidos`, con su nombre y su cuenta', () => {
    // El suelo es `<`, no `<=`: quedarse exactamente en el numero que dice la
    // tabla es estar en el suelo, no en rojo. Un fichero de mas no encoge.
    const entrada = medidoSano();
    entrada.find((r) => r.repo === 'ABDNeural').ficheros = FICHEROS_POR_REPO.ABDNeural - 1;

    const informe = comparaConSuelo(entrada);

    assert.deepEqual(informe.encogidos, [
      {
        repo: 'ABDNeural',
        ficheros: FICHEROS_POR_REPO.ABDNeural - 1,
        suelo: FICHEROS_POR_REPO.ABDNeural,
        perdidos: 1
      }
    ]);
    assert.equal(falla(informe), true);
  });

  it('y el informe dice cuantos le faltan, no solo que falta', () => {
    // Sin la cuenta el aviso es inutil: hay que poder bajar el suelo sabiendo
    // hasta donde.
    const entrada = medidoSano();
    entrada.find((r) => r.repo === 'ABDScope').ficheros = 0;

    const texto = formatea(comparaConSuelo(entrada));

    assert.match(texto, /ABDScope\s+0 de\s+72\s+\(-72\)/, texto);
  });

  it('los repos que han encogido salen del mas pequeño al mas grande', () => {
    // El primero que hay que mirar es el que mas ha perdido respecto a lo que
    // tenia, que no es el primero de la lista ni el mas grande.
    const entrada = medidoSano();
    entrada.find((r) => r.repo === 'ABDOmega').ficheros = 3000;   // -177
    entrada.find((r) => r.repo === 'ABDScope').ficheros = 0;       // -72
    entrada.find((r) => r.repo === 'ABDNeural').ficheros = 400;    // -4

    const encogidos = comparaConSuelo(entrada).encogidos;

    assert.deepEqual(encogidos.map((e) => e.repo), ['ABDOmega', 'ABDScope', 'ABDNeural']);
  });

  it('un repo que falta sale por su nombre, aunque la cuenta no lo delate', () => {
    // La cuenta sola no vale. Si un repo se renombra y aparece otro, el numero de
    // repos y el total pueden quedarse igual y no habria nada que ver. Los dos
    // filtros hacen falta y este es el del nombre.
    const entrada = medidoSano().filter((r) => r.repo !== 'ABDCZ101');
    // Y se cambia el nombre de otro para que la cuenta no baje.
    const renombrado = entrada.find((r) => r.repo === 'ABDScope');
    renombrado.repo = 'ABDScopeNuevo';

    const informe = comparaConSuelo(entrada);

    assert.deepEqual(informe.faltan, ['ABDCZ101', 'ABDScope']);
    assert.deepEqual(informe.encogidos, []);
  });

  it('un total por debajo del suelo global falla aunque ningun repo haya encogido', () => {
    // Repos que suben, que es lo normal cuando se anade trabajo: la cuenta global
    // no es la que juzga, y esta forma lo comprueba. ABDOmegaUnified con el doble
    // de ficheros y la tabla intacta.
    const entrada = medidoSano();
    const grande = entrada.find((r) => r.repo === 'ABDOmegaUnified');
    grande.ficheros = SUELO_FICHEROS * 2;

    const informe = comparaConSuelo(entrada);

    assert.deepEqual(informe.encogidos, []);
    assert.ok(informe.total > SUELO_FICHEROS);
    assert.equal(falla(informe), false);
  });

  it('y el total global tambien falla cuando por debajo de el hay un repo que encogio', () => {
    // El caso del que hablo en la cabecera: un repo pierde sesenta ficheros, el
    // total sigue por encima del suelo global, y sin la tabla no se veria nada.
    const entrada = medidoSano();
    entrada.find((r) => r.repo === 'ABDCZ101').ficheros = 970;

    const informe = comparaConSuelo(entrada);

    assert.ok(informe.total > SUELO_FICHEROS,
      'este caso solo sirve si el total global sigue en verde');
    assert.equal(informe.encogidos.length, 1, 'la tabla tiene que verlo donde el total no ve');
    assert.equal(falla(informe), true);
  });

  it('la raiz no se juzga por tamano, porque su tamano depende de la rama desplegada', () => {
    // En `workspace-history` la raiz son trece ficheros; en `main` es la
    // aplicacion entera y son ochocientos. Un suelo para la raiz habria que
    // medirlo con dos cifras y no significaria nada. Se cuenta y se informa, y
    // nada mas.
    const entrada = medidoSano();
    entrada.push({ repo: 'laRaiz', ficheros: 13, esRaiz: true });

    const informe = comparaConSuelo(entrada);

    assert.equal(informe.total, 11504 + 13);
    assert.deepEqual(informe.encogidos, []);
    assert.equal(falla(informe), false);
  });

  it('ni por muchos ficheros que tenga, que a veces son 800', () => {
    // La mitad del anterior: que la raiz este excluida no es que no pueda picar
    // hacia abajo, es que no puede picar hacia arriba. Sin esto, el primer
    // despliegue de `main` en el runner pondria este guard en rojo.
    const entrada = medidoSano();
    entrada.push({ repo: 'laRaiz', ficheros: 803, esRaiz: true });

    const informe = comparaConSuelo(entrada);

    assert.equal(informe.encogidos.length, 0, JSON.stringify(informe.encogidos));
    assert.equal(falla(informe), false);
  });

  it('un repo que no esta en la tabla no se juzga, porque no hay suelo que poner', () => {
    // Un repo nuevo no es un fallo: es un repo. Lo que no puede es entrar en
    // silencio, y para eso esta REPOS_OBLIGATORIOS, que es la lista que se
    // actualiza a proposito.
    const entrada = medidoSano();
    entrada.push({ repo: 'RepoNuevo', ficheros: 1 });

    const informe = comparaConSuelo(entrada);

    assert.deepEqual(informe.encogidos, []);
    assert.equal(falla(informe), false);
  });

  it('el informe solo dice que esta entera cuando no hay nada que decir', () => {
    // Un test mio anterior afirmaba que el bloque sale siempre. No sale: si no hay
    // nada que contar, un informe que se inventa problemas es peor que uno
    // mudo.
    const limpio = formatea(comparaConSuelo(medidoSano()));
    assert.match(limpio, /la suite esta entera/);
    assert.equal(limpio.includes('FALTAN'), false);
    assert.equal(limpio.includes('PERDIDO'), false);

    const conFaltas = formatea(comparaConSuelo([]));
    assert.equal(conFaltas.includes('la suite esta entera'), false);
    assert.match(conFaltas, /FALTAN REPOS/);
  });

  it('y una lista vacia falla por los tres motivos a la vez', () => {
    // El caso de un clon que se ha quedado sin nada: no es un caso raro, es lo que
    // pasa si el paso de clon falla y el resto sigue.
    const informe = comparaConSuelo([]);

    assert.equal(informe.total, 0);
    assert.equal(informe.cuantosRepos, 0);
    assert.equal(falla(informe), true);
    assert.match(formatea(informe), /por debajo del suelo de 11000/);
    assert.match(formatea(informe), /por debajo del suelo de 14/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LAS TABLAS, QUE TIENEN UNA COHERENCIA INTERNA
// ─────────────────────────────────────────────────────────────────────────

describe('las tablas', () => {
  it('cada repo obligatorio tiene suelo, o el nombre cuenta y el numero no', () => {
    // La incoherencia de siempre al anadir un repo: se pone en la lista de
    // nombres y se olvida la de numeros. El repo aparece en el informe, no
    // encoge nunca, y la puerta queda medio puesta sin que nada lo note.
    const sinSuelo = REPOS_OBLIGATORIOS.filter((n) => FICHEROS_POR_REPO[n] === undefined);

    assert.deepEqual(sinSuelo, [],
      'obligatorios sin suelo: ' + sinSuelo.join(', ') + '. Anadelos a FICHEROS_POR_REPO');
  });

  it('y ningun suelo es de un repo que no este en la lista', () => {
    // Un suelo de un repo que ya no existe es codigo muerto que ademas sugiere
    // que el repo deberia seguir ahi.
    const sinNombre = Object.keys(FICHEROS_POR_REPO).filter((n) => !REPOS_OBLIGATORIOS.includes(n));

    assert.deepEqual(sinNombre, [], 'suelos sin repo obligatorio: ' + sinNombre.join(', '));
  });

  it('la raiz no esta en ninguna de las dos, y no por olvido', () => {
    // Su nombre es el de la carpeta, que en la maquina es `ABDSynths` y en el
    // runner es el nombre del repo. Pedirla por nombre haria fallar este guard en
    // cuanto alguien clonara el repo donde otro nombre.
    for (const lista of [REPOS_OBLIGATORIOS, Object.keys(FICHEROS_POR_REPO)]) {
      assert.equal(lista.includes('ABDSynths'), false);
      assert.equal(lista.includes('ABDOmegaEditor'), false);
    }
  });

  it('los suelos estan por debajo de lo medido, no justos', () => {
    // Un suelo igual al numero medido es un hilo de pelo: el primer fichero que
    // se borre a proposito cae en rojo, y la primera vez que eso pasa es cuando
    // se empieza a bajar suelos a lo bruto. Este solo avisa si la tabla se ha
    // puesto al pelo.
    const exactos = REPOS_OBLIGATORIOS
      .filter((n) => FICHEROS_POR_REPO[n] !== undefined);

    // No se puede comparar con la medida de aqui: la maquina trabaja en ramas de
    // desarrollo. Lo que si se comprueba es que ningun suelo sea cero, que es el
    // suelo que no protege de nada.
    const sinProteccion = exactos.filter((n) => FICHEROS_POR_REPO[n] <= 0);

    assert.deepEqual(sinProteccion, [], 'suelos que no protegen de nada: ' + sinProteccion.join(', '));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LA SUITE REAL
// ─────────────────────────────────────────────────────────────────────────

describe('la suite real, que es a quien este guard tiene que vigilar', () => {
  it('todos los repos de siempre estan, y ninguno ha encogido', () => {
    // EL test del encargo. En la maquina y en el runner, porque los suelos son
    // el menor de los dos y los dos estan por encima.
    assert.deepEqual(REAL.faltan, [], 'faltan repos: ' + REAL.faltan.join(', '));
    assert.deepEqual(REAL.encogidos.map((e) => e.repo + ': ' + e.ficheros + ' de ' + e.suelo), [],
      'repos que han encogido');
  });

  it('y el total esta por encima del suelo global', () => {
    assert.ok(REAL.total > SUELO_FICHEROS,
      'solo ' + REAL.total + ' ficheros trackeados');
  });

  it('y hay mas repos que el suelo, que es lo que hace util la cuenta', () => {
    // Un suelo de repos que se cumple justo no dice nada. Con margen, cada repo
    // que aparezca es un repo nuevo y no hace falta tocar nada.
    assert.ok(REAL.cuantosRepos > SUELO_REPOS,
      'hay ' + REAL.cuantosRepos + ' repos y el suelo es ' + SUELO_REPOS + ': sin margen');
  });

  it('y los numeros que ve se parecen a los medidos, para saber que el ojo esta bien', () => {
    // La red de seguridad de la red de seguridad. Si `ls-files` dejara de
    // encontrar ficheros, el total se hundiria, el suelo global saltaria, y este
    // test daria el numero exacto de donde ha venido el problema.
    const { total, cuantosRepos } = REAL;

    // Trece mil en el clon de las ramas por defecto, y mas en la maquina, que
    // trabaja en ramas de desarrollo. Un margen del 20 por ciento por debajo
    // cubre las dos sin poder tragarse un repo entero.
    assert.ok(total > 11000, 'el total se ha hundido: ' + total);
    assert.ok(cuantosRepos >= 15, 'faltan repos por el camino: ' + cuantosRepos);
  });

  it('y mira de verdad: el recuento sale de `ls-files`, no de un numero de mentira', () => {
    // Si `auditaRepo` devolviera cero, `total` seria cero y el suelo global
    // saltaria con un aviso correcto pero equivocado. Este test separa las dos
    // cosas: el recuento bajo por un repo que se fue, o el recuento bajo porque
    // `ls-files` ha dejado de funcionar.
    const conRepo = REAL.repos.filter((r) => r.ficheros > 0);

    assert.ok(conRepo.length >= 14,
      'solo ' + conRepo.length + ' repos con ficheros, de ' + SUELO_REPOS + ' repos');
    assert.ok(Math.max(...REAL.repos.map((r) => r.ficheros)) > 1000,
      'ningun repo pasa de mil ficheros: el recuento no esta leyendo nada');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LOS DIENTES
// ─────────────────────────────────────────────────────────────────────────

describe('los dientes, medidos sobre la medicion real', () => {
  it('un repo real al que se le quitan ficheros sale en rojo', () => {
    // La prueba de que la puerta muerde de verdad y no solo con numeros de
    // mentira. Se parte de lo que hay en disco y se le quita lo suyo a un repo,
    // sin tocar el disco: si la puerta no ve esta entrada, es que la tabla no se
    // esta usando.
    const real = REAL;
    const victima = real.repos
      .filter((r) => r.esRaiz !== true && FICHEROS_POR_REPO[r.repo] !== undefined)
      .sort((a, b) => a.ficheros - b.ficheros)[0];

    assert.ok(victima, 'no hay ningun repo con suelo al que quitarle ficheros');

    const encogido = real.repos.map((r) => r.repo === victima.repo
      ? { ...r, ficheros: r.ficheros - 1 }
      : r);
    const informe = comparaConSuelo(encogido);

    assert.deepEqual(informe.encogidos.map((e) => e.repo), [victima.repo],
      'un fichero fuera de un repo real deberia salir en rojo');
    assert.equal(falla(informe), true);
  });

  it('y con ese repo mas pequeño, el total global ni se entera', () => {
    // La mitad del anterior, y es la que importa: por eso hace falta la tabla y
    // no solo el total. Con quince repos, sacar uno entero a un total de trece mil
    // es un ocho por ciento, y un ocho por ciento de una suite que encoge a trozos
    // es justo lo que no se nota.
    const real = REAL;
    const victima = real.repos
      .filter((r) => r.esRaiz !== true && FICHEROS_POR_REPO[r.repo] !== undefined)
      .sort((a, b) => a.ficheros - b.ficheros)[0];

    const sinEl = real.repos
      .filter((r) => r.repo !== victima.repo)
      .map((r) => r.repo === REPOS_OBLIGATORIOS[0]
        ? { ...r, ficheros: r.ficheros + 2000 }   // para que el total no delate
        : r);
    const informe = comparaConSuelo(sinEl);

    assert.ok(informe.total > SUELO_FICHEROS, 'el total tendria que seguir en verde');
    assert.deepEqual(informe.faltan, [victima.repo],
      'y aun asi tiene que salir el nombre del repo que falta');
  });
});

describe('y el paso de CI existe, que sin el esto no vigila nada', () => {
  it('el workflow ejecuta este guard', () => {
    // Un guard que nadie ejecuta es documentacion con teeth. Ademas el paso tiene
    // que ir DESPUES del paso que clona la suite: si va antes, solo ve la raiz
    // con trece ficheros y falla siempre.
    const workflow = join(raizDeSuite(), '.github', 'workflows', 'guards.yml');

    assert.ok(existsSync(workflow), 'no se encuentra el workflow de los guards');

    const texto = readFileSync(workflow, 'utf8');
    const lineas = texto.split('\n');

    const linea = lineas.find((l) => l.includes('run: node tools/auditar_tamano.mjs'));
    assert.ok(linea, 'el workflow no ejecuta el guard de tamano');

    // Y que venga despues del clon de la suite, que es lo que le da sentido.
    const clon = lineas.findIndex((l) => l.includes('git clone'));
    const tamano = lineas.indexOf(linea);
    assert.ok(clon !== -1 && clon < tamano,
      'el guard de tamano tiene que ir despues de clonar la suite, no antes');
  });
});
