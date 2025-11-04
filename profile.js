// =======================================
// profile.js（現役期間 追加・丸ごと差し替え版）
//
// 追加モード：value="term-active"
//  定義：
//   ・区分=「現役」         → 四段昇段日 〜 今日 の期間
//   ・区分≠「現役」かつ引退日あり → 四段昇段日 〜 引退日 の期間
//   ・上記以外で没年月日あり     → 四段昇段日 〜 没年月日 の期間
//   ・表示は「◯年◯か月◯日」
//   ・テーブル列（スマホ省幅版）：棋士名｜四段(YY/MM/DD)｜終了(YY/MM/DD)｜期間
//
// 既存モードもそのまま維持：
//   sekiji / kishi-no / age / age-4d..9d / dur-4to5..8to9
// 並び：ラジオ（keep=席次順 / asc / desc）
// 原則：id/classを勝手に付けない／列名参照／sectionとtableはそのまま
// =======================================

const CSV_URL = 'profile.csv';

// 今日（ローカル）※年齢・現役期間で使用
const today = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
})();

// 席次順“原本”
let baseData = [];
let currentMode  = 'sekiji';
let currentOrder = 'keep';

// ---------------- 初期化 ----------------
fetch(CSV_URL)
  .then(res => res.text())
  .then(text => {
    const rows = parseCSV(text);
    const enriched = rows.map(enrichRow);
    baseData = enriched.slice().sort((a,b) => toNumberSafe(a['席次']) - toNumberSafe(b['席次']));
    renderTable(baseData, 'sekiji');
    setupUI();
  })
  .catch(err => console.error('CSV読み込み失敗:', err));

// -------------- CSV → 配列（列名参照） --------------
function parseCSV(csvText){
  const lines = csvText.trim().split(/\r?\n/);
  if(!lines.length) return [];
  const header = lines[0].split(',').map(h => h.trim());
  const out = [];
  for(let i=1;i<lines.length;i++){
    if(!lines[i].trim()) continue;
    const cols = lines[i].split(',');
    const row = {};
    header.forEach((h,idx)=> row[h] = (cols[idx] || '').trim());
    out.push(row);
  }
  return out;
}

// -------------- 行の拡張（段位/称号・年齢・各段年齢・dur・現役期間） --------------
function enrichRow(row){
  // 段位/称号
  const title = (row['称号'] || '').trim();
  const dan   = (row['段位'] || '').trim();
  const danOrTitle = title ? title : (dan || '');

  // 生没・現在年齢
  const birth = toDateSafe(row['生年月日']);
  const died  = toDateSafe(row['没年月日']);
  const endDateForAge = died ? died : today;

  let ageDays = null, ageDisplay = '';
  if (birth){
    ageDays = diffDays(birth, endDateForAge);
    const a = diffYMD(birth, endDateForAge);
    ageDisplay = `${died ? '享年' : ''}${a.year}歳${a.month}か月${a.day}日`;
  }

  // 各段昇段日
  const p4 = toDateSafe(row['四段昇段日']);
  const p5 = toDateSafe(row['五段昇段日']);
  const p6 = toDateSafe(row['六段昇段日']);
  const p7 = toDateSafe(row['七段昇段日']);
  const p8 = toDateSafe(row['八段昇段日']);
  const p9 = toDateSafe(row['九段昇段日']);

  // 指定日までの年齢（表示用）
  const ageAt = to => {
    if(!birth || !to) return {days:null, text:''};
    const days = diffDays(birth, to);
    const d = diffYMD(birth, to);
    return {days, text:`${d.year}歳${d.month}か月${d.day}日`};
  };
  const a4 = ageAt(p4), a5 = ageAt(p5), a6 = ageAt(p6), a7 = ageAt(p7), a8 = ageAt(p8), a9 = ageAt(p9);

  // 各区間の所要期間（◯年◯か月◯日）
  const dur = (from,to) => {
    if(!from || !to) return {days:null, text:''};
    const days = diffDays(from,to);
    const d = diffYMD(from,to);
    return {days, text:`${d.year}年${d.month}か月${d.day}日`};
  };
  const d45 = dur(p4,p5);
  const d56 = dur(p5,p6);
  const d67 = dur(p6,p7);
  const d78 = dur(p7,p8);
  const d89 = dur(p8,p9);

  // ★ 現役期間
  const kubun = (row['区分'] || '').trim();
  const retiredAt = toDateSafe(row['引退日']);
  let termEndDate = null; // YYYY-MM-DD の文字列も保持したいので後で作る
  let termEndDateStr = '';

  if (p4) {
    if (kubun === '現役') {
      termEndDate = today;
      termEndDateStr = formatDateYYYYMMDD(today);
    } else if (retiredAt) {
      termEndDate = retiredAt;
      termEndDateStr = row['引退日'] || '';
    } else if (died) {
      termEndDate = died;
      termEndDateStr = row['没年月日'] || '';
    }
  }

  let termDays = null, termDisplay = '';
  if (p4 && termEndDate) {
    termDays = diffDays(p4, termEndDate);
    const t = diffYMD(p4, termEndDate);
    termDisplay = `${t.year}年${t.month}か月${t.day}日`;
  }

  return Object.assign({}, row, {
    '__dan_or_title__': danOrTitle,
    '__age_days__': ageDays, '__age_display__': ageDisplay,
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
    '__term_active_end__': termEndDateStr // YYYY-MM-DD（現役は今日の日付を文字列化）
  });
}

