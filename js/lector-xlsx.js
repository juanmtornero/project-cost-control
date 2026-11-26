// ============================================================
// LECTOR DE EXCEL (.xlsx) hecho a mano, sin librerías.
// ------------------------------------------------------------
// Un .xlsx es en realidad un archivo .zip con varios archivos
// de texto (XML) dentro: uno con los nombres de las pestañas,
// uno por pestaña con sus celdas y otro con los textos.
// Este lector:
//   1. abre el .zip (con la descompresión que ya trae el navegador),
//   2. lee esos XML,
//   3. devuelve cada pestaña como una tabla de valores.
// Solo lee valores (números, textos, verdadero/falso). No le hacen
// falta formatos, colores ni fórmulas: de una fórmula toma el
// resultado que Excel o Google Sheets guardaron al descargar.
// Todo ocurre dentro del navegador: el archivo no sale del ordenador.
// ============================================================

// ---------- 1. Abrir el .zip ----------
async function abrirZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const vista = new DataView(buffer);
  // El índice del zip está al final: buscamos su firma (0x06054b50)
  let fin = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error('NO_ZIP');
  const total = vista.getUint16(fin + 10, true);
  let p = vista.getUint32(fin + 16, true);
  const archivos = {};
  for (let n = 0; n < total; n++) {
    if (vista.getUint32(p, true) !== 0x02014b50) throw new Error('NO_ZIP');
    const metodo = vista.getUint16(p + 10, true);
    const tamComprimido = vista.getUint32(p + 20, true);
    const largoNombre = vista.getUint16(p + 28, true);
    const largoExtra = vista.getUint16(p + 30, true);
    const largoComent = vista.getUint16(p + 32, true);
    const inicioLocal = vista.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + largoNombre));
    archivos[nombre] = { metodo, tamComprimido, inicioLocal };
    p += 46 + largoNombre + largoExtra + largoComent;
  }
  // Devuelve una función que extrae un archivo del zip como texto
  return {
    existe: nombre => nombre in archivos,
    async texto(nombre) {
      const a = archivos[nombre];
      if (!a) return null;
      const q = a.inicioLocal;
      const datos = bytes.subarray(q + 30 + vista.getUint16(q + 26, true) + vista.getUint16(q + 28, true));
      const comprimido = datos.subarray(0, a.tamComprimido);
      if (a.metodo === 0) return new TextDecoder().decode(comprimido);
      if (a.metodo !== 8) throw new Error('NO_ZIP');
      const flujo = new Blob([comprimido]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new TextDecoder().decode(await new Response(flujo).arrayBuffer());
    }
  };
}

// ---------- 2. Ayudas para leer el XML ----------
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const desescapar = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTIDADES[e.toLowerCase()]);
const atributo = (txt, nombre) => { const m = txt.match(new RegExp('\\b' + nombre + '="([^"]*)"')); return m ? desescapar(m[1]) : null; };
// Une todos los trozos <t>…</t> de un texto (Excel parte el texto si tiene varios estilos)
const textoDe = xml => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => desescapar(m[1])).join('');
// "AB12" -> columna 27 (contando desde 0)
const columnaDe = ref => { let n = 0; for (const c of ref.match(/^[A-Z]+/)[0]) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };

// ---------- 3. Leer el libro completo ----------
// Devuelve { "Proyecto": filas, "Presupuesto": filas, ... }
// filas[n] = valores de la fila n de Excel (fila 1 = cabecera); filas[n][0] = columna A.
// Cada valor es un número, un texto, true/false, o { error: "#REF!" } si la celda tiene un error.
async function leerXlsx(buffer) {
  let zip;
  try { zip = await abrirZip(buffer); } catch (e) { throw new Error('El archivo no es un Excel (.xlsx) válido. En Google Sheets: Archivo › Descargar › Microsoft Excel (.xlsx).'); }
  const libro = await zip.texto('xl/workbook.xml');
  if (!libro) throw new Error('El archivo no es un Excel (.xlsx) válido. En Google Sheets: Archivo › Descargar › Microsoft Excel (.xlsx).');
  // Algunos Excel antiguos de Mac cuentan las fechas desde 1904: todas saldrían 4 años desplazadas
  if (/<workbookPr\b[^>]*\bdate1904="(1|true)"/.test(libro))
    throw new Error('El archivo usa el sistema de fechas de 1904 (Excel antiguo de Mac) y las fechas se leerían mal. En Excel: Archivo › Opciones › Avanzadas › desmarca «Usar sistema de fechas 1904», revisa las fechas y vuelve a guardarlo.');

  // Relación "id interno" -> archivo de cada pestaña
  const rels = (await zip.texto('xl/_rels/workbook.xml.rels')) || '';
  const destino = {};
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = atributo(m[1], 'Id'), t = atributo(m[1], 'Target');
    if (id && t) destino[id] = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
  }

  // Textos compartidos: Excel guarda cada texto una vez y las celdas apuntan a él
  const sst = (await zip.texto('xl/sharedStrings.xml')) || '';
  const textos = [...sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => textoDe(m[1]));

  const hojas = {};
  for (const m of libro.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const nombre = atributo(m[1], 'name'), id = atributo(m[1], 'r:id');
    const xml = destino[id] ? await zip.texto(destino[id]) : null;
    if (!nombre || !xml) continue;
    const datos = (xml.match(/<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/) || [])[1] || '';
    const filas = [];
    // Filas ocultas (pueden tener datos que el usuario no ve): se guardan para avisar
    filas.ocultas = [...datos.matchAll(/<row\b([^>]*)>/g)].filter(r => /\bhidden="(1|true)"/.test(r[1])).map(r => +atributo(r[1], 'r')).filter(Boolean);
    for (const c of datos.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = atributo(c[1], 'r');
      if (!ref) continue;
      const tipo = atributo(c[1], 't') || 'n', interior = c[2] || '';
      const v = (interior.match(/<v\b[^>]*>([\s\S]*?)<\/v>/) || [])[1];
      // Fórmula sin resultado guardado: el programa que guardó el archivo no la calculó
      // (una fórmula cuyo resultado es texto vacío llega como t="str" con <v></v>: eso sí está calculado)
      if ((v == null || (v === "" && tipo !== "str")) && /<f\b/.test(interior) && tipo !== "inlineStr") { (filas.sinCalcular = filas.sinCalcular || []).push({ fila: +ref.match(/\d+$/)[0], col: columnaDe(ref) }); continue; }
      let valor = null;
      if (tipo === 's') valor = v != null ? textos[+v] ?? '' : null;
      else if (tipo === 'inlineStr') valor = textoDe(interior);
      else if (tipo === 'str') valor = v != null ? desescapar(v) : '';
      else if (tipo === 'b') valor = v === '1';
      else if (tipo === 'e') valor = { error: v != null ? desescapar(v) : '#ERROR' };
      else if (v != null && v !== '') valor = Number(v);
      if (valor === null || valor === '') continue; // celda vacía
      const fila = +ref.match(/\d+$/)[0];
      (filas[fila] = filas[fila] || [])[columnaDe(ref)] = valor;
    }
    hojas[nombre] = filas;
  }
  return hojas;
}

// Fecha de Excel (número de días desde 30/12/1899) -> "AAAA-MM-DD"
function fechaExcel(n) {
  // Solo cuenta el día: si la celda lleva hora (01/03/2026 18:00), se ignora la hora
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000);
  return d.toISOString().slice(0, 10);
}

if (typeof module !== 'undefined') module.exports = { leerXlsx, fechaExcel };
