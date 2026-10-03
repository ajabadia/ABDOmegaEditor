// Pruebas de la linea de margenes, que es lo unico que dice.
//
//   node --test tools/margenes.test.mjs
//
// Sin dependencias y sin suite real: esto no toca el disco, y su valor esta en
// que el calculo sea el mismo en cualquier numero que se le pase. Todas las
// pruebas son de la parte pura con datos inventados, y las unicas que dependen de
// la maquina comprueban bordes —que el total de la linea no se invente— y no
// listas, que es lo que rompio el guard de EOL dos veces.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  margenDe, puertaDe, peorDe, puertasDeTamano, puertasDeIgnore, puertasDeEol,
  formateaLinea, mideTodo
} from './margenes.mjs';

// Las tablas de los floors se importan, no se copian: un test con repos
// inventados pasa aunque la puerta este rota, porque no encuentra el repo que
// busca y no se da cuenta. Con los nombres de verdad, un suelo que desaparece
// rompe el test.
import { FICHEROS_POR_REPO } from './auditar_tamano.mjs';
import { RAMAS_POR_REPO } from './auditar_eol.mjs';

const CONSUELO = Object.keys(FICHEROS_POR_REPO)[0];
const CONRamas = Object.keys(RAMAS_POR_REPO)[0];

const ENTORNO = { nombre: 'ABDSynths', repos: 14, ficheros: 100 };

describe('el margen de una puerta', () => {
  it('un suelo se cuenta hacia arriba y un techo hacia abajo', () => {
    // La normalizacion que hace que "el margen" signifique lo mismo en las dos
    // direcciones. Sin ella, un techo con dos tapados de mas saldria con margen
    // +2, y la linea declararia buena justo la puerta que se esta rompiendo.
    assert.equal(margenDe(13000, 11000), 2000);

    assert.equal(puertaDe('TAMAÑO', 'total', 13000, 11000).margen, 2000);
    assert.equal(puertaDe('IGNORE', 'UnRepo', 2, 4, 'techo').margen, 2);
    assert.equal(puertaDe('IGNORE', 'Otro', 6, 4, 'techo').margen, -2);
  });

  it('una puerta en rojo sale con margen NEGATIVO, no con un margen positivo', () => {
    // El signo es lo que dice si hay que mirar. Un margen de -1 tiene que leerse
    // como -1, porque "le queda uno" seria justo lo contrario de la verdad.
    assert.equal(puertaDe('EOL', 'UnRepo', 1, 2).margen, -1);
  });

  it('la puerta que peor esta es la de menor margen, no la de mayor numero', () => {
    // El error que haria este informe si mirara magnitudes: el total de ficheros
    // va por +2600 y el techo de un repo por cero, y el que se rompe primero es
    // el del cero.
    const puertas = [
      puertaDe('TAMAÑO', 'total', 13000, 11000, 'suelo', true),
      puertaDe('IGNORE', 'UnRepo', 3951, 3951, 'techo')
    ];

    assert.equal(peorDe(puertas).puerta, 'IGNORE');
    assert.equal(peorDe([puertaDe('A', 'x', 1, 0), puertaDe('B', 'y', 9, 9)]).puerta, 'B');
  });

  it('sin puertas, la peor no es un fallo sino un caso que no se puede dar', () => {
    assert.equal(peorDe([]), undefined);
  });
});

