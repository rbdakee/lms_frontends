/**
 * Кодировщик QR-кода: байтовый режим, уровень коррекции M, версии 1–10.
 *
 * Своя реализация вместо зависимости — как иконки и плеер в этом прототипе.
 * Хватает с запасом: ссылка проверки вида
 * «https://lms.kz/verify/KZ-2026-003107» — это версия 3, а 10-я держит
 * 271 байт, то есть любой preview-домен Vercel.
 *
 * Спецификация — ISO/IEC 18004. Порядок шагов: данные → блоки с кодами
 * Рида — Соломона → чередование → раскладка по матрице → выбор маски.
 */

/* ---------- Арифметика GF(256) ---------- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = x << 1;
  if (x & 0x100) x ^= 0x11d; // порождающий многочлен поля 0b100011101
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/* ---------- Параметры версий для уровня коррекции M ---------- */

/** Всего кодовых слов (данные + коррекция) в версиях 1–10 */
const TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

/** Кодовых слов коррекции на блок */
const EC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];

/** Число блоков коррекции */
const BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5] as const;

/** Центры выравнивающих узоров */
const ALIGN_CENTERS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/** Байт данных в версии (без кодовых слов коррекции) */
const dataCapacity = (version: number) =>
  TOTAL_CODEWORDS[version - 1] - EC_PER_BLOCK[version - 1] * BLOCKS[version - 1];

/* ---------- Коды Рида — Соломона ---------- */

/** Делитель степени `degree` — произведение (x − α⁰)…(x − α^(degree−1)) */
function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = mul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = mul(root, 0x02);
  }
  return result;
}

/** Остаток от деления данных на делитель — это и есть слова коррекции */
function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < divisor.length; i++) result[i] ^= mul(divisor[i], factor);
  }
  return result;
}

/* ---------- Поток данных ---------- */

/** UTF-8 байты строки — сканеры читают байтовый режим как UTF-8 */
function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/** Наименьшая версия, в которую влезут данные */
function pickVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v++) {
    // 4 бита режима + счётчик длины (8 бит до версии 10, дальше 16)
    const header = 4 + (v < 10 ? 8 : 16);
    if (Math.ceil((header + byteLen * 8) / 8) <= dataCapacity(v)) return v;
  }
  throw new Error("QR: слишком длинная строка для версий 1–10");
}

/** Собирает поток кодовых слов: заголовок, данные, дополнение до ёмкости */
function buildData(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  push(0b0100, 4); // байтовый режим
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);

  const capacityBits = dataCapacity(version) * 8;
  push(0, Math.min(4, capacityBits - bits.length)); // терминатор
  while (bits.length % 8 !== 0) bits.push(0);

  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let w = 0;
    for (let j = 0; j < 8; j++) w = (w << 1) | bits[i + j];
    words.push(w);
  }
  // Чередующиеся байты-заполнители до конца блока данных
  for (let i = 0; words.length < dataCapacity(version); i++) {
    words.push(i % 2 === 0 ? 0xec : 0x11);
  }
  return words;
}

/** Разбивает данные на блоки, считает коррекцию и чередует байты */
function interleave(data: number[], version: number): number[] {
  const numBlocks = BLOCKS[version - 1];
  const ecLen = EC_PER_BLOCK[version - 1];
  const shortLen = Math.floor(data.length / numBlocks);
  const numLong = data.length % numBlocks; // последние блоки на байт длиннее

  const divisor = rsDivisor(ecLen);
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];

  for (let i = 0, offset = 0; i < numBlocks; i++) {
    const len = shortLen + (i >= numBlocks - numLong ? 1 : 0);
    const block = data.slice(offset, offset + len);
    offset += len;
    dataBlocks.push(block);
    ecBlocks.push(rsRemainder(block, divisor));
  }

  const out: number[] = [];
  for (let i = 0; i < shortLen + 1; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return out;
}

/* ---------- Матрица ---------- */

type Grid = { size: number; mods: boolean[][]; fixed: boolean[][] };

function blankGrid(version: number): Grid {
  const size = version * 4 + 17;
  const make = () => Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  return { size, mods: make(), fixed: make() };
}

function setModule(g: Grid, x: number, y: number, dark: boolean, fixed = true) {
  if (x < 0 || y < 0 || x >= g.size || y >= g.size) return;
  g.mods[y][x] = dark;
  if (fixed) g.fixed[y][x] = true;
}

/** Поисковый узор 7×7 с белой рамкой вокруг */
function drawFinder(g: Grid, cx: number, cy: number) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(g, cx + dx, cy + dy, d !== 2 && d !== 4);
    }
  }
}

