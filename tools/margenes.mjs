// Una linea que diga que puerta se esta mirando en ESTE entorno, y cuanto le
// queda a cada una antes de ponerse roja.
//
//   node tools/margenes.mjs
//
// POR QUE UNA SOLA LINEA. Cada guard imprime su informe entero, que es lo que
// hay que leer cuando algo se ha roto. Esto es lo contrario: no informa de un
// fallo, informa del ESTADO, y su trabajo es que de un vistazo se sepa si lo que
// se tiene delante es una suite sana o una que esta a punto de no serlo. Por eso
// no repite lo que ya dicen los otros tres: repite los Suelos, que son lo que
// no se ve en ningun sitio.
//
// QUE PUERTA ES LA MAS AJUSTADA. Los suelos estan puestos al menor de los dos
// entornos, con lo cual el margen es pequeño en un sitio y grande en el otro, y
// el numero que importa no es el de cada puerta sino el de la que peor esta:
// una linea con cinco margenes y ninguno marcado no dice nada. La que peor esta
// sale la ultima, con su margen, y esa es la que hay que mirar antes de tocar
// nada.
//
// NO ES UNA PUERTA. Esto sale siempre en 0 y no falla nunca, ni en la maquina ni
// en el runner: un informe que se pone rojo al intentar decir como de cerca
// estas del rojo seria una cuarta puerta que nadie ha pedido. Los que fallan son
// los otros tres.

import { pathToFileURL } from 'node:url';
import { basename } from 'node:path';

import { raizDeSuite, auditaSuite as auditaIgnore, auditaRamasDeSuite as auditaRamasDeIgnore,
  peorCasoPorRepo, DEUDA_CONOCIDA } from './auditar_ignore_oculto.mjs';
import { auditaTamano, SUELO_REPOS, SUELO_FICHEROS, FICHEROS_POR_REPO } from './auditar_tamano.mjs';
import { auditaRamasDeSuite, resumenDeRamas, RAMAS_AUDITADAS_MINIMAS,
  REPOS_CON_RAMAS_MINIMOS, RAMAS_POR_REPO } from './auditar_eol.mjs';

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE PURA. Nada toca el disco ni git, y por eso el test puede darle
// numeros inventados y comprobar cada puerta sin montar una suite.
// ─────────────────────────────────────────────────────────────────────────

/**
 * La diferencia entre lo medido y el suelo, tal cual.
 *
 * Es `puertaDe` quien decide hacia que lado va, porque un suelo se cuenta hacia
 * arriba y un techo hacia abajo. Aqui solo se resta, y el nombre lo dice: la
 * funcion que sabe de que lado esta la puerta es la que construye la puerta.
 *
 * @param {number} medido
 * @param {number} suelo
 * @returns {number}
 */
export function margenDe (medido, suelo) {
  return medido - suelo;
}

/**
 * Una puerta, con la etiqueta y el margen que salen en la linea.
 *
 * EL SIGNO. Un suelo se cruza por ARRIBA —hay mas ficheros de los que el suelo
 * pide— y un techo por ABAJO —hay mas tapados de los que la linea base
 * permite—, asi que la holgura va en sentidos distintos segun la forma. Sin esa
 * correccion, un techo con margen +1 pareceria tener holgura cuando lo que
 * tiene es un fichero de mas, y la linea mas ajustada declararia buena justo la
 * puerta que se esta rompiendo. Con la correccion, `margen` es siempre "cuanto
 * le queda": negativo quiere decir que ya esta en rojo.
 *
 * `global` marca la medida que resume a su grupo —el total de ficheros, el de
 * ramas— de la que solo hay una por puerta. Sin esa marca, el informe tendria que
 * adivinar cual de las puertas es la que resume y cual es un repo suelto, y una
 * linea que adivina no vale.
 *
 * @param {string} puerta `TAMAÑO`, `IGNORE` o `EOL`.
 * @param {string} donde que repo, o que medida, se esta mirando.
 * @param {number} medido
 * @param {number} suelo
 * @param {string} forma `'suelo'` o `'techo'`.
 * @param {boolean} global si es la medida que resume a las demas de su puerta.
 * @returns {{puerta: string, donde: string, medido: number, suelo: number,
 *            margen: number, forma: string, global: boolean}}
 */
