// ============================================================
// CÁLCULO DE INDICADORES (KPIs)
// ------------------------------------------------------------
// Aquí solo hay fórmulas: reciben datos y devuelven números.
// No tocan la pantalla. Separarlo así permite revisar (y en el
// futuro probar automáticamente) los cálculos sin mirar el diseño.
// ============================================================

// Umbrales de la etiqueta de estado. Están juntos para cambiarlos en un solo sitio.
// La etiqueta depende solo de la desviación de la estimación central.
const UMBRALES = {
  desvRojo: -5,   // desviación peor que -5 % del presupuesto -> "Por encima"
  desvAmbar: 0    // desviación entre 0 % y -5 %             -> "Algo por encima"
};

// Los 5 métodos para estimar el coste al finalizar (EAC).
// Cada uno mira el proyecto desde un ángulo distinto; ninguno es "el bueno".
const METODOS = [
  { id: 'pl',     nombre: 'Previsión del Project Lead', formula: 'Real + lo que el Project Lead estima que falta',
    explica: 'El criterio de quien mejor conoce el proyecto.' },
  { id: 'cpi',    nombre: 'Eficiencia actual (CPI)', formula: 'Presupuesto ÷ CPI',
    explica: 'Si todo lo que queda se hace con la misma eficiencia que hasta ahora.' },
  { id: 'resto',  nombre: 'Resto según presupuesto', formula: 'Real + (presupuesto − valor ganado)',
    explica: 'Si los desvíos ya ocurridos no se repiten y lo que queda cuesta lo presupuestado.' },
  { id: 'cpispi', nombre: 'Eficiencia y plazo (CPI × SPI)', formula: 'Real + (presupuesto − valor ganado) ÷ (CPI × SPI)',
    explica: 'Además de la eficiencia, penaliza ir retrasado respecto al plan. Suele ser el más pesimista.' },
  { id: 'ritmo',  nombre: 'Ritmo de gasto mensual', formula: 'Real + media de los 3 últimos meses × meses que quedan',
    explica: 'Si se sigue gastando al ritmo de los últimos meses hasta la fecha de fin.' }
];