/** Выравнивающий узор 5×5 */
function drawAlignment(g: Grid, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setModule(g, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function drawFunctionPatterns(g: Grid, version: number) {
  const last = g.size - 1;

  drawFinder(g, 3, 3);
  drawFinder(g, last - 3, 3);
  drawFinder(g, 3, last - 3);

  // Синхродорожки
  for (let i = 8; i < g.size - 8; i++) {
    setModule(g, i, 6, i % 2 === 0);
    setModule(g, 6, i, i % 2 === 0);
  }

  // Выравнивающие узоры — кроме углов, занятых поисковыми
  const centers = ALIGN_CENTERS[version - 1];
  for (const cy of centers) {
    for (const cx of centers) {
      const corner =
        (cx === 6 && cy === 6) ||
        (cx === 6 && cy === last - 6) ||
        (cx === last - 6 && cy === 6);
      if (!corner) drawAlignment(g, cx, cy);
    }
  }

  // Место под информацию о формате — заполнится после выбора маски
  for (let i = 0; i < 9; i++) {
    setModule(g, i, 8, false);
    setModule(g, 8, i, false);
  }
  for (let i = 0; i < 8; i++) {
    setModule(g, last - i, 8, false);
    setModule(g, 8, last - i, false);
  }
  setModule(g, 8, last - 7, true); // всегда тёмный модуль

  // Информация о версии — только с 7-й
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = ((version << 12) | rem) >>> 0;
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = last - 10 + (i % 3);
      const b = Math.floor(i / 3);
      setModule(g, a, b, bit);
      setModule(g, b, a, bit);
    }
  }
}

/** 15 бит информации о формате: уровень коррекции M и номер маски */
function drawFormat(g: Grid, mask: number) {
  const data = (0b00 << 3) | mask; // 00 — уровень M
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = (((data << 10) | rem) ^ 0x5412) >>> 0;
  const at = (i: number) => ((bits >>> i) & 1) === 1;
  const last = g.size - 1;

  // Копия вокруг левого верхнего поискового узора
  for (let i = 0; i <= 5; i++) setModule(g, 8, i, at(i));
  setModule(g, 8, 7, at(6));
  setModule(g, 8, 8, at(7));
  setModule(g, 7, 8, at(8));
  for (let i = 9; i < 15; i++) setModule(g, 14 - i, 8, at(i));

  // Копия у двух других углов
  for (let i = 0; i < 8; i++) setModule(g, last - i, 8, at(i));
  for (let i = 8; i < 15; i++) setModule(g, 8, last - 14 + i, at(i));
}

/** Раскладка кодовых слов змейкой снизу вверх, по два столбца */
function drawCodewords(g: Grid, words: number[]) {
  let bit = 0;
  for (let right = g.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // столбец синхродорожки пропускаем
    for (let step = 0; step < g.size; step++) {
      const up = ((right + 1) & 2) === 0;
      const y = up ? g.size - 1 - step : step;
      for (const x of [right, right - 1]) {
        if (g.fixed[y][x]) continue;
        const dark = bit < words.length * 8 && ((words[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1;
        g.mods[y][x] = dark;
        bit++;
      }
    }
  }
}

const maskAt = (mask: number, x: number, y: number): boolean => {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
};

function applyMask(g: Grid, mask: number) {
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) {
      if (!g.fixed[y][x] && maskAt(mask, x, y)) g.mods[y][x] = !g.mods[y][x];
    }
  }
}

/** Штраф по четырём правилам спецификации — чем меньше, тем лучше маска */
function penalty(g: Grid): number {
  const n = g.size;
  let score = 0;

  // Правила 1 и 3: серии и узоры вида 1:1:3:1:1
  const lines: boolean[][] = [];
  for (let y = 0; y < n; y++) lines.push(g.mods[y]);
  for (let x = 0; x < n; x++) lines.push(g.mods.map((row) => row[x]));

  for (const line of lines) {
    let run = 1;
    for (let i = 1; i < n; i++) {
      if (line[i] === line[i - 1]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
    for (let i = 0; i + 11 <= n; i++) {
      const w = line.slice(i, i + 11);
      const pat = (a: boolean[]) => a.map((v) => (v ? "1" : "0")).join("");
      if (pat(w) === "10111010000" || pat(w) === "00001011101") score += 40;
    }
  }

  // Правило 2: одноцветные блоки 2×2
  for (let y = 0; y + 1 < n; y++) {
    for (let x = 0; x + 1 < n; x++) {
      const v = g.mods[y][x];
      if (v === g.mods[y][x + 1] && v === g.mods[y + 1][x] && v === g.mods[y + 1][x + 1]) {
        score += 3;
      }
    }
  }

  // Правило 4: перекос доли тёмных модулей от половины
  let dark = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (g.mods[y][x]) dark++;
  score += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;

  return score;
}

/**
 * Матрица модулей QR-кода: `true` — тёмный.
 * Уровень коррекции M — сертификат может быть распечатан и слегка затёрт.
 */
export function qrMatrix(text: string): boolean[][] {
  const bytes = utf8(text);
  const version = pickVersion(bytes.length);
  const words = interleave(buildData(bytes, version), version);

  let best: Grid | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const g = blankGrid(version);
    drawFunctionPatterns(g, version);
    drawCodewords(g, words);
    drawFormat(g, mask);
    applyMask(g, mask);
    const score = penalty(g);
    if (score < bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return (best as Grid).mods;
}

/**
 * Путь для SVG: каждый тёмный модуль — квадрат 1×1.
 * viewBox рисуется по размеру матрицы, поля добавляет вызывающий код.
 */
export function qrPath(matrix: boolean[][]): string {
  const parts: string[] = [];
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (matrix[y][x]) parts.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return parts.join("");
}
