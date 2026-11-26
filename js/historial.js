// ============================================================
// HISTORIAL DE CIERRES (v4): una "foto" de cada fecha de corte
// ------------------------------------------------------------
// Cada vez que se sube el Excel con una fecha de corte nueva, se
// guarda una foto con las cifras clave de ese mes. Con varias fotos
// se ve cómo cambia la estimación de cierre mes a mes, qué ha
// cambiado desde el corte anterior y si el plan o el presupuesto
// se han modificado entre un mes y otro.
// Aquí solo hay cálculos y HTML; guardar en el navegador lo hace
// mi-proyecto.js. Usa los formatos de app.js (eur, pct, fecha...).
// ============================================================

const TOL_EUR = 0.5; // diferencias menores que medio euro son redondeo, no cambios

// Foto de un corte. d = datos del importador, k = resultado de calcularProyecto
function fotoDesde(d, k, archivo) {
  const plan = d.usaPlan ? Object.fromEntries((d.plan || []).map(x => [x.mes, x.importe])) : null;
  return {
    corte: d.proyecto.corte, fin: d.proyecto.fin, archivo: archivo || '', guardado: new Date().toISOString(),
    avance: d.proyecto.avance, BAC: k.BAC, AC: k.AC, cerrado: k.cerrado,
    EAC: k.EAC, EACmin: k.EACmin, EACmax: k.EACmax, EACpl: k.EACpl, nActivos: k.nActivos,
    desviacion: k.desviacion, desviacionPct: k.desviacionPct, semaforo: k.semaforo,
    metodos: Object.fromEntries(k.metodos.map(m => [m.id, m.eac])),
    activos: k.metodos.filter(m => m.activo).map(m => m.id),
    plan,
    partidas: k.partidas.map(l => ({ c: l.concepto, t: l.tipo, p: l.presupuesto, r: l.real, e: l.eac }))
  };
}

// Dos fotos del mismo corte con las mismas cifras (para no reescribir sin necesidad)
const mismasCifras = (a, b) => {
  const sin = f => JSON.stringify({ ...f, guardado: '', archivo: '' });
  return sin(a) === sin(b);
};

// Inserta o sustituye la foto de su corte; la lista queda ordenada por fecha de corte
function ponerFoto(fotos, f) {
  const resto = fotos.filter(x => x.corte !== f.corte);
  resto.push(f);
  return resto.sort((a, b) => (a.corte < b.corte ? -1 : 1));
}

// La foto inmediatamente anterior a un corte (o null)
const fotoAnterior = (fotos, corte) => fotos.filter(x => x.corte < corte).pop() || null;

// Diferencias del plan mensual entre dos fotos: meses distintos y totales
function cambioPlan(ant, act) {
  if (!ant.plan && !act.plan) return null;
  if (!ant.plan) return { tipo: 'nuevo' };
  if (!act.plan) return { tipo: 'quitado' };
  const meses = [...new Set([...Object.keys(ant.plan), ...Object.keys(act.plan)])].sort();
  const distintos = meses.filter(m => Math.abs((ant.plan[m] || 0) - (act.plan[m] || 0)) > TOL_EUR);
  if (!distintos.length) return null;
  const tot = p => Object.values(p).reduce((s, v) => s + v, 0);
  return { tipo: 'cambiado', meses: distintos, antes: tot(ant.plan), ahora: tot(act.plan) };
}

const listaMeses = ms => {
  const t = ms.slice(0, 6).map(mesTxt);
  return (t.length > 1 ? t.slice(0, -1).join(', ') + ' y ' + t[t.length - 1] : t[0]) + (ms.length > 6 ? ` (y ${ms.length - 6} más)` : '');
};

