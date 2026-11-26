// ============================================================
// DATOS FICTICIOS de la cartera de proyectos (versión 1)
// Generado por datos-consultora/generar_datos.py: no editar a mano.
// Empresa, clientes y personas son inventados.
// Importes en euros a COSTE interno (salvo ingresoContratado).
// Fecha de corte: 31/10/2026 (cierre mensual de octubre).
// Se guarda como .js (y no .json) para que la web funcione abriendo
// index.html con doble clic, sin servidor.
// ============================================================
window.DATOS = {
 "empresa": "Norte & Vega Consultores",
 "fechaCorte": "2026-10-31",
 "moneda": "EUR",
 "version": 1,
 "nota": "Datos ficticios. Empresa, clientes y personas son inventados. Importes a coste interno salvo ingresoContratado.",
 "tarifas": {
  "Socio": 120,
  "Gerente": 75,
  "Consultor senior": 52,
  "Consultor": 40,
  "Analista": 30
 },
 "tarifasVenta": {
  "Socio": 210,
  "Gerente": 135,
  "Consultor senior": 98,
  "Consultor": 76,
  "Analista": 58
 },
 "proyectos": [
  {
   "id": "ERP-01",
   "nombre": "Implantación ERP financiero y logístico",
   "cliente": "Distribuciones Valcárcel",
   "sector": "Distribución alimentaria",
   "projectLead": "Lucía Ferrer",
   "inicio": "2026-03",
   "fin": "2027-02",
   "estado": "En curso",
   "avance": 0.62,
   "comentario": "La integración con el sistema de almacén (SGA) heredado del cliente ha exigido más horas de consultores senior y más desarrollo subcontratado de lo previsto. Se ha presentado una petición de cambio de alcance de 38.000 € (pendiente de aprobación del cliente). Sin ella, el proyecto cerrará por encima del presupuesto.",
   "tipoContrato": "Precio cerrado",
   "perfilCostes": "lineal",
   "ingresoContratado": 640000,
   "presupuesto": 444550,
   "modificaciones": [
    {
     "fecha": "2026-09-15",
     "descripcion": "Petición de cambio: interfaces adicionales con el SGA",
     "importeCoste": 38000,
     "importeVenta": 64000,
     "estado": "Pendiente"
    }
   ],
   "lineas": [
    {
     "tipo": "horas",
     "concepto": "Socio",
     "tarifa": 120,
     "horasPresupuesto": 110,
     "horasReales": 73,
     "horasPendientes": 37
    },
    {
     "tipo": "horas",
     "concepto": "Gerente",
     "tarifa": 75,
     "horasPresupuesto": 1050,
     "horasReales": 763,
     "horasPendientes": 344
    },
    {
     "tipo": "horas",
     "concepto": "Consultor senior",
     "tarifa": 52,
     "horasPresupuesto": 2300,
     "horasReales": 1806,
     "horasPendientes": 841
    },
    {
     "tipo": "horas",
     "concepto": "Consultor",
     "tarifa": 40,
     "horasPresupuesto": 2800,
     "horasReales": 2062,
     "horasPendientes": 952
    },
    {
     "tipo": "horas",
     "concepto": "Analista",
     "tarifa": 30,
     "horasPresupuesto": 1800,
     "horasReales": 1241,
     "horasPendientes": 559
    },
    {
     "tipo": "gasto",
     "concepto": "Viajes y dietas",
     "presupuesto": 16000,
     "real": 11030,
     "pendiente": 4950
    },
    {
     "tipo": "gasto",
     "concepto": "Subcontratación desarrollo ABAP",
     "presupuesto": 42000,
     "real": 31080,
     "pendiente": 18630
    },
    {
     "tipo": "gasto",
     "concepto": "Licencias entorno de pruebas",
     "presupuesto": 9000,
     "real": 6230,
     "pendiente": 2790
    }
   ],
   "mensual": [
    {
     "mes": "2026-03",
     "plan": 23599,
     "real": 23600,
     "prevision": null,
     "avance": 0.052
    },
    {
     "mes": "2026-04",
     "plan": 28769,
     "real": 28523,
     "prevision": null,
     "avance": 0.115
    },
    {
     "mes": "2026-05",
     "plan": 36816,
     "real": 36316,
     "prevision": null,
     "avance": 0.194
    },
    {
     "mes": "2026-06",
     "plan": 42075,
     "real": 47089,
     "prevision": null,
     "avance": 0.282
    },
    {
     "mes": "2026-07",
     "plan": 42844,
     "real": 49104,
     "prevision": null,
     "avance": 0.369
    },
    {
     "mes": "2026-08",
     "plan": 43084,
     "real": 49048,
     "prevision": null,
     "avance": 0.455
    },
    {
     "mes": "2026-09",
     "plan": 43084,
     "real": 47706,
     "prevision": null,
     "avance": 0.539
    },
    {
     "mes": "2026-10",
     "plan": 43084,
     "real": 46561,
     "prevision": null,
     "avance": 0.62
    },
    {
     "mes": "2026-11",
     "plan": 43084,
     "real": null,
     "prevision": 47365
    },
    {
     "mes": "2026-12",
     "plan": 38354,
     "real": null,
     "prevision": 42196
    },
    {
     "mes": "2027-01",
     "plan": 32565,
     "real": null,
     "prevision": 35744
    },
    {
     "mes": "2027-02",
     "plan": 27192,
     "real": null,
     "prevision": 29887
    }
   ]
  },
  {
   "id": "PMO-02",
   "nombre": "Oficina de gestión de proyectos (PMO) corporativa",
   "cliente": "Seguros Atalaya",
   "sector": "Seguros",
   "projectLead": "Daniel Ortega",
   "inicio": "2026-04",
   "fin": "2026-12",
   "estado": "En curso",
   "avance": 0.8,
   "comentario": "Servicio estable y con el equipo dimensionado según lo previsto. Parte de las reuniones se hacen en remoto, lo que genera un pequeño ahorro en viajes. Previsión de cierre ligeramente por debajo de presupuesto.",
   "tipoContrato": "Tiempo y materiales",
   "perfilCostes": "lineal",
   "ingresoContratado": 310290,
   "presupuesto": 174100,
   "modificaciones": [],
   "lineas": [
    {
     "tipo": "horas",
     "concepto": "Socio",
     "tarifa": 120,
     "horasPresupuesto": 50,
     "horasReales": 39,
     "horasPendientes": 11
    },
    {
     "tipo": "horas",
     "concepto": "Gerente",
     "tarifa": 75,
     "horasPresupuesto": 680,
     "horasReales": 555,
     "horasPendientes": 125
    },
    {
     "tipo": "horas",
     "concepto": "Consultor senior",
     "tarifa": 52,
     "horasPresupuesto": 1250,
     "horasReales": 991,
     "horasPendientes": 232
    },
    {
     "tipo": "horas",
     "concepto": "Consultor",
     "tarifa": 40,
     "horasPresupuesto": 1100,
     "horasReales": 872,
     "horasPendientes": 204
    },
    {
     "tipo": "gasto",
     "concepto": "Viajes y dietas",
     "presupuesto": 4500,
     "real": 2260,
     "pendiente": 500
    },
    {
     "tipo": "gasto",
     "concepto": "Licencias herramienta PPM",
     "presupuesto": 3600,
     "real": 2940,
     "pendiente": 660
    }
   ],
   "mensual": [
    {
     "mes": "2026-04",
     "plan": 14072,
     "real": 13997,
     "prevision": null,
     "avance": 0.081
    },
    {
     "mes": "2026-05",
     "plan": 17955,
     "real": 17506,
     "prevision": null,
     "avance": 0.183
    },
    {
     "mes": "2026-06",
     "plan": 21873,
     "real": 21364,
     "prevision": null,
     "avance": 0.307
    },
    {
     "mes": "2026-07",
     "plan": 21972,
     "real": 20294,
     "prevision": null,
     "avance": 0.432
    },
    {
     "mes": "2026-08",
     "plan": 21972,
     "real": 21486,
     "prevision": null,
     "avance": 0.555
    },
    {
     "mes": "2026-09",
     "plan": 21972,
     "real": 21746,
     "prevision": null,
     "avance": 0.678
    },
    {
     "mes": "2026-10",
     "plan": 21873,
     "real": 21524,
     "prevision": null,
     "avance": 0.8
    },
    {
     "mes": "2026-11",
     "plan": 17955,
     "real": null,
     "prevision": 17768
    },
    {
     "mes": "2026-12",
     "plan": 14456,
     "real": null,
     "prevision": 14311
    }
   ]
  },
  {
   "id": "DAT-03",
   "nombre": "Plataforma de datos y cuadro de mando de riesgos",
   "cliente": "Banca Lisarda",
   "sector": "Banca",
   "projectLead": "Marta Iglesias",
   "inicio": "2026-05",
   "fin": "2027-03",
   "estado": "En curso",
   "avance": 0.4,
   "comentario": "Se incorporó en julio un arquitecto senior adicional para resolver problemas de rendimiento en la carga de datos. El Project Lead mantiene que el resto del plan no cambia y que el proyecto cerrará en presupuesto, pero el gasto va claramente por delante del avance: conviene revisar esa previsión.",
   "tipoContrato": "Precio cerrado",
   "perfilCostes": "final",
   "ingresoContratado": 520000,
   "presupuesto": 355500,
   "modificaciones": [],
   "lineas": [
    {
     "tipo": "horas",
     "concepto": "Socio",
     "tarifa": 120,
     "horasPresupuesto": 90,
     "horasReales": 40,
     "horasPendientes": 50
    },
    {
     "tipo": "horas",
     "concepto": "Gerente",
     "tarifa": 75,
     "horasPresupuesto": 900,
     "horasReales": 396,
     "horasPendientes": 454
    },
    {
     "tipo": "horas",
     "concepto": "Consultor senior",
     "tarifa": 52,
     "horasPresupuesto": 2100,
     "horasReales": 1233,
     "horasPendientes": 1000
    },
    {
     "tipo": "horas",
     "concepto": "Consultor",
     "tarifa": 40,
     "horasPresupuesto": 2200,
     "horasReales": 1037,
     "horasPendientes": 1061
    },
    {
     "tipo": "horas",
     "concepto": "Analista",
     "tarifa": 30,
     "horasPresupuesto": 1500,
     "horasReales": 659,
     "horasPendientes": 774
    },
    {
     "tipo": "gasto",
     "concepto": "Licencias y servicios cloud",
     "presupuesto": 24000,
     "real": 13100,
     "pendiente": 13460
    },
    {
     "tipo": "gasto",
     "concepto": "Viajes y dietas",
     "presupuesto": 6000,
     "real": 2630,
     "pendiente": 3360
    },
    {
     "tipo": "gasto",
     "concepto": "Formación del equipo",
     "presupuesto": 5000,
     "real": 2200,
     "pendiente": 2800
    }
   ],
   "mensual": [
    {
     "mes": "2026-05",
     "plan": 12555,
     "real": 12558,
     "prevision": null,
     "avance": 0.117
    },
    {
     "mes": "2026-06",
     "plan": 18154,
     "real": 18394,
     "prevision": null,
     "avance": 0.192
    },
    {
     "mes": "2026-07",
     "plan": 24531,
     "real": 28012,
     "prevision": null,
     "avance": 0.261
    },
    {
     "mes": "2026-08",
     "plan": 30344,
     "real": 35935,
     "prevision": null,
     "avance": 0.32
    },
    {
     "mes": "2026-09",
     "plan": 33695,
     "real": 39783,
     "prevision": null,
     "avance": 0.366
    },
    {
     "mes": "2026-10",
     "plan": 37000,
     "real": 43114,
     "prevision": null,
     "avance": 0.4
    },
    {
     "mes": "2026-11",
     "plan": 40300,
     "real": null,
     "prevision": 35856
    },
    {
     "mes": "2026-12",
     "plan": 43726,
     "real": null,
     "prevision": 38901
    },
    {
     "mes": "2027-01",
     "plan": 43038,
     "real": null,
     "prevision": 38335
    },
    {
     "mes": "2027-02",
     "plan": 38793,
     "real": null,
     "prevision": 34523
    },
    {
     "mes": "2027-03",
     "plan": 33364,
     "real": null,
     "prevision": 29715
    }
   ]
  },
  {
   "id": "EST-04",
   "nombre": "Plan estratégico de transformación digital",
   "cliente": "Hospital General de Montesur",
   "sector": "Sanidad",
   "projectLead": "Javier Molina",
   "inicio": "2026-02",
   "fin": "2026-07",
   "estado": "Cerrado",
   "avance": 1.0,
   "comentario": "Proyecto cerrado y entregado en plazo. El cierre queda casi un 3 % por debajo del presupuesto gracias a reutilizar el modelo de madurez digital de un proyecto anterior.",
   "tipoContrato": "Precio cerrado",
   "perfilCostes": "inicio",
   "ingresoContratado": 210000,
   "presupuesto": 151440,
   "modificaciones": [],
   "lineas": [
    {
     "tipo": "horas",
     "concepto": "Socio",
     "tarifa": 120,
     "horasPresupuesto": 140,
     "horasReales": 134,
     "horasPendientes": 0
    },
    {
     "tipo": "horas",
     "concepto": "Gerente",
     "tarifa": 75,
     "horasPresupuesto": 520,
     "horasReales": 520,
     "horasPendientes": 0
    },
    {
     "tipo": "horas",
     "concepto": "Consultor senior",
     "tarifa": 52,
     "horasPresupuesto": 820,
     "horasReales": 788,
     "horasPendientes": 0
    },
    {
     "tipo": "horas",
     "concepto": "Consultor",
     "tarifa": 40,
     "horasPresupuesto": 900,
     "horasReales": 852,
     "horasPendientes": 0
    },
    {
     "tipo": "horas",
     "concepto": "Analista",
     "tarifa": 30,
     "horasPresupuesto": 300,
     "horasReales": 300,
     "horasPendientes": 0
    },
    {
     "tipo": "gasto",
     "concepto": "Viajes y dietas",
     "presupuesto": 3500,
     "real": 3500,
     "pendiente": 0
    },
    {
     "tipo": "gasto",
     "concepto": "Talleres con profesionales sanitarios",
     "presupuesto": 4500,
     "real": 4680,
     "pendiente": 0
    }
   ],
   "mensual": [
    {
     "mes": "2026-02",
     "plan": 27892,
     "real": 27892,
     "prevision": null,
     "avance": 0.06
    },
    {
     "mes": "2026-03",
     "plan": 34199,
     "real": 34165,
     "prevision": null,
     "avance": 0.226
    },
    {
     "mes": "2026-04",
     "plan": 31199,
     "real": 30517,
     "prevision": null,
     "avance": 0.446
    },
    {
     "mes": "2026-05",
     "plan": 26373,
     "real": 25207,
     "prevision": null,
     "avance": 0.675
    },
    {
     "mes": "2026-06",
     "plan": 20494,
     "real": 19200,
     "prevision": null,
     "avance": 0.879
    },
    {
     "mes": "2026-07",
     "plan": 11283,
     "real": 10335,
     "prevision": null,
     "avance": 1.0
    }
   ]
  },
  {
   "id": "LOG-05",
   "nombre": "Optimización de la red de almacenes",
   "cliente": "Logística Brezal",
   "sector": "Logística",
   "projectLead": "Andrea Campos",
   "inicio": "2026-09",
   "fin": "2027-01",
   "estado": "En curso",
   "avance": 0.37,
   "comentario": "Arranque según plan. Las visitas a los 7 almacenes del cliente están costando más de lo presupuestado en viajes (más desplazamientos y estancias más largas). Impacto pequeño en el total, pero se vigila.",
   "tipoContrato": "Precio cerrado",
   "perfilCostes": "lineal",
   "ingresoContratado": 165000,
   "presupuesto": 110040,
   "modificaciones": [],
   "lineas": [
    {
     "tipo": "horas",
     "concepto": "Socio",
     "tarifa": 120,
     "horasPresupuesto": 40,
     "horasReales": 15,
     "horasPendientes": 25
    },
    {
     "tipo": "horas",
     "concepto": "Gerente",
     "tarifa": 75,
     "horasPresupuesto": 300,
     "horasReales": 116,
     "horasPendientes": 184
    },
    {
     "tipo": "horas",
     "concepto": "Consultor senior",
     "tarifa": 52,
     "horasPresupuesto": 620,
     "horasReales": 240,
     "horasPendientes": 380
    },
    {
     "tipo": "horas",
     "concepto": "Consultor",
     "tarifa": 40,
     "horasPresupuesto": 680,
     "horasReales": 271,
     "horasPendientes": 417
    },
    {
     "tipo": "horas",
     "concepto": "Analista",
     "tarifa": 30,
     "horasPresupuesto": 260,
     "horasReales": 101,
     "horasPendientes": 159
    },
    {
     "tipo": "gasto",
     "concepto": "Viajes y dietas",
     "presupuesto": 9000,
     "real": 5570,
     "pendiente": 7450
    },
    {
     "tipo": "gasto",
     "concepto": "Licencia software de simulación",
     "presupuesto": 6500,
     "real": 2510,
     "pendiente": 3980
    }
   ],
   "mensual": [
    {
     "mes": "2026-09",
     "plan": 17630,
     "real": 18490,
     "prevision": null,
     "avance": 0.157
    },
    {
     "mes": "2026-10",
     "plan": 24897,
     "real": 26440,
     "prevision": null,
     "avance": 0.37
    },
    {
     "mes": "2026-11",
     "plan": 24897,
     "real": null,
     "prevision": 25608
    },
    {
     "mes": "2026-12",
     "plan": 24897,
     "real": null,
     "prevision": 25608
    },
    {
     "mes": "2027-01",
     "plan": 17719,
     "real": null,
     "prevision": 18224
    }
   ]
  },
  {
   "id": "SEC-06",
   "nombre": "Adecuación al Esquema Nacional de Seguridad",
   "cliente": "Agencia Regional del Agua",
   "sector": "Sector público",
   "projectLead": "Pablo Sanz",
   "inicio": "2026-01",
   "fin": "2026-11",
   "estado": "En curso",
   "avance": 0.9,
   "comentario": "En la fase final. El análisis de riesgos llevó más horas de lo previsto porque el cliente amplió el inventario de sistemas. Se cerrará en noviembre con un sobrecoste moderado (en torno al 3 %).",
   "tipoContrato": "Precio cerrado",
   "perfilCostes": "lineal",
   "ingresoContratado": 230000,
   "presupuesto": 186100,
   "modificaciones": [],
   "lineas": [
    {
     "tipo": "horas",
     "concepto": "Socio",
     "tarifa": 120,
     "horasPresupuesto": 60,
     "horasReales": 56,
     "horasPendientes": 4
    },
    {
     "tipo": "horas",
     "concepto": "Gerente",
     "tarifa": 75,
     "horasPresupuesto": 560,
     "horasReales": 522,
     "horasPendientes": 38
    },
    {
     "tipo": "horas",
     "concepto": "Consultor senior",
     "tarifa": 52,
     "horasPresupuesto": 1200,
     "horasReales": 1190,
     "horasPendientes": 89
    },
    {
     "tipo": "horas",
     "concepto": "Consultor",
     "tarifa": 40,
     "horasPresupuesto": 1150,
     "horasReales": 1106,
     "horasPendientes": 73
    },
    {
     "tipo": "horas",
     "concepto": "Analista",
     "tarifa": 30,
     "horasPresupuesto": 400,
     "horasReales": 376,
     "horasPendientes": 24
    },
    {
     "tipo": "gasto",
     "concepto": "Auditoría externa de certificación",
     "presupuesto": 14000,
     "real": 7000,
     "pendiente": 7000
    },
    {
     "tipo": "gasto",
     "concepto": "Viajes y dietas",
     "presupuesto": 2500,
     "real": 2340,
     "pendiente": 160
    }
   ],
   "mensual": [
    {
     "mes": "2026-01",
     "plan": 11178,
     "real": 11176,
     "prevision": null,
     "avance": 0.06
    },
    {
     "mes": "2026-02",
     "plan": 13807,
     "real": 13807,
     "prevision": null,
     "avance": 0.134
    },
    {
     "mes": "2026-03",
     "plan": 16361,
     "real": 16363,
     "prevision": null,
     "avance": 0.222
    },
    {
     "mes": "2026-04",
     "plan": 17890,
     "real": 17890,
     "prevision": null,
     "avance": 0.318
    },
    {
     "mes": "2026-05",
     "plan": 17890,
     "real": 18202,
     "prevision": null,
     "avance": 0.414
    },
    {
     "mes": "2026-06",
     "plan": 17890,
     "real": 18806,
     "prevision": null,
     "avance": 0.51
    },
    {
     "mes": "2026-07",
     "plan": 17890,
     "real": 19358,
     "prevision": null,
     "avance": 0.605
    },
    {
     "mes": "2026-08",
     "plan": 17890,
     "real": 18806,
     "prevision": null,
     "avance": 0.701
    },
    {
     "mes": "2026-09",
     "plan": 16361,
     "real": 17135,
     "prevision": null,
     "avance": 0.789
    },
    {
     "mes": "2026-10",
     "plan": 20807,
     "real": 21067,
     "prevision": null,
     "avance": 0.9
    },
    {
     "mes": "2026-11",
     "plan": 18136,
     "real": null,
     "prevision": 18758
    }
   ]
  }
 ]
};