// -------------- 日付ユーティリティ（ローカル基準 & スマホ省幅フォーマット） --------------
function toDateSafe(str){
  if(!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  return new Date(+m[1], +m[2]-1, +m[3]);
}
function diffDays(a,b){ if(!a||!b) return null; return Math.floor((b - a)/86400000); }
function diffYMD(from,to){
  let y1=from.getFullYear(), m1=from.getMonth(), d1=from.getDate();
  let y2=to.getFullYear(),   m2=to.getMonth(),   d2=to.getDate();
  let year=y2-y1, month=m2-m1, day=d2-d1;
  if(day<0){ const last=new Date(y2,m2,0).getDate(); day+=last; month--; }
  if(month<0){ month+=12; year--; }
  return {year,month,day};
}
// YY/MM/DD 省幅表示
function formatDateYY(str){
  if(!str) return '';
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return str;
  const yy = String(Number(m[1]) % 100).padStart(2,'0');
  return `${yy}/${m[2]}/${m[3]}`;
}
// Date → YYYY-MM-DD 文字列（現役の「今日」用）
function formatDateYYYYMMDD(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

// -------------- UI --------------
function setupUI(){
  const section = document.querySelector('section');
  if(!section) return;
  const sel = section.querySelector('select');
  const radios = section.querySelectorAll('input[type="radio"][name="order"]');

  // セレクト変更：列のみ切替。ラジオがasc/descなら並べ替えも適用
  sel.addEventListener('change', () => {
    currentMode = sel.value; // sekiji/kishi-no/age/age-4d..9d/dur-4to5..8to9/term-active
    if (currentOrder === 'keep') {
      renderTable(baseData, currentMode);
    } else {
      renderTable(sortData(baseData, currentMode, currentOrder), currentMode);
    }
  });

  // ラジオ変更：keepなら席次順で表示、asc/descなら現在モードで並べ替え
  radios.forEach(r => {
    r.addEventListener('change', () => {
      if(!r.checked) return;
      currentOrder = r.value; // keep/asc/desc
      if (currentOrder === 'keep') {
        renderTable(baseData, currentMode);
      } else {
        renderTable(sortData(baseData, currentMode, currentOrder), currentMode);
      }
    });
  });
}

// -------------- 並び替え --------------
function sortData(data, mode, order){
  const copied = data.slice();
  const dir = (order === 'desc') ? -1 : 1;

  if (mode === 'kishi-no') {
    copied.sort((a,b)=>(toNumberSafe(a['棋士番号']) - toNumberSafe(b['棋士番号'])) * dir);
  } else if (mode === 'age') {
    copied.sort((a,b)=> numCmp(a['__age_days__'], b['__age_days__']) * dir);
  } else if (/^age-[4-9]d$/.test(mode)) {
    const key = mode.replace('age-','__age_at_') + '_days__';
    copied.sort((a,b)=> numCmp(a[key], b[key]) * dir);
  } else if (/^dur-[4-9]to[5-9]$/.test(mode)) {
    const key = '__' + mode.replace('dur-','dur_') + '_days__';
    copied.sort((a,b)=> numCmp(a[key], b[key]) * dir);
  } else if (mode === 'term-active') {
    copied.sort((a,b)=> numCmp(a['__term_active_days__'], b['__term_active_days__']) * dir);
  } else {
    // 席次
    copied.sort((a,b)=>(toNumberSafe(a['席次']) - toNumberSafe(b['席次'])) * dir);
  }
  return copied;
}
function numCmp(a,b){ const an=(a==null), bn=(b==null); if(an&&bn) return 0; if(an) return 1; if(bn) return -1; return a-b; }
function toNumberSafe(v){ const n=Number(v); return isNaN(n)?9999999:n; }

// -------------- 描画（モードごとに列を切替／dur・termは日付短縮） --------------
function renderTable(rows, mode){
  const table = document.querySelector('table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  let cols;

  if (mode === 'age') {
    cols = [
      { key:'区分', label:'区分' },
      { key:'棋士名', label:'棋士名' },
      { key:'__age_display__', label:'年齢' },
      { key:'生年月日', label:'生年月日' }
    ];
  } else if (mode === 'kishi-no') {
    cols = [
      { key:'区分', label:'区分' },
      { key:'棋士番号', label:'棋士番号' },
      { key:'棋士名', label:'棋士名' },
      { key:'__dan_or_title__', label:'段位/称号' }
    ];
  } else if (/^age-[4-9]d$/.test(mode)) {
    const rankMap = {
      'age-4d': { label:'四段昇段年齢', dateCol:'四段昇段日', displayKey:'__age_at_4d_display__' },
      'age-5d': { label:'五段昇段年齢', dateCol:'五段昇段日', displayKey:'__age_at_5d_display__' },
      'age-6d': { label:'六段昇段年齢', dateCol:'六段昇段日', displayKey:'__age_at_6d_display__' },
      'age-7d': { label:'七段昇段年齢', dateCol:'七段昇段日', displayKey:'__age_at_7d_display__' },
      'age-8d': { label:'八段昇段年齢', dateCol:'八段昇段日', displayKey:'__age_at_8d_display__' },
      'age-9d': { label:'九段昇段年齢', dateCol:'九段昇段日', displayKey:'__age_at_9d_display__' }
    };
    const cfg = rankMap[mode];
    cols = [
      { key:'区分', label:'区分' },
      { key:'棋士名', label:'棋士名' },
      { key:cfg.displayKey, label:cfg.label },
      { key:cfg.dateCol, label:cfg.dateCol }
    ];
  } else if (/^dur-[4-9]to[5-9]$/.test(mode)) {
    // dur 系（四→五、五→六、…、八→九）
    const durMap = {
      'dur-4to5': { start:'四段昇段日', end:'五段昇段日', startLabel:'四段', endLabel:'五段', displayKey:'__dur_4to5_display__' },
      'dur-5to6': { start:'五段昇段日', end:'六段昇段日', startLabel:'五段', endLabel:'六段', displayKey:'__dur_5to6_display__' },
      'dur-6to7': { start:'六段昇段日', end:'七段昇段日', startLabel:'六段', endLabel:'七段', displayKey:'__dur_6to7_display__' },
      'dur-7to8': { start:'七段昇段日', end:'八段昇段日', startLabel:'七段', endLabel:'八段', displayKey:'__dur_7to8_display__' },
      'dur-8to9': { start:'八段昇段日', end:'九段昇段日', startLabel:'八段', endLabel:'九段', displayKey:'__dur_8to9_display__' }
    };
    const cfg = durMap[mode];
    cols = [
      { key:'棋士名', label:'棋士名' },
      { key:cfg.start, label:cfg.startLabel },
      { key:cfg.end,   label:cfg.endLabel },
      { key:cfg.displayKey, label:'期間' }
    ];
  } else if (mode === 'term-active') {
    // 現役期間（四段〜終了）
    cols = [
      { key:'棋士名', label:'棋士名' },
      { key:'四段昇段日', label:'四段' },
      { key:'__term_active_end__', label:'終了' }, // 今日 or 引退日 or 没年月日
      { key:'__term_active_display__', label:'期間' }
    ];
  } else {
    // sekiji
    cols = [
      { key:'区分', label:'区分' },
      { key:'席次', label:'席次' },
      { key:'棋士名', label:'棋士名' },
      { key:'__dan_or_title__', label:'段位/称号' }
    ];
  }

  // thead
  thead.innerHTML = '';
  const trh = document.createElement('tr');
  cols.forEach(c => { const th=document.createElement('th'); th.textContent=c.label; trh.appendChild(th); });
  thead.appendChild(trh);

  // tbody（dur・termは日付をYY/MM/DDに短縮表示）
  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    cols.forEach(c => {
      const td = document.createElement('td');
      let val = row[c.key] || '';

      if (/^dur-[4-9]to[5-9]$/.test(mode)) {
        const dm = {
          'dur-4to5': ['四段昇段日','五段昇段日'],
          'dur-5to6': ['五段昇段日','六段昇段日'],
          'dur-6to7': ['六段昇段日','七段昇段日'],
          'dur-7to8': ['七段昇段日','八段昇段日'],
          'dur-8to9': ['八段昇段日','九段昇段日']
        }[mode];
        if (dm && (c.key === dm[0] || c.key === dm[1])) val = formatDateYY(val);
      }

      if (mode === 'term-active' && (c.key === '四段昇段日' || c.key === '__term_active_end__')) {
        val = formatDateYY(val);
      }

      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}