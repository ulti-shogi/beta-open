// =======================================
// profile.js（全モード対応＋各段の昇段日モード追加）
//
// 追加: date-4d ～ date-9d
//  表示: 区分｜棋士名｜◯段昇段日｜棋士番号
//  並替: ラジオ keep=席次順 / asc, desc=該当昇段日で比較
//
// 終了日の統一ルール:
//   区分=現役 → 今日
//   区分≠現役 → 引退日（※現役中没はCSVで引退日=没年月日を記入）
//
// 既存モード:
//   sekiji, kishi-no, age,
//   age-4d..9d（各段昇段“年齢”）,
//   dur-4to5..8to9（昇段所要期間）,
//   term-active（現役期間 四段→終了）,
//   age-active（現役年齢 誕生→終了）
// =======================================

const CSV_URL = 'profile.csv';

// 今日（ローカル）
const today = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
})();

// 席次順“原本”
let baseData = [];
let currentMode  = 'sekiji';
let currentOrder = 'keep';

// 大分類 → 小分類の対応表（追加①）
const DETAIL_OPTIONS = {
  basic: [
    { value: "sekiji",   label: "席次" },
    { value: "kishi-no", label: "棋士番号" }
  ],
  age: [
    { value: "age",       label: "年齢（享年）" },
    { value: "age-active",label: "現役年齢" },
    { value: "age-4d",    label: "四段昇段年齢" },
    { value: "age-5d",    label: "五段昇段年齢" },
    { value: "age-6d",    label: "六段昇段年齢" },
    { value: "age-7d",    label: "七段昇段年齢" },
    { value: "age-8d",    label: "八段昇段年齢" },
    { value: "age-9d",    label: "九段昇段年齢" }
  ],
  term: [
    { value: "term-active", label: "現役期間" },
    { value: "dur-4to5",    label: "四→五段 昇段所要期間" },
    { value: "dur-5to6",    label: "五→六段 昇段所要期間" },
    { value: "dur-6to7",    label: "六→七段 昇段所要期間" },
    { value: "dur-7to8",    label: "七→八段 昇段所要期間" },
    { value: "dur-8to9",    label: "八→九段 昇段所要期間" }
  ],
  date: [
    { value: "date-4d", label: "四段 昇段日" },
    { value: "date-5d", label: "五段 昇段日" },
    { value: "date-6d", label: "六段 昇段日" },
    { value: "date-7d", label: "七段 昇段日" },
    { value: "date-8d", label: "八段 昇段日" },
    { value: "date-9d", label: "九段 昇段日" }
  ]
};

// ---------- 初期化 ----------
fetch(CSV_URL)
  .then(res => res.text())
  .then(text => {
    const rows = parseCSV(text);
    const enriched = rows.map(enrichRow);
    baseData = enriched.slice().sort((a, b) => toNumberSafe(a['席次']) - toNumberSafe(b['席次']));
    renderTable(baseData, 'sekiji');
    setupUI();
  })
  .catch(err => console.error('CSV読み込み失敗:', err));

// ---------- CSV ----------
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(',').map(h => h.trim());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(',');
    const row = {};
    header.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
    out.push(row);
  }
  return out;
}

