/* =========================================================
   ÚTILHUB V19 — NOVA FLOW
   SCRIPT.JS
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const STORAGE_KEY = "utilhub-v19";
const OLD_KEYS = [
  "utilhub-v18",
  "utilhub-v17",
  "utilhub-v15-advanced",
  "utilhub-v15"
];

const MAX_RECENT = 12;
const MAX_FAVORITES = 50;


/* =========================================================
   ESTADO
   ========================================================= */

const DEFAULT_STATE = {
  theme: "dark",
  motion: true,
  performance: "balanced",
  focus: false,

  novaMode: "cosmic",
  novaIntensity: 0.8,

  favorites: [],
  recent: [],

  notes: "",
  tasks: [],

  dictionaryRecent: [],

  stopwatch: {
    running: false,
    elapsed: 0,
    startedAt: 0
  },

  timer: {
    running: false,
    remaining: 0,
    endAt: 0
  }
};

let state = loadState();

let currentTool = null;
let toastTimer = null;
let clockInterval = null;
let timerInterval = null;
let stopwatchInterval = null;


/* =========================================================
   UTILIDADES GENERALES
   ========================================================= */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

function safeText(value) {
  return String(value ?? "");
}

function escapeHTML(value) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value, digits = 8) {
  if (!Number.isFinite(value)) return "—";

  return Number(
    value.toFixed(digits)
  ).toLocaleString("es-PE", {
    maximumFractionDigits: digits
  });
}

function formatTime(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function parseNumber(value) {
  const normalized = String(value)
    .trim()
    .replace(",", ".");

  if (!normalized) return NaN;

  return Number(normalized);
}


/* =========================================================
   STORAGE
   ========================================================= */

function loadState() {
  let raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    for (const key of OLD_KEYS) {
      const old = localStorage.getItem(key);

      if (old) {
        raw = old;
        break;
      }
    }
  }

  if (!raw) {
    return structuredClone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      stopwatch: {
        ...DEFAULT_STATE.stopwatch,
        ...(parsed.stopwatch || {})
      },
      timer: {
        ...DEFAULT_STATE.timer,
        ...(parsed.timer || {})
      }
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    showToast("No se pudo guardar la configuración.");
  }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}


/* =========================================================
   CATÁLOGO DE HERRAMIENTAS
   ========================================================= */

const TOOLS = [
  {
    id: "calculator",
    title: "Calculadora",
    icon: "＋",
    category: "math",
    categoryName: "Matemática",
    description: "Realiza operaciones matemáticas de forma rápida."
  },

  {
    id: "percentage",
    title: "Porcentajes",
    icon: "%",
    category: "math",
    categoryName: "Matemática",
    description: "Calcula porcentajes y sus valores."
  },

  {
    id: "discount",
    title: "Descuentos",
    icon: "⌁",
    category: "math",
    categoryName: "Matemática",
    description: "Calcula precio final y ahorro."
  },

  {
    id: "rule3",
    title: "Regla de tres",
    icon: "∝",
    category: "math",
    categoryName: "Matemática",
    description: "Resuelve reglas de tres simples."
  },

  {
    id: "length",
    title: "Longitud",
    icon: "↔",
    category: "convert",
    categoryName: "Conversiones",
    description: "Convierte metros, kilómetros, centímetros y más."
  },

  {
    id: "weight",
    title: "Peso",
    icon: "⚖",
    category: "convert",
    categoryName: "Conversiones",
    description: "Convierte gramos, kilogramos, libras y onzas."
  },

  {
    id: "volume",
    title: "Volumen",
    icon: "◇",
    category: "convert",
    categoryName: "Conversiones",
    description: "Convierte litros, mililitros y metros cúbicos."
  },

  {
    id: "temperature",
    title: "Temperatura",
    icon: "°",
    category: "convert",
    categoryName: "Conversiones",
    description: "Convierte Celsius, Fahrenheit y Kelvin."
  },

  {
    id: "timeconvert",
    title: "Tiempo",
    icon: "◷",
    category: "time",
    categoryName: "Tiempo",
    description: "Convierte segundos, minutos y horas."
  },

  {
    id: "currency",
    title: "Moneda",
    icon: "$",
    category: "convert",
    categoryName: "Conversiones",
    description: "Convierte monedas usando datos externos cuando están disponibles."
  },

  {
    id: "datediff",
    title: "Diferencia de fechas",
    icon: "▣",
    category: "time",
    categoryName: "Tiempo",
    description: "Calcula los días entre dos fechas."
  },

  {
    id: "age",
    title: "Calculadora de edad",
    icon: "⌛",
    category: "time",
    categoryName: "Tiempo",
    description: "Calcula una edad aproximada a partir de una fecha."
  },

  {
    id: "timer",
    title: "Temporizador",
    icon: "⏱",
    category: "time",
    categoryName: "Tiempo",
    description: "Configura una cuenta regresiva."
  },

  {
    id: "stopwatch",
    title: "Cronómetro",
    icon: "◉",
    category: "time",
    categoryName: "Tiempo",
    description: "Mide el tiempo transcurrido."
  },

  {
    id: "clock",
    title: "Reloj",
    icon: "◷",
    category: "time",
    categoryName: "Tiempo",
    description: "Consulta la hora actual."
  },

  {
    id: "focus",
    title: "Concentración",
    icon: "◎",
    category: "organize",
    categoryName: "Organización",
    description: "Activa un espacio de concentración."
  },

  {
    id: "text",
    title: "Herramientas de texto",
    icon: "Aa",
    category: "text",
    categoryName: "Texto",
    description: "Cuenta palabras, caracteres y líneas."
  },

  {
    id: "dictionary",
    title: "Diccionario",
    icon: "📖",
    category: "text",
    categoryName: "Texto",
    description: "Busca definiciones cuando existe conexión."
  },

  {
    id: "notes",
    title: "Notas",
    icon: "✎",
    category: "organize",
    categoryName: "Organización",
    description: "Guarda notas directamente en tu dispositivo."
  },

  {
    id: "tasks",
    title: "Tareas",
    icon: "✓",
    category: "organize",
    categoryName: "Organización",
    description: "Organiza tus pendientes."
  },

  {
    id: "shopping",
    title: "Lista de compras",
    icon: "🛒",
    category: "life",
    categoryName: "Vida diaria",
    description: "Crea y organiza una lista de compras."
  },

  {
    id: "food",
    title: "Buscar comida",
    icon: "🍴",
    category: "life",
    categoryName: "Vida diaria",
    description: "Busca restaurantes y comida en la web."
  },

  {
    id: "buy",
    title: "Buscar productos",
    icon: "🛍",
    category: "life",
    categoryName: "Vida diaria",
    description: "Busca productos en tiendas y buscadores."
  },

  {
    id: "password",
    title: "Generador de contraseña",
    icon: "◆",
    category: "fun",
    categoryName: "Entretenimiento",
    description: "Genera una contraseña aleatoria."
  },

  {
    id: "random",
    title: "Número aleatorio",
    icon: "✦",
    category: "fun",
    categoryName: "Entretenimiento",
    description: "Genera números aleatorios."
  },

  {
    id: "qr",
    title: "Código QR",
    icon: "▦",
    category: "fun",
    categoryName: "Entretenimiento",
    description: "Crea un código QR desde un texto o enlace."
  }
];


/* =========================================================
   ALIASES
   ========================================================= */

const TOOL_ALIASES = {
  unit: "length",
  convert: "length",

  comida: "food",
  restaurants: "food",

  "shopping-web": "buy",
  compras: "shopping",
  shop: "buy"
};


/* =========================================================
   RENDER HERRAMIENTAS
   ========================================================= */

let currentCategory = "all";
let currentSearch = "";

function getTool(id) {
  const normalized = TOOL_ALIASES[id] || id;

  return TOOLS.find(tool => tool.id === normalized);
}

