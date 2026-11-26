// ============================================================
// PANTALLA: dibuja el panel a partir de DATOS (data.js)
// y de las fórmulas (kpis.js). JavaScript "puro", sin librerías,
// para que la web sea un conjunto de archivos estáticos que se
// puede publicar gratis en cualquier sitio.
// ============================================================
const D = window.DATOS;
const $ = id => document.getElementById(id);

// ---------- Formatos (estilo español: 1.234.567 €, 12,5 %) ----------
const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });
const nf1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: 'always' });
const nf2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = n => nf0.format(Math.round(n)) + ' €';
const keur = n => nf1.format(n / 1000) + ' k€';
const pct = n => nf1.format(n) + ' %';
const signo = n => (n > 0 ? '+' : n < 0 ? '−' : '');
// Con signo; lo que se redondea a cero se muestra sin signo ("0 €", "0,0 %")
const eurS = n => (Math.round(Math.abs(n)) === 0 ? '' : signo(n)) + eur(Math.abs(n));
const pctS = n => (Math.round(Math.abs(n) * 10) === 0 ? '' : signo(n)) + pct(Math.abs(n));
const cls = n => (n > 0.5 ? 'pos' : n < -0.5 ? 'neg' : '');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesTxt = ym => MESES[+ym.slice(5) - 1] + ' ' + ym.slice(2, 4);
const fecha = iso => iso.split('-').reverse().join('/');
// Fecha de hoy (o de d) en hora local, AAAA-MM-DD. toISOString() usa UTC y cerca de medianoche da otro día
const hoyLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SEM = {
  verde: { icono: '✓', txt: 'En línea' },
  ambar: { icono: '!', txt: 'Algo por encima' },
  rojo:  { icono: '✕', txt: 'Por encima' }
};
const semaforo = s => `<span class="sem ${s}"><i aria-hidden="true">${SEM[s].icono}</i>${SEM[s].txt}</span>`;
const ayuda = t => `<i class="info" title="${esc(t)}">?</i>`;
const tile = (lab, val, det = '', tip = '', c = '') =>
  `<div class="tile"><div class="lab">${lab} ${tip ? ayuda(tip) : ''}</div><div class="val num ${c}">${val}</div>${det ? `<div class="det">${det}</div>` : ''}</div>`;

// Métodos que el usuario ha desestimado en cada proyecto. Es un ajuste de vista
// (no cambia los datos) y se guarda en este navegador: { "ERP-01": ["ritmo"], ... }
const AJUSTES_KEY = 'controlPresupuestario.desestimados';
let DESESTIMADOS = {};
try { DESESTIMADOS = JSON.parse(localStorage.getItem(AJUSTES_KEY)) || {}; } catch (e) { DESESTIMADOS = {}; }
const guardarAjustes = () => { try { localStorage.setItem(AJUSTES_KEY, JSON.stringify(DESESTIMADOS)); } catch (e) { /* sin almacenamiento: solo dura esta visita */ } };

// Rango "mín – máx" en k€; si coinciden, un solo valor
const rangoK = k => Math.round(k.EACmin / 100) === Math.round(k.EACmax / 100) ? keur(k.EACmin) : `${nf1.format(k.EACmin / 1000)} – ${keur(k.EACmax)}`;
const metodosTxt = k => k.cerrado ? 'coste final' : `mediana de ${k.nActivos} de 5 métodos`;

// ---------- Cabecera y pestañas ----------
$('empresa').textContent = D.empresa;

function mostrarVista(v) {
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.vista === v));
  document.querySelectorAll('section.vista').forEach(s => (s.hidden = s.id !== 'v-' + v));
  // En móvil las pestañas se desplazan de lado: que la elegida quede a la vista
  const nav = document.querySelector('nav.tabs'), bt = nav.querySelector(`button[data-vista="${v}"]`);
  if (bt && nav.scrollWidth > nav.clientWidth) nav.scrollLeft += bt.getBoundingClientRect().left - nav.getBoundingClientRect().left - (nav.clientWidth - bt.offsetWidth) / 2;
}
// Enlaces "ve a Mi proyecto" dentro de los avisos
document.querySelectorAll('[data-ir]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); document.querySelector(`nav.tabs button[data-vista="${a.dataset.ir}"]`).click(); window.scrollTo({ top: 0 });
}));
document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', () => {
  mostrarVista(b.dataset.vista);
  if (b.dataset.vista === 'mi-proyecto' && window.repintarMiProyecto) window.repintarMiProyecto();
  if (b.dataset.vista === 'mi-cartera' && window.repintarMiCartera) window.repintarMiCartera();
  history.replaceState(null, '', '#' + b.dataset.vista);
}));