// ---------- 行の拡張 ----------
function enrichRow(row) {
  const kubun = (row['区分'] || '').trim();
  const title = (row['称号'] || '').trim();
  const dan   = (row['段位'] || '').trim();
  const danOrTitle = title ? title : (dan || '');

  const birth = toDateSafe(row['生年月日']);
  const died  = toDateSafe(row['没年月日']);
  const retiredAt = toDateSafe(row['引退日']);

  // 年齢/享年用の終了日（死んでいれば没年月日、そうでなければ今日）
  const endForAge = died ? died : today;

  // 現役期間・現役年齢用の終了日（統一ルール）
  const endUnified = (kubun === '現役') ? today : retiredAt;
  const endUnifiedStr = (kubun === '現役')
    ? formatDateYYYYMMDD(today)
    : (row['引退日'] || '');

  // 現在年齢／享年
  let ageDays = null, ageDisplay = '';
  if (birth) {
    ageDays = diffDays(birth, endForAge);
    const a = diffYMD(birth, endForAge);
    ageDisplay = `${died ? '享年' : ''}${a.year}歳${a.month}ヶ月${a.day}日`;
  }

  // 各段昇段日
  const p4 = toDateSafe(row['四段昇段日']);
  const p5 = toDateSafe(row['五段昇段日']);
  const p6 = toDateSafe(row['六段昇段日']);
  const p7 = toDateSafe(row['七段昇段日']);
  const p8 = toDateSafe(row['八段昇段日']);
  const p9 = toDateSafe(row['九段昇段日']);

  // 指定日までの年齢
  const ageAt = (to) => {
    if (!birth || !to) return { days: null, text: '' };
    const days = diffDays(birth, to);
    const d = diffYMD(birth, to);
    return { days, text: `${d.year}歳${d.month}ヶ月${d.day}日` };
  };

  const a4 = ageAt(p4);
  const a5 = ageAt(p5);
  const a6 = ageAt(p6);
  const a7 = ageAt(p7);
  const a8 = ageAt(p8);
  const a9 = ageAt(p9);

  // 区間の所要期間
  const dur = (from, to) => {
    if (!from || !to) return { days: null, text: '' };
    const days = diffDays(from, to);
    const d = diffYMD(from, to);
    return { days, text: `${d.year}年${d.month}ヶ月${d.day}日` };
  };

  const d45 = dur(p4, p5);
  const d56 = dur(p5, p6);
  const d67 = dur(p6, p7);
  const d78 = dur(p7, p8);
  const d89 = dur(p8, p9);

  // 現役期間（四段→終了）
  let termDays = null, termDisplay = '';
  if (p4 && endUnified) {
    termDays = diffDays(p4, endUnified);
    const t = diffYMD(p4, endUnified);
    termDisplay = `${t.year}年${t.month}ヶ月${t.day}日`;
  }

  // 現役年齢（生年月日→終了）
  let ageActiveDays = null, ageActiveDisplay = '';
  if (birth && endUnified) {
    ageActiveDays = diffDays(birth, endUnified);
    const t = diffYMD(birth, endUnified);
    ageActiveDisplay = `${t.year}歳${t.month}ヶ月${t.day}日`;
  }

  return Object.assign({}, row, {
    '__dan_or_title__': danOrTitle,

    '__age_days__': ageDays,
    '__age_display__': ageDisplay,

    '__age_at_4d_days__': a4.days, '__age_at_4d_display__': a4.text,
    '__age_at_5d_days__': a5.days, '__age_at_5d_display__': a5.text,
    '__age_at_6d_days__': a6.days, '__age_at_6d_display__': a6.text,
    '__age_at_7d_days__': a7.days, '__age_at_7d_display__': a7.text,
    '__age_at_8d_days__': a8.days, '__age_at_8d_display__': a8.text,
    '__age_at_9d_days__': a9.days, '__age_at_9d_display__': a9.text,

    '__dur_4to5_days__': d45.days, '__dur_4to5_display__': d45.text,
    '__dur_5to6_days__': d56.days, '__dur_5to6_display__': d56.text,
    '__dur_6to7_days__': d67.days, '__dur_6to7_display__': d67.text,
    '__dur_7to8_days__': d78.days, '__dur_7to8_display__': d78.text,
    '__dur_8to9_days__': d89.days, '__dur_8to9_display__': d89.text,

    '__term_active_days__': termDays,
    '__term_active_display__': termDisplay,
    '__term_active_end__': endUnifiedStr,

    '__age_active_days__': ageActiveDays,
    '__age_active_display__': ageActiveDisplay,
    '__age_active_end__': endUnifiedStr
  });
}

