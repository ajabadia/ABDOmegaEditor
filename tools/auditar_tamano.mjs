// Audita que la suite NO SE HAYA ENCOGIDO en silencio.
//
//   node tools/auditar_tamano.mjs
//
// Salida:
//   0  la suite tiene todos los repos de siempre y ninguno ha perdido ficheros
//   1  falta un repo, o un repo tiene menos ficheros de los que tenia, o el
//      total esta por debajo del suelo
//   2  no se pudo ni siquiera leer la suite
//
// ─────────────────────────────────────────────────────────────────────────
// QUE ESTO CIERRA, Y POR QUE HACIA FALTA
//
// Los tres guards preguntan por el CONTENIDO: si un fichero incumple la regla que
// declara, si una regla de ignore tapa trabajo ya trackeado, si una regla de eol
// explica por que. Los tres son verdes con una suite a la que le han salido tres
// repos, y no hay forma de distinguirlo del resultado correcto.
//
// Y no es una hipotesis. Los repos son clones: un clon puede fallar, un repo se
// puede renombrar, y un `.gitignore` de la raiz puede dejar de descubrir un
// hermano sin que nadie se entere. Todo eso baja el numero de ficheros, y una
// suite que encoge en silencio se audita mas rapido y mejor: es la direccion en la
// que este trabajo es mas peligroso.
//
// Que un numero baje NO es por si mismo un fallo. Por eso aqui no hay un suelo y
// ya: hay una tabla con lo que cada repo tenia, y bajar un numero es una decision
// que alguien tiene que escribir en el codigo. Es el mismo trato que la linea base
// de deuda de `auditar_ignore_oculto.mjs`, aplicado al denominador.
//
// ─────────────────────────────────────────────────────────────────────────
// LA RAIZ SE QUEDA FUERA DE LA TABLA, Y POR QUE
//
// El repositorio raiz se nombra como se llame la carpeta donde esta, que en la
// maquina de desarrollo es `ABDSynths`, en el runner es el nombre del repo, y en
// cualquiera de los dos puede ser otra cosa. Ademas su tamano depende de que rama
// esta desplegada: trece ficheros en `workspace-history` y ochocientos en `main`,
// porque `main` es la aplicacion entera. Un suelo para la raiz habria que medirlo
// con dos cifras y no significaria nada. La raiz se cuenta y se informa, pero no
// se juzga por tamano; lo que la protege es estar en la cuenta de repos.
//
// ─────────────────────────────────────────────────────────────────────────
// LOS SUELOS SON EL MENOR DE LOS DOS ENTORNOS, NO EL DE UNO
//
// El numero de ficheros de un repo depende de que rama esta deployada, y la
// maquina de desarrollo trabaja en ramas de desarrollo mientras el runner clona la
// por defecto. ABDJUNiO601 tiene 763 ficheros en `main` y 6.007 en
// `feature/fidelity-certified`: si el suelo fuera el de la maquina, el runner
// fallaria siempre. Ese error ya se cometio una vez en este repo, con el suelo de
// ficheros auditados del guard de EOL, y el arreglo fue bajar el suelo a la medida
// mas pobre despues de que el runner dijera que no. Aqui se hace al reves, que es
// mas barato: se mide en los dos sitios antes de escribir el numero.
//
// Medido en los dos entornos con este mismo codigo, con `git ls-files`:
//
//   clon limpio de las ramas por defecto   14 repos, 8.336 ficheros
//   maquina de desarrollo                  14 repos, 13.647 ficheros
//
// Los dos bajaron de la ultima vez que se midieron, y los dos por lo mismo: ABDOmega
// salio de la suite. En la maquina porque estaba deprecado y movido, y en el clon
// porque el workflow dejo de clonarlo. Un repo que se va es menos repos y menos
// ficheros, y las dos cifras se vuelven a medir, no se corrigen a ojo.
//
// La tabla de abajo es el menor de los dos, repo a repo.

import { auditaRepo, raizDeSuite, reposDeSuite } from './auditar_ignore_oculto.mjs';
// La lista de repos que tienen que estar vive con la puerta de las ramas, que es
// donde ya la usan el guard de EOL y el diagnostico. Aqui se reexporta para que
// quien la importaba de este fichero siga haciendolo.
import { REPOS_OBLIGATORIOS } from './puertas_de_ramas.mjs';

export { REPOS_OBLIGATORIOS };

/**
 * Cuantos repos tiene que haber, como minimo.
 *
 * Catorce medidos en los dos entornos, con suelo en trece: uno de margen para
 * que anadir un repo no toque nada, y ninguno para que un repo que falta se note
 * en la cuenta y no solo en el total.
 */
export const SUELO_REPOS = 13;