// ============================================================
// VISTA CARTERA
// ============================================================
// ---------- Piezas de la vista de cartera (las usa la pestaña Cartera y el resumen de cartera en PDF) ----------
// Tarjetas de totales: presupuesto, real, coste al finalizar, desviación y recuento de etiquetas
function tilesCartera(lista) {
  const t = calcularCartera(lista);
  const nCerrados = lista.filter(x => x.k.cerrado).length, todosCerrados = lista.length > 0 && nCerrados === lista.length;
  return tile('Presupuesto total', keur(t.BAC), `${lista.length} proyecto${lista.length === 1 ? '' : 's'}`, 'Suma del presupuesto aprobado (BAC) de los proyectos filtrados') +
    tile('Coste real acumulado', keur(t.AC), `${pct(t.consumidoPct)} del presupuesto consumido`, 'Horas imputadas × tarifa + gastos reales hasta la fecha de corte (AC)') +
    tile(todosCerrados ? 'Coste final' : 'Coste estimado al finalizar', keur(t.EAC),
      !lista.length ? '' : todosCerrados ? 'Proyectos cerrados: coste real' : `Rango ${nf1.format(t.EACmin / 1000)} – ${keur(t.EACmax)}${nCerrados ? ` · incluye ${nCerrados} cerrado${nCerrados > 1 ? 's' : ''} a coste final` : ''}`,
      'En curso: estimación central de cada proyecto (mediana de sus métodos); el rango suma el método más optimista y el más pesimista de cada uno. Cerrados: su coste final real') +
    tile(todosCerrados ? 'Desviación final' : 'Desviación estimada', signo(t.desviacion) + keur(Math.abs(t.desviacion)), pctS(t.desviacionPct) + ' sobre presupuesto', 'Presupuesto − coste al finalizar. Negativo = sobrecoste', cls(t.desviacion)) +
    `<div class="tile"><div class="lab">Estado de los proyectos</div><div class="resumen-sem">
      ${t.rojo ? semaforo('rojo') + `<b class="num">${t.rojo}</b>` : ''}
      ${t.ambar ? semaforo('ambar') + `<b class="num">${t.ambar}</b>` : ''}
      ${t.verde ? semaforo('verde') + `<b class="num">${t.verde}</b>` : ''}</div></div>`;
}
// Primero los que más preocupan (por encima, algo por encima, en línea) y, dentro de cada grupo, la peor desviación
const ordenarCartera = lista => {
  const peso = { rojo: 0, ambar: 1, verde: 2 };
  return [...lista].sort((a, b) => peso[a.k.semaforo] - peso[b.k.semaforo] || a.k.desviacionPct - b.k.desviacionPct);
};
// Tabla de proyectos. opc.sub(p): línea bajo el nombre; opc.notaNombre / opc.notaCierre (p, k): html extra
function tablaCartera(orden, opc = {}) {
  const t = calcularCartera(orden);
  return `
    <thead><tr><th>Proyecto</th><th>Project Lead</th><th>Estado</th><th class="r">Presupuesto</th><th class="r">Real</th>
      <th>Consumido vs avance</th><th class="r">Coste al finalizar</th><th class="r">Desviación</th></tr></thead>
    <tbody>${orden.map(({ p, k }) => `
      <tr class="clic" tabindex="0" data-id="${esc(p.id)}" title="Ver detalle">
        <td class="proy"><b>${esc(p.nombre)}</b>${opc.sub && opc.sub(p) ? `<span>${opc.sub(p)}</span>` : ''}${opc.notaNombre ? opc.notaNombre(p, k) : ''}</td>
        <td>${esc(p.projectLead || '—')}</td>
        <td>${semaforo(k.semaforo)}<div class="proy"><span>${p.estado}</span></div></td>
        <td class="r num">${eur(k.BAC)}</td>
        <td class="r num">${eur(k.AC)}</td>
        <td class="consumo"><small class="num">${pct(k.consumidoPct)} consumido · ${pct(p.avance * 100)} avance</small>
          <div class="barra"><b style="width:${Math.min(k.consumidoPct, 100)}%"></b><u style="left:${Math.min(p.avance * 100, 100)}%"></u></div></td>
        <td class="r num">${eur(k.EAC)}<div class="proy"><span>${k.cerrado ? 'final (real)' : 'estimado · ' + rangoK(k)}</span></div>${opc.notaCierre ? opc.notaCierre(p, k) : ''}</td>
        <td class="r num ${cls(k.desviacion)}">${eurS(k.desviacion)}<div class="proy"><span>${pctS(k.desviacionPct)}</span></div></td>
      </tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="3">Total cartera</td><td class="r num">${eur(t.BAC)}</td><td class="r num">${eur(t.AC)}</td>
      <td class="num">${pct(t.consumidoPct)} consumido</td><td class="r num">${eur(t.EAC)}</td>
      <td class="r num ${cls(t.desviacion)}">${eurS(t.desviacion)}</td></tr></tfoot>`;
}
// Clic o Intro en una fila abre el proyecto
function activarFilas(tabla, abrir) {
  tabla.querySelectorAll('tr.clic').forEach(tr => {
    tr.addEventListener('click', () => abrir(tr.dataset.id));
    tr.addEventListener('keydown', e => { if (e.key === 'Enter') abrir(tr.dataset.id); });
  });
}

// Gráfico de barras horizontales divergentes (ahorro / sobrecoste)
// Tres columnas fijas para que nada se pise: nombre | barras | cifra.
function graficoDesviacion(lista, cont, abrir = () => {}, etiqueta = p => p.nombre) {
  if (!lista.length) { cont.innerHTML = '<p class="sub">Sin proyectos con este filtro.</p>'; return; }
  // Si la pestaña está oculta no tiene ancho: se dibujará al mostrarla (ver pestañas)
  if (!cont.clientWidth) { cont.dataset.pendiente = '1'; return; }
  delete cont.dataset.pendiente;
  const W = Math.max(cont.clientWidth, 340), estrecho = W < 600;
  const fila = estrecho ? 46 : 34, H = lista.length * fila + 26;
  const etq = estrecho ? 0 : Math.min(280, W * 0.3);        // columna del nombre (en móvil va encima de la barra)
  const val = estrecho ? 56 : 150;                            // columna de la cifra
  const zona = W - etq - val - 16;                           // ancho de la zona de barras
  const desvMin = x => x.k.BAC - x.k.EACmax, desvMax = x => x.k.BAC - x.k.EACmin; // extremos del rango
  const lo = Math.min(0, ...lista.map(desvMin)), hi = Math.max(0, ...lista.map(desvMax));
  const span = (hi - lo) || 1;
  const X = v => etq + 8 + (v - lo) / span * zona;
  const x0 = X(0);
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Desviación por proyecto">
    <line x1="${x0}" x2="${x0}" y1="0" y2="${H - 22}" stroke="var(--tx2)" stroke-width="1"/>`;
  lista.forEach(({ p, k }, i) => {
    const y = i * fila + (estrecho ? 18 : 6), neg = k.desviacion < 0;
    const xb = Math.min(X(k.desviacion), x0), wb = Math.max(Math.abs(X(k.desviacion) - x0), 1.5);
    const nombre = etiqueta(p), maxCar = estrecho ? Math.floor(W / 7.2) - 12 : Math.floor(etq / 6.6);
    const corto = nombre.length > maxCar ? nombre.slice(0, maxCar - 1) + '…' : nombre;
    const cifra = `${eurS(k.desviacion)} (${pctS(k.desviacionPct)})${k.cerrado ? ' · final' : ''}`;
    svg += `<g class="clic" data-id="${esc(p.id)}" style="cursor:pointer">
      <title>${esc(p.nombre)}: ${k.cerrado ? 'desviación final' : 'desviación estimada'} ${cifra}${k.cerrado ? '' : `. Rango según los métodos: ${eurS(desvMin({ k }))} a ${eurS(desvMax({ k }))}`}</title>
      <rect x="0" y="${y - (estrecho ? 18 : 4)}" width="${W}" height="${fila}" fill="transparent"/>
      <text x="${estrecho ? 0 : 0}" y="${estrecho ? y - 4 : y + 15}" style="fill:var(--tx)">${esc(corto)}${estrecho ? `<tspan class="num" style="fill:var(--tx2)"> · ${eurS(k.desviacion)}</tspan>` : ''}</text>
      <rect x="${xb}" y="${y + 3}" width="${wb}" height="18" rx="3" fill="${neg ? 'var(--neg)' : 'var(--pos)'}"/>
      ${!k.cerrado && k.EACmax - k.EACmin > 1 ? `<g stroke="var(--tx)" stroke-width="1.5">
        <line x1="${X(desvMin({ k }))}" x2="${X(desvMax({ k }))}" y1="${y + 12}" y2="${y + 12}"/>
        <line x1="${X(desvMin({ k }))}" x2="${X(desvMin({ k }))}" y1="${y + 7}" y2="${y + 17}"/>
        <line x1="${X(desvMax({ k }))}" x2="${X(desvMax({ k }))}" y1="${y + 7}" y2="${y + 17}"/></g>` : ''}
      ${estrecho ? '' : `<text x="${W - 4}" y="${y + 16}" text-anchor="end" class="num ${cls(k.desviacion)}" style="fill:${neg ? 'var(--neg)' : 'var(--pos)'}">${cifra}</text>`}</g>`;
  });
  svg += `<text x="${x0 - 6}" y="${H - 6}" text-anchor="end">← sobrecoste</text><text x="${x0 + 6}" y="${H - 6}">ahorro →</text></svg>`;
  cont.innerHTML = svg;
  cont.querySelectorAll('g.clic').forEach(g => g.addEventListener('click', () => abrir(g.dataset.id)));
}