// Avisos sobre los datos de base respecto al corte anterior: plan, presupuesto, fin, avance y coste que bajan.
// Se muestran arriba del panel y en el PDF. Formato de app.js: [clase, html]
function avisosHistorial(fotos, act) {
  const ant = fotoAnterior(fotos, act.corte);
  if (!ant) return [];
  const desde = `respecto al corte del ${fecha(ant.corte)}`, n = [];
  const cp = cambioPlan(ant, act);
  if (cp && cp.tipo === 'cambiado') n.push(['ambar', `<b>El plan mensual (línea base) ha cambiado ${desde}</b>: ${cp.meses.length === 1 ? `cambia el importe de ${listaMeses(cp.meses)}` : `cambian ${cp.meses.length} meses (${listaMeses(cp.meses)})`}${Math.abs(cp.ahora - cp.antes) > TOL_EUR ? `, y el total pasa de ${eur(cp.antes)} a ${eur(cp.ahora)}` : ', y el total no cambia'}. Si fue una re-planificación aprobada, es correcto; si no, revisa la pestaña Plan mensual.`]);
  if (cp && cp.tipo === 'quitado') n.push(['ambar', `<b>Este Excel no tiene plan mensual y el del corte del ${fecha(ant.corte)} sí lo tenía.</b> Sin plan no se calculan el SPI ni el método «CPI × SPI». Revisa si se ha borrado la pestaña Plan mensual por error.`]);
  if (cp && cp.tipo === 'nuevo') n.push(['nota', `Se ha añadido el plan mensual: el Excel del corte del ${fecha(ant.corte)} no lo tenía.`]);
  if (Math.abs(act.BAC - ant.BAC) > TOL_EUR) n.push(['ambar', `<b>El presupuesto ha cambiado ${desde}</b>: pasa de ${eur(ant.BAC)} a ${eur(act.BAC)} (${eurS(act.BAC - ant.BAC)}). Si se aprobó un cambio de alcance, es correcto. Las desviaciones de los cortes anteriores se calcularon con el presupuesto de entonces.`]);
  if (act.fin !== ant.fin) n.push(['nota', `La fecha de fin ha cambiado ${desde}: pasa del ${fecha(ant.fin)} al ${fecha(act.fin)}.`]);
  if (act.avance < ant.avance - 1e-9) n.push(['ambar', `<b>El avance ha bajado ${desde}</b>: de ${pct(ant.avance * 100)} a ${pct(act.avance * 100)}. Puede ser una revisión del avance; si no, revisa la celda B8 de Proyecto.`]);
  if (act.AC < ant.AC - TOL_EUR) n.push(['ambar', `<b>El coste real acumulado ha bajado ${desde}</b>: de ${eur(ant.AC)} a ${eur(act.AC)}. Puede deberse a correcciones en la pestaña Real; si no, revisa que estén todas las imputaciones.`]);
  return n;
}