// ---------- 日付ユーティリティ ----------
function toDateSafe(str) {
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function diffDays(a, b) { if (!a || !b) return null; return Math.floor((b.getTime() - a.getTime()) / 86400000); }
function diffYMD(from, to) {
  let y1 = from.getFullYear(), m1 = from.getMonth(), d1 = from.getDate();
  let y2 = to.getFullYear(),   m2 = to.getMonth(),   d2 = to.getDate();
  let year = y2 - y1, month = m2 - m1, day = d2 - d1;
  if (day < 0) { const last = new Date(y2, m2, 0).getDate(); day += last; month--; }
  if (month < 0) { month += 12; year--; }
  return { year, month, day };
}
function formatDateYYYYMMDD(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function formatDateYY(str) {
  if (!str) return '';
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return str;
  const yy = String(Number(m[1]) % 100).padStart(2, '0');
  return `${yy}/${m[2]}/${m[3]}`;
}
function toNumberSafe(v){ const n=Number(v); return isNaN(n)?9999999:n; }
function numCmp(a,b){ const an=(a==null), bn=(b==null); if(an&&bn)return 0; if(an)return 1; if(bn)return -1; return a-b; }
function dateValue(s){ const d=toDateSafe(s); return d ? d.getTime() : null; }
function dateCmp(a,b){ const av=dateValue(a), bv=dateValue(b); if(av==null&&bv==null)return 0; if(av==null)return 1; if(bv==null)return -1; return av-bv; }

// 大分類に応じて小分類セレクトを書き換える（追加②）
function updateDetailSelect(categoryValue) {
  const detailSel = document.querySelector('select[name="detail"]');
  detailSel.innerHTML = ''; // いったん空にする

  const list = DETAIL_OPTIONS[categoryValue] || [];
  list.forEach(obj => {
    const opt = document.createElement('option');
    opt.value = obj.value;
    opt.textContent = obj.label;
    detailSel.appendChild(opt);
  });

  // ▼ detail の change イベント（従来）
  detailSel.addEventListener('change', () => {
    currentMode = detailSel.value;
    if (currentOrder === "keep") {
      renderTable(baseData, currentMode);
    } else {
      renderTable(sortData(baseData, currentMode, currentOrder), currentMode);
    }
  });

  // ▼★ 追加：小分類の最初の項目で即時表示（自動更新）
  currentMode = detailSel.value;
  if (currentOrder === "keep") {
    renderTable(baseData, currentMode);
  } else {
    renderTable(sortData(baseData, currentMode, currentOrder), currentMode);
  }
}

// ---------- UI ----------
function setupUI() {
  const categorySel = document.querySelector('select[name="category"]');
  const detailSel   = document.querySelector('select[name="detail"]');
  const radios      = document.querySelectorAll('input[type="radio"][name="order"]');

  // ▼ 初期状態：basic の小分類を反映
  updateDetailSelect('basic');

  // ▼ 大分類が変わったとき、小分類を書き換える
  categorySel.addEventListener('change', () => {
    updateDetailSelect(categorySel.value);
  });

  // ▼ 小分類（detail）は updateDetailSelect 側で change を登録済み

  // ▼ 並び替え（既存機能）
  radios.forEach(r => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      currentOrder = r.value;
      if (currentOrder === 'keep') {
        renderTable(baseData, currentMode);
      } else {
        renderTable(sortData(baseData, currentMode, currentOrder), currentMode);
      }
    });
  });
}