function renderTools() {
  const grid = $("#toolGrid");

  if (!grid) return;

  const search = currentSearch
    .trim()
    .toLowerCase();

  const filtered = TOOLS.filter(tool => {

    const categoryMatch =
      currentCategory === "all" ||
      tool.category === currentCategory;

    const searchMatch =
      !search ||
      tool.title.toLowerCase().includes(search) ||
      tool.description.toLowerCase().includes(search) ||
      tool.categoryName.toLowerCase().includes(search);

    return categoryMatch && searchMatch;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="emptyState">
        <div>
          <strong>No encontramos esa herramienta</strong>
          <span>Prueba con otra palabra o categoría.</span>
        </div>
      </div>
    `;

    return;
  }

  grid.innerHTML = filtered.map(tool => {

    const favorite =
      state.favorites.includes(tool.id);

    return `
      <article
        class="toolCard"
        data-open="${escapeHTML(tool.id)}"
        tabindex="0"
        role="button"
        aria-label="Abrir ${escapeHTML(tool.title)}">

        <div class="toolCardTop">

          <span class="toolIcon">
            ${tool.icon}
          </span>

          <button
            class="favoriteBtn ${favorite ? "active" : ""}"
            data-favorite="${escapeHTML(tool.id)}"
            type="button"
            aria-label="Favorito">
            ${favorite ? "★" : "☆"}
          </button>

        </div>

        <h3>
          ${escapeHTML(tool.title)}
        </h3>

        <p>
          ${escapeHTML(tool.description)}
        </p>

        <span class="toolCategory">
          ${escapeHTML(tool.categoryName)}
        </span>

      </article>
    `;
  }).join("");

  updateStats();
}

function renderQuickTools() {
  const container = $("#quickTools");

  if (!container) return;

  const recentTools = state.recent
    .map(id => getTool(id))
    .filter(Boolean)
    .slice(0, 8);

  if (!recentTools.length) {
    container.innerHTML = `
      <div class="emptyState">
        <div>
          <strong>Aún no tienes herramientas recientes</strong>
          <span>Cuando abras una herramienta aparecerá aquí.</span>
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML = recentTools.map(tool => `
    <button
      class="quickItem"
      data-open="${escapeHTML(tool.id)}"
      type="button">

      <span class="quickItemIcon">
        ${tool.icon}
      </span>

      <span class="quickItemText">

        <strong>
          ${escapeHTML(tool.title)}
        </strong>

        <span>
          ${escapeHTML(tool.categoryName)}
        </span>

      </span>

    </button>
  `).join("");
}

function updateStats() {
  const toolCount = $("#toolCount");
  const favoriteCount = $("#favoriteCount");
  const recentCount = $("#recentCount");

  if (toolCount) {
    toolCount.textContent = TOOLS.length;
  }

  if (favoriteCount) {
    favoriteCount.textContent =
      state.favorites.length;
  }

  if (recentCount) {
    recentCount.textContent =
      state.recent.length;
  }
}


/* =========================================================
   FAVORITOS
   ========================================================= */

function toggleFavorite(id) {
  const index =
    state.favorites.indexOf(id);

  if (index >= 0) {
    state.favorites.splice(index, 1);
    showToast("Quitado de favoritos.");
  } else {
    if (state.favorites.length >= MAX_FAVORITES) {
      showToast("Has alcanzado el límite de favoritos.");
      return;
    }

    state.favorites.unshift(id);

    showToast("Añadido a favoritos.");
  }

  saveState();

  renderTools();
}


/* =========================================================
   RECIENTES
   ========================================================= */

function addRecent(id) {
  state.recent =
    state.recent.filter(item => item !== id);

  state.recent.unshift(id);

  state.recent =
    state.recent.slice(0, MAX_RECENT);

  saveState();

  renderQuickTools();
  updateStats();
}


/* =========================================================
   TOOL PANEL
   ========================================================= */

function openTool(id) {
  const tool = getTool(id);

  if (!tool) {
    showToast("Herramienta no encontrada.");
    return;
  }

  currentTool = tool.id;

  addRecent(tool.id);

  const panel = $("#toolPanel");
  const icon = $("#toolPanelIcon");
  const category = $("#toolPanelCategory");
  const title = $("#toolPanelTitle");
  const content = $("#toolContent");

  if (!panel || !content) return;

  if (icon) {
    icon.textContent = tool.icon;
  }

  if (category) {
    category.textContent = tool.categoryName;
  }

  if (title) {
    title.textContent = tool.title;
  }

  try {
    content.innerHTML = renderTool(tool.id);
  } catch (error) {
    console.error(error);

    content.innerHTML = `
      <div class="emptyState">
        <div>
          <strong>No se pudo cargar esta herramienta.</strong>
          <span>Intenta abrirla nuevamente.</span>
        </div>
      </div>
    `;
  }

  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");

  document.body.classList.add("tool-open");

  setupCurrentTool(tool.id);
}

function closeTool() {
  const panel = $("#toolPanel");

  if (!panel) return;

  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");

  document.body.classList.remove("tool-open");

  currentTool = null;
}


/* =========================================================
   RENDERIZADO DE HERRAMIENTAS
   ========================================================= */

function renderTool(id) {

  switch (id) {

    case "calculator":
      return renderCalculator();

    case "percentage":
      return renderPercentage();

    case "discount":
      return renderDiscount();

    case "rule3":
      return renderRule3();

    case "length":
      return renderConverter("length");

    case "weight":
      return renderConverter("weight");

    case "volume":
      return renderConverter("volume");

    case "temperature":
      return renderTemperature();

    case "timeconvert":
      return renderTimeConvert();

    case "currency":
      return renderCurrency();

    case "datediff":
      return renderDateDiff();

    case "age":
      return renderAge();

    case "timer":
      return renderTimer();

    case "stopwatch":
      return renderStopwatch();

    case "clock":
      return renderClock();

    case "focus":
      return renderFocus();

    case "text":
      return renderTextTool();

    case "dictionary":
      return renderDictionary();

    case "notes":
      return renderNotes();

    case "tasks":
      return renderTasks();

    case "shopping":
      return renderShoppingList();

    case "food":
      return renderFood();

    case "buy":
      return renderBuy();

    case "password":
      return renderPassword();

    case "random":
      return renderRandom();

    case "qr":
      return renderQR();

    default:
      return `
        <div class="emptyState">
          <div>
            <strong>Herramienta no disponible</strong>
          </div>
        </div>
      `;
  }
}


/* =========================================================
   CALCULADORA
   ========================================================= */

function renderCalculator() {
  return `
    <div class="toolIntro">
      <h3>Calculadora</h3>
      <p>
        Usa números, paréntesis, +, -, ×, ÷, %, y ^.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">
        <label for="calcExpression">
          Operación
        </label>

        <input
          id="calcExpression"
          type="text"
          inputmode="decimal"
          placeholder="Ejemplo: (25 + 15) × 2"
          autocomplete="off">
      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="calcBtn"
          type="button">
          Calcular
        </button>

        <button
          id="calcClear"
          type="button">
          Limpiar
        </button>
      </div>

      <div
        class="resultBox"
        id="calcResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   PARSER MATEMÁTICO SEGURO
   ========================================================= */

function tokenizeMath(expression) {
  const text = String(expression)
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");

  if (!text) {
    throw new Error("Operación vacía.");
  }

  const tokens = [];

  let i = 0;

  while (i < text.length) {

    const char = text[i];

    if (/[0-9.]/.test(char)) {

      let number = "";

      let dots = 0;

      while (
        i < text.length &&
        /[0-9.]/.test(text[i])
      ) {
        if (text[i] === ".") dots++;

        number += text[i];
        i++;
      }

      if (dots > 1 || number === ".") {
        throw new Error("Número inválido.");
      }

      tokens.push({
        type: "number",
        value: Number(number)
      });

      continue;
    }

    if ("+-*/%^()".includes(char)) {

      tokens.push({
        type: "operator",
        value: char
      });

      i++;
      continue;
    }

    throw new Error(
      `Carácter no permitido: ${char}`
    );
  }

  return tokens;
}

function calculateExpression(expression) {

  const tokens = tokenizeMath(expression);

  let position = 0;

  function peek() {
    return tokens[position];
  }

  function consume() {
    return tokens[position++];
  }

  function parsePrimary() {

    const token = peek();

    if (!token) {
      throw new Error("Falta un valor.");
    }

    if (
      token.value === "+"
      ||
      token.value === "-"
    ) {
      consume();

      const value = parsePrimary();

      return token.value === "-"
        ? -value
        : value;
    }

    if (token.value === "(") {

      consume();

      const value = parseAdditive();

      const close = consume();

      if (!close || close.value !== ")") {
        throw new Error("Falta un paréntesis.");
      }

      return value;
    }

    if (token.type === "number") {
      consume();
      return token.value;
    }

    throw new Error("Expresión inválida.");
  }

  function parsePower() {

    let left = parsePrimary();

    if (peek()?.value === "^") {

      consume();

      const right = parsePower();

      left = Math.pow(left, right);
    }

    return left;
  }

  function parseMultiplicative() {

    let value = parsePower();

    while (
      peek() &&
      ["*", "/", "%"].includes(peek().value)
    ) {

      const operator = consume().value;

      const right = parsePower();

      if (operator === "*") {
        value *= right;
      }

      if (operator === "/") {

        if (right === 0) {
          throw new Error(
            "No se puede dividir entre cero."
          );
        }

        value /= right;
      }

      if (operator === "%") {

        if (right === 0) {
          throw new Error(
            "No se puede calcular módulo con cero."
          );
        }

        value %= right;
      }
    }

    return value;
  }

  function parseAdditive() {

    let value = parseMultiplicative();

    while (
      peek() &&
      ["+", "-"].includes(peek().value)
    ) {

      const operator = consume().value;

      const right = parseMultiplicative();

      if (operator === "+") {
        value += right;
      } else {
        value -= right;
      }
    }

    return value;
  }

  const result = parseAdditive();

  if (position < tokens.length) {
    throw new Error("Expresión incompleta.");
  }

  if (!Number.isFinite(result)) {
    throw new Error("Resultado no válido.");
  }

  return result;
}


/* =========================================================
   PORCENTAJES
   ========================================================= */

function renderPercentage() {
  return `
    <div class="toolIntro">
      <h3>Porcentajes</h3>
      <p>
        Calcula cuánto representa un porcentaje de una cantidad.
      </p>
    </div>

    <div class="toolForm">

      <div class="formRow">

        <div class="formGroup">
          <label>Cantidad</label>
          <input
            id="percentAmount"
            type="number"
            placeholder="100">
        </div>

        <div class="formGroup">
          <label>Porcentaje</label>
          <input
            id="percentValue"
            type="number"
            placeholder="20">
        </div>

      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="percentBtn"
          type="button">
          Calcular
        </button>
      </div>

      <div
        class="resultBox"
        id="percentResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   DESCUENTO
   ========================================================= */

function renderDiscount() {
  return `
    <div class="toolIntro">
      <h3>Descuento</h3>
      <p>
        Calcula el ahorro y el precio final.
      </p>
    </div>

    <div class="toolForm">

      <div class="formRow">

        <div class="formGroup">
          <label>Precio original</label>
          <input
            id="discountPrice"
            type="number"
            min="0"
            placeholder="100">
        </div>

        <div class="formGroup">
          <label>Descuento (%)</label>
          <input
            id="discountPercent"
            type="number"
            min="0"
            max="100"
            placeholder="20">
        </div>

      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="discountBtn"
          type="button">
          Calcular
        </button>
      </div>

      <div
        class="resultBox"
        id="discountResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   REGLA DE TRES
   ========================================================= */

function renderRule3() {
  return `
    <div class="toolIntro">
      <h3>Regla de tres</h3>
      <p>
        Si A corresponde a B y C corresponde a X,
        calcula X.
      </p>
    </div>

    <div class="toolForm">

      <div class="formRow">

        <div class="formGroup">
          <label>A</label>
          <input
            id="ruleA"
            type="number"
            placeholder="2">
        </div>

        <div class="formGroup">
          <label>B</label>
          <input
            id="ruleB"
            type="number"
            placeholder="10">
        </div>

      </div>

      <div class="formGroup">
        <label>C</label>
        <input
          id="ruleC"
          type="number"
          placeholder="5">
      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="ruleBtn"
          type="button">
          Resolver
        </button>
      </div>

      <div
        class="resultBox"
        id="ruleResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   CONVERSORES
   ========================================================= */

const CONVERTERS = {

  length: {
    units: {
      m: 1,
      km: 1000,
      cm: 0.01,
      mm: 0.001,
      mi: 1609.344,
      yd: 0.9144,
      ft: 0.3048,
      in: 0.0254
    },
    labels: {
      m: "Metros",
      km: "Kilómetros",
      cm: "Centímetros",
      mm: "Milímetros",
      mi: "Millas",
      yd: "Yardas",
      ft: "Pies",
      in: "Pulgadas"
    }
  },

  weight: {
    units: {
      kg: 1,
      g: 0.001,
      mg: 0.000001,
      lb: 0.45359237,
      oz: 0.028349523125
    },
    labels: {
      kg: "Kilogramos",
      g: "Gramos",
      mg: "Miligramos",
      lb: "Libras",
      oz: "Onzas"
    }
  },

  volume: {
    units: {
      l: 1,
      ml: 0.001,
      m3: 1000,
      cm3: 0.001,
      gal: 3.785411784
    },
    labels: {
      l: "Litros",
      ml: "Mililitros",
      m3: "Metros cúbicos",
      cm3: "Centímetros cúbicos",
      gal: "Galones"
    }
  }

};

function renderConverter(type) {

  const converter = CONVERTERS[type];

  const options = Object.entries(
    converter.labels
  ).map(([value, label]) => `
    <option value="${value}">
      ${label}
    </option>
  `).join("");

  return `
    <div class="toolIntro">
      <h3>${type === "length"
        ? "Longitud"
        : type === "weight"
          ? "Peso"
          : "Volumen"}</h3>

      <p>
        Convierte unidades rápidamente.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">
        <label>Valor</label>

        <input
          id="converterValue"
          type="number"
          placeholder="10">
      </div>

      <div class="formRow">

        <div class="formGroup">
          <label>Desde</label>

          <select id="converterFrom">
            ${options}
          </select>
        </div>

        <div class="formGroup">
          <label>Hasta</label>

          <select id="converterTo">
            ${options}
          </select>
        </div>

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="converterBtn"
          type="button">
          Convertir
        </button>

      </div>

      <div
        class="resultBox"
        id="converterResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   TEMPERATURA
   ========================================================= */

function renderTemperature() {

  return `
    <div class="toolIntro">
      <h3>Temperatura</h3>
      <p>
        Convierte entre Celsius, Fahrenheit y Kelvin.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">
        <label>Valor</label>

        <input
          id="tempValue"
          type="number"
          placeholder="25">
      </div>

      <div class="formRow">

        <div class="formGroup">
          <label>Desde</label>

          <select id="tempFrom">
            <option value="C">Celsius</option>
            <option value="F">Fahrenheit</option>
            <option value="K">Kelvin</option>
          </select>
        </div>

        <div class="formGroup">
          <label>Hasta</label>

          <select id="tempTo">
            <option value="C">Celsius</option>
            <option value="F">Fahrenheit</option>
            <option value="K">Kelvin</option>
          </select>
        </div>

      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="tempBtn"
          type="button">
          Convertir
        </button>
      </div>

      <div
        class="resultBox"
        id="tempResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   CONVERSIÓN DE TIEMPO
   ========================================================= */

function renderTimeConvert() {

  return `
    <div class="toolIntro">
      <h3>Conversión de tiempo</h3>
      <p>
        Convierte segundos, minutos, horas y días.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">
        <label>Valor</label>

        <input
          id="timeValue"
          type="number"
          placeholder="120">
      </div>

      <div class="formRow">

        <div class="formGroup">
          <label>Desde</label>

          <select id="timeFrom">
            <option value="seconds">Segundos</option>
            <option value="minutes">Minutos</option>
            <option value="hours">Horas</option>
            <option value="days">Días</option>
          </select>
        </div>

        <div class="formGroup">
          <label>Hasta</label>

          <select id="timeTo">
            <option value="seconds">Segundos</option>
            <option value="minutes">Minutos</option>
            <option value="hours">Horas</option>
            <option value="days">Días</option>
          </select>
        </div>

      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="timeConvertBtn"
          type="button">
          Convertir
        </button>
      </div>

      <div
        class="resultBox"
        id="timeConvertResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   MONEDA
   ========================================================= */

function renderCurrency() {

  return `
    <div class="toolIntro">
      <h3>Conversor de moneda</h3>

      <p>
        Consulta una tasa externa cuando haya conexión.
        Las tasas pueden variar.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">
        <label>Cantidad</label>

        <input
          id="currencyAmount"
          type="number"
          min="0"
          placeholder="100">
      </div>

      <div class="formRow">

        <div class="formGroup">
          <label>Desde</label>

          <select id="currencyFrom">
            <option value="PEN">PEN — Sol peruano</option>
            <option value="USD">USD — Dólar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Libra</option>
            <option value="JPY">JPY — Yen</option>
            <option value="BRL">BRL — Real</option>
            <option value="MXN">MXN — Peso mexicano</option>
            <option value="COP">COP — Peso colombiano</option>
          </select>
        </div>

        <div class="formGroup">
          <label>Hasta</label>

          <select id="currencyTo">
            <option value="USD">USD — Dólar</option>
            <option value="PEN">PEN — Sol peruano</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Libra</option>
            <option value="JPY">JPY — Yen</option>
            <option value="BRL">BRL — Real</option>
            <option value="MXN">MXN — Peso mexicano</option>
            <option value="COP">COP — Peso colombiano</option>
          </select>
        </div>

      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="currencyBtn"
          type="button">
          Convertir
        </button>
      </div>

      <div
        class="resultBox"
        id="currencyResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   DIFERENCIA DE FECHAS
   ========================================================= */

function renderDateDiff() {

  const today =
    new Date().toISOString().slice(0, 10);

  return `
    <div class="toolIntro">
      <h3>Diferencia de fechas</h3>

      <p>
        Calcula cuántos días existen entre dos fechas.
      </p>
    </div>

    <div class="toolForm">

      <div class="formRow">

        <div class="formGroup">
          <label>Fecha inicial</label>

          <input
            id="dateStart"
            type="date"
            value="${today}">
        </div>

        <div class="formGroup">
          <label>Fecha final</label>

          <input
            id="dateEnd"
            type="date"
            value="${today}">
        </div>

      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="dateDiffBtn"
          type="button">
          Calcular
        </button>
      </div>

      <div
        class="resultBox"
        id="dateDiffResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   EDAD
   ========================================================= */

function renderAge() {

  return `
    <div class="toolIntro">
      <h3>Calculadora de edad</h3>

      <p>
        Introduce tu fecha de nacimiento para calcular
        la edad aproximada.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">
        <label>Fecha de nacimiento</label>

        <input
          id="birthDate"
          type="date">
      </div>

      <div class="toolActions">
        <button
          class="primary"
          id="ageBtn"
          type="button">
          Calcular edad
        </button>
      </div>

      <div
        class="resultBox"
        id="ageResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   TEMPORIZADOR
   ========================================================= */

function renderTimer() {

  const remaining =
    getTimerRemaining();

  return `
    <div class="toolIntro">
      <h3>Temporizador</h3>

      <p>
        Configura una cuenta regresiva.
      </p>
    </div>

    <div class="timeDisplay" id="timerDisplay">
      ${formatTime(remaining)}
    </div>

    <div class="toolForm">

      <div class="formRow">

        <div class="formGroup">
          <label>Minutos</label>

          <input
            id="timerMinutes"
            type="number"
            min="0"
            value="5">
        </div>

        <div class="formGroup">
          <label>Segundos</label>

          <input
            id="timerSeconds"
            type="number"
            min="0"
            max="59"
            value="0">
        </div>

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="timerStart"
          type="button">
          Iniciar
        </button>

        <button
          id="timerPause"
          type="button">
          Pausar
        </button>

        <button
          id="timerReset"
          type="button">
          Reiniciar
        </button>

      </div>

    </div>
  `;
}

function getTimerRemaining() {

  if (
    state.timer.running &&
    state.timer.endAt
  ) {
    return Math.max(
      0,
      Math.ceil(
        (state.timer.endAt - Date.now()) / 1000
      )
    );
  }

  return state.timer.remaining || 0;
}

function updateTimerDisplay() {

  const display =
    $("#timerDisplay");

  if (!display) return;

  display.textContent =
    formatTime(getTimerRemaining());
}

function startTimer() {

  let remaining =
    getTimerRemaining();

  if (!state.timer.running) {

    const minutes =
      parseNumber($("#timerMinutes")?.value || 0);

    const seconds =
      parseNumber($("#timerSeconds")?.value || 0);

    if (
      remaining <= 0 &&
      minutes <= 0 &&
      seconds <= 0
    ) {
      showToast("Introduce un tiempo.");
      return;
    }

    if (remaining <= 0) {
      remaining =
        minutes * 60 + seconds;
    }

    state.timer.remaining =
      remaining;

    state.timer.endAt =
      Date.now() + remaining * 1000;

    state.timer.running = true;

    saveState();
  }

  clearInterval(timerInterval);

  timerInterval = setInterval(() => {

    const left =
      getTimerRemaining();

    state.timer.remaining = left;

    updateTimerDisplay();

    if (left <= 0) {

      clearInterval(timerInterval);

      state.timer.running = false;
      state.timer.remaining = 0;
      state.timer.endAt = 0;

      saveState();

      updateTimerDisplay();

      showToast("⏱ Temporizador terminado.");
    }

  }, 250);
}

function pauseTimer() {

  const remaining =
    getTimerRemaining();

  state.timer.running = false;
  state.timer.remaining = remaining;
  state.timer.endAt = 0;

  clearInterval(timerInterval);

  saveState();

  updateTimerDisplay();
}

function resetTimer() {

  state.timer.running = false;
  state.timer.remaining = 0;
  state.timer.endAt = 0;

  clearInterval(timerInterval);

  saveState();

  updateTimerDisplay();
}


/* =========================================================
   CRONÓMETRO
   ========================================================= */

function renderStopwatch() {

  const elapsed =
    getStopwatchElapsed();

  return `
    <div class="toolIntro">
      <h3>Cronómetro</h3>

      <p>
        Mide el tiempo transcurrido.
      </p>
    </div>

    <div
      class="timeDisplay"
      id="stopwatchDisplay">
      ${formatTime(elapsed)}
    </div>

    <div class="toolActions">

      <button
        class="primary"
        id="stopwatchStart"
        type="button">
        Iniciar
      </button>

      <button
        id="stopwatchPause"
        type="button">
        Pausar
      </button>

      <button
        id="stopwatchReset"
        type="button">
        Reiniciar
      </button>

    </div>
  `;
}

function getStopwatchElapsed() {

  if (
    state.stopwatch.running &&
    state.stopwatch.startedAt
  ) {

    return (
      state.stopwatch.elapsed +
      (Date.now() - state.stopwatch.startedAt)
    ) / 1000;
  }

  return state.stopwatch.elapsed / 1000;
}

function updateStopwatchDisplay() {

  const display =
    $("#stopwatchDisplay");

  if (!display) return;

  display.textContent =
    formatTime(
      getStopwatchElapsed()
    );
}

function startStopwatch() {

  if (!state.stopwatch.running) {

    state.stopwatch.startedAt =
      Date.now();

    state.stopwatch.running = true;

    saveState();
  }

  clearInterval(stopwatchInterval);

  stopwatchInterval =
    setInterval(
      updateStopwatchDisplay,
      250
    );
}

function pauseStopwatch() {

  if (state.stopwatch.running) {

    state.stopwatch.elapsed +=
      Date.now() -
      state.stopwatch.startedAt;

    state.stopwatch.running = false;
    state.stopwatch.startedAt = 0;
  }

  clearInterval(stopwatchInterval);

  saveState();

  updateStopwatchDisplay();
}

function resetStopwatch() {

  state.stopwatch.running = false;
  state.stopwatch.elapsed = 0;
  state.stopwatch.startedAt = 0;

  clearInterval(stopwatchInterval);

  saveState();

  updateStopwatchDisplay();
}


/* =========================================================
   RELOJ
   ========================================================= */

function renderClock() {

  return `
    <div class="toolIntro">
      <h3>Reloj</h3>

      <p>
        Hora actual de este dispositivo.
      </p>
    </div>

    <div
      class="clockDisplay"
      id="clockDisplay">
      --:--:--
    </div>

    <div
      class="resultBox"
      id="clockDate">
    </div>
  `;
}

function updateClock() {

  const display =
    $("#clockDisplay");

  const dateBox =
    $("#clockDate");

  if (!display && !dateBox) return;

  const now = new Date();

  if (display) {
    display.textContent =
      now.toLocaleTimeString("es-PE");
  }

  if (dateBox) {
    dateBox.innerHTML = `
      <strong>FECHA</strong>
      <div class="resultValue">
        ${escapeHTML(
          now.toLocaleDateString("es-PE", {
            dateStyle: "full"
          })
        )}
      </div>
    `;
  }
}


/* =========================================================
   CONCENTRACIÓN
   ========================================================= */

function renderFocus() {

  return `
    <div class="toolIntro">
      <h3>Modo concentración</h3>

      <p>
        Oculta elementos secundarios para concentrarte
        en las herramientas.
      </p>
    </div>

    <div class="toolActions">

      <button
        class="primary"
        id="focusToolBtn"
        type="button">
        ${state.focus
          ? "Desactivar concentración"
          : "Activar concentración"}
      </button>

    </div>

    <div class="resultBox">
      <strong>ESTADO</strong>

      <div class="resultValue">
        ${state.focus
          ? "Modo concentración activo"
          : "Modo normal"}
      </div>
    </div>
  `;
}


/* =========================================================
   TEXTO
   ========================================================= */

function renderTextTool() {

  return `
    <div class="toolIntro">
      <h3>Herramientas de texto</h3>

      <p>
        Escribe o pega un texto para obtener estadísticas.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">

        <label>Texto</label>

        <textarea
          id="textInput"
          class="noteArea"
          placeholder="Escribe aquí..."></textarea>

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="textAnalyzeBtn"
          type="button">
          Analizar
        </button>

        <button
          id="textUpperBtn"
          type="button">
          MAYÚSCULAS
        </button>

        <button
          id="textLowerBtn"
          type="button">
          minúsculas
        </button>

      </div>

      <div
        class="resultBox"
        id="textResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   DICCIONARIO
   ========================================================= */

function renderDictionary() {

  return `
    <div class="toolIntro">
      <h3>Diccionario</h3>

      <p>
        Busca una palabra. Necesitas conexión a internet
        para consultar el servicio.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">

        <label>Palabra</label>

        <input
          id="dictionaryWord"
          type="text"
          placeholder="Ejemplo: naturaleza"
          autocomplete="off">

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="dictionaryBtn"
          type="button">
          Buscar
        </button>

      </div>

      <div
        id="dictionaryResult">
      </div>

    </div>
  `;
}

async function searchDictionary(word) {

  const result =
    $("#dictionaryResult");

  if (!result) return;

  const clean =
    String(word).trim();

  if (!clean) {
    result.innerHTML = `
      <div class="resultBox">
        <span class="error">
          Escribe una palabra.
        </span>
      </div>
    `;

    return;
  }

  result.innerHTML = `
    <div class="resultBox">
      <span class="muted">
        Buscando...
      </span>
    </div>
  `;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      8000
    );

  try {

    const response =
      await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(clean)}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json"
          }
        }
      );

    if (!response.ok) {

      if (response.status === 404) {
        throw new Error(
          "No encontramos esa palabra."
        );
      }

      throw new Error(
        "El servicio no está disponible."
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "La respuesta del diccionario no es válida."
      );
    }

    if (
      !Array.isArray(data) ||
      !data.length
    ) {
      throw new Error(
        "No encontramos información."
      );
    }

    const entry = data[0];

    const meanings =
      Array.isArray(entry.meanings)
        ? entry.meanings
        : [];

    if (!meanings.length) {
      throw new Error(
        "No hay definiciones disponibles."
      );
    }

    state.dictionaryRecent =
      [
        clean,
        ...state.dictionaryRecent.filter(
          word => word !== clean
        )
      ].slice(0, 10);

    saveState();

    result.innerHTML = `
      <div class="dictionaryResult">

        ${meanings.map(meaning => {

          const definitions =
            Array.isArray(
              meaning.definitions
            )
              ? meaning.definitions
              : [];

          return `
            <div class="dictionaryMeaning">

              <h4>
                ${escapeHTML(
                  meaning.partOfSpeech ||
                  "Definición"
                )}
              </h4>

              <ul>

                ${definitions
                  .slice(0, 6)
                  .map(definition => `
                    <li>
                      ${escapeHTML(
                        definition.definition
                      )}

                      ${
                        definition.example
                          ? `<br>
                             <span class="muted">
                               Ejemplo:
                               ${escapeHTML(
                                 definition.example
                               )}
                             </span>`
                          : ""
                      }
                    </li>
                  `)
                  .join("")}

              </ul>

            </div>
          `;
        }).join("")}

      </div>
    `;

  } catch (error) {

    console.error(error);

    const message =
      error.name === "AbortError"
        ? "La búsqueda tardó demasiado."
        : error.message ||
          "No se pudo consultar el diccionario.";

    result.innerHTML = `
      <div class="resultBox">

        <span class="error">
          ${escapeHTML(message)}
        </span>

        <br>

        <span class="muted">
          Comprueba tu conexión e inténtalo nuevamente.
        </span>

      </div>
    `;

  } finally {
    clearTimeout(timeout);
  }
}


/* =========================================================
   NOTAS
   ========================================================= */

function renderNotes() {

  return `
    <div class="toolIntro">
      <h3>Notas</h3>

      <p>
        Tus notas se guardan localmente en este dispositivo.
      </p>
    </div>

    <div class="toolForm">

      <textarea
        id="notesInput"
        class="noteArea"
        placeholder="Escribe tus notas aquí...">${escapeHTML(
          state.notes
        )}</textarea>

      <div class="toolActions">

        <button
          class="primary"
          id="saveNotesBtn"
          type="button">
          Guardar nota
        </button>

        <button
          id="clearNotesBtn"
          type="button">
          Borrar
        </button>

      </div>

      <div
        class="resultBox"
        id="notesStatus"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   TAREAS
   ========================================================= */

function renderTasks() {

  return `
    <div class="toolIntro">
      <h3>Tareas</h3>

      <p>
        Organiza tus pendientes y guárdalos localmente.
      </p>
    </div>

    <div class="toolForm">

      <div class="formRow">

        <input
          id="taskInput"
          type="text"
          placeholder="Nueva tarea">

        <button
          class="primary"
          id="addTaskBtn"
          type="button">
          Añadir
        </button>

      </div>

      <div
        class="taskList"
        id="taskList">
      </div>

    </div>
  `;
}

function renderTaskList() {

  const list =
    $("#taskList");

  if (!list) return;

  if (!state.tasks.length) {

    list.innerHTML = `
      <div class="emptyState">
        <div>
          <strong>No tienes tareas todavía.</strong>
          <span>Añade tu primer pendiente.</span>
        </div>
      </div>
    `;

    return;
  }

  list.innerHTML =
    state.tasks.map((task, index) => `
      <div
        class="taskItem ${task.done ? "done" : ""}">

        <input
          type="checkbox"
          data-task-toggle="${index}"
          ${task.done ? "checked" : ""}>

        <span>
          ${escapeHTML(task.text)}
        </span>

        <button
          type="button"
          data-task-delete="${index}"
          style="margin-left:auto;border:0;background:transparent;cursor:pointer;color:var(--danger);">
          ×
        </button>

      </div>
    `).join("");
}


/* =========================================================
   LISTA DE COMPRAS
   ========================================================= */

function renderShoppingList() {

  const shopping =
    Array.isArray(state.shopping)
      ? state.shopping
      : [];

  return `
    <div class="toolIntro">
      <h3>Lista de compras</h3>

      <p>
        Crea una lista sencilla para organizar tus compras.
      </p>
    </div>

    <div class="toolForm">

      <div class="formRow">

        <input
          id="shoppingInput"
          type="text"
          placeholder="Ejemplo: arroz">

        <button
          class="primary"
          id="addShoppingBtn"
          type="button">
          Añadir
        </button>

      </div>

      <div
        class="taskList"
        id="shoppingList">
      </div>

    </div>
  `;
}

function renderShoppingItems() {

  const list =
    $("#shoppingList");

  if (!list) return;

  const shopping =
    Array.isArray(state.shopping)
      ? state.shopping
      : [];

  if (!shopping.length) {

    list.innerHTML = `
      <div class="emptyState">
        <div>
          <strong>Lista vacía</strong>
          <span>Añade productos para comenzar.</span>
        </div>
      </div>
    `;

    return;
  }

  list.innerHTML =
    shopping.map((item, index) => `
      <div
        class="taskItem ${item.done ? "done" : ""}">

        <input
          type="checkbox"
          data-shopping-toggle="${index}"
          ${item.done ? "checked" : ""}>

        <span>
          ${escapeHTML(item.text)}
        </span>

        <button
          type="button"
          data-shopping-delete="${index}"
          style="margin-left:auto;border:0;background:transparent;cursor:pointer;color:var(--danger);">
          ×
        </button>

      </div>
    `).join("");
}


/* =========================================================
   COMIDA
   ========================================================= */

function renderFood() {

  return `
    <div class="toolIntro">
      <h3>Buscar comida</h3>

      <p>
        ÚtilHub no realiza pedidos automáticamente.
        Tú decides dónde comprar o pedir.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">

        <label>
          ¿Qué buscas?
        </label>

        <input
          id="foodQuery"
          type="text"
          placeholder="Ejemplo: pizza cerca de mí">

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="foodSearchBtn"
          type="button">
          Buscar en la web
        </button>

        <button
          id="foodMapsBtn"
          type="button">
          Buscar en mapas
        </button>

      </div>

      <div class="resultBox">

        <strong>IMPORTANTE</strong>

        <div class="muted">
          Los resultados dependen del buscador y de tu conexión.
          ÚtilHub no confirma precios, disponibilidad ni pedidos.
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   PRODUCTOS
   ========================================================= */

function renderBuy() {

  return `
    <div class="toolIntro">
      <h3>Buscar productos</h3>

      <p>
        Busca productos en tiendas o buscadores.
        La compra la realizas tú.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">

        <label>
          Producto
        </label>

        <input
          id="buyQuery"
          type="text"
          placeholder="Ejemplo: audífonos">

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="googleShoppingBtn"
          type="button">
          Google
        </button>

        <button
          id="mercadoLibreBtn"
          type="button">
          Mercado Libre
        </button>

      </div>

      <div class="resultBox">

        <strong>COMPRA MANUAL</strong>

        <div class="muted">
          ÚtilHub solamente abre la búsqueda.
          No realiza compras por ti.
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   CONTRASEÑA
   ========================================================= */

function renderPassword() {

  return `
    <div class="toolIntro">
      <h3>Generador de contraseña</h3>

      <p>
        Genera una cadena aleatoria usando el generador
        seguro del navegador cuando está disponible.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">

        <label>
          Longitud
        </label>

        <input
          id="passwordLength"
          type="number"
          min="6"
          max="128"
          value="16">

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="passwordGenerateBtn"
          type="button">
          Generar
        </button>

        <button
          id="passwordCopyBtn"
          type="button">
          Copiar
        </button>

      </div>

      <div
        class="resultBox"
        id="passwordResult">

        <strong>CONTRASEÑA</strong>

        <div
          class="resultValue"
          id="generatedPassword">
          —
        </div>

      </div>

    </div>
  `;
}

function generateSecureRandom(max) {

  if (
    window.crypto &&
    crypto.getRandomValues
  ) {

    const array =
      new Uint32Array(1);

    crypto.getRandomValues(array);

    return array[0] % max;
  }

  return Math.floor(
    Math.random() * max
  );
}

function generatePassword(length) {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ" +
    "abcdefghijkmnopqrstuvwxyz" +
    "23456789" +
    "!@#$%^&*_-+=";

  let result = "";

  for (let i = 0; i < length; i++) {
    result +=
      chars[
        generateSecureRandom(chars.length)
      ];
  }

  return result;
}


/* =========================================================
   ALEATORIO
   ========================================================= */

function renderRandom() {

  return `
    <div class="toolIntro">
      <h3>Número aleatorio</h3>

      <p>
        Genera un número entre un mínimo y un máximo.
      </p>
    </div>

    <div class="toolForm">

      <div class="formRow">

        <div class="formGroup">
          <label>Mínimo</label>

          <input
            id="randomMin"
            type="number"
            value="1">
        </div>

        <div class="formGroup">
          <label>Máximo</label>

          <input
            id="randomMax"
            type="number"
            value="100">
        </div>

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="randomBtn"
          type="button">
          Generar
        </button>

      </div>

      <div
        class="resultBox"
        id="randomResult"
        hidden>
      </div>

    </div>
  `;
}


/* =========================================================
   QR
   ========================================================= */

function renderQR() {

  return `
    <div class="toolIntro">
      <h3>Código QR</h3>

      <p>
        Introduce un texto o enlace. La generación visual
        utiliza un servicio externo.
      </p>
    </div>

    <div class="toolForm">

      <div class="formGroup">

        <label>
          Texto o enlace
        </label>

        <input
          id="qrText"
          type="text"
          placeholder="https://ejemplo.com">

      </div>

      <div class="toolActions">

        <button
          class="primary"
          id="qrGenerateBtn"
          type="button">
          Crear QR
        </button>

      </div>

      <div
        id="qrResult">
      </div>

    </div>
  `;
}


/* =========================================================
   CONFIGURACIÓN DE CADA HERRAMIENTA
   ========================================================= */

function setupCurrentTool(id) {

  clearInterval(clockInterval);

  switch (id) {

    case "calculator":
      setupCalculator();
      break;

    case "percentage":
      setupPercentage();
      break;

    case "discount":
      setupDiscount();
      break;

    case "rule3":
      setupRule3();
      break;

    case "length":
    case "weight":
    case "volume":
      setupConverter();
      break;

    case "temperature":
      setupTemperature();
      break;

    case "timeconvert":
      setupTimeConvert();
      break;

    case "currency":
      setupCurrency();
      break;

    case "datediff":
      setupDateDiff();
      break;

    case "age":
      setupAge();
      break;

    case "timer":
      setupTimer();
      break;

    case "stopwatch":
      setupStopwatch();
      break;

    case "clock":
      setupClock();
      break;

    case "focus":
      setupFocus();
      break;

    case "text":
      setupText();
      break;

    case "dictionary":
      setupDictionary();
      break;

    case "notes":
      setupNotes();
      break;

    case "tasks":
      setupTasks();
      break;

    case "shopping":
      setupShopping();
      break;

    case "food":
      setupFood();
      break;

    case "buy":
      setupBuy();
      break;

    case "password":
      setupPassword();
      break;

    case "random":
      setupRandom();
      break;

    case "qr":
      setupQR();
      break;
  }
}


/* =========================================================
   SETUP CALCULADORA
   ========================================================= */

function setupCalculator() {

  $("#calcBtn")?.addEventListener(
    "click",
    () => {

      const expression =
        $("#calcExpression")?.value;

      const result =
        $("#calcResult");

      try {

        const value =
          calculateExpression(expression);

        result.hidden = false;

        result.innerHTML = `
          <strong>RESULTADO</strong>
          <div class="resultValue">
            ${formatNumber(value)}
          </div>
        `;

      } catch (error) {

        result.hidden = false;

        result.innerHTML = `
          <strong>ERROR</strong>
          <div class="error">
            ${escapeHTML(error.message)}
          </div>
        `;
      }
    }
  );

  $("#calcClear")?.addEventListener(
    "click",
    () => {

      $("#calcExpression").value = "";
      $("#calcResult").hidden = true;
    }
  );

  $("#calcExpression")?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        $("#calcBtn")?.click();
      }
    }
  );
}


/* =========================================================
   SETUP PORCENTAJES
   ========================================================= */

function setupPercentage() {

  $("#percentBtn")?.addEventListener(
    "click",
    () => {

      const amount =
        parseNumber(
          $("#percentAmount")?.value
        );

      const percent =
        parseNumber(
          $("#percentValue")?.value
        );

      const result =
        $("#percentResult");

      if (
        !Number.isFinite(amount) ||
        !Number.isFinite(percent)
      ) {
        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce valores válidos.
          </span>
        `;

        return;
      }

      const value =
        amount * percent / 100;

      result.hidden = false;

      result.innerHTML = `
        <strong>RESULTADO</strong>

        <div class="resultValue">
          ${formatNumber(value)}
        </div>

        <span class="muted">
          ${formatNumber(percent)}% de
          ${formatNumber(amount)}
        </span>
      `;
    }
  );
}


/* =========================================================
   SETUP DESCUENTO
   ========================================================= */

function setupDiscount() {

  $("#discountBtn")?.addEventListener(
    "click",
    () => {

      const price =
        parseNumber(
          $("#discountPrice")?.value
        );

      const percent =
        parseNumber(
          $("#discountPercent")?.value
        );

      const result =
        $("#discountResult");

      if (
        !Number.isFinite(price) ||
        !Number.isFinite(percent) ||
        price < 0 ||
        percent < 0 ||
        percent > 100
      ) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce valores válidos.
          </span>
        `;

        return;
      }

      const saving =
        price * percent / 100;

      const finalPrice =
        price - saving;

      result.hidden = false;

      result.innerHTML = `
        <strong>PRECIO FINAL</strong>

        <div class="resultValue">
          ${formatNumber(finalPrice)}
        </div>

        <span class="success">
          Ahorras ${formatNumber(saving)}
        </span>
      `;
    }
  );
}


/* =========================================================
   SETUP REGLA DE TRES
   ========================================================= */

function setupRule3() {

  $("#ruleBtn")?.addEventListener(
    "click",
    () => {

      const a =
        parseNumber($("#ruleA")?.value);

      const b =
        parseNumber($("#ruleB")?.value);

      const c =
        parseNumber($("#ruleC")?.value);

      const result =
        $("#ruleResult");

      if (
        !Number.isFinite(a) ||
        !Number.isFinite(b) ||
        !Number.isFinite(c) ||
        a === 0
      ) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            A debe ser diferente de cero.
          </span>
        `;

        return;
      }

      const x =
        (b * c) / a;

      result.hidden = false;

      result.innerHTML = `
        <strong>RESULTADO</strong>

        <div class="resultValue">
          X = ${formatNumber(x)}
        </div>
      `;
    }
  );
}


/* =========================================================
   SETUP CONVERSOR
   ========================================================= */

function setupConverter() {

  $("#converterBtn")?.addEventListener(
    "click",
    () => {

      const value =
        parseNumber(
          $("#converterValue")?.value
        );

      const from =
        $("#converterFrom")?.value;

      const to =
        $("#converterTo")?.value;

      const result =
        $("#converterResult");

      const converter =
        CONVERTERS[currentTool];

      if (
        !converter ||
        !Number.isFinite(value)
      ) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce un valor válido.
          </span>
        `;

        return;
      }

      const base =
        value *
        converter.units[from];

      const converted =
        base /
        converter.units[to];

      result.hidden = false;

      result.innerHTML = `
        <strong>RESULTADO</strong>

        <div class="resultValue">
          ${formatNumber(converted)}
        </div>

        <span class="muted">
          ${formatNumber(value)}
          ${converter.labels[from]}
          →
          ${converter.labels[to]}
        </span>
      `;
    }
  );
}


/* =========================================================
   TEMPERATURA
   ========================================================= */

function setupTemperature() {

  $("#tempBtn")?.addEventListener(
    "click",
    () => {

      const value =
        parseNumber(
          $("#tempValue")?.value
        );

      const from =
        $("#tempFrom")?.value;

      const to =
        $("#tempTo")?.value;

      const result =
        $("#tempResult");

      if (!Number.isFinite(value)) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce una temperatura válida.
          </span>
        `;

        return;
      }

      let celsius;

      if (from === "C") {
        celsius = value;
      }

      if (from === "F") {
        celsius =
          (value - 32) * 5 / 9;
      }

      if (from === "K") {
        celsius =
          value - 273.15;
      }

      let converted;

      if (to === "C") {
        converted = celsius;
      }

      if (to === "F") {
        converted =
          celsius * 9 / 5 + 32;
      }

      if (to === "K") {
        converted =
          celsius + 273.15;
      }

      result.hidden = false;

      result.innerHTML = `
        <strong>RESULTADO</strong>

        <div class="resultValue">
          ${formatNumber(converted)} °${to}
        </div>
      `;
    }
  );
}


/* =========================================================
   TIEMPO
   ========================================================= */

function setupTimeConvert() {

  const factors = {
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400
  };

  $("#timeConvertBtn")?.addEventListener(
    "click",
    () => {

      const value =
        parseNumber(
          $("#timeValue")?.value
        );

      const from =
        $("#timeFrom")?.value;

      const to =
        $("#timeTo")?.value;

      const result =
        $("#timeConvertResult");

      if (!Number.isFinite(value)) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce un valor válido.
          </span>
        `;

        return;
      }

      const seconds =
        value * factors[from];

      const converted =
        seconds / factors[to];

      result.hidden = false;

      result.innerHTML = `
        <strong>RESULTADO</strong>

        <div class="resultValue">
          ${formatNumber(converted)}
        </div>
      `;
    }
  );
}


/* =========================================================
   MONEDA
   ========================================================= */

async function fetchCurrencyRate(
  from,
  to
) {

  if (from === to) return 1;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      8000
    );

  try {

    const response =
      await fetch(
        `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`,
        {
          signal: controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        "No se pudo consultar la tasa."
      );
    }

    const data =
      await response.json();

    const rate =
      data?.rates?.[to];

    if (!Number.isFinite(rate)) {
      throw new Error(
        "No existe una tasa para esa moneda."
      );
    }

    return rate;

  } finally {
    clearTimeout(timeout);
  }
}

function setupCurrency() {

  $("#currencyBtn")?.addEventListener(
    "click",
    async () => {

      const amount =
        parseNumber(
          $("#currencyAmount")?.value
        );

      const from =
        $("#currencyFrom")?.value;

      const to =
        $("#currencyTo")?.value;

      const result =
        $("#currencyResult");

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce una cantidad válida.
          </span>
        `;

        return;
      }

      result.hidden = false;

      result.innerHTML = `
        <span class="muted">
          Consultando tasa...
        </span>
      `;

      try {

        const rate =
          await fetchCurrencyRate(
            from,
            to
          );

        const converted =
          amount * rate;

        result.innerHTML = `
          <strong>RESULTADO</strong>

          <div class="resultValue">
            ${formatNumber(converted)}
            ${escapeHTML(to)}
          </div>

          <span class="muted">
            Tasa aproximada:
            ${formatNumber(rate, 6)}
          </span>
        `;

      } catch (error) {

        result.innerHTML = `
          <span class="error">
            No se pudo obtener la tasa.
          </span>

          <br>

          <span class="muted">
            Comprueba tu conexión e inténtalo nuevamente.
          </span>
        `;
      }
    }
  );
}


/* =========================================================
   FECHAS
   ========================================================= */

function setupDateDiff() {

  $("#dateDiffBtn")?.addEventListener(
    "click",
    () => {

      const start =
        $("#dateStart")?.value;

      const end =
        $("#dateEnd")?.value;

      const result =
        $("#dateDiffResult");

      if (!start || !end) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Selecciona las dos fechas.
          </span>
        `;

        return;
      }

      const a =
        new Date(`${start}T00:00:00`);

      const b =
        new Date(`${end}T00:00:00`);

      const diff =
        Math.round(
          (b - a) /
          86400000
        );

      result.hidden = false;

      result.innerHTML = `
        <strong>DIFERENCIA</strong>

        <div class="resultValue">
          ${Math.abs(diff).toLocaleString("es-PE")} días
        </div>

        <span class="muted">
          ${diff < 0
            ? "La segunda fecha es anterior."
            : diff === 0
              ? "Las fechas son iguales."
              : "La segunda fecha es posterior."}
        </span>
      `;
    }
  );
}


/* =========================================================
   EDAD
   ========================================================= */

function setupAge() {

  $("#ageBtn")?.addEventListener(
    "click",
    () => {

      const input =
        $("#birthDate")?.value;

      const result =
        $("#ageResult");

      if (!input) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Selecciona una fecha.
          </span>
        `;

        return;
      }

      const birth =
        new Date(`${input}T00:00:00`);

      const now =
        new Date();

      if (
        birth > now ||
        Number.isNaN(birth.getTime())
      ) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce una fecha válida.
          </span>
        `;

        return;
      }

      let years =
        now.getFullYear() -
        birth.getFullYear();

      const birthdayPassed =
        (
          now.getMonth() > birth.getMonth()
        ) ||
        (
          now.getMonth() === birth.getMonth() &&
          now.getDate() >= birth.getDate()
        );

      if (!birthdayPassed) {
        years--;
      }

      result.hidden = false;

      result.innerHTML = `
        <strong>EDAD</strong>

        <div class="resultValue">
          ${years} años
        </div>
      `;
    }
  );
}


/* =========================================================
   SETUP TIMER
   ========================================================= */

function setupTimer() {

  updateTimerDisplay();

  if (state.timer.running) {
    startTimer();
  }

  $("#timerStart")?.addEventListener(
    "click",
    startTimer
  );

  $("#timerPause")?.addEventListener(
    "click",
    pauseTimer
  );

  $("#timerReset")?.addEventListener(
    "click",
    resetTimer
  );
}


/* =========================================================
   SETUP STOPWATCH
   ========================================================= */

function setupStopwatch() {

  updateStopwatchDisplay();

  if (state.stopwatch.running) {
    startStopwatch();
  }

  $("#stopwatchStart")?.addEventListener(
    "click",
    startStopwatch
  );

  $("#stopwatchPause")?.addEventListener(
    "click",
    pauseStopwatch
  );

  $("#stopwatchReset")?.addEventListener(
    "click",
    resetStopwatch
  );
}


/* =========================================================
   SETUP RELOJ
   ========================================================= */

function setupClock() {

  updateClock();

  clearInterval(clockInterval);

  clockInterval =
    setInterval(
      updateClock,
      1000
    );
}


/* =========================================================
   SETUP CONCENTRACIÓN
   ========================================================= */

function setupFocus() {

  $("#focusToolBtn")?.addEventListener(
    "click",
    () => {

      state.focus =
        !state.focus;

      applyFocus();

      saveState();

      closeTool();

      showToast(
        state.focus
          ? "Modo concentración activado."
          : "Modo concentración desactivado."
      );
    }
  );
}

function applyFocus() {

  document.body.classList.toggle(
    "focusMode",
    Boolean(state.focus)
  );

  const button =
    $("#focusBtn");

  if (button) {
    button.textContent =
      state.focus ? "◉" : "◎";
  }
}


/* =========================================================
   SETUP TEXTO
   ========================================================= */

function setupText() {

  $("#textAnalyzeBtn")?.addEventListener(
    "click",
    () => {

      const text =
        $("#textInput")?.value || "";

      const words =
        text.trim()
          ? text.trim().split(/\s+/).length
          : 0;

      const characters =
        text.length;

      const charactersNoSpaces =
        text.replace(/\s/g, "").length;

      const lines =
        text
          ? text.split(/\r?\n/).length
          : 0;

      const result =
        $("#textResult");

      result.hidden = false;

      result.innerHTML = `
        <strong>ESTADÍSTICAS</strong>

        <div class="resultValue">
          ${words} palabras
        </div>

        <span class="muted">
          ${characters} caracteres ·
          ${charactersNoSpaces} sin espacios ·
          ${lines} líneas
        </span>
      `;
    }
  );

  $("#textUpperBtn")?.addEventListener(
    "click",
    () => {

      const input =
        $("#textInput");

      input.value =
        input.value.toUpperCase();
    }
  );

  $("#textLowerBtn")?.addEventListener(
    "click",
    () => {

      const input =
        $("#textInput");

      input.value =
        input.value.toLowerCase();
    }
  );
}


/* =========================================================
   SETUP DICCIONARIO
   ========================================================= */

function setupDictionary() {

  $("#dictionaryBtn")?.addEventListener(
    "click",
    () => {
      searchDictionary(
        $("#dictionaryWord")?.value
      );
    }
  );

  $("#dictionaryWord")?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        $("#dictionaryBtn")?.click();
      }
    }
  );
}