describe('las puertas de cada guard', () => {
  it('tamano: el total, la cuenta de repos, y repo a repo contra SUELO', () => {
    // El total global casi nunca avisa de nada: perder sesenta ficheros en uno
    // de quince repos es un 0,4%. Por eso tambien sale cada repo con su suelo,
    // que es donde el dato es real. Los nombres son los de la tabla de verdad, y
    // el repo del suelo va dos ficheros por debajo para que se vea el rojo.
    const conTodos = (delta) => ({
      total: 13602,
      cuantosRepos: 14,
      repos: [
        ...Object.keys(FICHEROS_POR_REPO).map((repo) => ({
          repo,
          ficheros: FICHEROS_POR_REPO[repo] + delta,
          esRaiz: false
        })),
        { repo: 'UnRepoQueNoEstaEnLaTabla', ficheros: 900, esRaiz: false },
        { repo: 'laCarpeta', ficheros: 900, esRaiz: true }
      ]
    });
    const justos = new Set(puertasDeTamano(conTodos(0)).map((p) => p.donde));
    const porDebajo = puertasDeTamano(conTodos(-2));

    assert.ok(!justos.has('UnRepoQueNoEstaEnLaTabla'), 'un repo sin suelo no es una puerta');
    assert.ok(!justos.has('laCarpeta'), 'la raiz se llama segun la carpeta y no se juzga por nombre');
    assert.ok(porDebajo.some((p) => p.donde === 'total' && p.medido === 13602));
    assert.ok(porDebajo.some((p) => p.donde === CONSUELO && p.margen === -2),
      'un repo dos ficheros por debajo de su suelo sale con margen negativo');
    assert.equal(porDebajo.filter((p) => p.donde === CONSUELO).length, 1,
      'cada repo tiene UNA puerta de tamano');
  });

  it('ignore: un techo por repo, y uno nuevo con margen negativo', () => {
    // El caso que no es ruido: un repo que no estaba en la linea base y que
    // ahora tapa algo sale con margen NEGATIVO, porque lo que importa no es
    // cuantos tapa sino que sea la primera vez que los tapa.
    const porRepo = [
      { repo: 'ConDeuda', tapados: [{ ruta: 'a' }, { ruta: 'b' }] },
      { repo: 'Nuevo', tapados: [{ ruta: 'c' }] }
    ];
    const puertas = puertasDeIgnore(porRepo, [], { ConDeuda: 4 });

    const nuevo = puertas.find((p) => p.donde === 'Nuevo');

    assert.equal(nuevo.forma, 'techo');
    assert.equal(nuevo.medido, 1);
    assert.equal(nuevo.suelo, 0);
    assert.equal(nuevo.margen, -1);
    assert.ok(puertas.find((p) => p.donde === 'ConDeuda').margen === 2);
  });

  it('ignore: la raiz se queda fuera del margen, como en el guard', () => {
    // La raiz se llama segun la carpeta y su linea base no puede ser la misma en
    // la maquina y en el runner. Si su margen contara, esta linea diria que hay un
    // rojo donde el guard dice que no, que es la peor clase de mentira.
    const porRepo = [
      { repo: 'laCarpeta', tapados: [{ ruta: 'a' }, { ruta: 'b' }] },
      { repo: 'Otro', tapados: [{ ruta: 'c' }] }
    ];
    const sinRaiz = new Set(puertasDeIgnore(porRepo, [], {}, '/ruta/laCarpeta').map((p) => p.donde));

    assert.ok(!sinRaiz.has('laCarpeta'), 'la raiz tiene que quedar fuera');
    assert.ok(sinRaiz.has('Otro'), 'los demas siguen estando');
    // Y si no se dice cual es la raiz, la raiz no se puede quitar: el parametro
    // es el unico sitio donde se sabe, y sin el la linea mintiria en silencio.
    assert.ok(puertasDeIgnore(porRepo, [], {}).some((p) => p.donde === 'laCarpeta'));
  });

  it('eol: el total de ramas, los repos, y repo a repo contra su propio suelo', () => {
    const minimo = RAMAS_POR_REPO[CONRamas];
    const porRama = Array.from({ length: 12 }, (_, i) => ({
      repo: CONRamas,
      rama: 'origin/r' + i,
      auditoria: { ficheros: 10, auditados: 0, incumplimientos: [] }
    }));
    const estado = [
      { repo: 'laCarpeta', remotas: 3, extra: 2, esRaiz: true },
      { repo: CONRamas, remotas: minimo, extra: minimo - 1, esRaiz: false },
      { repo: 'UnRepoSinSuelo', remotas: 1, extra: 0, esRaiz: false }
    ];
    const puertas = puertasDeEol(porRama, estado);

    assert.ok(puertas.some((p) => p.donde === 'ramas extra' && p.global === true));
    assert.ok(puertas.some((p) => p.donde === CONRamas && p.medido === minimo && p.margen === 0));
    assert.ok(!puertas.some((p) => p.donde === 'laCarpeta'), 'la raiz no tiene suelo de ramas');
    assert.ok(!puertas.some((p) => p.donde === 'UnRepoSinSuelo'), 'sin suelo, sin puerta');
  });
});