// ============================================================
// VISTA DETALLE DE PROYECTO
// Panel de un proyecto (pestaña Proyecto y resumen en PDF).
// ============================================================
// Dibuja el panel completo de un proyecto dentro de "cont".
// opc.corte: fecha de corte (ISO). opc.notas: mensajes extra [[clase, html], ...]
function pintarPanel(cont, p, k, opc) {
  cont.innerHTML = htmlPanel(p, k, opc);
  graficoCurva(p, k, cont.querySelector('.grafico'), opc.corte);
}

// Mensajes automáticos del panel (también los usa el resumen en PDF)
function mensajesPanel(p, k, opc) {
  const sobreconsumo = k.consumidoPct - p.avance * 100;

  // Mensajes automáticos: explican la etiqueta en lenguaje de negocio
  const msgs = [];
  if (k.cerrado) msgs.push([k.semaforo, `<b>${SEM[k.semaforo].txt}.</b> Cerrado con un coste final de ${eur(k.EAC)} frente a ${eur(k.BAC)} presupuestados (${eurS(k.desviacion)}, ${pctS(k.desviacionPct)}).`]);
  else msgs.push([k.semaforo, `<b>${k.semaforo === 'verde' ? 'En línea con el presupuesto' : k.semaforo === 'rojo' ? 'Cierre estimado por encima del presupuesto' : 'Cierre estimado algo por encima del presupuesto'}.</b> La estimación central es ${eur(k.EAC)} frente a ${eur(k.BAC)} presupuestados (${eurS(k.desviacion)}, ${pctS(k.desviacionPct)}).${k.nActivos > 1 ? ` Según el método, el cierre va de ${eur(k.EACmin)} a ${eur(k.EACmax)}.` : ''}`]);
  (opc.notas || []).forEach(n => msgs.push(n));
  // La previsión del Project Lead, comparada con la estimación central
  const difPL = k.EACpl != null && k.metodos[0].activo ? (k.EAC - k.EACpl) / k.BAC * 100 : 0;
  if (!k.cerrado && difPL > 5) msgs.push(['ambar', `<b>La previsión del Project Lead es más optimista que la estimación central.</b> Prevé cerrar en ${eur(k.EACpl)}, ${eur(k.EAC - k.EACpl)} menos que la estimación central. Conviene que explique en qué se basa.`]);
  if (!k.cerrado && difPL < -5) msgs.push(['nota', `La previsión del Project Lead (${eur(k.EACpl)}) es más prudente que la estimación central: ${eur(k.EACpl - k.EAC)} por encima de la estimación central.`]);
  const extremos = k.metodos.filter(m => m.activo && m.eac > 2 * k.BAC);
  if (!k.cerrado && extremos.length) msgs.push(['nota', `<b>${extremos.length === 1 ? 'Un método da' : extremos.length + ' métodos dan'} un cierre de más del doble del presupuesto</b> (${extremos.map(m => m.nombre).join(', ')}). Suele pasar con muy poco avance: dividir por un avance pequeño dispara el resultado. La mediana lo amortigua, pero conviene revisar el avance informado o desmarcar ese método.`]);
  if (!k.cerrado && sobreconsumo > 5) msgs.push(['nota', `Se ha consumido el ${pct(k.consumidoPct)} del presupuesto con un ${pct(p.avance * 100)} de avance: el gasto va ${nf1.format(sobreconsumo)} puntos por delante del trabajo realizado.`]);

  return msgs;
}

