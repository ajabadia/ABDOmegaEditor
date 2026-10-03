// La puerta de las ramas, que es la misma en los dos guards que miran ramas.
//
//   POR QUE ESTA EN UN FICHERO PROPIO. El guard de `.gitignore` y el de EOL
//   auditan las mismas ramas de los mismos repos, y la pregunta que se hace
//   sobre ellas —cuantas son, de quien son, y por que han bajado— no tiene dos
//   respuestas validas. Si cada uno guardase su tabla de suelos, un dia una
//   valdria 8 y la otra 9, y el `clone` del workflow que vale para uno dejaria
//   de valer para el otro sin que nadie se entere.
//
//   Y la otra razon es un CICLO. `auditar_eol` ya importa de
//   `auditar_ignore_oculto`. Si el de `.gitignore` importase de `auditar_eol` para
//   tener la puerta, los dos guards se importarian mutuamente. En ESM eso
//   funciona HOY, porque todos los simbolos que se usan son funciones declaradas
//   y ninguna constante de nivel superior depende del otro modulo al cargar. Es
//   decir: funciona mientras nadie anada una constante arriba del todo, y se
//   rompe el dia que lo haga, en el `import`, no en la linea que la usa. Un
//   guard que rompe al importar es el peor sitio posible para romperse.
//
//   ESTE MODULO NO IMPORTA NADA DE LOS GUARDS. Solo `execFileSync` y sus propias
//   reglas, para que los dos guards puedan depender de el sin depender el uno del
//   otro. La lista de repos que tienen que estar tambien vive aqui, y el guard
//   de tamano la reexporta: dos listas de catorce nombres en dos ficheros son
//   catorce formas de que una se quede vieja en silencio.

import { execFileSync } from 'node:child_process';

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

/**
 * Los repos que tienen que estar, por nombre.
 *
 * La cuenta de repos dice CUANTOS hay; esta lista dice COMO SE LLAMAN, que es lo
 * que hace util el aviso. Sin ella, un repo que se renombra y otro que aparece
 * dejan el numero igual y nadie se entera de nada.
 *
 * Los catorce hermanos de siempre. La raiz no esta aqui y no por olvido: se
 * nombra segun la carpeta, que cambia de un entorno a otro.
 */
export const REPOS_OBLIGATORIOS = [
  'ABDOmega',
  'ABDOmegaUnified',
  'ABDAudioLab',
  'ABDCZ101',
  'ABDEep',
  'ABDJUNiO601',
  'ABDMS2000',
  'ABDNeural',
  'ABDScope',
  'ABDSharedAssets',
  'ABDSharedCode',
  'ABDBankManager',
  '_specific_example',
  'abd-ia_synths'
];
/**
 * Las ramas de un repo, con su nombre corto y su commit.
 *
 * De `refs/remotes/origin` y no de las ramas locales, por una razon que parece
 * tonta y no lo es: el runner clona de cero y solo tiene `origin/*`. Si aqui se
 * miraran las ramas locales, la maquina de desarrollo auditaria ramas que el
 * runner no puede ver, y los dos numeros dejarian de ser comparables —que es
 * exactamente el problema que este guard paso tres commits arreglando.
 *
 * @param {string} repo ruta absoluta del repositorio.
 * @returns {{rama: string, sha: string}[]}
 */