/* =========================================================
   SETUP NOTAS
   ========================================================= */

function setupNotes() {

  $("#saveNotesBtn")?.addEventListener(
    "click",
    () => {

      state.notes =
        $("#notesInput")?.value || "";

      saveState();

      const status =
        $("#notesStatus");

      status.hidden = false;

      status.innerHTML = `
        <span class="success">
          Nota guardada correctamente.
        </span>
      `;

      showToast("Nota guardada.");
    }
  );

  $("#clearNotesBtn")?.addEventListener(
    "click",
    () => {

      if (
        !confirm(
          "¿Borrar todas las notas?"
        )
      ) {
        return;
      }

      state.notes = "";

      saveState();

      $("#notesInput").value = "";

      const status =
        $("#notesStatus");

      status.hidden = false;

      status.innerHTML = `
        <span class="muted">
          Nota borrada.
        </span>
      `;
    }
  );
}


/* =========================================================
   SETUP TAREAS
   ========================================================= */

function setupTasks() {

  if (!Array.isArray(state.tasks)) {
    state.tasks = [];
  }

  renderTaskList();

  $("#addTaskBtn")?.addEventListener(
    "click",
    addTask
  );

  $("#taskInput")?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        addTask();
      }
    }
  );
}

function addTask() {

  const input =
    $("#taskInput");

  const text =
    input?.value.trim();

  if (!text) {
    showToast("Escribe una tarea.");
    return;
  }

  state.tasks.push({
    text,
    done: false
  });

  saveState();

  input.value = "";

  renderTaskList();
}


