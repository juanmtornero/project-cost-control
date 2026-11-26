// ============================================================
// PANTALLA "CARTERA" (v5): varios proyectos a la vez
// ------------------------------------------------------------
// Se suben varios Excel (uno por proyecto, la plantilla de siempre).
// Cada archivo se comprueba por separado; los correctos se guardan
// en el almacén de proyectos (ver mi-proyecto.js).
// La primera vez se carga sola la cartera de ejemplo (6 proyectos
// ficticios); al subir Excel propios, el ejemplo se quita.
// Pulsar un proyecto abre su panel completo en la pestaña "Proyecto".
// ============================================================
(() => {
  const M = window.misProyectos;
  const intro = $('mc-intro'), barra = $('mc-barra'), informe = $('mc-informe'), vista = $('mc-cartera');
  const entrada = $('mc-archivos'), zona = $('mc-zona');
  const FILTRO = { estado: '', pl: '' };
  let ultimo = null; // filas del resultado de la última subida

  // ---------- Entrada: botón, arrastrar y soltar, ejemplo ----------
  entrada.addEventListener('change', () => { if (entrada.files.length) subir([...entrada.files]); entrada.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove('encima'); }));
  zona.addEventListener('drop', e => { if (e.dataTransfer.files.length) subir([...e.dataTransfer.files]); });
  $('mc-ejemplo').addEventListener('click', () => cargarEjemplo());
  window.cargarCarteraEjemplo = () => cargarEjemplo(true);

  async function subir(archivos) {
    informe.innerHTML = `<div class="card"><p class="sub" style="margin:0">Leyendo ${archivos.length} archivo${archivos.length > 1 ? 's' : ''}…</p></div>`;
    ultimo = await M.procesarArchivos(archivos);
    if (ultimo.some(f => f.estado)) delete barra.dataset.subir; // algo se ha cargado: se cierra la zona de subida
    pintar(true);
  }

  // ---------- Cartera de ejemplo: los 6 proyectos ficticios, convertidos a la plantilla ----------
  // Se construye cada Excel a partir de los datos de ejemplo (data.js) y pasa por las mismas comprobaciones
  // que un archivo subido. El real mensual de cada partida se reparte con el peso del real de cada mes.
  const serial = (a, m, d) => (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
  const serialMes = ym => serial(+ym.slice(0, 4), +ym.slice(5, 7), 1);
  const serialFinMes = ym => serial(+ym.slice(0, 4), +ym.slice(5, 7) + 1, 1) - 1;
  function hojasDesdeEjemplo(p, base) {
    const h = JSON.parse(JSON.stringify(base));
    const corte = D.fechaCorte;
    [p.nombre, p.cliente, p.projectLead, serialMes(p.inicio), serialFinMes(p.fin), serial(+corte.slice(0, 4), +corte.slice(5, 7), +corte.slice(8, 10)), Math.round(p.avance * 100), 'EUR']
      .forEach((v, i) => { h.Proyecto[2 + i][1] = v; });
    const BAC = p.lineas.reduce((s, l) => s + (l.tipo === 'horas' ? l.horasPresupuesto * l.tarifa : l.presupuesto), 0);
    h.Presupuesto = h.Presupuesto.slice(0, 3); h.Presupuesto[2] = h.Presupuesto[2].slice(); h.Presupuesto[2][7] = BAC;
    p.lineas.forEach(l => h.Presupuesto.push(l.tipo === 'horas' ? [l.concepto, 'Horas', l.horasPresupuesto, l.tarifa, null, l.horasPresupuesto * l.tarifa] : [l.concepto, 'Gasto', null, null, l.presupuesto, l.presupuesto]));
    const reales = p.mensual.filter(m => m.real != null), tot = reales.reduce((s, m) => s + m.real, 0);
    const filas = [];
    p.lineas.forEach(l => {
      const total = l.tipo === 'horas' ? l.horasReales : l.real;
      const partes = reales.map(m => Math.round(total * m.real / tot)); if (partes.length) partes[partes.length - 1] += total - partes.reduce((s, x) => s + x, 0);
      reales.forEach((m, i) => filas.push([serialMes(m.mes), l.concepto, l.tipo === 'horas' ? partes[i] : null, l.tipo === 'horas' ? null : partes[i]]));
    });
    h.Real = h.Real.slice(0, 3).concat(filas.sort((a, b) => a[0] - b[0]));
    h['Previsión'] = h['Previsión'].slice(0, 3).concat(p.lineas.map(l => l.tipo === 'horas' ? [l.concepto, l.horasPendientes, null, 'No'] : [l.concepto, null, l.pendiente, l.pendiente > 0 && /licencia|subcontrat/i.test(l.concepto) ? 'Sí' : 'No']));
    const plan = h['Plan mensual'].slice(0, 3); plan[2] = plan[2].slice(); plan[2][3] = p.mensual.reduce((s, m) => s + (m.plan || 0), 0);
    h['Plan mensual'] = plan.concat(p.mensual.map(m => [serialMes(m.mes), m.plan]));
    return h;
  }
  // silencioso: sin informe de subida (al entrar por primera vez o desde la pestaña Proyecto)
  async function cargarEjemplo(silencioso) {
    if (silencioso !== true) informe.innerHTML = '<div class="card"><p class="sub" style="margin:0">Preparando la cartera de ejemplo…</p></div>';
    const bin = atob(window.EJEMPLO_XLSX), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const base = await leerXlsx(bytes.buffer), buenos = [], malos = [];
    D.proyectos.forEach(p => {
      const archivo = `ejemplo-${p.id}.xlsx (cartera de ejemplo)`, r = importarProyecto(hojasDesdeEjemplo(p, base));
      if (r.ok) buenos.push({ archivo, r, ejemplo: true }); else malos.push({ archivo, r });
    });
    M.historialEjemplo(base); // ERP-01 trae dos cortes anteriores simulados, para ver la evolución
    const filas = [...M.integrar(buenos).map(x => ({ ...x, r: buenos.find(b => b.archivo === x.archivo).r })), ...malos];
    if (silencioso === true) { ultimo = null; informe.innerHTML = ''; pintar(); }
    else { ultimo = filas; pintar(true); }
  }

  // ---------- Resultado de la subida ----------
  const RES = {
    'nuevo': f => ['verde', `Añadido · corte ${fecha(f.corte)}`],
    'nuevo-corte': f => ['verde', `Actualizado al corte ${fecha(f.corte)}; el del ${fecha(f.corteGuardado)} pasa al historial`],
    'mismo-corte': f => ['verde', `Sustituido: ya estaba guardado con el mismo corte (${fecha(f.corte)})`],
    'repetido': f => ['ambar', `Mismo proyecto y corte (${fecha(f.corte)}) que «${esc(f.repiteA)}», también en esta subida. Se usa este archivo; revisa cuál es el bueno`],
    'historial': f => ['verde', `Añadido al historial: su corte (${fecha(f.corte)}) es anterior al guardado (${fecha(f.corteGuardado)})`]
  };
  function htmlInforme(filas) {
    const ok = filas.filter(f => f.estado), mal = filas.filter(f => !f.estado);
    const fila = (f, i) => {
      if (f.estado) {
        const [c, t] = RES[f.estado](f), nA = f.r ? f.r.avisos.length : 0;
        return `<tr><td>${esc(f.archivo)}</td><td><b>${esc(f.nombre)}</b></td><td>${semaforo(c).replace(SEM[c].txt, c === 'verde' ? 'Cargado' : 'Revisar')}</td>
          <td>${t}${nA ? `<div class="proy"><span>${nA} aviso${nA > 1 ? 's' : ''} en el archivo: se ven en la comprobación del proyecto</span></div>` : ''}</td></tr>`;
      }
      const nE = f.r ? f.r.errores.length : 0;
      return `<tr><td>${esc(f.archivo)}</td><td>${f.nombre ? `<b>${esc(f.nombre)}</b>` : '<span class="det">—</span>'}</td>
        <td>${semaforo('rojo').replace(SEM.rojo.txt, 'No cargado')}</td>
        <td>${f.fallo ? `No se puede leer: ${f.fallo.map(esc).join(' ')}` : `Tiene ${nE} tipo${nE > 1 ? 's' : ''} de error: no se analiza. <button type="button" class="boton mini" data-ver-errores="${i}">Ver errores</button>`}</td></tr>`;
    };
    return `<div class="card"><h2>Resultado de la subida</h2>
      <p class="sub">${ok.length} de ${filas.length} archivo${filas.length > 1 ? 's' : ''} cargado${ok.length === 1 ? '' : 's'}${mal.length ? `. ${mal.length === 1 ? 'El que tiene' : 'Los que tienen'} errores no se ha${mal.length > 1 ? 'n' : ''} cargado: corrígelos en el Excel (la pestaña Comprobación ayuda) y vuelve a subirlos` : ''}.</p>
      <div class="tabla-wrap"><table class="informe"><thead><tr><th>Archivo</th><th>Proyecto</th><th>Resultado</th><th>Detalle</th></tr></thead>
      <tbody>${filas.map(fila).join('')}</tbody></table></div>
      ${filas.sinEjemplo ? '<p class="sub" style="margin:10px 0 0">Se ha quitado la cartera de ejemplo: a partir de ahora solo ves tus proyectos.</p>' : ''}<div id="mc-errores"></div></div>`;
  }
  informe.addEventListener('click', e => {
    const i = e.target.dataset && e.target.dataset.verErrores;
    if (i == null || !ultimo) return;
    const f = ultimo[+i];
    $('mc-errores').innerHTML = M.tarjetaChecks(f.r, f.archivo);
    $('mc-errores').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- Vista de cartera ----------
  // Proyectos de la cartera, con el filtro aplicado
  const filtrar = lista => lista.filter(x => (!FILTRO.estado || x.p.estado === FILTRO.estado) && (!FILTRO.pl || x.p.projectLead === FILTRO.pl));
  const corteMax = lista => lista.reduce((m, x) => (x.foto.corte > m ? x.foto.corte : m), '');
  // Cambio de la estimación desde el corte anterior guardado
  const notaCambio = x => {
    const ant = fotoAnterior(x.fotos, x.foto.corte);
    if (!ant) return '';
    const d = x.foto.EAC - ant.EAC;
    return `<div class="proy"><span class="${Math.abs(d) <= 0.5 ? '' : d > 0 ? 'neg' : 'pos'}">${Math.abs(d) <= 0.5 ? 'sin cambio' : `${d > 0 ? '▲' : '▼'} ${eur(Math.abs(d))}`} desde ${fecha(ant.corte)}</span></div>`;
  };

  function pintar(desplazar) {
    const todos = M.lista();
    if (ultimo) informe.innerHTML = htmlInforme(ultimo);
    if (!todos.length) {
      barra.hidden = true; intro.hidden = false; vista.innerHTML = '';
      if (desplazar) informe.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    intro.hidden = !!barra.dataset.subir ? false : true;
    $('mc-probar').hidden = true;
    barra.hidden = false;
    const soloEj = M.soloEjemplo();
    barra.classList.toggle('es-ejemplo', soloEj);
    barra.innerHTML = soloEj
      ? `<p><b>Cartera de ejemplo</b> <span class="tag">ejemplo</span><br><span class="sub">${todos.length} proyectos inventados de una consultora ficticia, para ver cómo funciona. Se analizan igual que si fueran tus Excel. Pulsa un proyecto para ver su panel completo. Para analizar los tuyos, sube sus Excel (uno por proyecto): el ejemplo se quita solo.</span></p>
      <div class="acciones"><button type="button" class="boton" id="mc-mas">Subir mis Excel</button>
        <button type="button" class="boton" id="mc-pdf">Descargar resumen de cartera (PDF)</button>
        <button type="button" class="boton" id="mc-borrar">Quitar el ejemplo</button></div><div class="aviso-barra"></div>`
      : `<p><b>Mi cartera</b><br><span class="sub">${todos.length} proyecto${todos.length > 1 ? 's' : ''} guardado${todos.length > 1 ? 's' : ''} en este navegador${M.hayGuardado() ? '' : ' (no se ha podido guardar: se perderá al cerrar la página)'}. Pulsa un proyecto para ver su panel completo.</span></p>
      <div class="acciones"><button type="button" class="boton" id="mc-pdf">Descargar resumen de cartera (PDF)</button>
        <button type="button" class="boton" id="mc-mas">Subir más archivos</button>
        <button type="button" class="boton" id="mc-borrar">Borrar mis datos</button></div><div class="aviso-barra"></div>`;
    $('mc-mas').addEventListener('click', () => { intro.hidden = false; barra.dataset.subir = '1'; intro.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('mc-pdf').addEventListener('click', descargarPdf);
    $('mc-borrar').addEventListener('click', e => {
      if (soloEj) { ultimo = null; delete barra.dataset.subir; M.borrar(); $('mc-probar').hidden = false; pintar(); informe.innerHTML = '<div class="msg nota">Se ha quitado la cartera de ejemplo. Sube tus Excel para analizar tus proyectos, o vuelve a verla con el botón de abajo.</div>'; return; }
      if (e.target.dataset.confirmar) { ultimo = null; informe.innerHTML = ''; delete barra.dataset.subir; M.borrar(); $('mc-probar').hidden = false; pintar(); informe.innerHTML = '<div class="msg nota">Se han borrado todos los datos guardados en este navegador: los proyectos, los comentarios y el historial de cortes.</div>'; return; }
      e.target.dataset.confirmar = '1'; e.target.textContent = '¿Seguro? Se borran todos los proyectos, comentarios e historial: pulsa otra vez';
      setTimeout(() => { if (e.target.isConnected) { delete e.target.dataset.confirmar; e.target.textContent = 'Borrar mis datos'; } }, 5000);
    });

    // Filtros (Project Lead: los que haya en la cartera)
    const pls = [...new Set(todos.map(x => x.p.projectLead).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    if (FILTRO.pl && !pls.includes(FILTRO.pl)) FILTRO.pl = '';
    const lista = filtrar(todos), orden = ordenarCartera(lista), cmax = corteMax(todos);
    const viejos = ordenarCartera(todos).filter(x => x.foto.corte < cmax);
    vista.innerHTML = `
      ${viejos.length ? `<div class="msg ambar"><b>No todos los datos son del mismo mes.</b> El corte más reciente es el ${fecha(cmax)}, pero ${viejos.map(x => `${esc(x.p.nombre)} (${fecha(x.foto.corte)})`).join(', ')} ${viejos.length > 1 ? 'tienen' : 'tiene'} un corte anterior. Sus cifras no son comparables con las del resto hasta que subas su Excel más reciente.</div>` : ''}
      <div class="filtros">
        <label>Estado <select id="mc-f-estado"><option value="">Todos</option>${['En curso', 'Cerrado'].map(o => `<option ${FILTRO.estado === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
        ${pls.length > 1 ? `<label>Project Lead <select id="mc-f-pl"><option value="">Todos</option>${pls.map(o => `<option value="${esc(o)}" ${FILTRO.pl === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>` : ''}
      </div>
      ${lista.length ? `<div class="tiles">${tilesCartera(lista)}</div>
      <div class="card"><h2>Proyectos</h2>
        <p class="sub">Pulsa un proyecto para ver su panel completo. La barra compara el presupuesto consumido con el avance (marca vertical). Bajo el coste al finalizar, cuánto ha cambiado la estimación desde el corte anterior guardado (▲ sube el coste, ▼ baja).</p>
        <div class="tabla-wrap"><table id="mc-tabla">${tablaCartera(orden, {
          sub: p => [p.cliente, 'corte ' + fecha(p.corteISO)].filter(Boolean).map(esc).join(' · '),
          notaNombre: p => (p.corteISO < cmax ? '<span class="det" style="display:inline-block;margin-top:4px;padding:1px 6px;border-radius:4px;background:var(--warnbg);color:var(--tx)">corte anterior al resto</span>' : ''),
          notaCierre: p => notaCambio(lista.find(x => x.p.id === p.id))
        })}</table></div></div>
      <div class="card"><h2>Desviación al cierre por proyecto</h2>
        <p class="sub">Presupuesto − coste al finalizar: estimado en los proyectos en curso y final en los cerrados. A la derecha, ahorro; a la izquierda, sobrecoste. La línea fina marca el rango entre el método más optimista y el más pesimista.</p>
        <div class="grafico" id="mc-graf"></div></div>` : '<div class="msg nota">Ningún proyecto cumple el filtro.</div>'}`;
    const fe = $('mc-f-estado'), fp = $('mc-f-pl');
    fe.addEventListener('change', () => { FILTRO.estado = fe.value; pintar(); });
    if (fp) fp.addEventListener('change', () => { FILTRO.pl = fp.value; pintar(); });
    if (lista.length) {
      activarFilas($('mc-tabla'), M.abrir);
      graficoDesviacion(orden, $('mc-graf'), M.abrir, p => p.nombre);
    }
    if (desplazar) (ultimo ? informe : barra).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function descargarPdf() {
    const lista = filtrar(M.lista()), cmax = corteMax(lista);
    if (!lista.length) { const a = barra.querySelector('.aviso-barra'); if (a) a.innerHTML = '<div class="msg nota">Ningún proyecto cumple el filtro: quítalo para descargar el resumen.</div>'; return; }
    const filtro = [FILTRO.estado, FILTRO.pl ? 'Project Lead: ' + FILTRO.pl : ''].filter(Boolean).join(' · ');
    prepararResumenCartera(lista, { corte: cmax, filtro: filtro ? 'filtro: ' + filtro : '', ejemplo: M.soloEjemplo() });
    const aviso = html => { const a = barra.querySelector('.aviso-barra'); if (a) a.innerHTML = html; };
    imprimirHoja(`resumen-cartera-${cmax}`, `Resumen de cartera · ${fecha(cmax)}`, aviso);
  }

  // Se llama al cambiar de pestaña, de tamaño o cuando cambian los proyectos guardados
  window.repintarMiCartera = () => { if (!$('v-mi-cartera').hidden) pintar(); };
  pintar();
  if (location.hash === '#mi-cartera') { mostrarVista('mi-cartera'); pintar(); }
  // Primera visita (nada guardado y el ejemplo no se ha quitado nunca): se carga la cartera de ejemplo
  if (!M.lista().length && !M.ejemploQuitado()) cargarEjemplo(true).catch(() => { /* se queda la pantalla de subida */ });
})();