export function ramasDeRepo (repo) {
  const salida = gitOpcional(repo, [
    'for-each-ref', '--format=%(refname) %(objectname)', 'refs/remotes/origin'
  ]);

  return salida.split('\n')
    .filter((l) => l !== '')
    .map((l) => {
      const [ref, sha] = l.split(' ');

      return { ref, sha };
    })
    // El `HEAD` del remoto es un symref a la rama por defecto: no es una rama,
    // es un puntero, y mirarlo seria auditar dos veces lo mismo. Y el `origin` a
    // secas TAMBIEN aparece y tambien es un symref, uno menos conocido porque
    // `for-each-ref` lo lista con nombre de una sola pieza. Sin este filtro,
    // ABDOmega salia con `origin` y con `origin/main` como dos ramas, que son el
    // mismo commit, y el recuento de ramas auditadas no cuadraba con el de
    // `git ls-remote --heads`.
    .filter((r) => r.ref !== 'refs/remotes/origin' && !r.ref.endsWith('/HEAD'))
    .map((r) => ({ rama: r.ref.replace('refs/remotes/', ''), sha: r.sha }));
}
/**
 * Cuantas ramas tienen que auditarse para que el recuento signifique algo.
 *
 * MEDIDO. En un clon con `--no-single-branch`, que es como lo hace el workflow,
 * son 13 ramas en 5 repos. En la maquina, con los mismos repos y las mismas
 * ramas mas lo que se haya traido otros dias, 15 en 6. Los suelos se ponen en 8
 * y en 3, no mas arriba, porque un suelo pegado al numero real no te avisa de
 * nada: solo se ajusta cuando alguien borra ramas de verdad, y entonces con un
 * comentario al lado diciendo cuantas y por que.
 *
 * UN CLON DE UNA SOLA. `git clone --depth 1` sin `--no-single-branch` se queda
 * con la rama por defecto, y como la que esta comprobada ya la audita
 * `auditaRepo`, el recuento de ramas EXTRA cae a cero. Con cero, todo lo de
 * arriba sale en verde: cero incumplimientos, porque no se ha mirado nada. Es el
 * modo de fallo mas barato que tiene un guard —dar verde por no mirar—, y por eso
 * el suelo esta en el `exit`, no solo en el informe.
 *
 * POR QUE HAY DOS SUELOS Y NO UNO. Con trece ramas todas de un solo repo el
 * primero se cumple y la cobertura se ha perdido igual: ABDJUNiO601 se come
 * nueve de trece. El segundo mira cuantos repos aportan, que es lo que de
 * verdad dice que la puerta sigue abierta en mas de un sitio.
 */
export const RAMAS_AUDITADAS_MINIMAS = 8;
export const REPOS_CON_RAMAS_MINIMOS = 3;
/**
 * Cuantas ramas remotas deberia traer cada repo que las tiene.
 *
 * MEDIDO, repo a repo, y el numero es el MENOR de los dos entornos: 2 y 2 en
 * ABDAudioLab, 9 y 9 en ABDJUNiO601, 2 y 2 en ABDMS2000, 5 y 5 en ABDOmega. Los
 * demas repos tienen una sola rama en los dos sitios y no aparecen, porque no hay
 * nada que suelo: la mayoria de la suite tiene una rama y seguira teniendola.
 *
 * ABDEep no sale porque aqui tiene 1 y alla 2. Es el unico caso en que los dos
 * entornos no coinciden, y poner un suelo de 1 no diria nada; cuando se le borre
 * la segunda, esta tabla es el sitio donde se anota con un comentario.
 *
 * LA RAIZ NO ESTA. Se llama segun la carpeta y sus ramas remotas dependen de como
 * se clonara este checkout: en la maquina son 3 y en un clon de prueba son 0. Un
 * suelo puesto ahi seria un suelo que solo es cierto en un sitio.
 *
 * Para cuando un repo pierde ramas de verdad se baja el numero aqui, en el mismo
 * commit que las borra, que es la manera de que bajarlo cueste un commit.
 */
export const RAMAS_POR_REPO = {
  ABDAudioLab: 2,
  ABDJUNiO601: 9,
  ABDMS2000: 2,
  ABDOmega: 5
};
/**
 * Las ramas que hay que auditar: sin la que ya esta comprobada y sin repetir
 * commit.
 *
 * Es la regla que comparten los dos guards, y vive aqui para que no la tengan
 * cada una por su cuenta. Si un dia los dos contaran ramas de forma distinta,
 * la puerta diria que hay cobertura donde un guard no ha mirado nada, que es el
 * peor sitio para que la contradiccion aparezca.
 *
 * @param {string} head el commit de la rama comprobada.
 * @param {{rama: string, sha: string}[]} todas las ramas remotas.
 * @returns {{rama: string, sha: string}[]}
 */
