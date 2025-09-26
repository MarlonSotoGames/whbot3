// index.js
const express = require('express');
const { MessagingResponse } = require('twilio').twiml;

const app = express();
app.use(express.urlencoded({ extended: false }));

/* =========================
   CONFIG NEGOCIO / CATÁLOGO
   ========================= */

const BUSINESS = {
  marca: 'MS Games',
  whatsapp_publico: '+506 8902 8220',
  web: 'https://msgames.example', // opcional, puedes dejarlo vacío
  ubicacion: 'Costa Rica'
};

// Curso en vivo próximo
const PROXIMO_EN_VIVO = {
  clave: 'whatsapp',
  nombre: 'Cómo crear un chatbot de WhatsApp',
  inicio: 'Jueves 18 de septiembre, 7:00 pm',
  sesiones: 3,
  duracion_por_clase: '1 hora c/u',
  inversion: '₡5.650',
  temario: [
    'Fundamentos de WhatsApp y flujo Sandbox → Producción',
    'Webhook + respuestas automáticas (Node.js)',
    'Buenas prácticas, pruebas y checklist de publicación'
  ],
  notas: 'No tiene temario oficial; este es un esquema de prueba.'
};

// Catálogo de cursos (asincrónicos y con posibilidad de abrir en vivo)
const CURSOS = [
  {
    clave: 'python',
    nombre: 'Python básico-intermedio',
    sinónimos: ['python', 'py', 'curso de python'],
    modalidad: { en_vivo: '3 meses, 1 clase/semana (₡11.300/mes)', asincrono: '₡16.950' },
    temario: [
      'Sintaxis y tipos de datos',
      'Control de flujo y funciones',
      'Módulos, entornos y librerías',
      'Archivos y manejo de errores',
      'Introducción a requests y consumo de APIs',
      'Proyecto de cierre (scripts útiles)'
    ]
  },
  {
    clave: 'sql',
    nombre: 'SQL básico-intermedio',
    sinónimos: ['sql', 'bases de datos', 'consulta sql'],
    modalidad: { en_vivo: '4 meses, 1 clase/semana (₡11.300/mes)', asincrono: '₡22.600' },
    temario: [
      'SELECT, WHERE, ORDER BY',
      'JOINs (INNER/LEFT/RIGHT/FULL)',
      'Agregaciones y GROUP BY',
      'Subconsultas y CTEs',
      'Funciones de ventana',
      'Modelado y mejores prácticas'
    ]
  },
  {
    clave: 'photoshop',
    nombre: 'Photoshop básico-intermedio',
    sinónimos: ['photoshop', 'ps', 'edición de imágenes'],
    modalidad: { en_vivo: '2 meses, 1 clase/semana (₡11.300/mes)', asincrono: '₡11.300' },
    temario: [
      'Interfaz y herramientas esenciales',
      'Capas, máscaras y selecciones',
      'Retoque y ajustes de color',
      'Tipografía y composición',
      'Exportación para web y redes',
      'Mini proyecto de marca personal'
    ]
  },
  {
    clave: 'figma',
    nombre: 'Figma básico-intermedio',
    sinónimos: ['figma', 'ui', 'ux', 'diseño de interfaces'],
    modalidad: { en_vivo: '3 meses, 1 clase/semana (₡11.300/mes)', asincrono: '₡16.950' },
    temario: [
      'Frames, auto-layout y componentes',
      'Grids, estilos y librerías',
      'Prototipado e interacciones',
      'Diseño responsive',
      'Hand-off y exportación',
      'Proyecto UI (landing/app)'
    ]
  },
  {
    clave: 'videojuegos',
    nombre: 'Programación de videojuegos de plataformas 2D',
    sinónimos: ['videojuegos', 'juegos 2d', 'godot', 'plataformas'],
    modalidad: { en_vivo: '5 semanas, 1 clase/semana (₡11.300 único)', asincrono: '₡8.475' },
    temario: [
      'Introducción a Godot y escenas',
      'Movimiento del personaje y físicas',
      'Colisiones, niveles y cámaras',
      'UI básica, audio y partículas',
      'Construcción y exportación del juego'
    ]
  }
];

// Helpers
const normalize = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const incluyeAlguna = (texto, palabras = []) =>
  palabras.some(p => texto.includes(p));