export function puertaDe (puerta, donde, medido, suelo, forma = 'suelo', global = false) {
  return {
    puerta,
    donde,
    medido,
    suelo,
    forma,
    global,
    margen: forma === 'techo' ? margenDe(suelo, medido) : margenDe(medido, suelo)
  };
}

/** La puerta que peor esta: la que antes se rompe. */
export function peorDe (puertas) {
  return [...puertas].sort((a, b) => a.margen - b.margen || (a.puerta < b.puerta ? -1 : 1))[0];
}

/** Las puertas de tamano: el total, la cuenta de repos, y repo a repo. */
export function puertasDeTamano (informe) {
  const delTotal = puertaDe('TAMAÑO', 'total', informe.total, SUELO_FICHEROS, 'suelo', true);
  const deRepos = puertaDe('TAMAÑO', 'repos', informe.cuantosRepos, SUELO_REPOS, 'suelo', true);

  // Repo a repo es donde esta el dato, y no por el total: con quince repos,
  // perder sesenta ficheros en uno solo es un 0,4% del total y el total ni se
  // entera. El suelo global de once mil no dice nada, y la tabla si.
  const porRepo = informe.repos
    .filter((r) => r.esRaiz !== true && FICHEROS_POR_REPO[r.repo] !== undefined)
    .map((r) => puertaDe('TAMAÑO', r.repo, r.ficheros, FICHEROS_POR_REPO[r.repo]));

  return [delTotal, deRepos, ...porRepo];
}

/**
 * Las puertas de `.gitignore`, que son TECHOS y no suelos.
 *
 * La linea base es lo que el repo puede tapar sin que esto se ponga rojo, asi que
 * la holgura es lo que le queda por encima de la deuda conocida. Un repo que no
 * esta en la linea base y tapa algo sale con margen negativo, que es la forma
 * de que una deuda nueva se lea como lo que es.
 *
 * LA RAIZ SE QUEDA FUERA DEL MARGEN, y no por prudencia sino porque no hay otra
 * cosa: se llama como la carpeta —`ABDSynths` en la maquina, el nombre del repo
 * en el runner— y su linea base no puede ser la misma en los dos sitios. El
 * guard de `.gitignore` ya hace exactamente esto, con el mismo motivo y en el
 * mismo sitio de la funcion. Si aqui entrara, la linea dira que hay un rojo donde
 * el guard dice que no, que es la peor clase de mentira: la que contradice a la
 * puerta.
 *
 * @param {{repo: string, tapados: {ruta: string}[]}[]} porRepo
 * @param {{repo: string, rama: string, auditoria: object}[]} porRama
 * @param {Record<string, number>} base
 * @param {string|null} raiz nombre o ruta de la raiz de la suite.
 */
export function puertasDeIgnore (porRepo, porRama, base = DEUDA_CONOCIDA, raiz = null) {
  const nombreDeLaRaiz = raiz === null
    ? null
    : (raiz.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || raiz);

  return peorCasoPorRepo(porRama, porRepo)
    .filter((p) => nombreDeLaRaiz === null || p.repo !== nombreDeLaRaiz)
    .map((p) => puertaDe('IGNORE', p.repo, p.tapados, base[p.repo] ?? 0, 'techo'));
}

/**
 * Las puertas de EOL: el total de ramas extra, cuantos repos aportan, y repo a
 * repo contra su propio suelo de ramas.
 *
 * @param {{repo: string, rama: string, auditoria: object}[]} porRama
 * @param {{repo: string, remotas: number, extra: number, esRaiz: boolean}[]} estado
 */
export function puertasDeEol (porRama, estado) {
  const resumen = resumenDeRamas(porRama);
  const total = puertaDe('EOL', 'ramas extra', resumen.auditadas, RAMAS_AUDITADAS_MINIMAS, 'suelo', true);
  const repos = puertaDe('EOL', 'repos con ramas', resumen.repos.length, REPOS_CON_RAMAS_MINIMOS, 'suelo', true);

  // El suelo por repo es mas fino que el total y es el que avisa antes: un repo
  // puede perder la mitad de sus ramas sin que el total de la suite se entere.
  const porRepo = (estado || []).filter((e) => !e.esRaiz && RAMAS_POR_REPO[e.repo] !== undefined)
    .map((e) => puertaDe('EOL', e.repo, e.remotas, RAMAS_POR_REPO[e.repo]));

  return [total, repos, ...porRepo];
}