export function auditableDe (head, todas) {
  const vistos = new Set([head]);

  return todas.filter((r) => !vistos.has(r.sha) && vistos.add(r.sha));
}

/**
 * El recuento de ramas, y si ha caído por debajo del suelo.
 *
 * QUE CUENTA CADA GUARD. El de EOL cuenta las ramas CON FICHEROS, porque una
 * rama cuyo arbol no tiene ficheros no se ha auditado: contarla seria medir lo
 * contrario de lo que dice el nombre. El de `.gitignore` cuenta todas las que ha
 * auditado, porque el suyo no es un recuento de ficheros sino de tapados, y una
 * rama sin ficheros puede tenerlos. Por eso la cuenta se pasa como funcion y no
 * como una regla fija: es lo unico que los dos guards no comparten, y decidirlo
 * aqui los obliga a decirlo en voz alta en vez de darlo por supuesto.
 *
 * @param {{repo: string, rama: string, auditoria: object}[]} porRama
 * @param {(rama: object) => boolean} cuenta que rama cuenta como auditada.
 * @returns {{auditadas: number, repos: string[], porDebajo: string[]}}
 */
export function resumenDeRamas (porRama, cuenta = (r) => r.auditoria.ficheros > 0) {
  const conFicheros = porRama.filter(cuenta);
  const repos = [...new Set(conFicheros.map((r) => r.repo))].sort();
  const porDebajo = [];

  if (conFicheros.length < RAMAS_AUDITADAS_MINIMAS) {
    porDebajo.push(conFicheros.length + ' rama(s) de un suelo de ' + RAMAS_AUDITADAS_MINIMAS);
  }

  if (repos.length < REPOS_CON_RAMAS_MINIMOS) {
    porDebajo.push(repos.length + ' repo(s) con ramas de un suelo de ' + REPOS_CON_RAMAS_MINIMOS);
  }

  return { auditadas: conFicheros.length, repos, porDebajo };
}
/**
 * POR QUE han bajado las ramas, que es lo que de verdad hace falta contestar.
 *
 * "Se han auditado menos ramas" no sirve de nada: hay cuatro motivos distintos y
 * solo uno tiene el mismo arreglo.
 *
 *   - el clon se hizo de UNA SOLA rama, y el arreglo es volver a clonar con
 *     `--no-single-branch`. Es el caso caro, porque no se ve mirando el numero:
 *     un repo con una rama es lo normal en catorce de los quince.
 *   - un repo que estaba en la lista ya NO ESTA en el clon, y ahi lo que falta no
 *     son ramas sino el repo entero.
 *   - le han BORRADO ramas de verdad a un repo, que se distingue del primer caso
 *     porque sigue teniendo mas de una.
 *   - y un repo NUEVO que no esta en la lista, que no es un fallo sino la puerta
 *     de al lado: la lista se queda vieja y el suelo de repos de otro guard
 *     empezara a pickar.
 *
 * Cada causa lleva `grave` porque la cuarta no pone el guard en rojo sola: un repo
 * nuevo es lo que tiene que pasar, y lo que hay que hacer es anadirlo a la lista.
 *
 * @param {{repo: string, remotas: number, extra: number, esRaiz: boolean}[]} estado
 * @param {string[]} esperados los repos que tienen que estar.
 * @returns {{codigo: string, grave: boolean, repos: string[], detalle: string}[]}
 */