/**
 * Cuantos ficheros trackeados tiene que haber en toda la suite, como minimo.
 *
 * La tabla de abajo ya suma 8.327, o sea que este suelo esta implicado por ella
 * y es la red de seguridad de las dos cosas: si alguien corrige una cifra de la
 * tabla y se equivoca, el total lo nota igual. Un 4 por ciento de margen sobre la
 * medida mas pobre, y no mas, porque un suelo con margen de sobra no es un suelo.
 *
 * BAJO DE 11.000 CUANDO SALIO ABDOmega, Y POR QUE HAY QUE BAJARLO. En el clon del
 * runner la suite tiene 8.336 ficheros sin el; antes eran 11.513 porque el solo
 * aportaba 3.177. Un repo deprecado que se sigue clonando no es un coste de disco:
 * es el techo del otro, y si se quita el repo y no el suelo, el guard se pone rojo
 * por una suite que ha crecido. La cifra se medio, no se estimo: 8.336 con trece
 * repos.
 */export const SUELO_FICHEROS = 8000;

/**
 * Cuantos ficheros tinha cada repo, como minimo.
 *
 * El menor de los dos entornos, repo a repo, que es lo unico que hace que el
 * suelo valga en la maquina y en el runner a la vez. Cuando un repo baje de aqui
 * porque se le han borrado ficheros a proposito, se baja este numero en el mismo
 * commit: es la manera de que bajar el suelo cueste un commit y no un descuido.
 *
 * Los que se ven con mas margen entre entornos son ABDJUNiO601 (763 en el clon
 * contra 6.007 en la maquina) y ABDEep (985 contra 981), y su suelo es el del
 * clon, que es el mas pobre.
 *
 * ESTA TABLA ES LA QUE APORTA, Y SE SABE CUANDO. Borrando sesenta ficheros de
 * ABDCZ101 en el clon, el total de la suite se queda en 8.276, que sigue por
 * encima del suelo global de 8.000, y el suelo global no dice nada. La tabla si:
 * `ABDCZ101 970 de 1030 (-60)`. Con trece repos, perder sesenta ficheros en uno
 * solo es una perdida de tres cuartos de un por ciento del total, y tres cuartos
 * de un por ciento no es el tipo de cosa que se nota mirando un numero grande. Por
 * eso las dos cosas: el total es la red y la tabla es la que nombra.
 */
export const FICHEROS_POR_REPO = {
  ABDJUNiO601: 763,
  ABDMS2000: 551,
  ABDNeural: 404,
  ABDOmegaUnified: 1837,
  ABDAudioLab: 1052,
  ABDBankManager: 365,
  ABDCZ101: 1030,
  ABDEep: 981,
  ABDScope: 72,
  ABDSharedAssets: 399,
  ABDSharedCode: 208,
  '_specific_example': 79,
  'abd-ia_synths': 586
};

/**
 * Lo que se ha encontrado, una vez leido el disco.
 *
 * @param {string} raiz
 * @returns {{repos: {repo: string, ficheros: number, esRaiz: boolean}[],
 *            faltan: string[], encogidos: {repo: string, ficheros: number, suelo: number}[],
 *            total: number, cuantosRepos: number}}
 */
export function auditaTamano (raiz = raizDeSuite()) {
  if (raiz === null) {
    throw new Error('no encuentro la raiz de la suite: no hay ningun ABDSharedAssets por encima '
      + 'del sitio donde esta este fichero');
  }

  // Se leen los repos de uno en uno con `auditaRepo`, que es el mismo `ls-files`
  // que usa la puerta de ignore. No se reimplementa el recuento: un numero
  // medido con otro codigo que el del guard es otro numero, y aqui se quiere el
  // de las otras puertas.
  //
  // `ls-files` cuenta lo TRACKEADO, no lo que hay en el disco. Un fichero borrado
  // del arbol de trabajo y sin commitear sigue contado, y con razon: eso no es
  // que la suite haya encogido, es alguien a medias en su repositorio, y la
  // puerta de EOL ya se encarga de mirar el disco. Lo que encoge la suite es lo
  // que se borro en un commit, y para eso el recuento tiene que ser el del
  // indice, que es el mismo en la maquina y en un clon recien bajado.
  const leidos = reposDeSuite(raiz).map((ruta) => {
    const esRaiz = ruta === raiz || ruta === raiz + '/';
    const nombre = ruta.split(/[\\/]/).filter((p) => p !== '').pop() || ruta;

    return { repo: nombre, ficheros: auditaRepo(ruta).trackeados, esRaiz };
  });

  return comparaConSuelo(leidos);
}