/**
 * La linea.
 *
 * El entorno va delante porque es lo que mas cambia entre una ejecucion y otra y
 * lo que hace comparables dos lineas: la maquina dice `ABDSynths` y el runner
 * dice el nombre de su carpeta, y con solo mirar eso se sabe de donde sale el
 * numero que se tiene delante.
 *
 * DE CADA PUERTA SALE UNA, NO TREINTA. Con las tablas por repo hay puertas de
 * sobra, y una linea que las lista todas es un muro: se lee el principio y se
 * pasa por lo demas. De cada puerta sale la medida que la resume y, solo si hay
 * algo peor debajo, cuanto le queda al repo que peor esta. Las demas siguen
 * estando en la cuenta de las que no tienen margen, que es donde se ve el
 * problema de fondo: los suelos estan puestos al menor de los dos entornos, y
 * eso quiere decir que la mitad de las puertas ya estan a cero.
 *
 * @param {{nombre: string, repos: number, ficheros: number}} entorno
 * @param {{puerta: string, donde: string, medido: number, suelo: number,
 *          margen: number, global: boolean}[]} puertas todas, o solo las que interesen.
 * @returns {string}
 */
export function formateaLinea (entorno, puertas) {
  const nombres = [...new Set(puertas.map((p) => p.puerta))];
  const tramos = [];

  for (const nombre of nombres) {
    const delGrupo = puertas.filter((p) => p.puerta === nombre);
    const peor = peorDe(delGrupo);
    const cabeza = delGrupo.find((p) => p.global) || peor;

    const mas = (p) => p.medido + '/' + p.suelo + (p.margen >= 0 ? ' +' + p.margen : ' ' + p.margen);

    tramos.push(cabeza === peor
      ? nombre + ' ' + (cabeza.global ? '' : cabeza.donde + ' ') + mas(cabeza)
      : nombre + ' ' + mas(cabeza) + ' (peor: ' + peor.donde
        + (peor.margen >= 0 ? ' +' + peor.margen : ' ' + peor.margen) + ')');
  }

  const sinMargen = puertas.filter((p) => p.margen === 0).length;
  const peor = peorDe(puertas);
  const caben = peor === undefined
    ? 'sin puertas que mirar'
    : 'la mas ajustada: ' + peor.puerta + ' ' + peor.donde + ', ' + Math.abs(peor.margen)
      + (peor.margen < 0 ? ' por debajo' : ' de margen');

  return entorno.nombre + ' (' + entorno.repos + ' repos, ' + entorno.ficheros + ' ficheros) · '
    + tramos.join(' · ') + ' · ' + sinMargen + ' de ' + puertas.length + ' sin margen · ' + caben;
}

// ─────────────────────────────────────────────────────────────────────────
// LA PARTE QUE MIDE, que es la que llama a los tres guards y solo a medir.
// ─────────────────────────────────────────────────────────────────────────

/** Todo lo que hace falta para la linea, medido con los tres guards. */
export function mideTodo (raiz = raizDeSuite()) {
  const tamano = auditaTamano(raiz);
  const ignore = auditaIgnore(raiz);
  const ramasDeIgnore = auditaRamasDeIgnore(raiz);
  const ramasDeEol = auditaRamasDeSuite(raiz);

  const entorno = {
    nombre: basename(raiz.replace(/[\\/]+$/, '')) || raiz,
    repos: tamano.cuantosRepos,
    ficheros: tamano.total
  };

  const puertas = [
    ...puertasDeTamano(tamano),
    ...puertasDeIgnore(ignore, ramasDeIgnore, DEUDA_CONOCIDA, raiz),
    ...puertasDeEol(ramasDeEol.porRama, ramasDeEol.estado)
  ];

  return { entorno, puertas };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { entorno, puertas } = mideTodo();

    console.log(formateaLinea(entorno, puertas));
  } catch (e) {
    // Aqui un fallo SI es una noticia, y no un codigo de salida: si no se puede
    // medir, la linea no se puede escribir, y callarse seria fingir que todo
    // esta bien.
    console.error('margenes: no se ha podido medir la suite.');
    console.error(e.message);
    process.exit(2);
  }

  process.exit(0);
}