export function diagnosticoDeRamas (estado, esperados = REPOS_OBLIGATORIOS) {
  const hermanos = estado.filter((e) => !e.esRaiz);
  const enDisco = new Set(hermanos.map((e) => e.repo));

  const faltan = esperados.filter((n) => !enDisco.has(n));
  const nuevos = hermanos.map((e) => e.repo).filter((n) => !esperados.includes(n));

  const sinRemoto = [];
  const unaSola = [];
  const borradas = [];

  for (const e of hermanos) {
    const minimo = RAMAS_POR_REPO[e.repo];

    // Un repo que no esta en la tabla no tiene suelo: no hay nada que quedarse
    // corto y no se puede inventar. Se pasa, y punto.
    if (minimo === undefined || e.remotas >= minimo) continue;

    if (e.remotas === 0) sinRemoto.push(e);
    else if (e.remotas === 1) unaSola.push(e);
    else borradas.push(e);
  }

  const causas = [];

  if (faltan.length > 0) {
    causas.push({
      codigo: 'REPOS_FALTANTES',
      grave: true,
      repos: faltan,
      detalle: 'no estan en el clon. O el workflow no los clona, o se han renombrado.'
    });
  }

  if (sinRemoto.length > 0) {
    causas.push({
      codigo: 'SIN_REMOTO',
      grave: true,
      repos: sinRemoto.map((e) => e.repo),
      detalle: 'no traen ninguna rama remota: no son clones de nada, o el remoto se ha borrado.'
    });
  }

  if (unaSola.length > 0) {
    causas.push({
      codigo: 'UNA_SOLO_RAMA',
      grave: true,
      repos: unaSola.map((e) => e.repo),
      detalle: unaSola.map((e) => e.repo + ' trae ' + e.remotas + ' de un minimo de '
        + RAMAS_POR_REPO[e.repo]).join(', ')
        + '. Es la firma de un clon con `--depth 1` sin `--no-single-branch`.'
    });
  }

  if (borradas.length > 0) {
    causas.push({
      codigo: 'RAMAS_BORRADAS',
      grave: true,
      repos: borradas.map((e) => e.repo),
      detalle: borradas.map((e) => e.repo + ' trae ' + e.remotas + ' de un minimo de '
        + RAMAS_POR_REPO[e.repo]).join(', ')
        + '. Trae mas de una, luego el clon no es de una sola: se han borrado ramas.'
    });
  }

  if (nuevos.length > 0) {
    causas.push({
      codigo: 'REPOS_NUEVOS',
      grave: false,
      repos: nuevos,
      detalle: 'estan en la suite y no en REPOS_OBLIGATORIOS. Anadirlos a esa lista.'
    });
  }

  return causas;
}
/**
 * El aviso del diagnostico, que es lo que sale en rojo y no el numero solo.
 *
 * `prefijo` es el nombre del guard que lo imprime, y va como parametro porque es
 * el unico que sabe quien esta hablando. Poner aqui el de EOL habria hecho que el
 * guard de `.gitignore` imprimiese «auditar_eol» en su propio log, que es la clase
 * de mentira que hace que un rojo se busque en el fichero equivocado.
 *
 * @param {{codigo: string, grave: boolean, repos: string[], detalle: string}[]} causas
 * @param {string} prefijo
 * @returns {string[]}
 */
export function formateaDiagnostico (causas, prefijo = 'auditar_eol') {
  const lineas = [];

  for (const c of causas) {
    lineas.push(prefijo + ': ' + (c.grave ? '' : 'aviso: ') + c.codigo);
    lineas.push('  ' + c.detalle);
    lineas.push('  Repos: ' + c.repos.join(', ') + '.');
  }

  if (causas.some((c) => c.codigo === 'UNA_SOLO_RAMA')) {
    lineas.push('  Para verlo de otro modo: en el workflow, la linea 97 es el `git clone`');
    lineas.push('  de la suite. Sin `--no-single-branch` se queda con la rama por');
    lineas.push('  defecto de cada repo y las ramas de mas nunca llegan al runner.');
  }

  return lineas;
}
