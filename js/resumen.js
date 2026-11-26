// ============================================================
// RESUMEN EN PDF (v3): una página A4 con el estado del proyecto
// para llevar a la reunión de seguimiento.
// Se genera con la función de imprimir del navegador
// ("Guardar como PDF"): sin librerías y sin enviar datos a ningún sitio.
// Usa el panel y los formatos de app.js (mensajesPanel, graficoCurva, eur...).
// ============================================================

// Prepara el resumen en #resumen-print. extra = { archivo, avisos, comentario: { texto, fecha }, anteriores, fotos }
function prepararResumen(p, k, opc, extra = {}) {
  let hoja = document.getElementById('resumen-print');
  if (!hoja) { hoja = document.createElement('div'); hoja.id = 'resumen-print'; hoja.setAttribute('aria-hidden', 'true'); document.body.appendChild(hoja); }

  const msgs = mensajesPanel(p, k, opc);
  const hoy = hoyLocal();

  // Métodos: resultado y si se ha usado en la estimación central
  const filaMetodo = m => `<tr class="${m.activo ? '' : 'apagado'}"><td>${m.nombre}</td>
    <td class="r num">${m.disponible ? eur(m.eac) : '—'}</td>
    <td class="r num ${m.disponible ? cls(m.desviacion) : ''}">${m.disponible ? eurS(m.desviacion) : ''}</td>
    <td>${!m.disponible ? `No disponible (${m.motivo.charAt(0).toLowerCase() + m.motivo.slice(1)})` : m.activo ? 'Usado' : 'Descartado por el Project Lead'}</td></tr>`;

  // Detalle completo por partida: la misma tabla que en pantalla (puede ocupar más de una página)
  const notaPartidas = k.cerrado ? 'Proyecto cerrado: la desviación de cada partida es la final, presupuesto frente a coste real.'
    : k.sinPrevision ? 'Sin previsión del Project Lead no se sabe qué falta por gastar en cada partida, así que no se calcula su cierre ni su desviación.'
    : 'El pendiente y el cierre de cada partida son los de la previsión del Project Lead.';
  // Evolución de la estimación (v4): solo si hay al menos dos cortes guardados. Abre la segunda página
  const fotos = extra.fotos || [], act = fotos.find(f => f.corte === opc.corte);
  const camb = fotos.length > 1 && act ? cambiosDesdeAnterior(fotos, act) : null;
  const evol = fotos.length > 1 ? `<div class="r-evol"><h2>Evolución de la estimación (${fotos.length} cortes)</h2>
    ${camb ? `<p class="sub" style="margin-bottom:2px"><b>Qué ha cambiado desde el corte del ${fecha(camb.ant.corte)}</b></p><ul class="r-cambios">${camb.lineas.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
    ${leyendaEvolucion(fotos).replace('class="leyenda"', 'class="r-leyenda"')}
    <div class="grafico grafico-evol"></div>
    ${tablaEvolucion(fotos.slice(-12), opc.corte, false)}
    ${fotos.some(f => f.simulado) ? '<p class="sub">Los cortes marcados como simulados se han construido a partir del Excel de ejemplo.</p>' : ''}
    ${fotos.length > 12 ? `<p class="sub">Se muestran los 12 últimos cortes de ${fotos.length}.</p>` : ''}</div>` : '';
  const com = extra.comentario && extra.comentario.texto && extra.comentario.texto.trim();
  hoja.innerHTML = `
    <div class="r-cab"><span>Resumen de seguimiento · Control presupuestario</span><span>Fecha de corte ${fecha(opc.corte)} · Generado el ${fecha(hoy)}</span></div>
    <div class="r-titulo">
      <div><h1>${esc(p.nombre)}</h1>
        <p class="sub">${[p.cliente, p.projectLead ? 'Project Lead: ' + p.projectLead : '', `${mesTxt(p.inicio)} – ${mesTxt(p.fin)}`, p.estado, `avance ${pct(p.avance * 100)}`].filter(Boolean).map(esc).join(' · ')}</p></div>
      ${semaforo(k.semaforo)}
    </div>
    <div class="r-cifras">
      <div><span>Presupuesto</span><b class="num">${eur(k.BAC)}</b></div>
      <div><span>${k.cerrado ? 'Coste final' : 'Coste real a la fecha'}</span><b class="num">${eur(k.AC)}</b><small>${pct(k.consumidoPct)} del presupuesto</small></div>
      ${k.cerrado ? '' : `<div><span>Coste estimado al finalizar</span><b class="num">${eur(k.EAC)}</b><small>${k.nActivos > 1 ? `rango ${rangoK(k)} · ` : ''}${metodosTxt(k)}</small></div>`}
      <div><span>${k.cerrado ? 'Desviación final' : 'Desviación estimada'}</span><b class="num ${cls(k.desviacion)}">${eurS(k.desviacion)}</b><small>${pctS(k.desviacionPct)} sobre presupuesto</small></div>
    </div>
    ${msgs.map(([c, t]) => `<div class="msg ${c}">${t.replace(/<a href="#mi-evolucion">.*?<\/a>/, 'Detalle en la página 2.').replace(/<a [^>]*>(.*?)<\/a>/g, '$1')}</div>`).join('')}
    ${com ? `<div class="r-comentario"><h2>Comentario del Project Lead</h2><p>${esc(com).replace(/\n/g, '<br>')}</p>
      ${extra.comentario.fecha ? `<p class="sub">Escrito el ${fecha(hoyLocal(new Date(extra.comentario.fecha)))}</p>` : ''}</div>` : ''}
    ${(extra.anteriores || []).length ? `<div class="r-comentario r-anteriores"><h2>Comentarios anteriores</h2>
      ${extra.anteriores.map(c => `<p><b>Corte ${fecha(c.corte)}:</b> ${esc(c.texto).replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
    <h2>Coste acumulado</h2>
    <div class="grafico"><div class="tooltip" hidden></div></div>
    <div class="r-leyenda">${k.sinPlan ? '' : '<span><i class="l-plan"></i>Plan (línea base)</span>'}<span><i class="l-real"></i>Real</span>
      ${hayProyeccion(p, k) ? '<span><i class="l-proy"></i>Proyección hasta la estimación central (referencia visual)</span>' : ''}
      ${!k.cerrado && k.EACpl != null ? '<span><b class="punto"></b>Cierre según el Project Lead</span>' : ''}
      ${k.cerrado ? '' : '<span><b class="rombo"></b>Estimación central y rango</span>'}</div>
    <div class="r-dos">
      ${k.cerrado ? '' : `<div class="r-bloque"><h2>Cierre según cada método</h2>
        <table><thead><tr><th>Método</th><th class="r">Cierre</th><th class="r">Desviación</th><th>Uso</th></tr></thead>
        <tbody>${k.metodos.map(filaMetodo).join('')}</tbody>
        <tfoot><tr><td>Estimación central (${metodosTxt(k)})</td><td class="r num">${eur(k.EAC)}</td><td class="r num ${cls(k.desviacion)}">${eurS(k.desviacion)}</td><td></td></tr></tfoot></table></div>`}
      <div class="r-largo">${evol}<h2>Detalle por partida</h2><p class="sub" style="margin-bottom:4px">${notaPartidas}</p>${tablaPartidas(k)}</div>
    </div>
    <div class="r-pie">
      ${(extra.avisos || []).length ? `<p><b>Avisos del archivo:</b> ${extra.avisos.map(a => esc(a.que)).join(' · ')}</p>` : ''}
      <p>Datos del archivo «${esc(extra.archivo || '')}». Importes a coste interno. Generado con la herramienta de control presupuestario.</p>
    </div>`;
  // La curva se dibuja con el ancho de la hoja (la hoja está fuera de la vista en pantalla)
  graficoCurva(p, k, hoja.querySelector('.grafico'), opc.corte, 230);
  if (evol) graficoEvolucion(fotos, hoja.querySelector('.grafico-evol'), opc.corte, 170);
  return hoja;
}


// ============================================================
// RESUMEN DE CARTERA EN PDF (v5): todos los proyectos de "Mi cartera"
// lista: [{ p, k, fotos, foto }] · opc: { corte (el más reciente), filtro (texto o '') }
// ============================================================
function prepararResumenCartera(lista, opc) {
  let hoja = document.getElementById('resumen-print');
  if (!hoja) { hoja = document.createElement('div'); hoja.id = 'resumen-print'; hoja.setAttribute('aria-hidden', 'true'); document.body.appendChild(hoja); }
  const orden = ordenarCartera(lista), t = calcularCartera(lista);
  const nCerrados = lista.filter(x => x.k.cerrado).length, todosCerrados = lista.length > 0 && nCerrados === lista.length;
  const viejos = orden.filter(x => x.foto.corte < opc.corte);
  const cambio = x => {
    const ant = fotoAnterior(x.fotos, x.foto.corte);
    if (!ant) return '<span class="det">—</span>';
    const d = x.foto.EAC - ant.EAC;
    return Math.abs(d) <= 0.5 ? '<span class="det">sin cambio</span>' : `<span class="${d > 0 ? 'neg' : 'pos'}">${d > 0 ? '▲' : '▼'} ${eur(Math.abs(d))}</span><div class="proy"><span>desde ${fecha(ant.corte)}</span></div>`;
  };
  hoja.innerHTML = `
    <div class="r-cab"><span>Resumen de cartera · Control presupuestario</span><span>Corte más reciente ${fecha(opc.corte)} · Generado el ${fecha(hoyLocal())}</span></div>
    <div class="r-titulo"><div><h1>${opc.ejemplo ? 'Cartera de ejemplo (proyectos ficticios)' : 'Cartera de proyectos'}</h1>
      <p class="sub">${lista.length} proyecto${lista.length === 1 ? '' : 's'}${opc.filtro ? ' · ' + esc(opc.filtro) : ''}${nCerrados ? ` · ${nCerrados} cerrado${nCerrados > 1 ? 's' : ''}` : ''}</p></div>
      <div class="r-sems">${['rojo', 'ambar', 'verde'].filter(c => t[c]).map(c => `${semaforo(c)} <b class="num">${t[c]}</b>`).join(' ')}</div></div>
    <div class="r-cifras">
      <div><span>Presupuesto total</span><b class="num">${eur(t.BAC)}</b></div>
      <div><span>Coste real acumulado</span><b class="num">${eur(t.AC)}</b><small>${pct(t.consumidoPct)} del presupuesto</small></div>
      <div><span>${todosCerrados ? 'Coste final' : 'Coste estimado al finalizar'}</span><b class="num">${eur(t.EAC)}</b><small>${todosCerrados ? 'proyectos cerrados' : `rango ${nf1.format(t.EACmin / 1000)} – ${keur(t.EACmax)}`}</small></div>
      <div><span>${todosCerrados ? 'Desviación final' : 'Desviación estimada'}</span><b class="num ${cls(t.desviacion)}">${eurS(t.desviacion)}</b><small>${pctS(t.desviacionPct)} sobre presupuesto</small></div>
    </div>
    ${viejos.length ? `<div class="msg ambar"><b>No todos los datos son del mismo mes.</b> El corte más reciente es el ${fecha(opc.corte)}, pero ${viejos.map(x => `${esc(x.p.nombre)} (${fecha(x.foto.corte)})`).join(', ')} ${viejos.length > 1 ? 'tienen' : 'tiene'} un corte anterior.</div>` : ''}
    <h2>Desviación al cierre por proyecto</h2>
    <div class="grafico" id="r-graf-desv"></div>
    <h2>Proyectos</h2>
    <table class="r-cartera"><thead><tr><th>Proyecto</th><th>Estado</th><th class="r">Presupuesto</th><th class="r">Real</th><th class="r">Avance</th><th class="r">Coste al finalizar</th><th class="r">Desviación</th><th class="r">Cambio</th></tr></thead>
      <tbody>${orden.map(({ p, k, foto, fotos }) => `<tr>
        <td><b>${esc(p.nombre)}</b><div class="proy"><span>${[p.projectLead, 'corte ' + fecha(foto.corte) + (foto.corte < opc.corte ? ' (anterior)' : '')].filter(Boolean).map(esc).join(' · ')}</span></div></td>
        <td>${semaforo(k.semaforo)}<div class="proy"><span>${p.estado}</span></div></td>
        <td class="r num">${eur(k.BAC)}</td><td class="r num">${eur(k.AC)}<div class="proy"><span>${pct(k.consumidoPct)}</span></div></td>
        <td class="r num">${pct(p.avance * 100)}</td>
        <td class="r num">${eur(k.EAC)}<div class="proy"><span>${k.cerrado ? 'final (real)' : rangoK(k)}</span></div></td>
        <td class="r num ${cls(k.desviacion)}">${eurS(k.desviacion)}<div class="proy"><span>${pctS(k.desviacionPct)}</span></div></td>
        <td class="r num">${cambio({ fotos, foto })}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Total cartera</td><td class="r num">${eur(t.BAC)}</td><td class="r num">${eur(t.AC)}</td><td></td><td class="r num">${eur(t.EAC)}</td><td class="r num ${cls(t.desviacion)}">${eurS(t.desviacion)}</td><td></td></tr></tfoot></table>
    <div class="r-pie">
      <p>Estado: etiqueta según la desviación de la estimación central de cada proyecto (mediana de sus métodos activos). «Cambio»: cuánto ha variado la estimación desde el corte anterior guardado (▲ sube el coste, ▼ baja; «—», no hay un corte anterior guardado).</p>
      <p>Importes a coste interno. Generado con la herramienta de control presupuestario.</p>
    </div>`;
  graficoDesviacion(orden, hoja.querySelector('#r-graf-desv'), () => {}, p => p.nombre);
  return hoja;
}

// ============================================================
// IMPRIMIR Y DESCARGAR (lo usan el resumen de un proyecto y el de la cartera)
// ============================================================
  const nombreArchivo = n => n.replace(/[^\wáéíóúñÁÉÍÓÚÑ -]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'proyecto';
  // Guarda un archivo generado en la página. Dentro de la vista previa de claude.ai las descargas normales
  // están bloqueadas y se usa el permiso de descargas de la plataforma; en una web normal, un enlace de descarga.
  // Devuelve 'ok', 'no' (el usuario no aceptó) o 'error'
  async function guardarArchivo(nombre, datos, tipo) {
    const plataforma = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads').catch(() => null) : null;
    if (plataforma) {
      try { await plataforma.save({ filename: nombre, data: datos }); return 'ok'; }
      catch (e) { return e && e.code === 'declined' ? 'no' : 'error'; }
    }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([datos], { type: tipo }));
      a.download = nombre;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return 'ok';
    } catch (e) { return 'error'; }
  }

  // Resumen como página web suelta (un solo archivo .html con sus estilos), para abrirla e imprimirla
  // cuando el navegador no deja abrir la ventana de imprimir desde aquí (por ejemplo, en la vista previa de claude.ai)
  async function resumenComoHtml(hoja, titulo) {
    let css = '';
    for (const h of document.styleSheets) { try { css += [...h.cssRules].map(r => r.cssText).join('\n') + '\n'; } catch (e) { /* hoja no legible */ } }
    if (!css) { try { css = await (await fetch('css/styles.css')).text(); } catch (e) { css = ''; } }
    const copia = hoja.cloneNode(true); copia.removeAttribute('aria-hidden');
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style>
<style>
  :root { color-scheme: light; } html, body { background: #e9eaec !important; margin: 0; }
  body.imprimiendo-resumen #resumen-print { position: static; width: 186mm; max-width: calc(100% - 24px); margin: 12px auto 24px; padding: 12mm; box-sizing: border-box; box-shadow: 0 1px 6px rgba(0,0,0,.15); }
  .barra-imprimir { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 10px 16px; background: #1c3d6e; color: #fff; font: 14px/1.4 system-ui, sans-serif; }
  .barra-imprimir button { font: inherit; font-weight: 600; padding: 8px 14px; border-radius: 7px; border: 0; background: #fff; color: #1c3d6e; cursor: pointer; }
  @media print { html, body { background: #fff !important; } body.imprimiendo-resumen #resumen-print { width: auto; max-width: none; margin: 0; padding: 0; box-shadow: none; } }
</style></head>
<body class="imprimiendo-resumen"><div class="barra-imprimir"><span>Para guardarlo en PDF, pulsa el botón y elige «Guardar como PDF» como destino.</span><button type="button" onclick="window.print()">Imprimir o guardar como PDF</button></div>
${copia.outerHTML}</body></html>`;
  }


// Imprime lo que haya en #resumen-print. Si la ventana de imprimir no se abre (la vista previa de claude.ai
// la bloquea), descarga el resumen como página web: al abrirla, un botón imprime y permite guardarlo en PDF.
// aviso(html): dónde contar al usuario lo que ha pasado
function imprimirHoja(base, titulo, aviso) {
  // La clase hace que solo se imprima el resumen; se quita al cerrar el diálogo
  document.body.classList.add('imprimiendo-resumen');
  let abierto = false;
  const alAbrir = () => { abierto = true; };
  window.addEventListener('beforeprint', alAbrir, { once: true });
  window.addEventListener('afterprint', () => document.body.classList.remove('imprimiendo-resumen'), { once: true });
  aviso('');
  try { window.print(); } catch (e) { /* bloqueado: se resuelve abajo */ } // el navegador ofrece "Guardar como PDF"
  setTimeout(async () => {
    if (abierto) return;
    window.removeEventListener('beforeprint', alAbrir);
    document.body.classList.remove('imprimiendo-resumen');
    aviso('<div class="msg nota">Preparando el resumen…</div>');
    const r = await guardarArchivo(base + '.html', await resumenComoHtml(document.getElementById('resumen-print'), titulo), 'text/html');
    aviso(r === 'ok'
      ? '<div class="msg nota"><b>Aquí no se puede abrir la ventana de imprimir</b> (la vista previa de claude.ai la bloquea), así que se ha descargado el resumen como página web. Ábrela, pulsa «Imprimir o guardar como PDF» y elige «Guardar como PDF».</div>'
      : r === 'no' ? '<div class="msg nota">No se ha descargado el resumen.</div>'
      : '<div class="msg rojo">Este navegador no deja abrir la ventana de imprimir ni descargar archivos desde aquí. Abre la herramienta en su web para descargar el resumen.</div>');
  }, 400);
}

if (typeof module !== 'undefined') module.exports = { prepararResumen };
