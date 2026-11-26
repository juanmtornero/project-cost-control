// ============================================================
// PANTALLA "MI PROYECTO": subir el Excel del usuario, comprobarlo
// y, si es correcto, mostrar el panel del proyecto.
// Usa: lector-xlsx.js (leer el archivo), importador.js (comprobar),
// adaptador.js (pasar al formato de los cálculos), kpis.js (calcular)
// y el panel y los formatos de app.js (pintarPanel, eur, pct, esc...).
// ============================================================
(() => {
  const zona = $('mi-zona'), entrada = $('mi-archivo'), salida = $('mi-resultado');
  const intro = $('mi-intro'), barra = $('mi-barra'), panel = $('mi-panel'), compro = $('mi-comprobacion');
  const MAX_MB = 10;
  // Los proyectos se guardan en este navegador (localStorage): nada sale del ordenador del usuario.
  // Desde la v5 puede haber varios, por su nombre: { version, proyectos: { [nombre]: g }, sel: nombre }
  // g = { version, nombre (archivo), cargado, r (resultado del importador), desestimados (métodos quitados) }
  const PROY_KEY = 'controlPresupuestario.misProyectos', VIEJO_KEY = 'controlPresupuestario.miProyecto', VERSION = 1;
  let ALMACEN = { version: 1, proyectos: {}, sel: null };
  let actual = null; // g del proyecto que se está mostrando
  let almacenGuardado = true;

  // Comentarios del Project Lead: el único texto que se escribe en la web (nunca cifras).
  // Se guardan por proyecto (su nombre): { actual: {texto, fecha, corte}, anteriores: [...] }
  const COMENT_KEY = 'controlPresupuestario.comentarios';
  let COMENT = {};
  try { COMENT = JSON.parse(localStorage.getItem(COMENT_KEY)) || {}; } catch (e) { COMENT = {}; }
  const guardarComent = () => { try { localStorage.setItem(COMENT_KEY, JSON.stringify(COMENT)); } catch (e) { /* solo esta visita */ } };
  const comentDe = () => (actual ? COMENT[actual.r.datos.proyecto.nombre] || (COMENT[actual.r.datos.proyecto.nombre] = { actual: null, anteriores: [] }) : null);
  // Historial de cierres (v4): una foto por fecha de corte, por proyecto (su nombre). Cálculos en historial.js
  const HIST_KEY = 'controlPresupuestario.historial';
  let HIST = {};
  try { HIST = JSON.parse(localStorage.getItem(HIST_KEY)) || {}; } catch (e) { HIST = {}; }
  let histGuardado = true; // false si el navegador no deja guardar (se avisa en la tarjeta)
  const guardarHist = () => { try { localStorage.setItem(HIST_KEY, JSON.stringify(HIST)); histGuardado = true; } catch (e) { histGuardado = false; } };
  const fotosDe = nombre => HIST[nombre] || [];
  let avisoHist = ''; // resultado de la última carga de copia (se muestra en la tarjeta)

  // Estado de la caja (no se guarda): editando, borrador, ver anteriores, incluirlos en el PDF
  const UI = { editando: false, borrador: '', verAnteriores: false, incluirAnteriores: false };

  // ---------- Guardar y recuperar ----------
  const gValido = g => g && g.version === VERSION && g.r && g.r.ok && g.r.datos && g.r.datos.proyecto;
  const guardarAlmacen = () => { try { localStorage.setItem(PROY_KEY, JSON.stringify(ALMACEN)); almacenGuardado = true; } catch (e) { almacenGuardado = false; } return almacenGuardado; };
  const nombreDe = g => g.r.datos.proyecto.nombre;
  (function cargarAlmacen() {
    try {
      const a = JSON.parse(localStorage.getItem(PROY_KEY));
      if (a && a.version === 1 && a.proyectos) {
        Object.entries(a.proyectos).forEach(([n, g]) => { if (gValido(g)) ALMACEN.proyectos[n] = g; });
        ALMACEN.sel = ALMACEN.proyectos[a.sel] ? a.sel : Object.keys(ALMACEN.proyectos)[0] || null;
      }
    } catch (e) { /* sin datos guardados */ }
    // Proyecto guardado con una versión anterior (un solo proyecto): se pasa al nuevo formato
    try {
      const g = JSON.parse(localStorage.getItem(VIEJO_KEY));
      if (gValido(g)) {
        if (!ALMACEN.proyectos[nombreDe(g)]) ALMACEN.proyectos[nombreDe(g)] = { ...g, desestimados: DESESTIMADOS['mi-proyecto'] || [] };
        ALMACEN.sel = ALMACEN.sel || nombreDe(g);
        if (guardarAlmacen()) localStorage.removeItem(VIEJO_KEY);
      }
    } catch (e) { /* nada que migrar */ }
  })();
  // Los métodos desmarcados son de cada proyecto; el panel trabaja con DESESTIMADOS['mi-proyecto']
  const cargarDesestimados = g => { if (g && (g.desestimados || []).length) DESESTIMADOS['mi-proyecto'] = g.desestimados.slice(); else delete DESESTIMADOS['mi-proyecto']; guardarAjustes(); };
  const resetUI = () => Object.assign(UI, { editando: false, borrador: '', verAnteriores: false, incluirAnteriores: false });
  function seleccionar(nombre) {
    const g = ALMACEN.proyectos[nombre] || null;
    if (g !== actual) { resetUI(); avisoHist = ''; }
    actual = g; ALMACEN.sel = g ? nombre : null; guardarAlmacen();
    cargarDesestimados(g);
  }
  const avisarCambios = () => { if (window.repintarMiCartera) window.repintarMiCartera(); };

  // Cartera de ejemplo: se carga sola la primera vez. Sus proyectos llevan ejemplo: true (o, si se guardaron
  // con una versión anterior, «(cartera de ejemplo)» / «(proyecto de ejemplo)» en el nombre del archivo).
  // Al subir un Excel propio, el ejemplo se quita. Tras «Borrar mis datos» ya no se vuelve a cargar solo.
  const SIN_EJEMPLO_KEY = 'controlPresupuestario.sinEjemplo';
  const esEjemplo = g => !!g.ejemplo || /\((cartera|proyecto) de ejemplo\)$/.test(g.nombre);
  function quitarEjemplos() {
    const fuera = Object.keys(ALMACEN.proyectos).filter(n => esEjemplo(ALMACEN.proyectos[n]));
    fuera.forEach(n => { delete ALMACEN.proyectos[n]; delete HIST[n]; delete COMENT[n]; });
    if (fuera.length) {
      guardarHist(); guardarComent(); guardarAlmacen();
      if (actual && !ALMACEN.proyectos[nombreDe(actual)]) { actual = null; ALMACEN.sel = null; resetUI(); delete DESESTIMADOS['mi-proyecto']; guardarAjustes(); }
    }
    return fuera.length;
  }

  const borrar = () => {
    const gs = Object.values(ALMACEN.proyectos), eraEjemplo = gs.length > 0 && gs.every(esEjemplo);
    try { localStorage.setItem(SIN_EJEMPLO_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
    try { localStorage.removeItem(PROY_KEY); localStorage.removeItem(VIEJO_KEY); localStorage.removeItem(COMENT_KEY); localStorage.removeItem(HIST_KEY); } catch (e) { /* nada que borrar */ }
    ALMACEN = { version: 1, proyectos: {}, sel: null };
    COMENT = {}; HIST = {}; avisoHist = ''; resetUI();
    delete DESESTIMADOS['mi-proyecto']; guardarAjustes();
    actual = null;
    barra.hidden = true; intro.hidden = false;
    panel.innerHTML = compro.innerHTML = '';
    salida.innerHTML = eraEjemplo ? `<div class="msg nota">Se ha quitado la cartera de ejemplo. Sube tu Excel para analizar tu proyecto, o vuelve a ver el ejemplo con el botón de arriba.</div>`
      : `<div class="msg nota">Se han borrado todos los datos guardados en este navegador: los proyectos, los comentarios y el historial de cortes. Si descargaste una copia del historial, puedes cargarla después de volver a subir el Excel.</div>`;
    avisarCambios();
  };
  // Quitar un proyecto (con su historial y sus comentarios)
  function quitarProyecto(nombre) {
    delete ALMACEN.proyectos[nombre]; delete HIST[nombre]; delete COMENT[nombre];
    guardarHist(); guardarComent();
    const resto = Object.keys(ALMACEN.proyectos).sort((a, b) => a.localeCompare(b, 'es'));
    seleccionar(resto[0] || null);
    if (actual) { mostrarProyecto(actual, true); salida.innerHTML = `<div class="msg nota">Se ha quitado «${esc(nombre)}», con su historial y sus comentarios.</div>`; }
    else { barra.hidden = true; intro.hidden = false; panel.innerHTML = compro.innerHTML = ''; salida.innerHTML = `<div class="msg nota">Se ha quitado «${esc(nombre)}», con su historial y sus comentarios. No queda ningún proyecto guardado.</div>`; }
    avisarCambios();
  }

  // Cálculo de un proyecto guardado y su foto en el historial (se actualiza si cambian los métodos activos)
  function calcularGuardado(g, desestimados) {
    const d = g.r.datos, { estado, notas } = estadoYNotas(d);
    const p = proyectoDesdeExcel(d, estado);
    const k = calcularProyecto(p, d.proyecto.corte, desestimados || g.desestimados || []);
    const nombre = d.proyecto.nombre, foto = fotoDesde(d, k, g.nombre);
    const previa = fotosDe(nombre).find(f => f.corte === foto.corte);
    if (!previa || !mismasCifras(previa, foto)) { HIST[nombre] = ponerFoto(fotosDe(nombre), foto); guardarHist(); }
    return { d, p, k, estado, notas, foto, fotos: fotosDe(nombre) };
  }

  // Integra archivos correctos en el almacén. items: [{ archivo, r }]. Por cada proyecto (su nombre):
  // corte más reciente que el guardado = pasa a ser el actual (el anterior queda en el historial);
  // mismo corte = sustituye al guardado; corte anterior = solo se añade al historial.
  // Devuelve una fila por archivo: { archivo, nombre, corte, estado, corteGuardado }
  function integrar(items) {
    const orden = items.slice().sort((a, b) => (a.r.datos.proyecto.corte < b.r.datos.proyecto.corte ? -1 : a.r.datos.proyecto.corte > b.r.datos.proyecto.corte ? 1 : 0));
    const vistos = new Map(), res = [];
    for (const it of orden) {
      const d = it.r.datos, nombre = d.proyecto.nombre, corte = d.proyecto.corte, clave = nombre + '|' + corte;
      const repetido = vistos.get(clave); vistos.set(clave, it.archivo);
      const ex = ALMACEN.proyectos[nombre];
      const g = { version: VERSION, nombre: it.archivo, cargado: new Date().toISOString(), r: it.r, desestimados: [], ...(it.ejemplo ? { ejemplo: true } : {}) };
      let estado, corteGuardado = ex ? ex.r.datos.proyecto.corte : null;
      if (!ex) { ALMACEN.proyectos[nombre] = g; estado = 'nuevo'; }
      else if (corte > corteGuardado) {
        calcularGuardado(ex); // el corte que se va queda en el historial
        // Nueva fecha de corte: el comentario actual pasa a "anteriores" (el más reciente primero)
        const c = COMENT[nombre];
        if (c && c.actual && c.actual.corte !== corte) { c.anteriores.unshift(c.actual); c.actual = null; guardarComent(); }
        ALMACEN.proyectos[nombre] = g; estado = 'nuevo-corte';
      } else if (corte === corteGuardado) { g.desestimados = (ex.desestimados || []).slice(); ALMACEN.proyectos[nombre] = g; estado = repetido ? 'repetido' : 'mismo-corte'; }
      else { calcularGuardado(g, []); estado = 'historial'; }
      if (estado !== 'historial') calcularGuardado(ALMACEN.proyectos[nombre]);
      if (actual && nombreDe(actual) === nombre && estado !== 'historial') { actual = ALMACEN.proyectos[nombre]; if (estado === 'nuevo-corte') { resetUI(); cargarDesestimados(actual); } }
      res.push({ archivo: it.archivo, nombre, corte, estado, corteGuardado, repiteA: repetido || null });
    }
    guardarAlmacen();
    return res;
  }

  // ---------- Entrada: botón, arrastrar y soltar, ejemplo ----------
  entrada.addEventListener('change', () => { if (entrada.files[0]) procesarArchivo(entrada.files[0]); entrada.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove('encima'); }));
  zona.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) procesarArchivo(f); });
  // Desde aquí también se puede cargar la cartera de ejemplo (la prepara mi-cartera.js); se queda en esta pestaña
  $('mi-ejemplo').addEventListener('click', () => { if (window.cargarCarteraEjemplo) window.cargarCarteraEjemplo(); });

  // El ejemplo trae dos cortes anteriores simulados (agosto y septiembre), para que se vea la evolución.
  // Se construyen con el mismo Excel: el real hasta ese corte, menos avance y una previsión del Project Lead
  // que luego se revisó al alza (lo que se gastó después del corte, previsto al 80 %). Solo si no existen ya
  function historialEjemplo(hojas) {
    const cortes = [[46265, 45], [46295, 55]]; // 31/08/2026 y 30/09/2026 (fecha de Excel)
    cortes.forEach(([corte, avance]) => {
      const h = JSON.parse(JSON.stringify(hojas));
      h.Proyecto[7][1] = corte; h.Proyecto[8][1] = avance;
      const despues = h.Real.filter((r, i) => i > 2 && r && typeof r[0] === 'number' && r[0] > corte);
      h.Real = h.Real.filter(r => !despues.includes(r));
      h['Previsión'].forEach((r, i) => {
        if (i < 3 || !r || !r[0]) return;
        const suyas = despues.filter(x => x[1] === r[0]);
        if (typeof r[1] === 'number') r[1] = Math.round(r[1] + 0.8 * suyas.reduce((s, x) => s + (x[2] || 0), 0));
        if (typeof r[2] === 'number') r[2] = Math.round(r[2] + 0.8 * suyas.reduce((s, x) => s + (x[3] || 0), 0));
      });
      const r = importarProyecto(h);
      if (!r.ok) return;
      const d = r.datos, nombre = d.proyecto.nombre;
      if (fotosDe(nombre).some(f => f.corte === d.proyecto.corte)) return;
      const k = calcularProyecto(proyectoDesdeExcel(d, estadoYNotas(d).estado), d.proyecto.corte, []);
      HIST[nombre] = ponerFoto(fotosDe(nombre), { ...fotoDesde(d, k, 'ejemplo-ERP-01.xlsx (corte simulado)'), simulado: true });
    });
    guardarHist();
  }

  function procesarArchivo(f) {
    if (!/\.xlsx$/i.test(f.name)) return mostrarFallo(f.name, ['El archivo debe ser un Excel con extensión .xlsx. En Google Sheets: Archivo › Descargar › Microsoft Excel (.xlsx).']);
    if (f.size > MAX_MB * 1048576) return mostrarFallo(f.name, [`El archivo pesa más de ${MAX_MB} MB. La plantilla de un proyecto suele pesar menos de 1 MB: revisa que sea el archivo correcto.`]);
    f.arrayBuffer().then(b => procesar(b, f.name));
  }

  async function procesar(buffer, nombre, esEjemplo) {
    salida.innerHTML = `<div class="card"><p class="sub" style="margin:0">Leyendo ${esc(nombre)}…</p></div>`;
    let hojas;
    try { hojas = await leerXlsx(buffer); }
    catch (e) { return mostrarFallo(nombre, [e.message]); }
    const r = importarProyecto(hojas);
    if (r.estructura.length) return mostrarFallo(nombre, r.estructura);
    if (!r.ok) return mostrarErrores(r, nombre);
    if (esEjemplo) historialEjemplo(hojas);
    const sinEjemplo = esEjemplo ? 0 : quitarEjemplos();
    // Archivo correcto: se integra con lo guardado y se muestra su proyecto. Los métodos desmarcados no se
    // arrastran a otra fecha de corte; si se vuelve a subir el mismo corte, se mantienen
    const [f] = integrar([{ archivo: nombre, r }]);
    seleccionar(f.nombre); avisoHist = '';
    mostrarProyecto(actual, true);
    if (sinEjemplo) salida.innerHTML = `<div class="msg nota">Se ha quitado la cartera de ejemplo: a partir de ahora solo ves tus proyectos.</div>`;
    if (f.estado === 'historial') salida.innerHTML = `<div class="msg nota"><b>Este Excel es del corte del ${fecha(f.corte)}, anterior al que ya tenías guardado (${fecha(f.corteGuardado)}).</b> Se ha añadido al historial del proyecto, que sigue mostrando el corte más reciente. Lo ves en la evolución de la estimación.</div>`;
    avisarCambios();
  }

  // Aviso de que el proyecto guardado sigue ahí cuando el archivo nuevo no se puede usar
  const notaGuardado = () => actual
    ? (Object.keys(ALMACEN.proyectos).length > 1
      ? `<p class="sub" style="margin:8px 0 0">Tus ${Object.keys(ALMACEN.proyectos).length} proyectos guardados siguen ahí: no se ha sustituido ninguno. <button type="button" class="boton" id="mi-volver">Volver a «${esc(nombreDe(actual))}»</button></p>`
      : `<p class="sub" style="margin:8px 0 0">Tu proyecto anterior («${esc(nombreDe(actual))}») sigue guardado: no se ha sustituido. <button type="button" class="boton" id="mi-volver">Volver a verlo</button></p>`) : '';
  const prepararFallo = () => { panel.innerHTML = compro.innerHTML = ''; barra.hidden = true; intro.hidden = false; };
  salida.addEventListener('click', e => { if (e.target.id === 'mi-volver' && actual) mostrarProyecto(actual, true); });
  barra.addEventListener('click', e => {
    if (!(e.target.dataset && e.target.dataset.ir)) return;
    e.preventDefault(); document.querySelector(`nav.tabs button[data-vista="${e.target.dataset.ir}"]`).click(); window.scrollTo({ top: 0 });
  });

  // ---------- Archivo que no es la plantilla ----------
  function mostrarFallo(nombre, mensajes) {
    prepararFallo();
    salida.innerHTML = `<div class="card">
      <h2>No se puede leer «${esc(nombre)}»</h2>
      ${mensajes.map(m => `<div class="msg rojo">${esc(m)}</div>`).join('')}
      <p class="sub" style="margin:8px 0 0">La herramienta solo lee la plantilla de control presupuestario. Descárgala, rellénala y vuelve a subirla.</p>
      ${notaGuardado()}</div>`;
    salida.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Resultado de las comprobaciones ----------
  const filasTxt = filas => {
    // Comprobaciones generales (sin fila concreta): solo el detalle
    if (filas.length === 1 && filas[0].fila === null) return filas[0].det ? `<span class="det">${esc(filas[0].det)}</span>` : '';
    const lista = filas.slice(0, 12).map(f => `${f.fila}${f.det ? ` <span class="det">(${esc(f.det)})</span>` : ''}`).join(', ');
    return (filas.length === 1 ? 'Fila ' : 'Filas ') + lista + (filas.length > 12 ? ` y ${filas.length - 12} más` : '');
  };
  const fichaCheck = c => `<tr>
      <td>${esc(c.pestana)}</td>
      <td>${esc(c.que)}<div class="proy"><span>${filasTxt(c.filas)}</span></div></td>
      <td>${c.tipo === 'Error' ? semaforo('rojo').replace('Por encima', 'Error') : semaforo('ambar').replace('Algo por encima', 'Aviso')}</td>
      <td>${esc(c.hacer)}</td></tr>`;

  // Tarjeta con el resultado de las comprobaciones (con errores, sola; si el archivo es correcto, plegada bajo el panel)
  function tarjetaChecks(r, nombre) {
    const nE = r.errores.length, nA = r.avisos.length, total = r.comprobaciones.length;
    const veredicto = r.ok
      ? `<div class="msg verde"><b>✓ Archivo correcto.</b> No tiene errores${nA ? ` y tiene ${nA} aviso${nA > 1 ? 's' : ''} que conviene revisar` : ''}.</div>`
      : `<div class="msg rojo"><b>✕ No se puede analizar el proyecto:</b> hay ${nE} tipo${nE > 1 ? 's' : ''} de error. Con datos incorrectos los indicadores no serían fiables. Corrige el Excel (la pestaña Comprobación de la plantilla te ayuda a encontrarlos) y vuelve a subirlo.</div>`;
    const problemas = [...r.errores, ...r.avisos];
    const okLista = r.comprobaciones.filter(c => !c.filas.length);
    return `<div class="card">
        <h2>Comprobación de «${esc(nombre)}»</h2>
        <p class="sub">${total - problemas.length} de ${total} comprobaciones correctas · ${nE} con error · ${nA} con aviso</p>
        ${veredicto}
        ${problemas.length ? `<div class="tabla-wrap"><table class="checks">
          <thead><tr><th>Pestaña</th><th>Qué se ha encontrado</th><th>Nivel</th><th>Qué hacer</th></tr></thead>
          <tbody>${problemas.map(fichaCheck).join('')}</tbody></table></div>` : ''}
        <details><summary>Ver las ${okLista.length} comprobaciones correctas</summary>
          <ul class="sub lista-ok">${okLista.map(c => `<li><b>${esc(c.pestana)}</b> · ${esc(c.que)}</li>`).join('')}</ul></details>
      </div>`;
  }

  function mostrarErrores(r, nombre) {
    prepararFallo();
    salida.innerHTML = tarjetaChecks(r, nombre) + (actual ? `<div class="card">${notaGuardado()}</div>` : '');
    salida.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Estado del proyecto ----------
  // Se deduce de los datos (decisión del 24/11/2026): cerrado si el avance es 100 % y la fecha de corte
  // es igual o posterior a la de fin. Siempre se explica en pantalla por qué.
  function estadoYNotas(d) {
    const pr = d.proyecto, completo = pr.avance >= 1, finPasado = pr.corte >= pr.fin;
    const notas = [];
    if (completo && finPasado) notas.push(['nota', `Se considera <b>cerrado</b> porque el avance es 100 % y la fecha de corte (${fecha(pr.corte)}) es igual o posterior a la de fin (${fecha(pr.fin)}). Las cifras son reales, no estimaciones.`]);
    else if (completo) notas.push(['nota', `El avance es 100 %, pero la fecha de fin (${fecha(pr.fin)}) es posterior a la de corte: se trata como <b>en curso</b>. Si el proyecto ya terminó, pon como fecha de corte el último día del mes de fin o uno posterior.`]);
    else if (finPasado) notas.push(['nota', `La fecha de fin (${fecha(pr.fin)}) ya ha pasado, pero el avance es ${pct(pr.avance * 100)}: se trata como <b>en curso</b> (proyecto alargado).`]);
    return { estado: completo && finPasado ? 'Cerrado' : 'En curso', notas };
  }

  // ---------- Panel del proyecto ----------
  function pintarProyecto() {
    if (!actual) return;
    // Los métodos desmarcados en el panel se guardan con el proyecto
    const des = DESESTIMADOS['mi-proyecto'] || [];
    if (JSON.stringify(des) !== JSON.stringify(actual.desestimados || [])) { actual.desestimados = des.slice(); guardarAlmacen(); avisarCambios(); }
    const { d, p, k, notas, foto, fotos } = calcularGuardado(actual, des);
    avisosHistorial(fotos, foto).forEach(n => notas.push(n));
    const ant = fotoAnterior(fotos, foto.corte);
    if (ant) {
      const dif = foto.EAC - ant.EAC, que = foto.cerrado && !ant.cerrado ? 'el coste final queda' : foto.cerrado ? 'el coste final' : 'la estimación central';
      notas.push(['nota', `Desde el corte del ${fecha(ant.corte)}, ${que} ${Math.abs(dif) <= 0.5 ? (foto.cerrado && !ant.cerrado ? 'igual que la última estimación' : 'no cambia') : `${foto.cerrado && !ant.cerrado ? (dif > 0 ? 'por encima de' : 'por debajo de') + ' la última estimación en' : dif > 0 ? 'sube' : 'baja'} ${eur(Math.abs(dif))}`}. <a href="#mi-evolucion">Ver qué ha cambiado</a>`]);
    }
    const notasPdf = notas.slice(); // en el PDF no va la nota que remite a la comprobación (los avisos salen al pie)
    const nA = actual.r.avisos.length;
    if (nA) notas.push(['ambar', `El archivo tiene ${nA} aviso${nA > 1 ? 's' : ''}: el análisis se hace igual, pero conviene revisarlo${nA > 1 ? 's' : ''} en la <a href="#mi-comprobacion">comprobación del archivo</a>, más abajo.`]);
    const evol = htmlEvolucion(fotos, d.proyecto.corte).replace('</h2>', '</h2>' + avisoHist
      + (histGuardado ? '' : '<div class="msg ambar">Este navegador no deja guardar el historial: se perderá al cerrar la página. Descarga una copia.</div>'));
    pintarPanel(panel, p, k, { corte: d.proyecto.corte, mostrarCorte: true, notas, htmlTrasMetodos: htmlComentarios(d.proyecto.corte), htmlTrasCurva: evol });
    graficoEvolucion(fotos, panel.querySelector('.grafico-evol'), d.proyecto.corte);
    const ta = panel.querySelector('#com-texto');
    if (ta) { ta.value = UI.borrador; ta.addEventListener('input', () => (UI.borrador = ta.value)); }
    return { p, k, d, fotos, notasPdf };
  }

  // ---------- Comentarios del Project Lead ----------
  function htmlComentarios(corte) {
    const c = comentDe(), n = c.anteriores.length;
    const verAnt = n ? `<button type="button" class="boton" data-com="anteriores">${UI.verAnteriores ? 'Ocultar' : 'Comentarios'} anteriores (${n})</button>` : '';
    let cuerpo;
    if (UI.editando) cuerpo = `<textarea id="com-texto" maxlength="1500" placeholder="Por ejemplo: qué método consideras más fiable y por qué, a qué se debe la desviación y qué medidas hay en marcha."></textarea>
      <div class="acciones"><button type="button" class="boton" data-com="guardar">Guardar comentario</button><button type="button" class="boton" data-com="cancelar">Cancelar</button>
      <span class="det">Máximo 1.500 caracteres. Se guarda en este navegador y sale en el resumen PDF.</span></div>`;
    else if (c.actual) cuerpo = `<blockquote>${esc(c.actual.texto)}</blockquote>
      <p class="sub" style="margin:6px 0 0">Escrito el ${fecha(hoyLocal(new Date(c.actual.fecha)))} · corte ${fecha(c.actual.corte)}</p>
      <div class="acciones"><button type="button" class="boton" data-com="editar">Editar comentario</button><button type="button" class="boton" data-com="borrar">Borrar comentario</button>${verAnt}</div>`;
    else cuerpo = `<p class="sub" style="margin:0">Opcional: explica qué método consideras más fiable y el motivo de la desviación. Sale en el resumen PDF.</p>
      <div class="acciones"><button type="button" class="boton" data-com="agregar">Agregar comentario</button>${verAnt}</div>`;
    if (UI.editando && n) cuerpo += `<div class="acciones">${verAnt}</div>`;
    const anteriores = UI.verAnteriores && n ? c.anteriores.map(a => `<div class="anterior"><span class="det">Corte ${fecha(a.corte)} · escrito el ${fecha(hoyLocal(new Date(a.fecha)))}</span><p>${esc(a.texto)}</p></div>`).join('') : '';
    const casilla = n ? `<div class="acciones"><label class="casilla"><input type="checkbox" data-com="incluir" ${UI.incluirAnteriores ? 'checked' : ''}> Incluir los comentarios anteriores en el resumen PDF</label></div>` : '';
    return `<div class="card comentarios"><h2>Comentario del Project Lead</h2>${cuerpo}${anteriores}${casilla}</div>`;
  }
  panel.addEventListener('click', e => {
    const accion = e.target.dataset && e.target.dataset.com;
    if (!accion || accion === 'incluir') return;
    const c = comentDe();
    if (accion === 'agregar') Object.assign(UI, { editando: true, borrador: '' });
    if (accion === 'editar') Object.assign(UI, { editando: true, borrador: c.actual.texto });
    if (accion === 'cancelar') Object.assign(UI, { editando: false, borrador: '' });
    if (accion === 'anteriores') UI.verAnteriores = !UI.verAnteriores;
    if (accion === 'borrar') { c.actual = null; guardarComent(); }
    if (accion === 'guardar') {
      const t = UI.borrador.trim();
      c.actual = t ? { texto: t, fecha: new Date().toISOString(), corte: actual.r.datos.proyecto.corte } : null;
      guardarComent(); Object.assign(UI, { editando: false, borrador: '' });
    }
    pintarProyecto();
    const caja = panel.querySelector('.comentarios'); if (caja) caja.scrollIntoView({ block: 'nearest' });
  });
  panel.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.com === 'incluir') UI.incluirAnteriores = e.target.checked; });

  // ---------- Historial: quitar un corte, descargar y cargar una copia ----------
  const entradaCopia = document.createElement('input');
  entradaCopia.type = 'file'; entradaCopia.accept = '.json,application/json'; entradaCopia.hidden = true;
  document.body.appendChild(entradaCopia);
  const nombreProyecto = () => actual.r.datos.proyecto.nombre;
  panel.addEventListener('click', e => {
    const accion = e.target.dataset && e.target.dataset.hist;
    if (!accion || !actual) return;
    if (accion === 'quitar') {
      // Dos pasos, como "Borrar mis datos"
      if (!e.target.dataset.confirmar) {
        e.target.dataset.confirmar = '1'; e.target.textContent = '¿Seguro?';
        return setTimeout(() => { if (e.target.isConnected) { delete e.target.dataset.confirmar; e.target.textContent = 'Quitar'; } }, 5000);
      }
      HIST[nombreProyecto()] = fotosDe(nombreProyecto()).filter(f => f.corte !== e.target.dataset.corte); guardarHist();
      avisoHist = `<div class="msg nota">Se ha quitado del historial el corte del ${fecha(e.target.dataset.corte)}.</div>`;
      pintarProyecto(); const t = panel.querySelector('.evol'); if (t) t.scrollIntoView({ block: 'nearest' });
    }
    if (accion === 'descargar') {
      const nombre = nombreProyecto();
      guardarArchivo(`historial-${nombreArchivo(nombre)}-${hoyLocal()}.json`, JSON.stringify(copiaDe(nombre, fotosDe(nombre), COMENT[nombre]), null, 1), 'application/json')
        .then(r => { if (r !== 'ok') { avisoHist = `<div class="msg ${r === 'no' ? 'nota' : 'rojo'}">${r === 'no' ? 'No se ha descargado la copia.' : 'Este navegador no ha dejado descargar la copia.'}</div>`; pintarProyecto(); } });
    }
    if (accion === 'cargar') entradaCopia.click();
  });
  entradaCopia.addEventListener('change', async () => {
    const f = entradaCopia.files[0]; entradaCopia.value = '';
    if (!f || !actual) return;
    let res;
    try { res = f.size > 5 * 1048576 ? { ok: false, error: 'El archivo pesa demasiado para ser una copia del historial.' } : validarCopia(JSON.parse(await f.text())); }
    catch (err) { res = { ok: false, error: 'El archivo no se puede leer: no es una copia del historial de esta herramienta.' }; }
    if (!res.ok) avisoHist = `<div class="msg rojo">${esc(res.error)}</div>`;
    else {
      const c = res.copia, u = unirCopia(fotosDe(c.proyecto), c);
      HIST[c.proyecto] = u.fotos; guardarHist();
      let com = '';
      if (c.comentarios && (c.comentarios.actual || (c.comentarios.anteriores || []).length)) {
        const tengo = COMENT[c.proyecto];
        if (!tengo || (!tengo.actual && !tengo.anteriores.length)) { COMENT[c.proyecto] = c.comentarios; guardarComent(); com = ' También se han cargado sus comentarios.'; }
        else com = ' Los comentarios de la copia no se han cargado porque en este navegador ya hay comentarios de este proyecto.';
      }
      const otro = c.proyecto !== nombreProyecto() ? ` La copia es del proyecto «${esc(c.proyecto)}», distinto del que ves: se verá cuando subas el Excel de ese proyecto.` : '';
      avisoHist = `<div class="msg ${u.anadidas ? 'verde' : 'nota'}">Copia cargada: ${u.anadidas === 1 ? 'se ha añadido 1 corte' : `se han añadido ${u.anadidas} cortes`}${u.repetidas ? ` (${u.repetidas} ya ${u.repetidas === 1 ? 'estaba' : 'estaban'} y se ${u.repetidas === 1 ? 'ha' : 'han'} dejado como en este navegador)` : ''}.${otro}${com}</div>`;
    }
    pintarProyecto(); const t = panel.querySelector('.evol'); if (t) t.scrollIntoView({ block: 'nearest' });
  });

  // ---------- Descargar archivos ----------
  // Nombre de archivo a partir del nombre del proyecto (sin caracteres raros)
  // Aviso junto a los botones de la barra (por ejemplo, si no se ha podido abrir la ventana de imprimir)
  const avisoBarra = html => { let a = barra.querySelector('.aviso-barra'); if (!a) { a = document.createElement('div'); a.className = 'aviso-barra'; barra.appendChild(a); } a.innerHTML = html; };

  // ---------- Resumen en PDF ----------
  function descargarResumen() {
    const { p, k, d, fotos, notasPdf } = pintarProyecto();
    const c = comentDe();
    prepararResumen(p, k, { corte: d.proyecto.corte, notas: notasPdf }, {
      fotos,
      archivo: actual.nombre, avisos: actual.r.avisos,
      comentario: c.actual, anteriores: UI.incluirAnteriores ? c.anteriores : []
    });
    const pr = d.proyecto;
    imprimirHoja(`resumen-${nombreArchivo(pr.nombre)}-${pr.corte}`, `Resumen · ${pr.nombre} · ${fecha(pr.corte)}`, avisoBarra);
  }
  // Se llama al cambiar de pestaña, de tamaño o de métodos. Solo dibuja si la pestaña se ve,
  // para que el gráfico tome el ancho real
  window.repintarMiProyecto = () => { if (actual && !$('v-mi-proyecto').hidden) pintarProyecto(); };

  // Botón de dos pasos, sin ventanas emergentes: el primer clic pide confirmación
  const dosPasos = (boton, texto, accion) => boton.addEventListener('click', e => {
    if (e.target.dataset.confirmar) return accion();
    const original = e.target.textContent;
    e.target.dataset.confirmar = '1'; e.target.textContent = texto;
    setTimeout(() => { if (e.target.isConnected) { delete e.target.dataset.confirmar; e.target.textContent = original; } }, 5000);
  });

  function mostrarProyecto(g, desplazar) {
    actual = g;
    intro.hidden = true; barra.hidden = false; salida.innerHTML = '';
    const nombres = Object.keys(ALMACEN.proyectos).sort((a, b) => a.localeCompare(b, 'es')), varios = nombres.length > 1;
    const ej = esEjemplo(g), soloEj = Object.values(ALMACEN.proyectos).every(esEjemplo);
    barra.innerHTML = `
      <p>${varios ? `<label class="sel-mio">Proyecto <select id="mi-sel">${nombres.map(n => `<option value="${esc(n)}" ${n === nombreDe(g) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <span class="sub">${nombres.length} proyectos guardados · <a href="#mi-cartera" data-ir="mi-cartera">ver la cartera</a></span><br>` : ''}
        ${ej ? `<b>Proyecto de ejemplo</b><br><span class="sub">Inventado, de la cartera de ejemplo de una consultora ficticia. Para analizar los tuyos, sube tus Excel: el ejemplo se quita solo.</span></p>`
        : `<b>${esc(g.nombre)}</b><br><span class="sub">Cargado el ${fecha(hoyLocal(new Date(g.cargado)))} ·
        ${almacenGuardado ? 'guardado en este navegador, no hace falta volver a subirlo' : 'no se ha podido guardar en este navegador: se perderá al cerrar la página'}</span></p>`}
      <div class="acciones"><button type="button" class="boton" id="mi-pdf">Descargar resumen (PDF)</button>
        <button type="button" class="boton" id="mi-otro">${soloEj ? 'Subir mi Excel' : 'Subir otro archivo'}</button>
        ${varios && !soloEj ? '<button type="button" class="boton" id="mi-quitar">Quitar este proyecto</button>' : ''}
        <button type="button" class="boton" id="mi-borrar">${soloEj ? 'Quitar el ejemplo' : 'Borrar mis datos'}</button></div>`;
    $('mi-pdf').addEventListener('click', descargarResumen);
    if (varios) {
      if ($('mi-quitar')) dosPasos($('mi-quitar'), '¿Seguro? Se quita con su historial y comentarios: pulsa otra vez', () => quitarProyecto(nombreDe(actual)));
      $('mi-sel').addEventListener('change', e => { seleccionar(e.target.value); mostrarProyecto(actual, false); });
    }
    $('mi-otro').addEventListener('click', () => { intro.hidden = false; intro.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    if (soloEj) $('mi-borrar').addEventListener('click', borrar);
    else dosPasos($('mi-borrar'), varios ? '¿Seguro? Se borran todos los proyectos, comentarios e historial: pulsa otra vez' : '¿Seguro? También se borran comentarios e historial: pulsa otra vez', borrar);
    const nA = g.r.avisos.length, total = g.r.comprobaciones.length;
    compro.innerHTML = `<details class="card" id="mi-detalle-archivo"><summary><b>Comprobación del archivo y datos leídos</b>
        <span class="det">· ${total - nA} de ${total} correctas${nA ? ` · ${nA} con aviso` : ''}</span></summary>
      ${tarjetaChecks(g.r, g.nombre)}${resumen(g.r.resumen)}</details>`;
    window.repintarMiProyecto(); // si la pestaña está oculta, se dibuja al abrirla
    if (desplazar) barra.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // El enlace a la evolución lleva a su tarjeta
  document.addEventListener('click', e => {
    if (!(e.target.matches && e.target.matches('a[href="#mi-evolucion"]'))) return;
    e.preventDefault();
    const t = panel.querySelector('.evol'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // El enlace a la comprobación abre el desplegable
  document.addEventListener('click', e => {
    if (!(e.target.matches && e.target.matches('a[href="#mi-comprobacion"]'))) return;
    e.preventDefault();
    const det = $('mi-detalle-archivo');
    if (det) { det.open = true; det.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  // ---------- Resumen de lo leído ----------
  function resumen(s) {
    const mes = ym => mesTxt(ym);
    const f = d => fecha(d);
    const n = (x, uno, varios) => `${x} ${x === 1 ? uno : varios}`;
    return `
      <div class="card">
        <h2>Lo que la herramienta ha leído</h2>
        <p class="sub">Compáralo con tu Excel. Si algo no coincide, revisa que el archivo use la plantilla sin columnas movidas.</p>
        <dl class="ficha">
          <dt>Proyecto</dt><dd><b>${esc(s.nombre)}</b></dd>
          <dt>Cliente</dt><dd>${esc(s.cliente) || '—'}</dd>
          <dt>Project Lead</dt><dd>${esc(s.projectLead) || '—'}</dd>
          <dt>Periodo</dt><dd>${f(s.inicio)} – ${f(s.fin)}</dd>
          <dt>Fecha de corte</dt><dd>${f(s.corte)} <span class="det">(cuentan los datos reales hasta ${mes(s.corte.slice(0, 7))}, mes incluido)</span></dd>
          <dt>Avance informado</dt><dd>${pct(s.avance * 100)}</dd>
        </dl>
      </div>
      <div class="tiles">
        ${tile('Presupuesto', eur(s.BAC), `${n(s.partidas, 'partida', 'partidas')}: ${s.partidasHoras} de horas y ${s.partidasGasto} de gasto`, 'Suma de horas × tarifa y de los importes de gasto de la pestaña Presupuesto')}
        ${tile('Coste real a la fecha de corte', eur(s.AC), s.nMesesReal ? `${n(s.filasReal, 'fila', 'filas')} · ${n(s.nMesesReal, 'mes', 'meses')} (${mes(s.primerMes)} – ${mes(s.ultimoMes)})` : 'Sin gasto real hasta la fecha de corte', 'Horas reales × tarifa + gastos reales, hasta la fecha de corte')}
        ${tile('Previsión del Project Lead', s.previsionPendiente === null ? 'No informada' : eur(s.previsionPendiente),
          s.previsionPendiente === null ? 'El método «Previsión del Project Lead» no se calcula' : `pendiente de gastar · ${eur(s.previsionComprometida)} ya comprometido`, 'Pestaña Previsión: lo que falta por gastar en cada partida')}
        ${tile('Plan mensual', s.planTotal === null ? 'No informado' : eur(s.planTotal),
          s.planTotal === null ? 'Sin línea base: no se calculan el SPI ni el método «CPI × SPI»' : `${n(s.planMeses, 'mes', 'meses')} de línea base`, 'Pestaña Plan mensual: cuánto se pensaba gastar cada mes')}
      </div>
      ${s.filasFueraCorte ? `<div class="msg ambar">${s.filasFueraCorte} fila${s.filasFueraCorte > 1 ? 's' : ''} de Real ${s.filasFueraCorte > 1 ? 'son' : 'es'} posterior${s.filasFueraCorte > 1 ? 'es' : ''} a la fecha de corte y no se ${s.filasFueraCorte > 1 ? 'cuentan' : 'cuenta'}.</div>` : ''}`;
  }

  // ---------- Para la pestaña "Mi cartera" (mi-cartera.js) ----------
  window.misProyectos = {
    // Todos los proyectos guardados, calculados con sus métodos activos. p.id = nombre del proyecto
    lista: () => Object.values(ALMACEN.proyectos).map(g => {
      const c = calcularGuardado(g);
      return { g, nombre: nombreDe(g), p: { ...c.p, id: nombreDe(g), corteISO: c.d.proyecto.corte }, k: c.k, d: c.d, fotos: c.fotos, foto: c.foto };
    }),
    // Lee y comprueba varios archivos; integra los correctos. Devuelve una fila por archivo
    procesarArchivos: async archivos => {
      const filas = [], buenos = [];
      for (const f of archivos) {
        if (!/\.xlsx$/i.test(f.name)) { filas.push({ archivo: f.name, fallo: ['No es un Excel .xlsx.'] }); continue; }
        if (f.size > MAX_MB * 1048576) { filas.push({ archivo: f.name, fallo: [`Pesa más de ${MAX_MB} MB.`] }); continue; }
        try {
          const h = await leerXlsx(await f.arrayBuffer()), r = importarProyecto(h);
          // Nombre tal como está en el Excel, para identificar en el informe los archivos con errores
          let nom = '';
          try { const v = hoja(h, 'Proyecto')[2][1]; nom = typeof v === 'string' ? v.trim() : ''; } catch (e) { /* sin nombre */ }
          if (r.estructura.length) filas.push({ archivo: f.name, fallo: r.estructura, nombre: nom });
          else if (!r.ok) filas.push({ archivo: f.name, r, nombre: nom });
          else buenos.push({ archivo: f.name, r });
        } catch (e) { filas.push({ archivo: f.name, fallo: [e.message] }); }
      }
      const sinEjemplo = buenos.length ? quitarEjemplos() : 0;
      const integrados = integrar(buenos);
      integrados.forEach(x => { x.r = buenos.find(b => b.archivo === x.archivo && b.r.datos.proyecto.corte === x.corte).r; });
      if (!actual && Object.keys(ALMACEN.proyectos).length) seleccionar(Object.keys(ALMACEN.proyectos).sort((a, b) => a.localeCompare(b, 'es'))[0]);
      if (actual) mostrarProyecto(actual, false);
      return Object.assign([...integrados, ...filas], { sinEjemplo });
    },
    // Integra resultados ya leídos (la cartera de ejemplo)
    integrar: items => {
      if (items.some(x => x.ejemplo)) { try { localStorage.removeItem(SIN_EJEMPLO_KEY); } catch (e) { /* nada */ } }
      const r = integrar(items); if (!actual) seleccionar(r.length ? r[0].nombre : null); if (actual) mostrarProyecto(actual, false); return r; },
    abrir: nombre => {
      seleccionar(nombre); mostrarProyecto(actual, false);
      document.querySelector('nav.tabs button[data-vista="mi-proyecto"]').click(); window.scrollTo({ top: 0 });
    },
    tarjetaChecks: (r, nombre) => tarjetaChecks(r, nombre),
    borrar: () => borrar(),
    historialEjemplo: hojas => historialEjemplo(hojas),
    soloEjemplo: () => { const gs = Object.values(ALMACEN.proyectos); return gs.length > 0 && gs.every(esEjemplo); },
    ejemploQuitado: () => { try { return localStorage.getItem(SIN_EJEMPLO_KEY) === '1'; } catch (e) { return false; } },
    hayGuardado: () => almacenGuardado
  };

  // ---------- Arranque: si hay un proyecto guardado, se muestra ----------
  if (ALMACEN.sel) seleccionar(ALMACEN.sel);
  const g = actual;
  if (g) mostrarProyecto(g, false);
  // Si lo guardado es el ejemplo (por ejemplo, cargado con una versión anterior), se le añaden también
  // sus cortes simulados, igual que al pulsar "Probar con el ejemplo"
  if (g && g.nombre.startsWith('ejemplo-ERP-01.xlsx') && !fotosDe(g.r.datos.proyecto.nombre).some(f => f.simulado)) {
    const bin = atob(window.EJEMPLO_XLSX), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    leerXlsx(bytes.buffer).then(h => { historialEjemplo(h); window.repintarMiProyecto(); }).catch(() => { /* sin cortes simulados */ });
  }
  // Abrir directamente esta pestaña si la dirección termina en #mi-proyecto
  if (location.hash === '#mi-proyecto') { mostrarVista('mi-proyecto'); window.repintarMiProyecto(); }
})();
