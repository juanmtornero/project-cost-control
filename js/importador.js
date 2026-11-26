// ============================================================
// IMPORTADOR: convierte las pestañas del Excel en los datos de
// un proyecto y comprueba que sean correctos.
// ------------------------------------------------------------
// Repite las mismas comprobaciones que la pestaña "Comprobación"
// de la plantilla. La hoja ya las hace, pero el importador las
// vuelve a hacer porque al pegar datos o al usar otro Excel esas
// reglas se pueden saltar.
//   - Error: impide analizar el proyecto (los datos no son fiables).
//   - Aviso: deja continuar, pero conviene revisarlo.
// Solo hay lógica: no toca la pantalla (eso lo hace mi-proyecto.js).
// ============================================================

// Pestañas y columnas que debe tener el archivo (en el orden de la plantilla)
const PLANTILLA = {
  'Proyecto':     { obligatoria: true,  columnas: ['Campo', 'Valor'] },
  'Presupuesto':  { obligatoria: true,  columnas: ['Partida', 'Tipo', 'Horas presupuestadas', 'Tarifa', 'Importe presupuestado'] },
  'Real':         { obligatoria: true,  columnas: ['Mes', 'Partida', 'Horas', 'Importe'] },
  'Previsión':    { obligatoria: false, columnas: ['Partida', 'Horas pendientes', 'Importe pendiente', 'Comprometido'] },
  'Plan mensual': { obligatoria: false, columnas: ['Mes', 'Importe planificado'] }
};
const PRIMERA_FILA = 3; // fila 1 = cabecera, fila 2 = explicaciones

// Compara textos sin mayúsculas, tildes, asteriscos ni lo que va entre paréntesis
const normal = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\*/g, '').trim().toLowerCase();

// ---------- Pequeñas ayudas sobre valores de celda ----------
const vacio = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const esNum = v => typeof v === 'number' && isFinite(v);
const esError = v => v !== null && typeof v === 'object' && 'error' in v;
const texto = v => (vacio(v) || esError(v) ? '' : String(v).trim());
// Una fecha válida es un número de Excel entre los años 1990 y 2100
const esFecha = v => esNum(v) && v >= 32874 && v <= 73051;
const iso = v => (esFecha(v) ? fechaExcel(v) : null);           // "2026-09-01"
const mesDe = v => (esFecha(v) ? fechaExcel(v).slice(0, 7) : null); // "2026-09"
const miles = n => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }).format(Math.round(n));
const sumarMes = m => { const [a, n] = m.split('-').map(Number); return n === 12 ? `${a + 1}-01` : `${a}-${String(n + 1).padStart(2, '0')}`; };
const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesCorto = m => MESES_C[+m.slice(5) - 1] + ' ' + m.slice(0, 4);
const verValor = v => (esError(v) ? v.error : typeof v === 'number' ? String(v).replace('.', ',') : String(v));