describe('la linea entera', () => {
  const puertas = [
    puertaDe('TAMAÑO', 'total', 13602, 11000, 'suelo', true),
    puertaDe('TAMAÑO', 'repos', 14, 14, 'suelo', true),
    puertaDe('TAMAÑO', 'Pequeno', 365, 365),
    puertaDe('IGNORE', 'Grande', 3951, 3951, 'techo'),
    puertaDe('EOL', 'ramas extra', 12, 8, 'suelo', true),
    puertaDe('EOL', 'UnRepo', 2, 2)
  ];

  it('empieza por el entorno, que es lo que hace comparables dos ejecuciones', () => {
    // La maquina y el runner miden cosas distintas y en sitios distintos. Que el
    // nombre de la carpeta vaya delante es lo que evita leer el numero de una
    // linea creyendo que es el de la otra.
    const linea = formateaLinea(ENTORNO, puertas);

    assert.ok(linea.startsWith('ABDSynths (14 repos, 100 ficheros) ·'), linea);
    assert.equal(linea.split('\n').length, 1, 'una linea, y solo una');
  });

  it('de cada puerta sale UNA medida, no la lista entera', () => {
    // Con las tablas por repo hay puertas de sobra, y una linea que las lista
    // todas es un muro del que solo se lee el principio.
    const linea = formateaLinea(ENTORNO, puertas);

    assert.equal(linea.split('TAMAÑO').length - 1, 1, linea);
    assert.equal(linea.split('IGNORE').length - 1, 1, linea);
    assert.equal(linea.split('EOL').length - 1, 2, 'EOL sale dos veces: la medida y "la mas ajustada"');
  });

  it('el total va con su margen, y el repo que peor esta va aparte y con nombre', () => {
    const linea = formateaLinea(ENTORNO, puertas);

    assert.match(linea, /TAMAÑO 13602\/11000 \+2602/);
    assert.match(linea, /\(peor: repos \+0\)/);
    assert.match(linea, /IGNORE Grande 3951\/3951 \+0/);
  });

  it('cuenta cuantas puertas estan ya a cero, que es el dato de fondo', () => {
    // Los suelos se ponen al menor de los dos entornos, y eso quiere decir que
    // la mitad de las puertas ya estan a cero en el clon mas pobre. Decirlo es
    // mas util que el margen de la mas ajustada, porque es el estado de la suite
    // y no el de una puerta.
    assert.match(formateaLinea(ENTORNO, puertas), /4 de 6 sin margen/);
  });

  it('termina diciendo cual es la mas ajustada y cuanto le queda', () => {
    const linea = formateaLinea(ENTORNO, puertas);

    assert.match(linea, /la mas ajustada: /);
    assert.match(linea, /, 0 de margen$/);
  });

  it('una puerta en rojo sale en la linea como lo que es', () => {
    const enRojo = [puertaDe('IGNORE', 'Nuevo', 3, 0, 'techo')];

    assert.match(formateaLinea(ENTORNO, enRojo), /3\/0 -3/);
    assert.match(formateaLinea(ENTORNO, enRojo), /la mas ajustada: IGNORE Nuevo, 3 por debajo/);
  });

  it('sin puertas no inventa un veredicto que no ha medido', () => {
    const linea = formateaLinea(ENTORNO, []);

    assert.match(linea, /sin puertas que mirar/);
    assert.equal(linea.split('\n').length, 1);
  });
});

describe('la suite real', () => {
  // Medir cuesta un minuto porque son los tres guards enteros, y hacerlos dos
  // veces para dos aserciones es el modo de que nadie espere a que acaben. Se
  // mide una vez y los dos tests leen lo mismo.
  let medido = null;
  const medir = () => (medido = medido || mideTodo());

  it('la linea sale, y dice el entorno en el que se ha medido', () => {
    // Lo unico que se comprueba con la maquina delante es que sale UNA linea y
    // que no esta vacia. Los numeros no: son distintos en cada entorno, y un
    // test que los fija es un test que un dia se pone rojo solo.
    const { entorno, puertas } = medir();
    const linea = formateaLinea(entorno, puertas);

    assert.ok(linea.length > 60, 'la linea sale demasiado corta: ' + linea);
    assert.equal(linea.split('\n').length, 1);
    assert.ok(entorno.repos > 0 && entorno.ficheros > 0, JSON.stringify(entorno));
    assert.ok(puertas.length > 3, 'una linea con una puerta no describe nada');
  });

  it('y ninguna puerta se queda sin suelo, que es lo que haria la linea inutil', () => {
    // Una puerta con `suelo` undefined daria NaN, y un NaN en la linea no es un
    // dato feo: es un numero que ordena mal y rompe la comparacion de la mas
    // ajustada sin que se note.
    for (const p of medir().puertas) {
      assert.ok(Number.isFinite(p.medido) && Number.isFinite(p.suelo) && Number.isFinite(p.margen),
        'puerta con numeros que no son numeros: ' + JSON.stringify(p));
    }
  });
});