/* =========================================================
   SETUP COMPRAS
   ========================================================= */

function setupShopping() {

  if (!Array.isArray(state.shopping)) {
    state.shopping = [];
  }

  renderShoppingItems();

  $("#addShoppingBtn")?.addEventListener(
    "click",
    addShoppingItem
  );

  $("#shoppingInput")?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        addShoppingItem();
      }
    }
  );
}

function addShoppingItem() {

  const input =
    $("#shoppingInput");

  const text =
    input?.value.trim();

  if (!text) {
    showToast("Escribe un producto.");
    return;
  }

  if (!Array.isArray(state.shopping)) {
    state.shopping = [];
  }

  state.shopping.push({
    text,
    done: false
  });

  saveState();

  input.value = "";

  renderShoppingItems();
}


/* =========================================================
   SETUP COMIDA
   ========================================================= */

function setupFood() {

  $("#foodSearchBtn")?.addEventListener(
    "click",
    () => {

      const query =
        $("#foodQuery")?.value.trim();

      if (!query) {
        showToast("Escribe qué comida buscas.");
        return;
      }

      const url =
        `https://www.google.com/search?q=${encodeURIComponent(
          query
        )}`;

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  );

  $("#foodMapsBtn")?.addEventListener(
    "click",
    () => {

      const query =
        $("#foodQuery")?.value.trim();

      if (!query) {
        showToast("Escribe qué comida buscas.");
        return;
      }

      const url =
        `https://www.google.com/maps/search/${encodeURIComponent(
          query
        )}`;

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  );
}


/* =========================================================
   SETUP PRODUCTOS
   ========================================================= */

function setupBuy() {

  function getQuery() {

    const value =
      $("#buyQuery")?.value.trim();

    if (!value) {
      showToast("Escribe un producto.");
      return null;
    }

    return value;
  }

  $("#googleShoppingBtn")?.addEventListener(
    "click",
    () => {

      const query = getQuery();

      if (!query) return;

      window.open(
        `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
          query
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  );

  $("#mercadoLibreBtn")?.addEventListener(
    "click",
    () => {

      const query = getQuery();

      if (!query) return;

      window.open(
        `https://listado.mercadolibre.com.pe/${encodeURIComponent(
          query
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  );
}


/* =========================================================
   SETUP PASSWORD
   ========================================================= */

function setupPassword() {

  $("#passwordGenerateBtn")?.addEventListener(
    "click",
    generatePasswordUI
  );

  $("#passwordCopyBtn")?.addEventListener(
    "click",
    async () => {

      const value =
        $("#generatedPassword")?.textContent;

      if (!value || value === "—") {
        showToast("Primero genera una contraseña.");
        return;
      }

      try {

        await navigator.clipboard.writeText(
          value
        );

        showToast(
          "Contraseña copiada."
        );

      } catch {

        showToast(
          "No se pudo copiar automáticamente."
        );
      }
    }
  );
}

function generatePasswordUI() {

  const input =
    $("#passwordLength");

  let length =
    parseInt(input?.value, 10);

  if (!Number.isFinite(length)) {
    length = 16;
  }

  length =
    clamp(length, 6, 128);

  input.value = length;

  const password =
    generatePassword(length);

  const output =
    $("#generatedPassword");

  if (output) {
    output.textContent =
      password;
  }
}


/* =========================================================
   SETUP RANDOM
   ========================================================= */

function setupRandom() {

  $("#randomBtn")?.addEventListener(
    "click",
    () => {

      let min =
        parseNumber(
          $("#randomMin")?.value
        );

      let max =
        parseNumber(
          $("#randomMax")?.value
        );

      const result =
        $("#randomResult");

      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max)
      ) {

        result.hidden = false;

        result.innerHTML = `
          <span class="error">
            Introduce valores válidos.
          </span>
        `;

        return;
      }

      if (min > max) {
        [min, max] = [max, min];
      }

      const random =
        Math.floor(
          Math.random() *
          (max - min + 1)
        ) + min;

      result.hidden = false;

      result.innerHTML = `
        <strong>NÚMERO</strong>

        <div class="resultValue">
          ${random}
        </div>
      `;
    }
  );
}


/* =========================================================
   SETUP QR
   ========================================================= */

function setupQR() {

  $("#qrGenerateBtn")?.addEventListener(
    "click",
    () => {

      const text =
        $("#qrText")?.value.trim();

      const result =
        $("#qrResult");

      if (!text) {

        result.innerHTML = `
          <div class="resultBox">
            <span class="error">
              Escribe un texto o enlace.
            </span>
          </div>
        `;

        return;
      }

      const url =
        `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
          text
        )}`;

      result.innerHTML = `
        <div class="qrResult">

          <img
            src="${url}"
            alt="Código QR generado">

          <span class="muted">
            Si no aparece, comprueba tu conexión.
          </span>

        </div>
      `;
    }
  );
}


/* =========================================================
   EVENTOS GLOBALES
   ========================================================= */

function setupGlobalEvents() {

  document.addEventListener(
    "click",
    event => {

      const favorite =
        event.target.closest(
          "[data-favorite]"
        );

      if (favorite) {

        event.stopPropagation();

        toggleFavorite(
          favorite.dataset.favorite
        );

        return;
      }

      const open =
        event.target.closest(
          "[data-open]"
        );

      if (open) {

        openTool(
          open.dataset.open
        );

        return;
      }

      if (
        event.target.closest(
          "[data-close-tool]"
        )
      ) {
        closeTool();
      }

      if (
        event.target.closest(
          "[data-close-modal]"
        )
      ) {
        closeModal();
      }

      const taskToggle =
        event.target.closest(
          "[data-task-toggle]"
        );

      if (taskToggle) {

        const index =
          Number(
            taskToggle.dataset.taskToggle
          );

        if (state.tasks[index]) {

          state.tasks[index].done =
            taskToggle.checked;

          saveState();

          renderTaskList();
        }
      }

      const taskDelete =
        event.target.closest(
          "[data-task-delete]"
        );

      if (taskDelete) {

        const index =
          Number(
            taskDelete.dataset.taskDelete
          );

        state.tasks.splice(index, 1);

        saveState();

        renderTaskList();
      }

      const shoppingToggle =
        event.target.closest(
          "[data-shopping-toggle]"
        );

      if (shoppingToggle) {

        const index =
          Number(
            shoppingToggle.dataset.shoppingToggle
          );

        if (state.shopping?.[index]) {

          state.shopping[index].done =
            shoppingToggle.checked;

          saveState();

          renderShoppingItems();
        }
      }

      const shoppingDelete =
        event.target.closest(
          "[data-shopping-delete]"
        );

      if (shoppingDelete) {

        const index =
          Number(
            shoppingDelete.dataset.shoppingDelete
          );

        state.shopping.splice(index, 1);

        saveState();

        renderShoppingItems();
      }
    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (event.key === "Escape") {
        closeTool();
        closeModal();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {

        event.preventDefault();

        const search =
          $("#toolSearch");

        search?.focus();

        search?.select();
      }

      if (
        currentTool &&
        event.key === "Enter" &&
        event.target.matches(
          ".toolPanel input"
        )
      ) {
        /*
          Las herramientas individuales controlan
          sus propios botones.
        */
      }
    }
  );
}


/* =========================================================
   BÚSQUEDA
   ========================================================= */

function setupSearch() {

  $("#toolSearch")?.addEventListener(
    "input",
    event => {

      currentSearch =
        event.target.value;

      renderTools();
    }
  );
}


/* =========================================================
   CATEGORÍAS
   ========================================================= */

function setupCategories() {

  $("#categories")?.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-category]"
        );

      if (!button) return;

      currentCategory =
        button.dataset.category;

      $$(".category").forEach(
        category => {

          category.classList.toggle(
            "active",
            category === button
          );
        }
      );

      renderTools();
    }
  );
}


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {

  document.body.dataset.theme =
    state.theme === "light"
      ? "light"
      : "dark";

  const button =
    $("#themeBtn");

  if (button) {
    button.textContent =
      state.theme === "light"
        ? "☀"
        : "☾";
  }
}