// ---------- 1. Estructura: ¿es la plantilla? ----------
function comprobarEstructura(hojas) {
  const errores = [];
  const nombres = Object.keys(hojas);
  for (const [pestana, def] of Object.entries(PLANTILLA)) {
    const real = nombres.find(n => normal(n) === normal(pestana));
    if (!real) {
      if (def.obligatoria) errores.push(`No se encuentra la pestaña «${pestana}». Usa la plantilla descargable y no cambies el nombre de las pestañas.`);
      continue;
    }
    const cab = (hojas[real][1] || []).map(normal);
    // La fila 2 son explicaciones (texto). Si tiene números o fechas, es que se borró y los datos empiezan en la 2
    if (pestana !== 'Proyecto' && (hojas[real][2] || []).slice(0, def.columnas.length).some(v => typeof v === 'number'))
      errores.push(`En la pestaña «${pestana}», la fila 2 tiene datos: parece que se borró la fila de explicaciones y la primera fila de datos no se leería. Vuelve a insertar una fila 2 (puede ir vacía) para que los datos empiecen en la fila 3.`);
    // En Proyecto los valores se leen por posición (B2 a B9): comprobamos que las etiquetas no se hayan movido
    if (pestana === 'Proyecto') {
      const etiquetas = ['Nombre del proyecto', 'Cliente', 'Project Lead', 'Fecha de inicio', 'Fecha de fin', 'Fecha de corte', 'Avance', 'Moneda'];
      const mal = etiquetas.findIndex((e, i) => !normal((hojas[real][i + 2] || [])[0]).startsWith(normal(e)));
      if (mal >= 0) errores.push(`En la pestaña «Proyecto», la fila ${mal + 2} debería ser «${etiquetas[mal]}». No añadas, borres ni muevas filas en esa pestaña.`);
    }
    def.columnas.forEach((col, i) => {
      if (!cab[i] || !cab[i].startsWith(normal(col)))
        errores.push(`En la pestaña «${pestana}», la columna ${String.fromCharCode(65 + i)} debería llamarse «${col}». No cambies ni muevas las columnas de la plantilla.`);
    });
  }
  return errores;
}
const existeHoja = (hojas, nombre) => Object.keys(hojas).some(n => normal(n) === normal(nombre));
const hoja = (hojas, nombre) => hojas[Object.keys(hojas).find(n => normal(n) === normal(nombre))] || [];

// Filas de datos (desde la fila 3) que tienen algo escrito en las columnas indicadas
function filasConDatos(filas, nCols) {
  const out = [];
  for (let f = PRIMERA_FILA; f < filas.length; f++) {
    const r = filas[f] || [];
    const celdas = Array.from({ length: nCols }, (_, i) => r[i]);
    if (celdas.some(v => !vacio(v))) out.push({ fila: f, c: celdas });
  }
  return out;
}