function htmlPanel(p, k, opc) {
  const msgs = mensajesPanel(p, k, opc);
  const lateral = p.comentario || (p.modificaciones || []).length;
  const sub = [p.id === 'mi-proyecto' ? '' : p.id, p.cliente, p.sector].filter(Boolean).map(esc).join(' · ');
  const mesFinal = p.mensual.length ? p.mensual[p.mensual.length - 1].mes : p.fin;
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:start">
        <div><h2 style="font-size:18px">${esc(p.nombre)}</h2>
          ${sub ? `<p class="sub" style="margin:0">${sub}</p>` : ''}</div>
        ${semaforo(k.semaforo)}
      </div>
      <dl class="ficha" style="margin-top:12px">
        ${p.projectLead ? `<dt>Project Lead</dt><dd>${esc(p.projectLead)}</dd>` : ''}
        <dt>Periodo</dt><dd>${mesTxt(p.inicio)} – ${mesTxt(p.fin)} · ${p.estado}</dd>
        ${opc.mostrarCorte ? `<dt>Fecha de corte</dt><dd>${fecha(opc.corte)}</dd>` : ''}
        <dt>Avance informado</dt><dd>${pct(p.avance * 100)}</dd>
      </dl>
    </div>
    <div class="tiles">
      ${tile('Presupuesto (BAC)', eur(k.BAC), '', 'Presupuesto aprobado')}
      ${k.cerrado ? '' : tile('Coste real (AC)', eur(k.AC), pct(k.consumidoPct) + ' consumido', 'Gastado hasta la fecha de corte')}
      ${tile(k.cerrado ? 'Coste final' : 'Coste estimado al finalizar', eur(k.EAC), k.cerrado ? `Proyecto cerrado · ${pct(k.consumidoPct)} del presupuesto` : `${k.nActivos > 1 ? `Rango ${rangoK(k)} · ` : ''}${metodosTxt(k)}`, k.cerrado ? 'El proyecto está cerrado: el coste final es el coste real, no se estima' : 'Estimación central: la mediana de los métodos que tienes activos (ver tabla de métodos más abajo)')}
      ${tile(k.cerrado ? 'Desviación final' : 'Desviación estimada', eurS(k.desviacion), pctS(k.desviacionPct) + ' sobre presupuesto', k.cerrado ? 'Presupuesto − coste final. Negativo = sobrecoste' : 'Presupuesto − coste estimado al finalizar. Negativo = sobrecoste', cls(k.desviacion))}
    </div>
    ${msgs.map(([c, t]) => `<div class="msg ${c}">${t}</div>`).join('')}
    ${k.cerrado ? '' : tablaMetodos(p, k)}
    ${opc.htmlTrasMetodos || ''}
    <div class="${lateral ? 'dos' : ''}" style="margin-top:16px">
      <div class="card">
        <h2>Coste acumulado: ${(l => l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : l[0])([k.sinPlan ? '' : 'plan', 'real', !k.cerrado && k.EACpl != null ? 'previsión' : ''].filter(Boolean))}</h2>
        <p class="sub">Pasa el ratón por el gráfico para ver cada mes.${k.sinPlan ? ' Sin plan mensual en el Excel: no hay línea base con la que comparar.' : ''}${hayProyeccion(p, k) ? ` La línea discontinua azul reparte lo que falta hasta la estimación central ${k.sinPlan ? 'en partes iguales cada mes (no hay plan mensual)' : 'con la misma forma que el plan en los meses que quedan'}: es una referencia visual, no un dato.` : ''}${!k.cerrado && !tienePrevMensual(p) && k.EACpl != null ? ` La previsión del Project Lead es por partida, no por mes: se marca solo su cierre, en ${mesTxt(mesFinal)}.` : ''}</p>
        <div class="leyenda">
          ${k.sinPlan ? '' : '<span><i style="border-color:var(--plan);border-top-style:dashed"></i>Plan (línea base)</span>'}
          <span><i style="border-color:var(--s1)"></i>Real</span>
          ${hayProyeccion(p, k) ? '<span><i style="border-color:var(--s1);border-top-style:dashed"></i>Proyección hasta la estimación central</span>' : ''}
          ${k.cerrado ? '' : `${k.EACpl == null ? '' : tienePrevMensual(p) ? '<span><i style="border-color:var(--s2);border-top-style:dashed"></i>Previsión del Project Lead</span>' : '<span><b class="punto"></b>Cierre según el Project Lead</span>'}
          ${k.nActivos > 1 ? '<span><b class="rombo"></b>Estimación central y rango de los métodos</span>' : '<span><b class="rombo"></b>Estimación central</span>'}`}
        </div>
        <div class="grafico"><div class="tooltip" hidden></div></div>
        <details><summary>Ver los datos mensuales en tabla</summary><div class="tabla-wrap">${tablaMensual(p)}</div></details>
      </div>
      ${lateral ? `<div class="card">
        ${p.comentario ? `<h2>Comentario del Project Lead</h2>
        <blockquote>${esc(p.comentario)}</blockquote>` : ''}
        ${(p.modificaciones || []).length ? `<h2 style="margin-top:16px">Solicitudes de cambio</h2>
          <p class="sub">Informativo: las pendientes aún no cambian el presupuesto.</p>
          ${p.modificaciones.map(m => `<div class="msg ${m.estado === 'Aprobada' ? 'verde' : 'ambar'}"><b>${esc(m.estado)} · ${eur(m.importeCoste)}</b> de coste<br>${esc(m.descripcion)}<div class="proy"><span>${fecha(m.fecha)}</span></div></div>`).join('')}` : ''}
      </div>` : ''}
    </div>
    ${opc.htmlTrasCurva || ''}
    <div class="card">
      <h2>Detalle por partida</h2>
      <p class="sub">${k.cerrado ? 'Horas por perfil (a tarifa de coste) y gastos. Proyecto cerrado: la desviación de cada partida es la final, presupuesto frente a coste real.'
        : k.sinPrevision ? 'Horas por perfil (a tarifa de coste) y gastos. Sin previsión del Project Lead no se sabe qué falta por gastar en cada partida, así que no se calcula su cierre ni su desviación.'
        : 'Horas por perfil (a tarifa de coste) y gastos. El pendiente y el cierre de cada partida son los de la previsión del Project Lead, el único método que se detalla por partida: sirven para ver qué partidas explican la desviación.'}</p>
      <div class="tabla-wrap">${tablaPartidas(k)}</div>
    </div>`;
}
const tienePrevMensual = p => p.mensual.some(m => m.prevision != null);
// Proyección (solo Mi proyecto, en curso y con meses por delante): reparte lo que falta hasta la estimación central
const hayProyeccion = (p, k) => !k.cerrado && !tienePrevMensual(p) && p.mensual.some(m => m.real == null);

// Tabla de los 5 métodos: resultado, posición respecto al presupuesto y casilla para desestimarlo
function tablaMetodos(p, k) {
  const disp = k.metodos.filter(m => m.disponible);
  const lo = Math.min(k.BAC, ...disp.map(m => m.eac)), hi = Math.max(k.BAC, ...disp.map(m => m.eac));
  const margen = (hi - lo) * 0.08 || k.BAC * 0.05;
  const pos = v => ((v - lo + margen) / (hi - lo + 2 * margen) * 100).toFixed(1) + '%';
  const fila = m => `<tr class="${!m.disponible ? 'nodisp' : m.activo ? '' : 'inactivo'}">
      <td><label class="metodo"><input type="checkbox" data-metodo="${m.id}" ${m.activo ? 'checked' : ''} ${m.disponible ? '' : 'disabled'}
        ${m.activo && k.nActivos === 1 ? 'disabled title="Tiene que quedar al menos un método"' : ''}>
        <span><b>${m.nombre}</b><small>${m.formula}${m.id === 'cpi' && k.CPI ? ` (CPI ${nf2.format(k.CPI)})` : m.id === 'cpispi' && k.CPI && k.SPI ? ` (CPI ${nf2.format(k.CPI)} × SPI ${nf2.format(k.SPI)})` : m.id === 'ritmo' && k.mediaMes ? ` (${eur(k.mediaMes)} × ${k.mesesQuedan})` : ''}. ${m.explica}</small></span></label></td>
      ${m.disponible ? `<td class="r num">${eur(m.eac)}</td>
      <td class="r num ${cls(m.desviacion)}">${eurS(m.desviacion)}</td>
      <td class="pista"><div class="eje"><u style="left:${pos(k.BAC)}"></u><b class="${m.activo ? cls(m.desviacion) || 'pos' : 'off'}" style="left:${pos(m.eac)}"></b></div></td>`
      : `<td colspan="3" class="nodisp-motivo"><span class="det">No disponible: ${m.motivo.charAt(0).toLowerCase() + m.motivo.slice(1)}</span></td>`}</tr>`;
  return `<div class="card" data-pid="${p.id}">
    <h2>Cierre estimado según cada método</h2>
    <p class="sub">La estimación central es la mediana (el valor del centro) de los métodos marcados. Si un método no tiene sentido para este proyecto, desmárcalo: el cálculo${p.id === 'mi-proyecto' ? '' : ' y la cartera'} se actualiza${p.id === 'mi-proyecto' ? '' : 'n'}, y la elección se guarda en este navegador.</p>
    <div class="tabla-wrap"><table class="metodos">
      <thead><tr><th>Método</th><th class="r">Cierre estimado</th><th class="r">Desviación</th><th>Frente al presupuesto <span class="det">(raya = presupuesto)</span></th></tr></thead>
      <tbody>${k.metodos.map(fila).join('')}</tbody>
      <tfoot><tr><td>Estimación central <span class="det">(${metodosTxt(k)})</span></td><td class="r num">${eur(k.EAC)}</td>
        <td class="r num ${cls(k.desviacion)}">${eurS(k.desviacion)}</td>
        <td class="pista"><div class="eje"><u style="left:${pos(k.BAC)}"></u><i style="left:${pos(k.EACmin)};width:calc(${pos(k.EACmax)} - ${pos(k.EACmin)})"></i><b class="central" style="left:${pos(k.EAC)}"></b></div></td></tr></tfoot>
    </table></div>
    ${k.nActivos < k.nDisponibles || k.nDisponibles < 5 ? `<p class="sub" style="margin:8px 0 0">${k.nDisponibles < 5 ? `${5 - k.nDisponibles} método${5 - k.nDisponibles > 1 ? 's no se pueden' : ' no se puede'} calcular con los datos de este proyecto. ` : ''}${k.nActivos < k.nDisponibles ? `<button type="button" class="boton" data-restaurar="${p.id}">Volver a usar todos los métodos</button>` : ''}</p>` : ''}
  </div>`;
}

// Marcar o desmarcar un método: se guarda, se recalcula todo y se vuelve a dibujar.
// El proyecto sale del data-pid de la tabla de métodos (en la pestaña Proyecto es "mi-proyecto").
function cambiarMetodos(pid, cambio) {
  const lista = new Set(DESESTIMADOS[pid] || []);
  cambio(lista);
  if (lista.size) DESESTIMADOS[pid] = [...lista]; else delete DESESTIMADOS[pid];
  guardarAjustes();
  if (window.repintarMiProyecto) window.repintarMiProyecto();
}
document.addEventListener('change', e => {
  const id = e.target.dataset && e.target.dataset.metodo, caja = e.target.closest && e.target.closest('[data-pid]');
  if (!id || !caja) return;
  cambiarMetodos(caja.dataset.pid, l => (e.target.checked ? l.delete(id) : l.add(id)));
});
document.addEventListener('click', e => {
  const pid = e.target.dataset && e.target.dataset.restaurar;
  if (pid) cambiarMetodos(pid, l => l.clear());
});

function tablaPartidas(k) {
  const c = k.cerrado; // cerrado: sin columnas de pendiente; el cierre es el real
  const sp = k.sinPrevision && !c; // sin previsión: no hay pendiente ni cierre por partida
  const nd = '<span class="det">—</span>';
  const comp = l => l.comprometido && l.pendiente > 0 ? '<div class="proy"><span>comprometido</span></div>' : '';
  const fila = l => `<tr><td>${esc(l.concepto)}${l.tipo === 'horas' ? `<div class="proy"><span>${nf0.format(l.tarifa)} €/h</span></div>` : ''}</td>
    <td class="r num">${l.tipo === 'horas' ? nf0.format(l.horasPresupuesto) + ' h' : ''}</td>
    <td class="r num">${l.tipo === 'horas' ? nf0.format(l.horasReales) + ' h' : ''}</td>
    ${c ? '' : `<td class="r num">${l.tipo === 'horas' ? (sp ? nd : nf0.format(l.horasPendientes) + ' h') : ''}</td>`}
    <td class="r num">${eur(l.presupuesto)}</td><td class="r num">${eur(l.real)}</td>${c ? '' : `<td class="r num">${sp ? nd : eur(l.pendiente) + comp(l)}</td>
    <td class="r num">${sp ? nd : eur(l.eac)}</td>`}<td class="r num ${sp ? '' : cls(l.desviacion)}">${sp ? nd : eurS(l.desviacion)}</td></tr>`;
  const horas = k.partidas.filter(l => l.tipo === 'horas'), gastos = k.partidas.filter(l => l.tipo === 'gasto');
  const n = c ? 6 : 9;
  const grupo = (t, lista) => lista.length ? `<tr class="grupo"><td colspan="${n}">${t}</td></tr>${lista.map(fila).join('')}` : '';
  return `<table><thead><tr><th>Partida</th><th class="r">Horas presup.</th><th class="r">Horas reales</th>${c ? '' : '<th class="r">Horas pend.</th>'}
    <th class="r">Presupuesto</th><th class="r">${c ? 'Coste final' : 'Real'}</th>${c ? '' : '<th class="r">Pendiente</th><th class="r">Cierre (PL)</th>'}<th class="r">${c ? 'Desviación final' : 'Desviación (PL)'}</th></tr></thead>
    <tbody>${grupo('Horas del equipo', horas)}${grupo('Gastos', gastos)}</tbody>
    <tfoot><tr><td colspan="${c ? 3 : 4}">Total</td><td class="r num">${eur(k.BAC)}</td><td class="r num">${eur(k.AC)}</td>${c ? '' : `<td class="r num">${sp ? nd : eur(k.ETC)}</td>
    <td class="r num">${sp ? nd : eur(k.AC + k.ETC)}</td>`}${sp ? `<td class="r num">${nd}</td>` : (d => `<td class="r num ${cls(d)}">${eurS(d)}</td>`)(c ? k.desviacion : k.BAC - k.AC - k.ETC)}</tr></tfoot></table>`;
}

function tablaMensual(p) {
  const conPlan = p.mensual.some(m => m.plan != null), conPrev = tienePrevMensual(p);
  return `<table><thead><tr><th>Mes</th>${conPlan ? '<th class="r">Plan</th>' : ''}<th class="r">Real</th>${conPrev ? '<th class="r">Previsión</th>' : ''}</tr></thead><tbody>
    ${p.mensual.map(m => `<tr><td>${mesTxt(m.mes)}</td>${conPlan ? `<td class="r num">${eur(m.plan)}</td>` : ''}<td class="r num">${m.real != null ? eur(m.real) : '—'}</td>${conPrev ? `<td class="r num">${m.prevision != null ? eur(m.prevision) : '—'}</td>` : ''}</tr>`).join('')}
    </tbody></table>`;
}

// Curva en "S": coste acumulado mes a mes
function graficoCurva(p, k, cont, fechaCorte, alto = 300) {
  if (!cont) return;
  const tip = cont.querySelector('.tooltip');
  const m = p.mensual, n = m.length;
  if (!n) return;
  const conPlan = !k.sinPlan;
  let aPlan = 0, aReal = 0;
  const pts = m.map(x => {
    aPlan += x.plan || 0;
    if (x.real != null) aReal += x.real; else if (x.prevision != null) aReal += x.prevision;
    return { mes: x.mes, plan: conPlan ? aPlan : null, real: x.real != null ? aReal : null, prev: x.prevision != null ? aReal : null };
  });
  // La previsión arranca en el último mes con dato real, para que la línea sea continua
  const ultReal = pts.map(x => x.real != null).lastIndexOf(true);
  if (ultReal >= 0 && ultReal < n - 1 && pts.some(x => x.prev != null)) pts[ultReal].prev = pts[ultReal].real;
  // Si la previsión no es mensual (Excel del usuario), solo se marca su cierre en el último mes
  const cierrePL = !k.cerrado && !tienePrevMensual(p) && k.EACpl != null ? k.EACpl : null;
  // Proyección: lo que falta (estimación central − real) repartido en los meses que quedan,
  // con el peso del plan de cada mes; sin plan (o plan a 0 en esos meses), a partes iguales
  if (hayProyeccion(p, k) && ultReal >= 0) {
    const quedan = m.slice(ultReal + 1), pesoPlan = quedan.reduce((s, x) => s + (x.plan || 0), 0);
    const peso = x => (conPlan && pesoPlan > 0 ? (x.plan || 0) / pesoPlan : 1 / quedan.length);
    let acum = pts[ultReal].real;
    const falta = k.EAC - acum;
    pts[ultReal].proy = acum;
    quedan.forEach((x, j) => { acum += falta * peso(x); pts[ultReal + 1 + j].proy = acum; });
  }

  const W = Math.max(cont.clientWidth, 360), H = alto, L = 58, R = 22, T = 14, B = 28;
  const maxY = Math.max(k.BAC, k.EAC, k.EACmax, pts[n - 1].prev || 0, cierrePL || 0, aReal) * 1.08;
  const X = i => L + (n === 1 ? (W - L - R) / 2 : i / (n - 1) * (W - L - R));
  const Y = v => T + (1 - v / maxY) * (H - T - B);
  const linea = (key) => {
    let d = '', on = false;
    pts.forEach((pt, i) => { if (pt[key] == null) { on = false; return; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(pt[key]).toFixed(1); on = true; });
    return d;
  };
  // Eje Y con 4 marcas "redondas"
  const paso = Math.pow(10, Math.floor(Math.log10(maxY / 4)));
  const st = [1, 2, 2.5, 5, 10].map(f => f * paso).find(s => maxY / s <= 5);
  let ejes = '';
  for (let v = 0; v <= maxY; v += st) ejes += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="num">${nf0.format(v / 1000)} k€</text>`;
  const salto = Math.max(1, Math.ceil(n / ((W - L - R) / 46)));
  pts.forEach((pt, i) => { if ((i % salto === 0 && n - 1 - i >= salto) || i === n - 1) ejes += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${mesTxt(pt.mes)}</text>`; });
  const yB = Y(k.BAC);
  const corteIdx = pts.findIndex(pt => pt.mes === fechaCorte.slice(0, 7));
  const yFin = pts[n - 1].prev != null ? pts[n - 1].prev : cierrePL;

  cont.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Coste acumulado de ${esc(p.nombre)}">
    ${ejes}
    <line x1="${L}" x2="${W - R}" y1="${yB}" y2="${yB}" stroke="var(--tx)" stroke-width="1" stroke-dasharray="2 3"/>
    <text x="${L + 6}" y="${yB - 5}" style="fill:var(--tx)">Presupuesto ${keur(k.BAC)}</text>
    ${corteIdx >= 0 && corteIdx < n - 1 ? `<line x1="${X(corteIdx)}" x2="${X(corteIdx)}" y1="${T}" y2="${H - B}" stroke="var(--tx2)" stroke-dasharray="1 3"/><text x="${X(corteIdx) + 4}" y="${T + 8}">corte</text>` : ''}
    ${conPlan ? `<path d="${linea('plan')}" fill="none" stroke="var(--plan)" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
    <path d="${linea('prev')}" fill="none" stroke="var(--s2)" stroke-width="2" stroke-dasharray="6 4"/>
    <path d="${linea('proy')}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-dasharray="4 4" opacity=".85"/>
    <path d="${linea('real')}" fill="none" stroke="var(--s1)" stroke-width="2.5"/>
    ${ultReal >= 0 ? `<circle cx="${X(ultReal)}" cy="${Y(pts[ultReal].real)}" r="4.5" fill="var(--s1)" stroke="var(--card)" stroke-width="2"/>` : ''}
    ${yFin != null ? `<circle cx="${X(n - 1)}" cy="${Y(yFin)}" r="4.5" fill="var(--s2)" stroke="var(--card)" stroke-width="2"/>
      <text x="${X(n - 1) - 8}" y="${Y(yFin) + ((pts[n - 1].proy != null ? yFin >= k.EAC : yFin > k.BAC) ? -10 : 18)}" text-anchor="end" class="etq-pl" style="fill:var(--tx);paint-order:stroke;stroke:var(--card);stroke-width:4px;stroke-linejoin:round">Previsión PL ${keur(yFin)}</text>` : ''}
    ${!k.cerrado ? `<g aria-label="Estimación central y rango de cierre según los métodos">
      ${k.EACmax - k.EACmin > 1 ? `<line x1="${X(n - 1) + 8}" x2="${X(n - 1) + 8}" y1="${Y(k.EACmax)}" y2="${Y(k.EACmin)}" stroke="var(--tx)" stroke-width="1.5"/>
      <line x1="${X(n - 1) + 4}" x2="${X(n - 1) + 12}" y1="${Y(k.EACmax)}" y2="${Y(k.EACmax)}" stroke="var(--tx)" stroke-width="1.5"/>
      <line x1="${X(n - 1) + 4}" x2="${X(n - 1) + 12}" y1="${Y(k.EACmin)}" y2="${Y(k.EACmin)}" stroke="var(--tx)" stroke-width="1.5"/>` : ''}
      <rect x="${X(n - 1) + 4}" y="${Y(k.EAC) - 4}" width="8" height="8" fill="var(--tx)" transform="rotate(45 ${X(n - 1) + 8} ${Y(k.EAC)})"/></g>` : ''}
    <line class="cruz" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--tx2)" visibility="hidden"/>
    <rect class="zona" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/>
  </svg>`);

  // Interacción: línea vertical + tooltip con los valores del mes
  const svg = cont.querySelector('svg'), cruz = svg.querySelector('.cruz');
  svg.querySelector('.zona').addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), xs = (e.clientX - r.left) / r.width * W;
    const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((xs - L) / (W - L - R) * (n - 1))));
    const pt = pts[i];
    cruz.setAttribute('x1', X(i)); cruz.setAttribute('x2', X(i)); cruz.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${mesTxt(pt.mes)} · acumulado</b>
      ${conPlan ? `<div><span><i style="background:var(--plan)"></i>Plan</span><span class="num">${eur(pt.plan)}</span></div>` : ''}
      ${pt.real != null ? `<div><span><i style="background:var(--s1)"></i>Real</span><span class="num">${eur(pt.real)}</span></div>` : ''}
      ${pt.prev != null && pt.real == null ? `<div><span><i style="background:var(--s2)"></i>Previsión</span><span class="num">${eur(pt.prev)}</span></div>` : ''}
      ${pt.proy != null && pt.real == null ? `<div><span><i style="background:var(--s1);opacity:.6"></i>Proyección</span><span class="num">${eur(pt.proy)}</span></div>` : ''}
      ${i === n - 1 && cierrePL != null ? `<div><span><i style="background:var(--s2)"></i>Cierre según el PL</span><span class="num">${eur(cierrePL)}</span></div>` : ''}`;
    tip.hidden = false;
    const px = X(i) / W * r.width;
    tip.style.left = (px > r.width / 2 ? px - tip.offsetWidth - 12 : px + 12) + 'px';
    tip.style.top = '10px';
  });
  svg.querySelector('.zona').addEventListener('mouseleave', () => { tip.hidden = true; cruz.setAttribute('visibility', 'hidden'); });
}

// ---------- Arranque ----------
if (location.hash === '#metodo') mostrarVista('metodo');

// Si cambia el tamaño de la ventana, se redibujan los gráficos con el nuevo ancho
let _t; window.addEventListener('resize', () => { clearTimeout(_t); _t = setTimeout(() => { if (window.repintarMiProyecto) window.repintarMiProyecto(); if (window.repintarMiCartera) window.repintarMiCartera(); }, 200); });