function toggleTheme() {

  state.theme =
    state.theme === "dark"
      ? "light"
      : "dark";

  applyTheme();

  saveState();
}


/* =========================================================
   MOTION
   ========================================================= */

function applyMotion() {

  document.body.classList.toggle(
    "motionOff",
    !state.motion
  );

  const button =
    $("#motionBtn");

  if (button) {
    button.textContent =
      state.motion
        ? "✦"
        : "○";
  }
}

function toggleMotion() {

  state.motion =
    !state.motion;

  applyMotion();

  saveState();

  showToast(
    state.motion
      ? "Animación activada."
      : "Animación pausada."
  );
}


/* =========================================================
   PERFORMANCE
   ========================================================= */

function applyPerformance() {

  document.body.classList.toggle(
    "performanceMode",
    state.performance === "performance"
  );

  const select =
    $("#performanceSelect");

  if (select) {
    select.value =
      state.performance;
  }
}


/* =========================================================
   NOVA FLOW — CANVAS
   ========================================================= */

const novaCanvas =
  $("#nova");

const novaCtx =
  novaCanvas?.getContext("2d");

let novaWidth = window.innerWidth;
let novaHeight = window.innerHeight;
let novaDpr = 1;

let novaAnimationId = null;
let novaLastFrame = performance.now();
let novaFrameCounter = 0;
let novaFpsTime = performance.now();

let novaMouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  active: false
};

let novaParticles = [];
let novaRain = [];
let novaStars = [];
let novaFireflies = [];
let novaSnow = [];


/* =========================================================
   NOVA RESIZE
   ========================================================= */

function resizeNova() {

  if (!novaCanvas || !novaCtx) return;

  novaWidth =
    window.innerWidth;

  novaHeight =
    window.innerHeight;

  novaDpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  novaCanvas.width =
    Math.floor(
      novaWidth * novaDpr
    );

  novaCanvas.height =
    Math.floor(
      novaHeight * novaDpr
    );

  novaCanvas.style.width =
    `${novaWidth}px`;

  novaCanvas.style.height =
    `${novaHeight}px`;

  novaCtx.setTransform(
    novaDpr,
    0,
    0,
    novaDpr,
    0,
    0
  );

  initializeNovaObjects();
}


/* =========================================================
   NOVA CALIDAD
   ========================================================= */

function getNovaCount(base) {

  let multiplier = 1;

  if (state.performance === "high") {
    multiplier = 1;
  }

  if (state.performance === "balanced") {
    multiplier = 0.65;
  }

  if (state.performance === "performance") {
    multiplier = 0.35;
  }

  if (!state.motion) {
    multiplier *= 0.45;
  }

  return Math.max(
    10,
    Math.floor(base * multiplier)
  );
}


/* =========================================================
   NOVA OBJETOS
   ========================================================= */

function initializeNovaObjects() {

  const particleCount =
    getNovaCount(
      Math.min(
        180,
        Math.max(
          80,
          Math.floor(
            novaWidth *
            novaHeight /
            11000
          )
        )
      )
    );

  novaParticles =
    Array.from(
      { length: particleCount },
      () => ({
        x: Math.random() * novaWidth,
        y: Math.random() * novaHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        phase: Math.random() * Math.PI * 2
      })
    );

  const starCount =
    getNovaCount(180);

  novaStars =
    Array.from(
      { length: starCount },
      () => ({
        x: Math.random() * novaWidth,
        y: Math.random() * novaHeight,
        size: Math.random() * 1.8 + 0.2,
        alpha: Math.random() * 0.8 + 0.15,
        twinkle: Math.random() * Math.PI * 2
      })
    );

  const rainCount =
    getNovaCount(130);

  novaRain =
    Array.from(
      { length: rainCount },
      () => ({
        x: Math.random() * novaWidth,
        y: Math.random() * novaHeight,
        speed: Math.random() * 10 + 5,
        length: Math.random() * 20 + 8
      })
    );

  const fireflyCount =
    getNovaCount(80);

  novaFireflies =
    Array.from(
      { length: fireflyCount },
      () => ({
        x: Math.random() * novaWidth,
        y: Math.random() * novaHeight,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        phase: Math.random() * Math.PI * 2,
        radius: Math.random() * 2 + 1
      })
    );

  const snowCount =
    getNovaCount(120);

  novaSnow =
    Array.from(
      { length: snowCount },
      () => ({
        x: Math.random() * novaWidth,
        y: Math.random() * novaHeight,
        speed: Math.random() * 2 + 0.5,
        drift: Math.random() * 1.5 + 0.2,
        size: Math.random() * 2.5 + 0.5,
        phase: Math.random() * Math.PI * 2
      })
    );
}


/* =========================================================
   NOVA HELPERS
   ========================================================= */

function novaClear() {

  novaCtx.clearRect(
    0,
    0,
    novaWidth,
    novaHeight
  );
}

function novaAlpha(value) {

  return clamp(
    value * state.novaIntensity,
    0,
    1
  );
}

function drawCircle(
  x,
  y,
  radius,
  alpha = 1
) {

  novaCtx.globalAlpha =
    novaAlpha(alpha);

  novaCtx.beginPath();

  novaCtx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  novaCtx.fill();

  novaCtx.globalAlpha = 1;
}

function distance(
  x1,
  y1,
  x2,
  y2
) {

  return Math.hypot(
    x2 - x1,
    y2 - y1
  );
}


/* =========================================================
   MODO COSMIC
   ========================================================= */

function drawCosmic(t) {

  novaCtx.fillStyle =
    "rgba(0,234,255,0.75)";

  for (const p of novaParticles) {

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -10) p.x = novaWidth + 10;
    if (p.x > novaWidth + 10) p.x = -10;

    if (p.y < -10) p.y = novaHeight + 10;
    if (p.y > novaHeight + 10) p.y = -10;

    const pulse =
      0.45 +
      Math.sin(
        t * 0.002 + p.phase
      ) * 0.35;

    drawCircle(
      p.x,
      p.y,
      p.size,
      pulse
    );
  }
}


/* =========================================================
   AURORA
   ========================================================= */