// ---------- 並べ替え ----------
function sortData(data, mode, order) {
  const copied = data.slice();
  const dir = (order === 'desc') ? -1 : 1;

  if (mode === 'kishi-no') {
    copied.sort((a, b) => (toNumberSafe(a['棋士番号']) - toNumberSafe(b['棋士番号'])) * dir);
  } else if (mode === 'age') {
    copied.sort((a, b) => numCmp(a['__age_days__'], b['__age_days__']) * dir);
  } else if (/^age-[4-9]d$/.test(mode)) {
    const key = mode.replace('age-', '__age_at_') + '_days__';
    copied.sort((a, b) => numCmp(a[key], b[key]) * dir);
  } else if (/^dur-[4-9]to[5-9]$/.test(mode)) {
    const key = '__' + mode.replace('dur-', 'dur_') + '_days__';
    copied.sort((a, b) => numCmp(a[key], b[key]) * dir);
  } else if (mode === 'term-active') {
    copied.sort((a, b) => numCmp(a['__term_active_days__'], b['__term_active_days__']) * dir);
  } else if (mode === 'age-active') {
    copied.sort((a, b) => numCmp(a['__age_active_days__'], b['__age_active_days__']) * dir);
  } else if (/^date-[4-9]d$/.test(mode)) {
    const dateMap = {
      'date-4d':'四段昇段日',
      'date-5d':'五段昇段日',
      'date-6d':'六段昇段日',
      'date-7d':'七段昇段日',
      'date-8d':'八段昇段日',
      'date-9d':'九段昇段日'
    };
    const col = dateMap[mode];
    copied.sort((a,b)=> dateCmp(a[col], b[col]) * dir);
  } else {
    // sekiji 他
    copied.sort((a, b) => (toNumberSafe(a['席次']) - toNumberSafe(b['席次'])) * dir);
  }
  return copied;
}

// ---------- 表示（4列固定：順位・棋士名・値・区分） ----------
// ---------- 表示（4列固定：順位・棋士名・値・区分） ----------
function renderTable(rows, mode) {
  const table = document.querySelector('table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  // ▼ モードごとの「③の値のキー」と「列のラベル」を決める
  let valueKey = '';
  let valueLabel = '';

  const labelMap = {
    'sekiji': '席次',
    'kishi-no': '棋士番号',
    'age': '年齢（享年）',
    'age-active': '現役年齢',
    'age-4d': '四段昇段年齢',
    'age-5d': '五段昇段年齢',
    'age-6d': '六段昇段年齢',
    'age-7d': '七段昇段年齢',
    'age-8d': '八段昇段年齢',
    'age-9d': '九段昇段年齢',
    'term-active': '現役期間',
    'dur-4to5': '四→五段 所要期間',
    'dur-5to6': '五→六段 所要期間',
    'dur-6to7': '六→七段 所要期間',
    'dur-7to8': '七→八段 所要期間',
    'dur-8to9': '八→九段 所要期間',
    'date-4d': '四段昇段日',
    'date-5d': '五段昇段日',
    'date-6d': '六段昇段日',
    'date-7d': '七段昇段日',
    'date-8d': '八段昇段日',
    'date-9d': '九段昇段日'
  };

  // ▼ ラベルを決定
  valueLabel = labelMap[mode] || '';

  // ▼ キーを決定
  const keyMap = {
    'sekiji': '席次',
    'kishi-no': '棋士番号',
    'age': '__age_display__',
    'age-active': '__age_active_display__',

    'age-4d': '__age_at_4d_display__',
    'age-5d': '__age_at_5d_display__',
    'age-6d': '__age_at_6d_display__',
    'age-7d': '__age_at_7d_display__',
    'age-8d': '__age_at_8d_display__',
    'age-9d': '__age_at_9d_display__',

    'term-active': '__term_active_display__',

    'dur-4to5': '__dur_4to5_display__',
    'dur-5to6': '__dur_5to6_display__',
    'dur-6to7': '__dur_6to7_display__',
    'dur-7to8': '__dur_7to8_display__',
    'dur-8to9': '__dur_8to9_display__',

    'date-4d': '四段昇段日',
    'date-5d': '五段昇段日',
    'date-6d': '六段昇段日',
    'date-7d': '七段昇段日',
    'date-8d': '八段昇段日',
    'date-9d': '九段昇段日'
  };

  valueKey = keyMap[mode];

  // ---------- thead ----------
  thead.innerHTML = `
    <tr>
      <th>順位</th>
      <th>棋士名</th>
      <th>${valueLabel}</th>
      <th>区分</th>
    </tr>
  `;

  // ---------- tbody ----------
  tbody.innerHTML = '';
  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');

    let val = row[valueKey] || '';

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${row['棋士名']}</td>
      <td>${val}</td>
      <td>${row['区分']}</td>
    `;

    tbody.appendChild(tr);
  });
}