// "Qué ha cambiado desde el corte anterior": lista de frases cortas (html)
function cambiosDesdeAnterior(fotos, act) {
  const ant = fotoAnterior(fotos, act.corte);
  if (!ant) return null;
  const sube = (d, cosa) => Math.abs(d) <= TOL_EUR ? `${cosa} no cambia` : `${cosa} ${d > 0 ? 'sube' : 'baja'} <b class="num ${d > 0 ? 'neg' : 'pos'}">${eur(Math.abs(d))}</b>`;
  const l = [];
  // Estimación (o coste final)
  if (act.cerrado && !ant.cerrado) l.push(`El proyecto se ha cerrado con un coste final de <b class="num">${eur(act.EAC)}</b>; en el corte anterior la estimación central era ${eur(ant.EAC)} (${sube(act.EAC - ant.EAC, 'el cierre').replace(/^el cierre /, '')}).`);
  else if (Math.abs(act.EAC - ant.EAC) <= TOL_EUR) l.push(`${act.cerrado ? 'Coste final' : 'Estimación central'}: sin cambios (<b class="num">${eur(act.EAC)}</b>).`);
  else l.push(`${act.cerrado ? 'Coste final' : 'Estimación central'}: de ${eur(ant.EAC)} a <b class="num">${eur(act.EAC)}</b> · ${sube(act.EAC - ant.EAC, act.cerrado ? 'el coste final' : 'la estimación')}.`);
  if (act.semaforo !== ant.semaforo) l.push(`La etiqueta pasa de «${SEM[ant.semaforo].txt}» a «${SEM[act.semaforo].txt}».`);
  // Gasto y avance del periodo
  const dAv = (act.avance - ant.avance) * 100;
  l.push(`Coste real del periodo: <b class="num">${eurS(act.AC - ant.AC) || '0 €'}</b> · avance de ${pct(ant.avance * 100)} a ${pct(act.avance * 100)} (${Math.abs(dAv) < 0.05 ? 'sin cambio' : `${dAv > 0 ? '+' : '−'}${nf1.format(Math.abs(dAv))} puntos`}).`);
  // Previsión del Project Lead
  if (!act.cerrado) {
    if (ant.EACpl != null && act.EACpl != null) l.push(`Previsión del Project Lead: de ${eur(ant.EACpl)} a <b class="num">${eur(act.EACpl)}</b> · ${sube(act.EACpl - ant.EACpl, 'la previsión')}.`);
    else if (ant.EACpl == null && act.EACpl != null) l.push(`El Project Lead ha añadido su previsión: cierre en <b class="num">${eur(act.EACpl)}</b> (el corte anterior no la tenía).`);
    else if (ant.EACpl != null && act.EACpl == null) l.push(`Este Excel no tiene previsión del Project Lead; en el corte anterior preveía cerrar en ${eur(ant.EACpl)}.`);
  }
  // Partidas: las que más mueven el cierre previsto (con previsión en las dos fotos) o, si no, las de más gasto del periodo
  const clave = x => x.t + '|' + x.c, previa = new Map(ant.partidas.map(x => [clave(x), x]));
  const conCierre = act.partidas.every(x => x.e != null) && ant.partidas.every(x => x.e != null);
  const top = (valor, titulo, txt) => {
    const lista = act.partidas.map(x => ({ x, v: valor(x, previa.get(clave(x))) })).filter(o => o.v != null && Math.abs(o.v) > TOL_EUR)
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3);
    if (lista.length) l.push(`${titulo}: ${lista.map(o => `${esc(o.x.c)} ${txt(o.v)}`).join(' · ')}.`);
  };
  if (conCierre && !act.cerrado) top((x, a) => (a ? x.e - a.e : null), 'Partidas que más cambian su cierre previsto', v => `<span class="num ${v > 0 ? 'neg' : 'pos'}">${eurS(v)}</span>`);
  else top((x, a) => (a ? x.r - a.r : null), 'Partidas que más cambian su gasto en el periodo', v => `<span class="num">${eurS(v)}</span>`);
  const nuevas = act.partidas.filter(x => !previa.has(clave(x))).map(x => esc(x.c));
  if (nuevas.length) l.push(`Partidas nuevas respecto al corte anterior: ${nuevas.join(', ')}.`);
  const actuales = new Set(act.partidas.map(clave)), quitadas = ant.partidas.filter(x => !actuales.has(clave(x))).map(x => esc(x.c));
  if (quitadas.length) l.push(`Partidas que estaban en el corte anterior y ya no están: ${quitadas.join(', ')}.`);
  return { ant, lineas: l };
}

// Tabla con una fila por corte (la del corte que se ve, resaltada)
function tablaEvolucion(fotos, corteActual, conQuitar) {
  const fila = f => `<tr class="${f.corte === corteActual ? 'actual' : ''}">
    <td>${fecha(f.corte)}${f.corte === corteActual && conQuitar ? ' <span class="det">(el que ves)</span>' : ''}${f.simulado ? ' <span class="det">(simulado)</span>' : ''}</td>
    <td class="r num">${pct(f.avance * 100)}</td><td class="r num">${eur(f.AC)}</td>
    <td class="r num">${eur(f.EAC)}${f.cerrado ? '<div class="proy"><span>coste final</span></div>' : ''}</td>
    <td class="r num">${f.cerrado || Math.round(f.EACmin / 100) === Math.round(f.EACmax / 100) ? '' : `${nf1.format(f.EACmin / 1000)} – ${keur(f.EACmax)}`}</td>
    <td class="r num">${f.cerrado || f.EACpl == null ? '<span class="det">—</span>' : eur(f.EACpl)}</td>
    <td class="r num ${cls(f.desviacion)}">${eurS(f.desviacion)}<div class="proy"><span>${pctS(f.desviacionPct)}</span></div></td>
    <td>${semaforo(f.semaforo)}</td>
    ${conQuitar ? `<td>${f.corte === corteActual ? '' : `<button type="button" class="boton mini" data-hist="quitar" data-corte="${f.corte}">Quitar</button>`}</td>` : ''}</tr>`;
  return `<table class="evolucion"><thead><tr><th>Corte</th><th class="r">Avance</th><th class="r">Coste real</th><th class="r">Estimación central</th><th class="r">Rango</th><th class="r">Previsión PL</th><th class="r">Desviación</th><th>Estado</th>${conQuitar ? '<th></th>' : ''}</tr></thead>
    <tbody>${fotos.map(fila).join('')}</tbody></table>`;
}