// Match de curso por nombre/sinónimo
function encontrarCurso(texto) {
  const n = normalize(texto);
  // whatsapp (próximo en vivo)
  if (incluyeAlguna(n, ['whatsapp', 'chatbot', 'bot'])) {
    return { tipo: 'proximo', data: PROXIMO_EN_VIVO };
  }
  // catálogo
  for (const c of CURSOS) {
    if (incluyeAlguna(n, [c.clave, ...c.sinónimos.map(normalize)])) {
      return { tipo: 'catalogo', data: c };
    }
  }
  return null;
}

function menuPrincipal() {
  return [
    `🤖 *${BUSINESS.marca}* — Cursos online de informática y programación`,
    '',
    'Escribí una palabra clave o número:',
    '1) Próximo curso en vivo (WhatsApp)',
    '2) Ver cursos disponibles',
    '3) Precios y modalidades',
    '4) Temarios',
    '5) Contacto con asesor',
    '',
    'Ejemplos: "precio photoshop", "temario sql", "python", "whatsapp".'
  ].join('\n');
}

function listarCursos() {
  const lineas = CURSOS.map(c => `• ${c.nombre} (${c.clave})`);
  return [
    '📚 *Cursos disponibles (asincrónicos y posibles aperturas en vivo)*',
    ...lineas,
    '',
    'Preguntá por uno con su nombre/clave. Ej: "temario figma", "precio sql".'
  ].join('\n');
}

function infoProximoEnVivo() {
  const c = PROXIMO_EN_VIVO;
  return [
    `🎯 *Próximo curso en vivo:* ${c.nombre}`,
    `🗓 Inicio: ${c.inicio}`,
    `📍 Clases: ${c.sesiones} sesiones, ${c.duracion_por_clase}`,
    `💰 Inversión única: ${c.inversion}`,
    `ℹ️ Nota: ${c.notas}`
  ].join('\n');
}

function infoCursoCatalogo(curso) {
  return [
    `📘 *${curso.nombre}*`,
    `🧭 Modalidad en vivo: ${curso.modalidad.en_vivo}`,
    `💾 Asincrónico: ${curso.modalidad.asincrono}`,
    '',
    '¿Querés *temario*, *precio* o *duracion*? Escribí, por ejemplo: "temario python" o "precio figma".'
  ].join('\n');
}

function temarioTexto(nombre, temario) {
  return [
    `🧾 *Temario — ${nombre}*`,
    ...temario.map((t, i) => `${i + 1}. ${t}`)
  ].join('\n');
}

function precioTexto(nombre, modalidad) {
  // Responde precios claros según modalidad
  return [
    `💰 *Precios — ${nombre}*`,
    `• En vivo: ${modalidad.en_vivo}`,
    `• Asincrónico: ${modalidad.asincrono}`
  ].join('\n');
}

function duracionTexto(nombre, modalidad) {
  // Extraemos duración desde el copy de "en_vivo" de cada curso
  return [
    `⏱️ *Duración — ${nombre}*`,
    `En vivo: ${modalidad.en_vivo}`
  ].join('\n');
}

function contactoTexto() {
  return [
    '👤 *Hablar con asesor*',
    `Escribinos por WhatsApp al ${BUSINESS.whatsapp_publico}.`,
    'Contanos qué curso te interesa y te guiamos 🙂'
  ].join('\n');
}

/* =========================
   INTENTS / RUTEO BÁSICO
   ========================= */
