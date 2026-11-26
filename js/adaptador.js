// ============================================================
// ADAPTADOR: del Excel importado al formato de los cálculos
// ------------------------------------------------------------
// El importador devuelve los datos tal como vienen del Excel.
// Los cálculos (kpis.js) esperan el mismo formato que los
// proyectos de ejemplo. Este archivo hace de puente, sin
// inventar nada: lo que falta queda en null y kpis.js lo
// marca como "no disponible".
// ============================================================

const sumarMesA = m => { const [a, n] = m.split('-').map(Number); return n === 12 ? `${a + 1}-01` : `${a}-${String(n + 1).padStart(2, '0')}`; };

// datos: resultado del importador (r.datos). estado: 'En curso' o 'Cerrado'.
function proyectoDesdeExcel(datos, estado = 'En curso') {
  const pr = datos.proyecto;
  const inicio = pr.inicio.slice(0, 7), fin = pr.fin.slice(0, 7), corte = pr.corte.slice(0, 7);
  const ultimo = fin > corte ? fin : corte; // si el proyecto se alargó, la curva llega hasta el corte
  const plan = new Map((datos.plan || []).map(x => [x.mes, x.importe]));

  // Un registro por mes, del inicio al último mes
  // real: hasta el corte, lo imputado (un mes sin datos cuenta 0 €, y el importador ya avisó); después, null
  // plan: lo del Plan mensual (0 si el mes no está); null en todos los meses si no hay plan
  const mensual = [];
  for (let m = inicio; m <= ultimo && mensual.length < 240; m = sumarMesA(m)) {
    mensual.push({
      mes: m,
      plan: datos.usaPlan ? (plan.get(m) || 0) : null,
      real: m <= corte ? (datos.realMes[m] || 0) : null
    });
  }

  return {
    id: 'mi-proyecto',
    nombre: pr.nombre, cliente: pr.cliente, projectLead: pr.projectLead,
    inicio, fin, estado, avance: pr.avance,
    lineas: datos.lineas,   // sin previsión, los pendientes vienen en null
    mensual,
    usaPlan: datos.usaPlan, usaPrevision: datos.usaPrevision
  };
}

if (typeof module !== 'undefined') module.exports = { proyectoDesdeExcel };