const leyendaEvolucion = fotos => `<div class="leyenda">
    <span><i style="border-color:var(--s1)"></i>Estimación central${fotos.some(f => f.cerrado) ? ' (coste final si está cerrado)' : ''}</span>
    ${fotos.some(f => !f.cerrado && f.EACmax - f.EACmin > 1) ? '<span><i style="border-color:var(--tx2);border-top-width:6px;opacity:.35"></i>Rango de los métodos</span>' : ''}
    ${fotos.some(f => !f.cerrado && f.EACpl != null) ? '<span><i style="border-color:var(--s2);border-top-style:dashed"></i>Previsión del Project Lead</span>' : ''}
    <span><i style="border-color:var(--tx);border-top-style:dotted"></i>Presupuesto</span></div>`;

// Gráfico de la evolución: estimación central, rango, previsión del PL y presupuesto en cada corte
function graficoEvolucion(fotos, cont, corteActual, alto = 240) {
  if (!cont || fotos.length < 2) return;
  const tip = cont.querySelector('.tooltip');
  const n = fotos.length, W = Math.max(cont.clientWidth, 320), H = alto, L = 58, R = 12, T = 14, B = 28, P = 24; // P: aire a cada lado
  const pl = f => (f.cerrado ? null : f.EACpl);
  const vals = fotos.flatMap(f => [f.EAC, f.BAC, f.cerrado ? f.EAC : f.EACmin, f.cerrado ? f.EAC : f.EACmax, pl(f)]).filter(v => v != null);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const margen = Math.max((hi - lo) * 0.12, hi * 0.02);
  lo = Math.max(0, lo - margen); hi += margen;
  const paso = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)));
  const st = [1, 2, 2.5, 5, 10].map(f => f * paso).find(s => (hi - lo) / s <= 5);
  lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
  // Eje horizontal proporcional al tiempo: si falta un mes entre dos cortes, el hueco se ve
  const mesN = f => +f.corte.slice(0, 4) * 12 + +f.corte.slice(5, 7), t0 = mesN(fotos[0]), tn = mesN(fotos[n - 1]);
  const X = i => L + P + (tn === t0 ? 0.5 : (mesN(fotos[i]) - t0) / (tn - t0)) * (W - L - R - 2 * P);
  const Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ruta = val => { let d = '', on = false; fotos.forEach((f, i) => { const v = val(f); if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); on = true; }); return d; };
  let ejes = '';
  for (let v = lo; v <= hi + st / 2; v += st) ejes += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="num">${nf0.format(v / 1000)} k€</text>`;
  // Etiquetas de mes: la última siempre; las demás solo si no se pisan con la anterior ni con la última
  let ultimaX = -1e9;
  fotos.forEach((f, i) => {
    const x = X(i);
    if (i === n - 1 || (x - ultimaX >= 46 && X(n - 1) - x >= 46)) { ejes += `<text x="${x}" y="${H - 8}" text-anchor="middle">${mesTxt(f.corte.slice(0, 7))}</text>`; ultimaX = x; }
  });
  const rangos = fotos.map((f, i) => f.cerrado || f.EACmax - f.EACmin <= 1 ? '' :
    `<rect x="${X(i) - 4}" y="${Y(f.EACmax)}" width="8" height="${Math.max(1, Y(f.EACmin) - Y(f.EACmax))}" rx="2" fill="var(--tx2)" opacity=".22"/>`).join('');
  const puntos = (val, color) => fotos.map((f, i) => val(f) == null ? '' : `<circle cx="${X(i)}" cy="${Y(val(f))}" r="${f.corte === corteActual ? 5.5 : 3.5}" fill="${color}" stroke="var(--card)" stroke-width="2"/>`).join('');
  const iAct = fotos.findIndex(f => f.corte === corteActual);
  cont.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de la estimación de cierre en cada corte">
    ${ejes}
    ${iAct >= 0 ? `<rect x="${X(iAct) - Math.min(14, P)}" y="${T}" width="${2 * Math.min(14, P)}" height="${H - T - B}" fill="var(--s1)" opacity=".06"/>` : ''}
    <path d="${ruta(f => f.BAC)}" fill="none" stroke="var(--tx)" stroke-width="1" stroke-dasharray="2 3"/>
    
    ${rangos}
    <path d="${ruta(pl)}" fill="none" stroke="var(--s2)" stroke-width="2" stroke-dasharray="6 4"/>${puntos(pl, 'var(--s2)')}
    <path d="${ruta(f => f.EAC)}" fill="none" stroke="var(--s1)" stroke-width="2.5"/>${puntos(f => f.EAC, 'var(--s1)')}
    <line class="cruz" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--tx2)" visibility="hidden"/>
    <rect class="zona" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/>
  </svg>`);
  if (!tip) return;
  const svg = cont.querySelector('svg'), cruz = svg.querySelector('.cruz');
  svg.querySelector('.zona').addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), xs = (e.clientX - r.left) / r.width * W;
    const i = fotos.reduce((m, _, j) => (Math.abs(X(j) - xs) < Math.abs(X(m) - xs) ? j : m), 0), f = fotos[i];
    cruz.setAttribute('x1', X(i)); cruz.setAttribute('x2', X(i)); cruz.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>Corte ${fecha(f.corte)}</b>
      <div><span><i style="background:var(--s1)"></i>${f.cerrado ? 'Coste final' : 'Estimación central'}</span><span class="num">${eur(f.EAC)}</span></div>
      ${!f.cerrado && f.EACmax - f.EACmin > 1 ? `<div><span><i style="background:var(--tx2);opacity:.4"></i>Rango</span><span class="num">${nf1.format(f.EACmin / 1000)} – ${keur(f.EACmax)}</span></div>` : ''}
      ${pl(f) != null ? `<div><span><i style="background:var(--s2)"></i>Previsión PL</span><span class="num">${eur(f.EACpl)}</span></div>` : ''}
      <div><span><i style="background:var(--tx)"></i>Presupuesto</span><span class="num">${eur(f.BAC)}</span></div>
      <div><span>Avance</span><span class="num">${pct(f.avance * 100)}</span></div>`;
    tip.hidden = false;
    const px = X(i) / W * r.width;
    tip.style.left = (px > r.width / 2 ? px - tip.offsetWidth - 12 : px + 12) + 'px';
    tip.style.top = '10px';
  });
  svg.querySelector('.zona').addEventListener('mouseleave', () => { tip.hidden = true; cruz.setAttribute('visibility', 'hidden'); });
}

// Tarjeta "Evolución de la estimación" de la pantalla Mi proyecto
function htmlEvolucion(fotos, corteActual) {
  const act = fotos.find(f => f.corte === corteActual);
  const botones = `<div class="acciones">
      <button type="button" class="boton" data-hist="descargar">Descargar copia del historial</button>
      <button type="button" class="boton" data-hist="cargar">Cargar una copia</button>
      <span class="det">El historial se guarda en este navegador. Descarga una copia para no perderlo si cambias de ordenador o borras los datos del navegador.</span></div>`;
  if (fotos.length < 2) return `<div class="card evol"><h2>Evolución de la estimación</h2>
    <p class="sub" style="margin:0">Cada vez que subas el Excel con una fecha de corte nueva se guarda una foto de las cifras de ese mes. Cuando haya al menos dos cortes, aquí verás cómo cambia la estimación de cierre y qué ha cambiado desde el mes anterior. Por ahora está guardado el corte del ${fecha(corteActual)}.</p>
    ${botones}</div>`;
  const cambios = act ? cambiosDesdeAnterior(fotos, act) : null;
  return `<div class="card evol"><h2>Evolución de la estimación</h2>
    <p class="sub">Una foto por fecha de corte (${fotos.length} guardadas), con los métodos que estaban activos en cada una. Pasa el ratón por el gráfico para ver cada corte.${fotos.some(f => f.simulado) ? ` Los cortes del ${fotos.filter(f => f.simulado).map(f => fecha(f.corte)).join(' y ')} son simulados a partir del Excel de ejemplo, para que se vea cómo funciona.` : ''}</p>
    ${cambios ? `<div class="cambios"><h3>Qué ha cambiado desde el corte del ${fecha(cambios.ant.corte)}</h3><ul>${cambios.lineas.map(t => `<li>${t}</li>`).join('')}</ul></div>`
      : `<p class="sub">El corte que ves (${fecha(corteActual)}) es el primero guardado: no hay uno anterior con el que comparar.</p>`}
    ${leyendaEvolucion(fotos)}
    <div class="grafico grafico-evol"><div class="tooltip" hidden></div></div>
    <details><summary>Ver todos los cortes en tabla</summary><div class="tabla-wrap">${tablaEvolucion(fotos, corteActual, true)}</div></details>
    ${botones}</div>`;
}

// ---------- Copia de seguridad (archivo .json) ----------
const COPIA_TIPO = 'control-presupuestario.historial';

function copiaDe(nombre, fotos, comentarios) {
  return { tipo: COPIA_TIPO, version: 1, proyecto: nombre, exportado: new Date().toISOString(), fotos, comentarios: comentarios || null };
}

// Comprueba una copia antes de cargarla. Devuelve { ok, error, copia }. No se rellena nada que falte: si algo no cuadra, se rechaza
function validarCopia(obj) {
  const mal = e => ({ ok: false, error: e });
  if (!obj || obj.tipo !== COPIA_TIPO) return mal('El archivo no es una copia del historial de esta herramienta.');
  if (obj.version !== 1) return mal('La copia es de una versión de la herramienta que no se reconoce.');
  if (typeof obj.proyecto !== 'string' || !obj.proyecto.trim()) return mal('La copia no indica a qué proyecto pertenece.');
  if (!Array.isArray(obj.fotos) || !obj.fotos.length) return mal('La copia no tiene ningún corte guardado.');
  const num = v => typeof v === 'number' && isFinite(v), numN = v => v === null || num(v);
  const fechaOk = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  for (const f of obj.fotos) {
    const ok = f && fechaOk(f.corte) && fechaOk(f.fin) && ['avance', 'BAC', 'AC', 'EAC', 'EACmin', 'EACmax', 'desviacion', 'desviacionPct'].every(c => num(f[c]))
      && numN(f.EACpl) && typeof f.cerrado === 'boolean' && ['verde', 'ambar', 'rojo'].includes(f.semaforo)
      && (f.plan === null || (typeof f.plan === 'object' && Object.values(f.plan).every(num)))
      && Array.isArray(f.partidas) && f.partidas.every(x => x && typeof x.c === 'string' && num(x.p) && num(x.r) && numN(x.e));
    if (!ok) return mal(`El corte ${f && typeof f.corte === 'string' ? fecha(f.corte) : '(sin fecha)'} de la copia está incompleto o dañado. No se ha cargado nada.`);
  }
  // Comentarios (opcionales): mismo formato que los de la pantalla
  const comOk = c => c && typeof c.texto === 'string' && typeof c.fecha === 'string' && !isNaN(new Date(c.fecha)) && fechaOk(c.corte);
  const cm = obj.comentarios;
  if (cm != null && !(typeof cm === 'object' && (cm.actual === null || comOk(cm.actual)) && Array.isArray(cm.anteriores) && cm.anteriores.every(comOk)))
    return mal('Los comentarios de la copia están dañados. No se ha cargado nada.');
  if (new Set(obj.fotos.map(f => f.corte)).size !== obj.fotos.length) return mal('La copia tiene dos fotos con la misma fecha de corte. No se ha cargado nada.');
  return { ok: true, copia: obj };
}

// Une una copia con lo guardado: se añaden los cortes que no están; los que ya están se dejan como en el navegador
function unirCopia(fotos, copia) {
  const tengo = new Set(fotos.map(f => f.corte));
  const nuevas = copia.fotos.filter(f => !tengo.has(f.corte));
  return { fotos: nuevas.reduce(ponerFoto, fotos.slice()), anadidas: nuevas.length, repetidas: copia.fotos.length - nuevas.length };
}

if (typeof module !== 'undefined') module.exports = { fotoDesde, mismasCifras, ponerFoto, fotoAnterior, cambioPlan, avisosHistorial, cambiosDesdeAnterior, validarCopia, unirCopia, copiaDe };