// ---------- 2. Leer y comprobar ----------
function importarProyecto(hojas) {
  const estructura = comprobarEstructura(hojas);
  // Fórmulas sin calcular en las pestañas que se leen: los valores no estarían en el archivo
  const sinCalc = Object.entries(PLANTILLA).filter(([n, d]) => existeHoja(hojas, n) &&
    (hoja(hojas, n).sinCalcular || []).some(c => c.col < (n === 'Proyecto' ? 2 : d.columnas.length))).map(([n]) => n);
  if (sinCalc.length) estructura.push(`El archivo tiene fórmulas sin calcular en ${sinCalc.map(n => '«' + n + '»').join(', ')}: el programa que lo guardó no guardó sus resultados. Ábrelo en Google Sheets o Excel y descárgalo de nuevo como .xlsx.`);
  if (estructura.length) return { ok: false, estructura, comprobaciones: [] };

  // --- Proyecto (formulario vertical: valores en la columna B, filas 2 a 9) ---
  const fp = hoja(hojas, 'Proyecto');
  const B = n => (fp[n] || [])[1];
  const pr = { nombre: B(2), cliente: B(3), pl: B(4), inicio: B(5), fin: B(6), corte: B(7), avance: B(8), moneda: B(9) };

  // --- Presupuesto ---
  const partidas = filasConDatos(hoja(hojas, 'Presupuesto'), 5).map(({ fila, c }) => ({
    fila, nombre: texto(c[0]), tipo: texto(c[1]), horas: c[2], tarifa: c[3], importe: c[4], raw: c
  }));
  const porNombre = new Map();
  partidas.forEach(p => { if (p.nombre && !porNombre.has(p.nombre)) porNombre.set(p.nombre, p); });
  const tipoDe = nombre => (porNombre.get(nombre) || {}).tipo;

  // --- Real ---
  const real = filasConDatos(hoja(hojas, 'Real'), 4).map(({ fila, c }) => ({
    fila, mes: c[0], partida: texto(c[1]), horas: c[2], importe: c[3], raw: c,
    comentario: texto((hoja(hojas, 'Real')[fila] || [])[4])
  }));

  // --- Previsión (la columna A es una fórmula: puede venir vacía o con error) ---
  const prevision = filasConDatos(hoja(hojas, 'Previsión'), 4).map(({ fila, c }) => ({
    fila, partidaRaw: c[0], partida: texto(c[0]), horas: c[1], importe: c[2], comprometidoRaw: c[3], comprometido: normal(c[3]) === 'si'
  }));
  const prevConCifra = prevision.filter(p => !vacio(p.horas) || !vacio(p.importe));
  const usaPrevision = prevConCifra.length > 0;

  // --- Plan mensual ---
  const plan = filasConDatos(hoja(hojas, 'Plan mensual'), 2).map(({ fila, c }) => ({ fila, mes: c[0], importe: c[1] }));
  const usaPlan = plan.some(p => !vacio(p.importe));

  // Fechas de referencia
  const inicioOk = esFecha(pr.inicio), finOk = esFecha(pr.fin);
  const mesInicio = mesDe(pr.inicio), mesFin = mesDe(pr.fin);
  const corteOk = esFecha(pr.corte);
  // Último mes válido en Real: el fin del proyecto o la fecha de corte si es posterior (proyecto alargado)
  const mesLimiteReal = [mesFin, corteOk ? mesDe(pr.corte) : null].filter(Boolean).sort().pop();
  const diaUno = v => esFecha(v) && fechaExcel(v).endsWith('-01');

  // ---------- Lista de comprobaciones ----------
  // Cada una: pestaña, texto, tipo (Error/Aviso), qué hacer, y la lista de filas afectadas.
  // Una fila afectada puede llevar un detalle (el valor que falla) para encontrarla antes.
  const C = [];
  const add = (pestana, que, tipo, hacer, filas) => C.push({ pestana, que, tipo, hacer, filas });
  const unica = (cond, fila) => (cond ? [{ fila }] : []);

  // Proyecto
  add('Proyecto', 'Nombre del proyecto informado', 'Error', 'Escribe el nombre en Proyecto, celda B2', unica(!texto(pr.nombre), 2));
  add('Proyecto', 'Fechas de inicio y fin válidas y en orden', 'Error', 'Revisa las celdas B5 y B6 de Proyecto',
    unica(!(inicioOk && finOk && pr.fin > pr.inicio), 5));
  add('Proyecto', 'Fecha de corte informada y válida (no anterior al inicio)', 'Error', 'Escribe en B7 de Proyecto la fecha hasta la que cuentan los datos reales (por ejemplo, el último día del mes cerrado)',
    unica(!(corteOk && (!inicioOk || Math.floor(pr.corte) >= Math.floor(pr.inicio))), 7));
  add('Proyecto', 'Fecha de corte posterior a la fecha de fin prevista', 'Aviso', 'Si el proyecto se ha alargado, es correcto; revisa la fecha de fin. El método «ritmo de gasto» no se podrá calcular porque no quedan meses',
    unica(corteOk && finOk && Math.floor(pr.corte) > Math.floor(pr.fin), 7));
  const finDeMes = v => { const d = new Date(Date.UTC(1899, 11, 30) + (Math.floor(v) + 1) * 86400000); return d.getUTCDate() === 1; };
  add('Proyecto', 'Fecha de corte que no es el último día del mes', 'Error', 'Los datos reales y el plan son mensuales: la fecha de corte tiene que ser el último día de un mes cerrado (por ejemplo, 31/10/2026). Un corte a mitad de mes mezclaría un mes incompleto con el plan del mes entero',
    unica(corteOk && !finDeMes(pr.corte), 7));
  add('Proyecto', 'Fecha de corte en el futuro', 'Aviso', 'La fecha de corte es posterior a hoy: ese mes todavía no ha terminado y sus datos reales estarán incompletos. Revisa que sea correcta',
    unica(corteOk && iso(pr.corte) > (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(new Date()), 7));
  add('Proyecto', 'Avance entre 0 y 100', 'Error', 'Escribe el avance en la celda B8, sin el símbolo %',
    unica(!(esNum(pr.avance) && pr.avance >= 0 && pr.avance <= 100), 8));
  add('Proyecto', 'Avance escrito como fracción (p. ej. 0,62 en vez de 62)', 'Aviso', 'Comprueba que el avance no sea 100 veces menor',
    unica(esNum(pr.avance) && pr.avance > 0 && pr.avance <= 1, 8));
  add('Proyecto', 'Moneda informada y en euros', 'Error', 'Escribe EUR en la celda B9: en esta versión todos los importes son en euros',
    unica(!['eur', '€', 'euro', 'euros'].includes(normal(pr.moneda)), 9));

  // Presupuesto
  add('Presupuesto', 'Hay al menos una partida', 'Error', 'Añade las partidas del presupuesto', unica(!partidas.some(p => p.nombre), PRIMERA_FILA));
  add('Presupuesto', 'Filas sin partida o con tipo distinto de Horas / Gasto', 'Error', 'Completa la partida y elige el tipo del desplegable',
    partidas.filter(p => !p.nombre || !['Horas', 'Gasto'].includes(p.tipo)).map(p => ({ fila: p.fila, det: p.tipo && !['Horas', 'Gasto'].includes(p.tipo) ? p.tipo : '' })));
  add('Presupuesto', 'Partidas de horas sin horas o sin tarifa', 'Error', 'Completa las horas y la tarifa',
    partidas.filter(p => p.tipo === 'Horas' && (!esNum(p.horas) || !esNum(p.tarifa))).map(p => ({ fila: p.fila, det: p.nombre })));
  add('Presupuesto', 'Partidas de gasto sin importe', 'Error', 'Completa el importe',
    partidas.filter(p => p.tipo === 'Gasto' && !esNum(p.importe)).map(p => ({ fila: p.fila, det: p.nombre })));
  add('Presupuesto', 'Cifras en la columna que no corresponde al tipo', 'Error', 'Borra la cifra sobrante: horas y tarifa solo en partidas de horas; importe solo en gastos',
    partidas.filter(p => (p.tipo === 'Horas' && !vacio(p.importe)) || (p.tipo === 'Gasto' && (!vacio(p.horas) || !vacio(p.tarifa)))).map(p => ({ fila: p.fila, det: p.nombre })));
  add('Presupuesto', 'Partidas repetidas', 'Error', 'Cambia el nombre de una de ellas',
    partidas.filter(p => p.nombre && partidas.filter(q => q.nombre === p.nombre).length > 1).map(p => ({ fila: p.fila, det: p.nombre })));
  const clave = n => normal(n).replace(/\s+/g, ' ');
  add('Presupuesto', 'Partidas que solo se diferencian en mayúsculas, tildes o espacios', 'Error', 'Usa un nombre claramente distinto o únelas en una sola partida',
    partidas.filter(p => p.nombre && partidas.some(q => q !== p && q.nombre && q.nombre !== p.nombre && clave(q.nombre) === clave(p.nombre))).map(p => ({ fila: p.fila, det: p.nombre })));
  add('Presupuesto', 'Partidas con presupuesto 0', 'Aviso', 'Si es trabajo no previsto, es correcto; si no, revisa las horas, la tarifa o el importe',
    partidas.filter(p => p.nombre && ((p.tipo === 'Horas' && p.horas === 0) || (p.tipo === 'Gasto' && p.importe === 0))).map(p => ({ fila: p.fila, det: p.nombre })));
  add('Presupuesto', 'Valores no numéricos o negativos', 'Error', 'Escribe solo números positivos (la tarifa, mayor que 0)',
    partidas.filter(p => [p.horas, p.tarifa, p.importe].some(v => !vacio(v) && (!esNum(v) || v < 0)) || (esNum(p.tarifa) && p.tarifa <= 0))
      .map(p => ({ fila: p.fila, det: [p.horas, p.tarifa, p.importe].filter(v => !vacio(v) && (!esNum(v) || v <= 0)).map(verValor).join(', ') })));

  // Real
  add('Real', 'Hay al menos una fila de datos reales', 'Error', 'Pega las imputaciones del proyecto', unica(!real.some(r => r.partida), PRIMERA_FILA));
  add('Real', 'Filas sin mes o sin partida', 'Error', 'Completa el mes y la partida',
    real.filter(r => vacio(r.mes) || !r.partida).map(r => ({ fila: r.fila })));
  add('Real', 'Filas sin horas ni importe', 'Error', 'Escribe las horas o el importe',
    real.filter(r => r.partida && vacio(r.horas) && vacio(r.importe)).map(r => ({ fila: r.fila, det: r.partida })));
  add('Real', 'Mes no válido (no es día 1 o está fuera del proyecto)', 'Error', 'Usa el día 1 del mes, entre el inicio del proyecto y su fin (o la fecha de corte si es posterior)',
    real.filter(r => !vacio(r.mes) && (!diaUno(r.mes) || (mesInicio && mesDe(r.mes) < mesInicio) || (mesLimiteReal && mesDe(r.mes) > mesLimiteReal)))
      .map(r => ({ fila: r.fila, det: esFecha(r.mes) ? iso(r.mes).split('-').reverse().join('/') : verValor(r.mes) })));
  add('Real', 'Partida que no existe en Presupuesto', 'Error', 'Elige la partida del desplegable',
    real.filter(r => r.partida && !porNombre.has(r.partida)).map(r => ({ fila: r.fila, det: r.partida })));
  add('Real', 'Horas en partida de gasto o importe en partida de horas', 'Error', 'Mueve la cifra a su columna',
    real.filter(r => (tipoDe(r.partida) === 'Horas' && !vacio(r.importe)) || (tipoDe(r.partida) === 'Gasto' && !vacio(r.horas))).map(r => ({ fila: r.fila, det: r.partida })));
  add('Real', 'Valores no numéricos', 'Error', 'Escribe solo números',
    real.filter(r => [r.horas, r.importe].some(v => !vacio(v) && !esNum(v))).map(r => ({ fila: r.fila, det: [r.horas, r.importe].filter(v => !vacio(v) && !esNum(v)).map(verValor).join(', ') })));
  // Correcciones negativas: el total de cada partida (en su unidad: horas o euros) no puede quedar negativo
  const totalReal = p => real.filter(r => r.partida === p.nombre).reduce((s, r) => s + (p.tipo === 'Horas' ? (esNum(r.horas) ? r.horas : 0) : (esNum(r.importe) ? r.importe : 0)), 0);
  add('Real', 'Partidas con total real negativo (correcciones mayores que lo imputado)', 'Error', 'Revisa las correcciones negativas de esa partida (la fila indicada es la del Presupuesto)',
    partidas.filter(p => p.nombre && totalReal(p) < 0).map(p => ({ fila: p.fila, det: p.nombre })));
  add('Real', 'Meses posteriores a la fecha de corte (no se contarán)', 'Aviso', 'Mueve la fecha de corte o ignóralo',
    real.filter(r => corteOk && esFecha(r.mes) && r.mes > pr.corte).map(r => ({ fila: r.fila })));
  const mesCorteChk = corteOk ? mesDe(pr.corte) : null;
  const mesesConReal = new Set(real.filter(r => esFecha(r.mes) && (esNum(r.horas) || esNum(r.importe))).map(r => mesDe(r.mes)));
  add('Real', 'No hay coste real hasta la fecha de corte', 'Aviso', 'Revisa la fecha de corte o los meses de Real: sin coste real no se pueden calcular la eficiencia ni el ritmo de gasto',
    corteOk && real.some(r => r.partida) && ![...mesesConReal].some(m => m <= mesCorteChk) ? [{ fila: null, det: 'Proyecto, celda B7' }] : []);
  const huecos = [];
  if (inicioOk && corteOk && mesInicio <= mesCorteChk) {
    for (let m = mesInicio; m <= mesCorteChk && huecos.length < 60; m = sumarMes(m)) if (!mesesConReal.has(m)) huecos.push(m);
  }
  add('Real', 'Meses sin ningún dato real entre el inicio y la fecha de corte', 'Aviso', 'Si ese mes no hubo actividad, es correcto. Si faltan imputaciones, añádelas: un mes vacío cuenta como 0 €',
    huecos.length ? [{ fila: null, det: huecos.map(mesCorto).join(', ') }] : []);
  add('Real', 'El avance es mayor que 0 % pero no hay coste real', 'Aviso', 'Revisa el avance o los datos reales',
    unica(esNum(pr.avance) && pr.avance > 0 && corteOk && ![...mesesConReal].some(m => m <= mesCorteChk), 8));
  add('Real', 'Hay gasto real pero el avance es 0 %', 'Aviso', 'Revisa el avance: con 0 % no se puede estimar el cierre por tendencia',
    unica(pr.avance === 0 && real.some(r => esNum(r.horas) || esNum(r.importe)), 8));

  // Presupuesto total (en euros) para las comprobaciones que lo necesitan
  const BAC = partidas.reduce((s, p) => s + (p.tipo === 'Horas' ? (esNum(p.horas) && esNum(p.tarifa) ? p.horas * p.tarifa : 0) : (esNum(p.importe) ? p.importe : 0)), 0);
  add('Presupuesto', 'El presupuesto total es mayor que 0', 'Error', 'Revisa las horas, tarifas e importes: sin presupuesto no se pueden calcular los indicadores',
    unica(partidas.some(p => p.nombre) && !(BAC > 0), PRIMERA_FILA));

  // Previsión
  add('Previsión', 'Sin previsión del Project Lead', 'Aviso', existeHoja(hojas, 'Previsión') ? 'Si la rellenas, se calcula el método «Previsión del Project Lead»; sin ella ese método queda fuera' : 'Falta la pestaña Previsión: el método «Previsión del Project Lead» queda fuera',
    !usaPrevision ? [{ fila: null, det: existeHoja(hojas, 'Previsión') ? 'pestaña vacía' : 'no hay pestaña' }] : []);
  add('Previsión', 'Partidas repetidas en la Previsión', 'Error', 'Cada partida debe aparecer una sola vez: vuelve a copiar la fórmula de la columna A',
    prevision.filter(p => p.partida && prevision.filter(q => q.partida === p.partida).length > 1).map(p => ({ fila: p.fila, det: p.partida })));
  add('Previsión', 'Comprometido sin indicar o con un valor distinto de Sí / No', 'Error', 'Elige Sí o No en la columna D de cada partida con importe pendiente',
    prevision.filter(p => p.partida && ([p.horas, p.importe].some(v => esNum(v) && v > 0) ? !['si', 'no'].includes(normal(p.comprometidoRaw)) : !vacio(p.comprometidoRaw) && !['si', 'no'].includes(normal(p.comprometidoRaw))))
      .map(p => ({ fila: p.fila, det: vacio(p.comprometidoRaw) ? p.partida + ': vacío' : p.partida + ': ' + verValor(p.comprometidoRaw) })));
  add('Previsión', 'Partidas del Presupuesto que no aparecen en la Previsión', 'Error', 'Vuelve a copiar la fórmula de la columna A de Previsión hasta la última partida',
    usaPrevision ? partidas.filter(p => p.nombre && !prevision.some(q => q.partida === p.nombre)).map(p => ({ fila: p.fila, det: p.nombre })) : []);
  add('Previsión', 'Partidas que no existen en el Presupuesto', 'Error', 'No escribas en la columna A: se rellena sola desde Presupuesto',
    prevision.filter(p => p.partida && !porNombre.has(p.partida)).map(p => ({ fila: p.fila, det: p.partida })));
  add('Previsión', 'Partidas sin cifra (si usas la Previsión, todas deben tener una; 0 si no falta nada)', 'Error', 'Escribe la cifra pendiente o 0',
    usaPrevision ? prevision.filter(p => p.partida && vacio(p.horas) && vacio(p.importe)).map(p => ({ fila: p.fila, det: p.partida })) : []);
  add('Previsión', 'Partidas rotas (se borró una fila de Presupuesto)', 'Error', 'Vuelve a copiar la fórmula de la columna A',
    prevision.filter(p => esError(p.partidaRaw)).map(p => ({ fila: p.fila })));
  add('Previsión', 'Cifra en la columna que no corresponde, o no numérica', 'Error', 'Horas en la columna B para partidas de horas; importe en la C para gastos; números mayores o iguales que 0',
    prevision.filter(p => p.partida && porNombre.has(p.partida) && (
      (tipoDe(p.partida) === 'Horas' ? !vacio(p.importe) : !vacio(p.horas)) ||
      [p.horas, p.importe].some(v => !vacio(v) && (!esNum(v) || v < 0)))).map(p => ({ fila: p.fila, det: p.partida })));
  add('Previsión', 'Avance 100 % pero queda previsión pendiente', 'Aviso', 'O el avance no es 100 % o la previsión debe ser 0',
    unica(pr.avance === 100 && prevision.some(p => (esNum(p.horas) && p.horas > 0) || (esNum(p.importe) && p.importe > 0)), 8));

  // Plan mensual
  add('Plan mensual', 'Sin plan mensual (línea base)', 'Aviso', 'Sin plan no se calculan el SPI ni el método «CPI × SPI», y la curva no muestra la línea base. La herramienta no lo inventa: si lo tienes, rellénalo',
    !usaPlan ? [{ fila: null, det: existeHoja(hojas, 'Plan mensual') ? 'pestaña vacía' : 'no hay pestaña' }] : []);
  add('Plan mensual', 'Filas con mes sin importe o importe sin mes (o importe no válido)', 'Error', 'Completa la fila o bórrala; el importe, un número mayor o igual que 0',
    plan.filter(p => vacio(p.mes) !== vacio(p.importe) || (!vacio(p.importe) && (!esNum(p.importe) || p.importe < 0))).map(p => ({ fila: p.fila })));
  add('Plan mensual', 'Mes no válido o repetido', 'Error', 'Día 1 del mes, sin repetir, dentro de las fechas del proyecto',
    plan.filter(p => !vacio(p.mes) && (!diaUno(p.mes) || plan.filter(q => mesDe(q.mes) === mesDe(p.mes)).length > 1 ||
      (mesInicio && mesDe(p.mes) < mesInicio) || (mesFin && mesDe(p.mes) > mesFin)))
      .map(p => ({ fila: p.fila, det: esFecha(p.mes) ? iso(p.mes).split('-').reverse().join('/') : verValor(p.mes) })));
  const totalPlan = plan.reduce((s, p) => s + (esNum(p.importe) ? p.importe : 0), 0);
  add('Plan mensual', 'El total del plan no cuadra con el presupuesto', 'Error', 'Ajusta los importes del plan',
    usaPlan && Math.round(totalPlan) !== Math.round(BAC) ? [{ fila: PRIMERA_FILA, det: `plan ${miles(totalPlan)} € frente a presupuesto ${miles(BAC)} €` }] : []);
  const mesesProyecto = inicioOk && finOk ? (+mesFin.slice(0, 4) - +mesInicio.slice(0, 4)) * 12 + (+mesFin.slice(5) - +mesInicio.slice(5)) + 1 : 0;
  add('Plan mensual', 'El plan no cubre todos los meses del proyecto', 'Aviso', 'Añade los meses que faltan (pueden ir a 0)',
    unica(usaPlan && mesesProyecto > 0 && plan.filter(p => esFecha(p.mes)).length < mesesProyecto, PRIMERA_FILA));

  // Filas ocultas con datos: se leen igual, pero quien mira el Excel no las ve
  for (const pest of ['Presupuesto', 'Real', 'Previsión', 'Plan mensual']) {
    const f = hoja(hojas, pest), ocultas = (f.ocultas || []).filter(n => n >= PRIMERA_FILA && (f[n] || []).some(v => !vacio(v)));
    add(pest, 'Filas ocultas con datos (se leen aunque no se vean)', 'Aviso', 'Muéstralas en el Excel y comprueba que deben contar', ocultas.map(n => ({ fila: n })));
  }

  const errores = C.filter(c => c.tipo === 'Error' && c.filas.length);
  const avisos = C.filter(c => c.tipo === 'Aviso' && c.filas.length);
  const ok = errores.length === 0;

  // ---------- 3. Si todo es correcto, preparar los datos limpios ----------
  let datos = null, resumen = null;
  if (ok) {
    // Fecha de corte: obligatoria y último día de mes (si no, es un error y no se llega aquí)
    const corte = iso(pr.corte);
    const mesCorte = corte.slice(0, 7);
    const lineas = partidas.map(p => {
      const filasP = real.filter(r => r.partida === p.nombre && mesDe(r.mes) <= mesCorte);
      const prev = prevision.find(q => q.partida === p.nombre) || {};
      if (p.tipo === 'Horas') {
        const horasReales = filasP.reduce((s, r) => s + (esNum(r.horas) ? r.horas : 0), 0);
        return { tipo: 'horas', concepto: p.nombre, tarifa: p.tarifa, horasPresupuesto: p.horas, horasReales,
                 horasPendientes: usaPrevision ? (prev.horas || 0) : null, comprometido: !!prev.comprometido };
      }
      const realE = filasP.reduce((s, r) => s + (esNum(r.importe) ? r.importe : 0), 0);
      return { tipo: 'gasto', concepto: p.nombre, presupuesto: p.importe, real: realE,
               pendiente: usaPrevision ? (prev.importe || 0) : null, comprometido: !!prev.comprometido };
    });
    // Real por mes (en euros), sumando varias filas del mismo mes y partida
    const realMes = {};
    real.forEach(r => {
      const p = porNombre.get(r.partida), m = mesDe(r.mes);
      if (m > mesCorte) return;
      realMes[m] = (realMes[m] || 0) + (p.tipo === 'Horas' ? (esNum(r.horas) ? r.horas : 0) * p.tarifa : (esNum(r.importe) ? r.importe : 0));
    });
    datos = {
      proyecto: { nombre: texto(pr.nombre), cliente: texto(pr.cliente), projectLead: texto(pr.pl),
                  inicio: iso(pr.inicio), fin: iso(pr.fin), corte, avance: pr.avance / 100, moneda: 'EUR' },
      lineas, realMes,
      plan: usaPlan ? plan.map(p => ({ mes: mesDe(p.mes), importe: p.importe })).sort((a, b) => a.mes < b.mes ? -1 : 1) : null,
      usaPrevision, usaPlan
    };
    const imp = l => l.tipo === 'horas'
      ? { pres: l.horasPresupuesto * l.tarifa, real: l.horasReales * l.tarifa, pend: (l.horasPendientes || 0) * l.tarifa }
      : { pres: l.presupuesto, real: l.real, pend: l.pendiente || 0 };
    const tot = lineas.reduce((s, l) => { const i = imp(l); s.BAC += i.pres; s.AC += i.real; s.ETC += i.pend; if (l.comprometido) s.comp += i.pend; return s; }, { BAC: 0, AC: 0, ETC: 0, comp: 0 });
    const meses = Object.keys(realMes).sort();
    resumen = {
      ...datos.proyecto,
      partidas: lineas.length,
      partidasHoras: lineas.filter(l => l.tipo === 'horas').length,
      partidasGasto: lineas.filter(l => l.tipo === 'gasto').length,
      BAC: tot.BAC, AC: tot.AC,
      filasReal: real.filter(r => mesDe(r.mes) <= mesCorte).length, primerMes: meses[0], ultimoMes: meses[meses.length - 1], nMesesReal: meses.length,
      filasFueraCorte: real.filter(r => mesDe(r.mes) > mesCorte).length,
      previsionPendiente: usaPrevision ? tot.ETC : null, previsionComprometida: usaPrevision ? tot.comp : null,
      planTotal: usaPlan ? totalPlan : null, planMeses: usaPlan ? plan.length : 0
    };
  }
  return { ok, estructura: [], comprobaciones: C, errores, avisos, datos, resumen };
}

if (typeof module !== 'undefined') {
  global.fechaExcel = global.fechaExcel || require('./lector-xlsx.js').fechaExcel;
  module.exports = { importarProyecto };
}