function drawAurora(t) {

  for (let band = 0; band < 5; band++) {

    novaCtx.beginPath();

    const offset =
      band * 90;

    for (
      let x = -50;
      x <= novaWidth + 50;
      x += 18
    ) {

      const y =
        novaHeight * 0.42 +
        offset +
        Math.sin(
          x * 0.006 +
          t * 0.0007 +
          band
        ) * 80 +
        Math.sin(
          x * 0.014 -
          t * 0.0004
        ) * 30;

      if (x === -50) {
        novaCtx.moveTo(x, y);
      } else {
        novaCtx.lineTo(x, y);
      }
    }

    novaCtx.strokeStyle =
      band % 2 === 0
        ? "rgba(0,234,255,0.13)"
        : "rgba(124,92,255,0.11)";

    novaCtx.lineWidth =
      35;

    novaCtx.stroke();
  }
}


/* =========================================================
   PULSE
   ========================================================= */

function drawPulse(t) {

  const cx =
    novaMouse.active
      ? novaMouse.x
      : novaWidth / 2;

  const cy =
    novaMouse.active
      ? novaMouse.y
      : novaHeight / 2;

  for (let i = 0; i < 12; i++) {

    const phase =
      (t * 0.001 +
        i * 0.45) %
      4;

    const radius =
      phase * 120;

    novaCtx.beginPath();

    novaCtx.arc(
      cx,
      cy,
      radius,
      0,
      Math.PI * 2
    );

    novaCtx.strokeStyle =
      i % 2
        ? "rgba(124,92,255,0.08)"
        : "rgba(0,234,255,0.10)";

    novaCtx.lineWidth =
      1.5;

    novaCtx.stroke();
  }
}


/* =========================================================
   MATRIX
   ========================================================= */

function drawMatrix(t) {

  const size = 18;

  novaCtx.font =
    "12px monospace";

  for (
    let x = 0;
    x < novaWidth;
    x += size
  ) {

    const index =
      Math.floor(x / size);

    const y =
      (
        t * 0.09 +
        index * 73
      ) %
      (novaHeight + 500);

    novaCtx.fillStyle =
      "rgba(0,234,255,0.12)";

    const char =
      String.fromCharCode(
        0x30A0 +
        Math.floor(
          Math.random() * 96
        )
      );

    novaCtx.fillText(
      char,
      x,
      y
    );
  }
}


/* =========================================================
   NEBULA
   ========================================================= */

function drawNebula(t) {

  const cx =
    novaWidth * 0.5;

  const cy =
    novaHeight * 0.48;

  for (let i = 0; i < 16; i++) {

    const angle =
      t * 0.00012 +
      i * 0.7;

    const radius =
      70 + i * 35;

    const x =
      cx +
      Math.cos(angle) *
      radius;

    const y =
      cy +
      Math.sin(angle) *
      radius *
      0.55;

    const gradient =
      novaCtx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        110
      );

    gradient.addColorStop(
      0,
      "rgba(0,234,255,0.08)"
    );

    gradient.addColorStop(
      1,
      "rgba(124,92,255,0)"
    );

    novaCtx.fillStyle =
      gradient;

    novaCtx.beginPath();

    novaCtx.arc(
      x,
      y,
      110,
      0,
      Math.PI * 2
    );

    novaCtx.fill();
  }
}


/* =========================================================
   WAVES
   ========================================================= */

function drawWaves(t) {

  for (let line = 0; line < 8; line++) {

    novaCtx.beginPath();

    for (
      let x = 0;
      x <= novaWidth;
      x += 12
    ) {

      const y =
        novaHeight * 0.35 +
        line * 55 +
        Math.sin(
          x * 0.009 +
          t * 0.001 +
          line
        ) * 25;

      if (x === 0) {
        novaCtx.moveTo(x, y);
      } else {
        novaCtx.lineTo(x, y);
      }
    }

    novaCtx.strokeStyle =
      line % 2
        ? "rgba(124,92,255,0.08)"
        : "rgba(0,234,255,0.10)";

    novaCtx.lineWidth =
      1.5;

    novaCtx.stroke();
  }
}


/* =========================================================
   STARFIELD
   ========================================================= */

function drawStarfield(t) {

  novaCtx.fillStyle =
    "white";

  for (const star of novaStars) {

    const twinkle =
      star.alpha +
      Math.sin(
        t * 0.003 +
        star.twinkle
      ) * 0.25;

    drawCircle(
      star.x,
      star.y,
      star.size,
      twinkle
    );
  }
}


/* =========================================================
   VORTEX
   ========================================================= */

function drawVortex(t) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  novaCtx.lineWidth = 1;

  for (let arm = 0; arm < 7; arm++) {

    novaCtx.beginPath();

    for (
      let r = 10;
      r < 500;
      r += 8
    ) {

      const angle =
        r * 0.025 +
        arm *
        (Math.PI * 2 / 7) +
        t * 0.0007;

      const x =
        cx +
        Math.cos(angle) *
        r;

      const y =
        cy +
        Math.sin(angle) *
        r;

      if (r === 10) {
        novaCtx.moveTo(x, y);
      } else {
        novaCtx.lineTo(x, y);
      }
    }

    novaCtx.strokeStyle =
      arm % 2
        ? "rgba(124,92,255,0.10)"
        : "rgba(0,234,255,0.10)";

    novaCtx.stroke();
  }
}


/* =========================================================
   FIREFLY
   ========================================================= */

function drawFirefly(t) {

  novaCtx.fillStyle =
    "#00eaff";

  for (const f of novaFireflies) {

    if (state.motion) {

      f.x +=
        f.vx +
        Math.sin(
          t * 0.001 +
          f.phase
        ) * 0.15;

      f.y +=
        f.vy +
        Math.cos(
          t * 0.0012 +
          f.phase
        ) * 0.15;
    }

    if (f.x < 0) f.x = novaWidth;
    if (f.x > novaWidth) f.x = 0;

    if (f.y < 0) f.y = novaHeight;
    if (f.y > novaHeight) f.y = 0;

    const alpha =
      0.25 +
      Math.sin(
        t * 0.004 +
        f.phase
      ) * 0.25;

    drawCircle(
      f.x,
      f.y,
      f.radius,
      alpha
    );
  }
}


/* =========================================================
   RAIN
   ========================================================= */

function drawRain() {

  novaCtx.strokeStyle =
    "rgba(0,234,255,0.13)";

  novaCtx.lineWidth = 1;

  for (const drop of novaRain) {

    if (state.motion) {
      drop.y += drop.speed;
    }

    if (drop.y > novaHeight + 30) {
      drop.y = -30;
      drop.x =
        Math.random() *
        novaWidth;
    }

    novaCtx.beginPath();

    novaCtx.moveTo(
      drop.x,
      drop.y
    );

    novaCtx.lineTo(
      drop.x - 2,
      drop.y + drop.length
    );

    novaCtx.stroke();
  }
}


/* =========================================================
   GRID
   ========================================================= */

function drawGrid(t) {

  const spacing = 55;

  novaCtx.lineWidth = 1;

  const offset =
    state.motion
      ? (t * 0.025) % spacing
      : 0;

  for (
    let x = -spacing;
    x < novaWidth + spacing;
    x += spacing
  ) {

    novaCtx.strokeStyle =
      "rgba(0,234,255,0.055)";

    novaCtx.beginPath();

    novaCtx.moveTo(
      x + offset,
      0
    );

    novaCtx.lineTo(
      x + offset,
      novaHeight
    );

    novaCtx.stroke();
  }

  for (
    let y = -spacing;
    y < novaHeight + spacing;
    y += spacing
  ) {

    novaCtx.beginPath();

    novaCtx.moveTo(
      0,
      y + offset
    );

    novaCtx.lineTo(
      novaWidth,
      y + offset
    );

    novaCtx.stroke();
  }
}


/* =========================================================
   SPIRAL
   ========================================================= */

function drawSpiral(t) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  for (let arm = 0; arm < 5; arm++) {

    novaCtx.beginPath();

    for (
      let i = 0;
      i < 420;
      i += 5
    ) {

      const radius =
        i * 1.3;

      const angle =
        i * 0.035 +
        arm * 1.25 +
        t * 0.0005;

      const x =
        cx +
        Math.cos(angle) *
        radius;

      const y =
        cy +
        Math.sin(angle) *
        radius *
        0.65;

      if (i === 0) {
        novaCtx.moveTo(x, y);
      } else {
        novaCtx.lineTo(x, y);
      }
    }

    novaCtx.strokeStyle =
      arm % 2
        ? "rgba(124,92,255,0.10)"
        : "rgba(0,234,255,0.10)";

    novaCtx.stroke();
  }
}


/* =========================================================
   ORBIT
   ========================================================= */

function drawOrbit(t) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  for (let orbit = 0; orbit < 5; orbit++) {

    const rx =
      100 + orbit * 75;

    const ry =
      45 + orbit * 40;

    novaCtx.beginPath();

    novaCtx.ellipse(
      cx,
      cy,
      rx,
      ry,
      orbit * 0.4,
      0,
      Math.PI * 2
    );

    novaCtx.strokeStyle =
      "rgba(0,234,255,0.09)";

    novaCtx.stroke();

    const angle =
      t * 0.001 *
      (orbit % 2 ? -1 : 1) +
      orbit;

    const x =
      cx +
      Math.cos(angle) *
      rx;

    const y =
      cy +
      Math.sin(angle) *
      ry;

    novaCtx.fillStyle =
      "#00eaff";

    drawCircle(
      x,
      y,
      3,
      0.8
    );
  }
}


/* =========================================================
   PLASMA
   ========================================================= */

function drawPlasma(t) {

  const step = 45;

  for (
    let x = 0;
    x < novaWidth;
    x += step
  ) {

    for (
      let y = 0;
      y < novaHeight;
      y += step
    ) {

      const value =
        Math.sin(
          x * 0.015 +
          t * 0.001
        ) +
        Math.sin(
          y * 0.017 -
          t * 0.001
        ) +
        Math.sin(
          (x + y) * 0.01
        );

      const radius =
        1 +
        Math.abs(value) * 2;

      novaCtx.fillStyle =
        value > 0
          ? "rgba(0,234,255,0.08)"
          : "rgba(255,78,205,0.06)";

      drawCircle(
        x,
        y,
        radius,
        0.7
      );
    }
  }
}


/* =========================================================
   DNA
   ========================================================= */

function drawDNA(t) {

  const center =
    novaWidth / 2;

  const height =
    novaHeight * 0.8;

  const start =
    novaHeight * 0.1;

  novaCtx.lineWidth = 1.5;

  for (let side = 0; side < 2; side++) {

    novaCtx.beginPath();

    for (
      let y = start;
      y < start + height;
      y += 5
    ) {

      const phase =
        y * 0.025 +
        t * 0.001;

      const x =
        center +
        Math.sin(phase) *
        110 *
        (side ? 1 : -1);

      if (y === start) {
        novaCtx.moveTo(x, y);
      } else {
        novaCtx.lineTo(x, y);
      }
    }

    novaCtx.strokeStyle =
      side
        ? "rgba(124,92,255,0.12)"
        : "rgba(0,234,255,0.12)";

    novaCtx.stroke();
  }

  for (
    let y = start;
    y < start + height;
    y += 30
  ) {

    const phase =
      y * 0.025 +
      t * 0.001;

    const x1 =
      center +
      Math.sin(phase) *
      -110;

    const x2 =
      center +
      Math.sin(phase) *
      110;

    novaCtx.strokeStyle =
      "rgba(255,255,255,0.05)";

    novaCtx.beginPath();

    novaCtx.moveTo(
      x1,
      y
    );

    novaCtx.lineTo(
      x2,
      y
    );

    novaCtx.stroke();
  }
}


/* =========================================================
   SNOW
   ========================================================= */

function drawSnow(t) {

  novaCtx.fillStyle =
    "rgba(255,255,255,0.8)";

  for (const flake of novaSnow) {

    if (state.motion) {

      flake.y += flake.speed;

      flake.x +=
        Math.sin(
          t * 0.001 +
          flake.phase
        ) *
        0.4;
    }

    if (flake.y > novaHeight + 10) {
      flake.y = -10;
      flake.x =
        Math.random() *
        novaWidth;
    }

    drawCircle(
      flake.x,
      flake.y,
      flake.size,
      0.6
    );
  }
}


/* =========================================================
   LIGHTNING
   ========================================================= */

function drawLightning(t) {

  if (
    Math.floor(t / 850) % 4 !== 0
  ) {
    return;
  }

  const startX =
    Math.random() *
    novaWidth;

  let x =
    startX;

  let y = 0;

  novaCtx.beginPath();

  novaCtx.moveTo(
    x,
    y
  );

  while (y < novaHeight * 0.8) {

    x +=
      (Math.random() - 0.5) *
      90;

    y +=
      Math.random() *
      70 + 25;

    novaCtx.lineTo(
      x,
      y
    );
  }

  novaCtx.strokeStyle =
    "rgba(0,234,255,0.35)";

  novaCtx.lineWidth =
    2;

  novaCtx.shadowBlur =
    15;

  novaCtx.shadowColor =
    "#00eaff";

  novaCtx.stroke();

  novaCtx.shadowBlur = 0;
}