/**
 * La parte que decide, sin tocar el disco, para poder probarla con numeros de
 * mentira.
 *
 * Tres preguntas, y se contestan en este orden para que el informe mas grave
 * salga primero: estan los repos de siempre, ha encogido alguno, esta el total por
 * debajo del suelo.
 *
 * @param {{repo: string, ficheros: number, esRaiz?: boolean}[]} medido
 * @returns {object} lo mismo que devuelve `auditaTamano`.
 */
export function comparaConSuelo (medido) {
  const repos = medido || [];
  const nombres = repos.map((r) => r.repo);

  // La raiz se salta de la cuenta de obligatorios: su nombre cambia con la
  // carpeta, asi que pedirla por nombre haria que este guard fallara en cuanto
  // alguien clonara el repo donde otro nombre.
  const faltan = REPOS_OBLIGATORIOS.filter((n) => !nombres.includes(n));

  const encogidos = repos
    .filter((r) => r.esRaiz !== true && FICHEROS_POR_REPO[r.repo] !== undefined
      && r.ficheros < FICHEROS_POR_REPO[r.repo])
    .map((r) => ({
      repo: r.repo,
      ficheros: r.ficheros,
      suelo: FICHEROS_POR_REPO[r.repo],
      perdidos: FICHEROS_POR_REPO[r.repo] - r.ficheros
    }))
    // El que mas ha perdido respecto a lo que tenia, primero. Ordenar por suelo
    // pondria delante al repo mas pequeño, que casi siempre es el que menos ha
    // perdido: son repos de treinta ficheros, y perder cuatro no es lo mismo que
    // perder ciento setenta aunque los numeros se parezcan.
    .sort((a, b) => b.perdidos - a.perdidos);

  const total = repos.reduce((a, r) => a + r.ficheros, 0);

  return {
    repos,
    faltan,
    encogidos,
    total,
    cuantosRepos: repos.length
  };
}

/** Un informe legible, con el fallo primero si hay fallo. */
export function formatea (informe) {
  const lineas = [
    'repos encontrados                               : ' + informe.cuantosRepos
      + ' (suelo ' + SUELO_REPOS + ')',
    'ficheros trackeados en la suite                 : ' + informe.total
      + ' (suelo ' + SUELO_FICHEROS + ')'
  ];

  if (informe.faltan.length === 0 && informe.encogidos.length === 0
      && informe.total >= SUELO_FICHEROS && informe.cuantosRepos >= SUELO_REPOS) {
    lineas.push('');
    lineas.push('la suite esta entera: todos los repos de siempre y ninguno mas pequeno.');
    return lineas.join('\n');
  }

  if (informe.faltan.length > 0) {
    lineas.push('');
    lineas.push('FALTAN REPOS QUE LA SUITE TIENE QUE TENER:');
    for (const n of informe.faltan) lineas.push('  ' + n);
  }

  if (informe.encogidos.length > 0) {
    lineas.push('');
    lineas.push('REPOS QUE HAN PERDIDO FICHEROS:');
    for (const e of informe.encogidos) {
      lineas.push('  ' + e.repo.padEnd(20) + String(e.ficheros).padStart(7) + ' de '
        + String(e.suelo).padStart(7) + '  (-' + (e.suelo - e.ficheros) + ')');
    }
  }

  if (informe.total < SUELO_FICHEROS) {
    lineas.push('');
    lineas.push('la suite tiene ' + informe.total + ' ficheros, por debajo del suelo de '
      + SUELO_FICHEROS + '.');
  }

  if (informe.cuantosRepos < SUELO_REPOS) {
    lineas.push('');
    lineas.push('la suite tiene ' + informe.cuantosRepos + ' repos, por debajo del suelo de '
      + SUELO_REPOS + '.');
  }

  return lineas.join('\n');
}

/** Si el informe es un hallazgo o no. */
export function falla (informe) {
  return informe.faltan.length > 0 || informe.encogidos.length > 0
    || informe.total < SUELO_FICHEROS || informe.cuantosRepos < SUELO_REPOS;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const informe = auditaTamano();

    console.log(formatea(informe));

    if (falla(informe)) {
      console.error('');
      console.error('auditar_tamano: la suite se ha encogido o le falta un repo.');
      console.error('  Si el repo se renombro, cambialo en REPOS_OBLIGATORIOS.');
      console.error('  Si un repo perdio ficheros a proposito, baja su numero en');
      console.error('  FICHEROS_POR_REPO en el mismo commit. Bajarlo sin querer es');
      console.error('  exactamente lo que esta puerta existe para que no pase.');
      process.exit(1);
    }

    process.exit(0);
  } catch (e) {
    console.error('auditar_tamano: no se pudo ni siquiera leer la suite.');
    console.error(e.message);
    process.exit(2);
  }
}