// Mediana: el valor del centro. Con un número par de valores, la media de los dos del centro.
function mediana(v) {
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
// Meses entre dos "AAAA-MM" (b - a)
const mesesEntre = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

// Suma presupuesto, real y pendiente de cada partida (en euros).
function importesLinea(l) {
  if (l.tipo === 'horas') {
    return {
      presupuesto: l.horasPresupuesto * l.tarifa,
      real: l.horasReales * l.tarifa,
      pendiente: l.horasPendientes == null ? null : l.horasPendientes * l.tarifa // null = sin previsión
    };
  }
  return { presupuesto: l.presupuesto, real: l.real, pendiente: l.pendiente };
}

// Calcula todos los indicadores de un proyecto.
// desestimados: lista de ids de métodos que el usuario ha decidido no tener en cuenta.
function calcularProyecto(p, fechaCorte, desestimados = []) {
  const corte = fechaCorte.slice(0, 7); // "2026-10"
  // Sin previsión del Project Lead (pestaña vacía): no se inventa lo pendiente, queda en null
  const sinPrevision = p.lineas.some(l => importesLinea(l).pendiente == null);
  let BAC = 0, AC = 0, ETC = sinPrevision ? null : 0;
  const partidas = p.lineas.map(l => {
    const imp = importesLinea(l);
    BAC += imp.presupuesto; AC += imp.real; if (!sinPrevision) ETC += imp.pendiente;
    const eac = p.estado === 'Cerrado' ? imp.real : imp.pendiente == null ? null : imp.real + imp.pendiente; // cerrado: lo real es lo final
    return { ...l, ...imp, eac, desviacion: eac == null ? null : imp.presupuesto - eac };
  });

  const consumidoPct = AC / BAC * 100;
  const EV = p.avance * BAC;                // valor ganado: lo que "vale" el trabajo hecho
  // Lo planificado hasta hoy. Sin plan mensual (plan = null en todos los meses) no hay PV ni SPI
  const sinPlan = !p.mensual.some(m => m.plan != null);
  const PV = sinPlan ? null : p.mensual.filter(m => m.mes <= corte).reduce((s, m) => s + (m.plan || 0), 0);
  const CPI = AC > 0 && EV > 0 ? EV / AC : null;   // eficiencia en coste
  const SPI = PV > 0 && EV > 0 ? EV / PV : null;   // eficiencia en plazo
  const cerrado = p.estado === 'Cerrado';

  // Ritmo de gasto: media de los 3 últimos meses con dato real, por los meses que quedan hasta el fin
  const reales = p.mensual.filter(m => m.mes <= corte && m.real != null).slice(-3);
  const mediaMes = reales.length ? reales.reduce((s, m) => s + m.real, 0) / reales.length : null;
  const mesesQuedan = Math.max(0, mesesEntre(corte, p.fin));

  // Resultado de cada método (null = no se puede calcular, con el motivo)
  const calc = {
    pl:     ETC != null ? [AC + ETC] : [null, 'Sin previsión del Project Lead (pestaña Previsión vacía)'],
    cpi:    CPI ? [BAC / CPI] : [null, 'Hace falta avance y coste real mayores que 0'],
    resto:  [AC + (BAC - EV)],
    cpispi: CPI && SPI ? [AC + (BAC - EV) / (CPI * SPI)]
          : [null, sinPlan ? 'Sin plan mensual (línea base)' : 'Hace falta avance, coste real y plan mayores que 0'],
    ritmo:  mediaMes !== null && mesesQuedan > 0 ? [AC + mediaMes * mesesQuedan]
          : [null, mesesQuedan > 0 ? 'Sin meses con coste real' : 'No quedan meses hasta la fecha de fin']
  };
  const metodos = METODOS.map(m => {
    // Proyecto cerrado: ya no se estima, el coste final es el real
    const [eac, motivo] = cerrado ? [AC] : calc[m.id];
    const disponible = eac != null;
    return { ...m, eac: disponible ? eac : null, motivo: motivo || '', disponible,
             activo: disponible && !desestimados.includes(m.id),
             desviacion: disponible ? BAC - eac : null };
  });
  // Si el usuario desestima todos, se usan todos los disponibles (siempre hay al menos "Resto según presupuesto")
  let activos = metodos.filter(m => m.activo);
  if (!activos.length) { metodos.forEach(m => (m.activo = m.disponible)); activos = metodos.filter(m => m.activo); }

  const valores = activos.map(m => m.eac);
  const EAC = mediana(valores);              // estimación central
  const EACmin = Math.min(...valores), EACmax = Math.max(...valores);
  const desviacion = BAC - EAC;              // + ahorro / − sobrecoste
  const desviacionPct = desviacion / BAC * 100;
  const EACpl = metodos[0].eac;              // previsión del Project Lead (para el gráfico y los mensajes)

  // Etiqueta: solo por la desviación de la estimación central
  // Se compara la desviación redondeada a un decimal, igual que se muestra (−0,04 % cuenta como 0,0 % = En línea)
  const desvMostrada = Math.round(desviacionPct * 10) / 10;
  const semaforo = desvMostrada < UMBRALES.desvRojo ? 'rojo' : desvMostrada < UMBRALES.desvAmbar ? 'ambar' : 'verde';

  return { BAC, AC, ETC, EAC, EACmin, EACmax, EACpl, EV, PV, CPI, SPI, desviacion, desviacionPct,
           consumidoPct, semaforo, cerrado, sinPlan, sinPrevision, partidas, metodos, nActivos: activos.length,
           nDisponibles: metodos.filter(m => m.disponible).length, mediaMes, mesesQuedan };
}

// Agrega los indicadores de varios proyectos (vista de cartera).
// El rango de la cartera suma los extremos de cada proyecto (todo sale bien / todo sale mal).
function calcularCartera(lista) {
  const t = lista.reduce((s, x) => {
    s.BAC += x.k.BAC; s.AC += x.k.AC; s.EAC += x.k.EAC; s.EACmin += x.k.EACmin; s.EACmax += x.k.EACmax; s[x.k.semaforo]++;
    return s;
  }, { BAC: 0, AC: 0, EAC: 0, EACmin: 0, EACmax: 0, verde: 0, ambar: 0, rojo: 0 });
  t.desviacion = t.BAC - t.EAC;
  t.desviacionPct = t.BAC ? t.desviacion / t.BAC * 100 : 0;
  t.consumidoPct = t.BAC ? t.AC / t.BAC * 100 : 0;
  return t;
}

if (typeof module !== 'undefined') module.exports = { calcularProyecto, calcularCartera, mediana, METODOS };