function resolverIntent(body) {
  const n = normalize(body);

  // Menú numerado
  if (/^[1-5]$/.test(n)) {
    const opt = Number(n);
    if (opt === 1) return { type: 'proximo' };
    if (opt === 2) return { type: 'listar' };
    if (opt === 3) return { type: 'precios' };
    if (opt === 4) return { type: 'temarios' };
    if (opt === 5) return { type: 'contacto' };
  }

  // Palabras clave globales
  if (incluyeAlguna(n, ['menu', 'inicio', 'ayuda', 'opciones', '#menu'])) {
    return { type: 'menu' };
  }
  if (incluyeAlguna(n, ['asesor', 'humano', 'contacto', 'vendedor'])) {
    return { type: 'contacto' };
  }
  if (incluyeAlguna(n, ['proximo', 'en vivo', 'whatsapp', 'chatbot'])) {
    return { type: 'proximo' };
  }

  // --- Detectores de detalle (precio/temario/duracion) + curso ---
  const tokens = n.split(' ');
  const pidePrecio   = tokens.includes('precio') || tokens.includes('precios') || tokens.includes('costo') || tokens.includes('tarifa');
  const pideTemario  = tokens.includes('temario') || tokens.includes('temarios') || tokens.includes('contenido');
  const pideDuracion = tokens.includes('duracion') || tokens.includes('dura');

  // Buscamos curso
  const match = encontrarCurso(n);

  // Si pidieron detalle y hay curso, devolvemos el detalle
  if ((pidePrecio || pideTemario || pideDuracion) && match) {
    return {
      type: 'detalle',
      detalle: pidePrecio ? 'precio' : (pideTemario ? 'temario' : 'duracion'),
      curso: match.data
    };
  }

  // Si pidieron detalle pero NO especificaron curso
  if (pidePrecio || pideTemario || pideDuracion) {
    return { type: 'falta_curso' };
  }

  // Si mencionó un curso (pero sin pedir detalle), damos ficha base
  if (match) {
    if (match.tipo === 'proximo') return { type: 'proximo' };
    return { type: 'curso', curso: match.data };
  }

  // Preguntas genéricas
  if (incluyeAlguna(n, ['precios', 'costo', 'tarifas'])) {
    return { type: 'falta_curso' };
  }
  if (incluyeAlguna(n, ['temario', 'temarios', 'contenido'])) {
    return { type: 'falta_curso' };
  }
  if (incluyeAlguna(n, ['cursos', 'catalogo', 'lista'])) {
    return { type: 'listar' };
  }

  // Si preguntan por algo que no existe
  if (incluyeAlguna(n, ['curso de ', 'tienen ', 'hay '])) {
    return { type: 'no_disponible' };
  }

  // Fallback
  return { type: 'fallback' };
}


/* =========================
   RUTAS
   ========================= */

app.get('/', (_req, res) => res.send(`${BUSINESS.marca} — Bot activo ✅`));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.post('/whatsapp', (req, res) => {
  const twiml = new MessagingResponse();
  const body = (req.body?.Body || '').trim();

  if (!body) {
    twiml.message('Escribí *menú* para ver opciones.');
    return res.type('text/xml').send(twiml.toString());
  }

  const intent = resolverIntent(body);

  switch (intent.type) {
    case 'menu':
      twiml.message(menuPrincipal());
      break;

    case 'proximo':
      twiml.message(`${infoProximoEnVivo()}\n\n¿Querés inscribirte? Escribí *asesor* para hablar con nosotros.`);
      break;

    case 'listar':
      twiml.message(`${listarCursos()}\n\nTip: pedí *temario nombre* o *precio nombre* (ej: "temario python").`);
      break;

    case 'curso':
      twiml.message(infoCursoCatalogo(intent.curso));
      break;

    case 'detalle': {
      const c = intent.curso;
      if (intent.detalle === 'temario') {
        twiml.message(temarioTexto(c.nombre, c.temario));
      } else if (intent.detalle === 'precio') {
        twiml.message(precioTexto(c.nombre, c.modalidad));
      } else if (intent.detalle === 'duracion') {
        twiml.message(duracionTexto(c.nombre, c.modalidad));
      }
      break;
    }

    case 'precios':
      twiml.message('Decime *qué curso* te interesa (ej: "precio figma", "precio sql").');
      break;

    case 'temarios':
      twiml.message('Decime *qué curso* te interesa (ej: "temario photoshop", "temario python").');
      break;

    case 'contacto':
      twiml.message(`${contactoTexto()}\n\nTambién podés escribir *menú* para más opciones.`);
      break;

    case 'falta_curso':
      twiml.message('Decime *qué curso* te interesa para darte el precio/temario. Ej: "precio python", "temario figma".');
      break;

    case 'no_disponible':
      twiml.message('Si preguntás por *otro curso*, por el momento *no hay*. Podés elegir uno de la lista con "cursos".');
      break;

    default:
      twiml.message(`${menuPrincipal()}\n\nSi querés hablar con un humano, escribí *asesor*.`);
      break;
  }

  res.type('text/xml').send(twiml.toString());
});

/* =========================
   SERVER
   ========================= */

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ ${BUSINESS.marca} bot escuchando en puerto ${port}`);
});