/* =========================================================
   GALAXY
   ========================================================= */

function drawGalaxy(t) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  for (let arm = 0; arm < 4; arm++) {

    novaCtx.beginPath();

    for (
      let i = 0;
      i < 500;
      i += 4
    ) {

      const r =
        i * 0.9;

      const angle =
        arm *
        Math.PI /
        2 +
        r * 0.018 +
        t * 0.0002;

      const spread =
        (Math.random() - 0.5) *
        15;

      const x =
        cx +
        Math.cos(angle) *
        r +
        spread;

      const y =
        cy +
        Math.sin(angle) *
        r *
        0.42 +
        spread;

      if (i === 0) {
        novaCtx.moveTo(x, y);
      } else {
        novaCtx.lineTo(x, y);
      }
    }

    novaCtx.strokeStyle =
      arm % 2
        ? "rgba(124,92,255,0.08)"
        : "rgba(0,234,255,0.08)";

    novaCtx.stroke();
  }
}


/* =========================================================
   COMETA
   ========================================================= */

function drawComet(t) {

  const cycle =
    (t * 0.00015) %
    1;

  const x =
    cycle *
    (novaWidth + 400) -
    200;

  const y =
    novaHeight *
    0.25 +
    Math.sin(
      cycle * Math.PI * 2
    ) *
    novaHeight *
    0.25;

  const gradient =
    novaCtx.createLinearGradient(
      x - 250,
      y + 100,
      x,
      y
    );

  gradient.addColorStop(
    0,
    "rgba(0,234,255,0)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,234,255,0.25)"
  );

  novaCtx.strokeStyle =
    gradient;

  novaCtx.lineWidth =
    5;

  novaCtx.beginPath();

  novaCtx.moveTo(
    x - 260,
    y + 110
  );

  novaCtx.lineTo(
    x,
    y
  );

  novaCtx.stroke();

  novaCtx.fillStyle =
    "white";

  drawCircle(
    x,
    y,
    5,
    1
  );
}


/* =========================================================
   QUANTUM
   ========================================================= */

function drawQuantum(t) {

  const count =
    Math.min(
      novaParticles.length,
      100
    );

  for (let i = 0; i < count; i++) {

    const p =
      novaParticles[i];

    const angle =
      p.phase +
      t * 0.0008;

    const radius =
      80 +
      Math.sin(
        t * 0.001 +
        i
      ) *
      70;

    const x =
      novaWidth / 2 +
      Math.cos(angle) *
      radius;

    const y =
      novaHeight / 2 +
      Math.sin(angle) *
      radius;

    novaCtx.fillStyle =
      i % 2
        ? "rgba(124,92,255,0.20)"
        : "rgba(0,234,255,0.20)";

    drawCircle(
      x,
      y,
      1.8,
      0.8
    );

    if (i > 0 && i % 4 === 0) {

      const previous =
        novaParticles[i - 1];

      novaCtx.strokeStyle =
        "rgba(0,234,255,0.035)";

      novaCtx.beginPath();

      novaCtx.moveTo(
        x,
        y
      );

      novaCtx.lineTo(
        previous.x,
        previous.y
      );

      novaCtx.stroke();
    }
  }
}


/* =========================================================
   DIBUJAR MODO
   ========================================================= */

const NOVA_MODES = {
  cosmic: drawCosmic,
  aurora: drawAurora,
  pulse: drawPulse,
  matrix: drawMatrix,
  nebula: drawNebula,
  waves: drawWaves,
  starfield: drawStarfield,
  vortex: drawVortex,
  firefly: drawFirefly,
  rain: drawRain,
  grid: drawGrid,
  spiral: drawSpiral,
  orbit: drawOrbit,
  plasma: drawPlasma,
  dna: drawDNA,
  snow: drawSnow,
  lightning: drawLightning,
  galaxy: drawGalaxy,
  comet: drawComet,
  quantum: drawQuantum
};


/* =========================================================
   ANIMACIÓN NOVA
   ========================================================= */

function novaLoop(now) {

  if (!novaCtx) return;

  const delta =
    now - novaLastFrame;

  novaLastFrame = now;

  novaFrameCounter++;

  if (
    now - novaFpsTime >= 1000
  ) {

    const fps =
      Math.round(
        novaFrameCounter /
        ((now - novaFpsTime) / 1000)
      );

    const fpsElement =
      $("#fps");

    if (fpsElement) {
      fpsElement.textContent =
        `${fps} FPS`;
    }

    novaFrameCounter = 0;
    novaFpsTime = now;
  }

  novaClear();

  try {

    const draw =
      NOVA_MODES[state.novaMode] ||
      NOVA_MODES.cosmic;

    draw(
      state.motion
        ? now
        : 0
    );

  } catch (error) {

    console.error(
      "NOVA FLOW error:",
      error
    );

    state.novaMode =
      "cosmic";

    updateNovaModeUI();

    try {
      NOVA_MODES.cosmic(now);
    } catch {
      /* Evita que el error detenga NOVA. */
    }
  }

  novaAnimationId =
    requestAnimationFrame(
      novaLoop
    );
}


/* =========================================================
   NOVA UI
   ========================================================= */

function updateNovaModeUI() {

  const modeName =
    $("#novaModeName");

  if (modeName) {

    modeName.textContent =
      state.novaMode
        .toUpperCase();
  }

  $$(".novaMode").forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.mode ===
        state.novaMode
      );
    }
  );
}

function setupNovaControls() {

  $$(".novaMode").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const mode =
            button.dataset.mode;

          if (!NOVA_MODES[mode]) {
            return;
          }

          state.novaMode =
            mode;

          saveState();

          updateNovaModeUI();

          showToast(
            `NOVA: ${mode.toUpperCase()}`
          );
        }
      );
    }
  );

  $("#novaIntensity")?.addEventListener(
    "input",
    event => {

      state.novaIntensity =
        parseFloat(
          event.target.value
        );

      saveState();
    }
  );

  $("#performanceSelect")?.addEventListener(
    "change",
    event => {

      state.performance =
        event.target.value;

      saveState();

      applyPerformance();

      initializeNovaObjects();
    }
  );

  $("#novaBtn")?.addEventListener(
    "click",
    () => {

      $("#novaSection")?.scrollIntoView({
        behavior: state.motion
          ? "smooth"
          : "auto"
      });
    }
  );

  const intensity =
    $("#novaIntensity");

  if (intensity) {
    intensity.value =
      state.novaIntensity;
  }

  updateNovaModeUI();
}


/* =========================================================
   RATÓN / CURSOR
   ========================================================= */

function setupNovaPointer() {

  window.addEventListener(
    "pointermove",
    event => {

      novaMouse.x =
        event.clientX;

      novaMouse.y =
        event.clientY;

      novaMouse.active = true;
    },
    {
      passive: true
    }
  );

  window.addEventListener(
    "pointerleave",
    () => {
      novaMouse.active = false;
    }
  );

  window.addEventListener(
    "blur",
    () => {
      novaMouse.active = false;
    }
  );
}


/* =========================================================
   EXPORTAR DATOS
   ========================================================= */

function exportData() {

  const data =
    JSON.stringify(
      state,
      null,
      2
    );

  const blob =
    new Blob(
      [data],
      {
        type: "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "utilhub-v19-backup.json";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  showToast(
    "Datos exportados."
  );
}


/* =========================================================
   IMPORTAR DATOS
   ========================================================= */

function importData(file) {

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = () => {

    try {

      const imported =
        JSON.parse(
          reader.result
        );

      if (
        !imported ||
        typeof imported !== "object"
      ) {
        throw new Error(
          "Archivo inválido."
        );
      }

      state = {
        ...structuredClone(DEFAULT_STATE),
        ...imported,
        stopwatch: {
          ...DEFAULT_STATE.stopwatch,
          ...(imported.stopwatch || {})
        },
        timer: {
          ...DEFAULT_STATE.timer,
          ...(imported.timer || {})
        }
      };

      saveState();

      applyAllSettings();

      renderTools();

      renderQuickTools();

      showToast(
        "Datos importados correctamente."
      );

      if (currentTool) {
        openTool(currentTool);
      }

    } catch (error) {

      console.error(error);

      showToast(
        "No se pudo importar el archivo."
      );
    }
  };

  reader.readAsText(file);
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(html) {

  const modal =
    $("#modal");

  const body =
    $("#modalBody");

  if (!modal || !body) return;

  body.innerHTML =
    html;

  modal.classList.add("open");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeModal() {

  const modal =
    $("#modal");

  if (!modal) return;

  modal.classList.remove("open");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================================
   INICIO
   ========================================================= */

function setupMainControls() {

  $("#themeBtn")?.addEventListener(
    "click",
    toggleTheme
  );

  $("#motionBtn")?.addEventListener(
    "click",
    toggleMotion
  );

  $("#focusBtn")?.addEventListener(
    "click",
    () => {

      state.focus =
        !state.focus;

      applyFocus();

      saveState();

      showToast(
        state.focus
          ? "Modo concentración activado."
          : "Modo concentración desactivado."
      );
    }
  );

  $("#exploreBtn")?.addEventListener(
    "click",
    () => {

      $("#toolsSection")?.scrollIntoView({
        behavior: state.motion
          ? "smooth"
          : "auto"
      });
    }
  );

  $("#clearRecentBtn")?.addEventListener(
    "click",
    () => {

      state.recent = [];

      saveState();

      renderQuickTools();

      updateStats();

      showToast(
        "Historial reciente limpiado."
      );
    }
  );

  $("#exportBtn")?.addEventListener(
    "click",
    exportData
  );

  $("#importBtn")?.addEventListener(
    "click",
    () => {
      $("#importFile")?.click();
    }
  );

  $("#importFile")?.addEventListener(
    "change",
    event => {

      importData(
        event.target.files?.[0]
      );

      event.target.value = "";
    }
  );

  $("#closeTool")?.addEventListener(
    "click",
    closeTool
  );

  $("#brandHome")?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: state.motion
          ? "smooth"
          : "auto"
      });
    }
  );
}


/* =========================================================
   ESTADO DE CONEXIÓN
   ========================================================= */

function updateConnectionStatus() {

  const status =
    $("#connectionStatus");

  if (!status) return;

  const online =
    navigator.onLine;

  status.classList.toggle(
    "offline",
    !online
  );

  const text =
    status.querySelector(
      "span:last-child"
    );

  if (text) {
    text.textContent =
      online
        ? "En línea"
        : "Sin conexión";
  }
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

async function registerServiceWorker() {

  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  try {

    await navigator.serviceWorker.register(
      "./sw.js",
      {
        scope: "./"
      }
    );

  } catch (error) {

    console.warn(
      "Service Worker no disponible:",
      error
    );
  }
}


/* =========================================================
   APLICAR CONFIGURACIÓN
   ========================================================= */

function applyAllSettings() {

  applyTheme();

  applyMotion();

  applyFocus();

  applyPerformance();

  updateNovaModeUI();

  const intensity =
    $("#novaIntensity");

  if (intensity) {
    intensity.value =
      state.novaIntensity;
  }
}


/* =========================================================
   INICIALIZACIÓN PRINCIPAL
   ========================================================= */

function init() {

  try {

    renderTools();

    renderQuickTools();

    setupMainControls();

    setupGlobalEvents();

    setupSearch();

    setupCategories();

    setupNovaControls();

    setupNovaPointer();

    applyAllSettings();

    updateConnectionStatus();

    window.addEventListener(
      "online",
      updateConnectionStatus
    );

    window.addEventListener(
      "offline",
      updateConnectionStatus
    );

    resizeNova();

    window.addEventListener(
      "resize",
      resizeNova,
      {
        passive: true
      }
    );

    if (novaCtx) {
      novaAnimationId =
        requestAnimationFrame(
          novaLoop
        );
    }

    registerServiceWorker();

    document.documentElement.dataset.ready =
      "true";

  } catch (error) {

    console.error(
      "Error inicializando ÚtilHub:",
      error
    );

    showToast(
      "ÚtilHub inició con algunas funciones limitadas."
    );
  }
}


/* =========================================================
   INICIAR CUANDO EL DOM ESTÉ LISTO
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init,
    {
      once: true
    }
  );

} else {

  init();
}


/* =========================================================
   LIMPIEZA ANTES DE SALIR
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (state.stopwatch.running) {

      state.stopwatch.elapsed +=
        Date.now() -
        state.stopwatch.startedAt;

      state.stopwatch.startedAt =
        Date.now();
    }

    if (state.timer.running) {

      state.timer.remaining =
        getTimerRemaining();

      state.timer.endAt =
        Date.now() +
        state.timer.remaining * 1000;
    }

    saveState();
  }
);


/* =========================================================
   FIN — ÚTILHUB V19
   ========================================================= */
