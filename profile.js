// =======================================
// profile.js（引退日統一ルール対応・簡潔版）
//
// 「現役」：今日まで
// 「現役以外」：引退日まで
// （現役中没はCSVで引退日＝没年月日を記入）
//
// 表示形式：年齢→◯歳◯ヶ月◯日
//            期間→◯年◯ヶ月◯日
// =======================================

const CSV_URL = 'profile.csv';
const today = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
let baseData = [];
let currentMode = 'sekiji';
let currentOrder = 'keep';

// ---------- 初期化 ----------
fetch(CSV_URL)
  .then(res => res.text())
  .then(text => {
    const rows = parseCSV(text);
    baseData = rows.map(enrichRow).sort((a,b)=>toNumberSafe(a['席次']) - toNumberSafe(b['席次']));
    renderTable(baseData, 'sekiji');
    setupUI();
  })
  .catch(err => console.error('CSV読み込み失敗:', err));

// ---------- CSV ----------
function parseCSV(csv){
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h=>h.trim());
  return lines.slice(1).map(line=>{
    const cols = line.split(',');
    const row={};
    header.forEach((h,i)=>row[h]=(cols[i]||'').trim());
    return row;
  });
}

// ---------- 派生値計算 ----------
function enrichRow(row){
  const kubun = (row['区分']||'').trim();
  const title = (row['称号']||'').trim();
  const dan = (row['段位']||'').trim();
  const danOrTitle = title || dan || '';

  const birth = toDateSafe(row['生年月日']);
  const died = toDateSafe(row['没年月日']);
  const retiredAt = toDateSafe(row['引退日']);

  // 終了日（統一ルール）
  const endDate = (kubun === '現役') ? today : retiredAt;
  const endDateStr = (kubun === '現役') ? formatDateYYYYMMDD(today) : (row['引退日']||'');

  // 現在年齢／享年
  let ageDays=null, ageDisplay='';
  if(birth){
    const to = died ? died : today;
    const d=diffYMD(birth,to);
    ageDays=diffDays(birth,to);
    ageDisplay=`${died?'享年':''}${d.year}歳${d.month}ヶ月${d.day}日`;
  }

  // 段昇段日
  const p4=toDateSafe(row['四段昇段日']),p5=toDateSafe(row['五段昇段日']),
        p6=toDateSafe(row['六段昇段日']),p7=toDateSafe(row['七段昇段日']),
        p8=toDateSafe(row['八段昇段日']),p9=toDateSafe(row['九段昇段日']);

  const ageAt = to => !birth||!to?{days:null,text:''}:(()=>{
    const d=diffYMD(birth,to);
    return {days:diffDays(birth,to), text:`${d.year}歳${d.month}ヶ月${d.day}日`};
  })();

  const dur = (from,to)=>!from||!to?{days:null,text:''}:(()=>{
    const d=diffYMD(from,to);
    return {days:diffDays(from,to),text:`${d.year}年${d.month}ヶ月${d.day}日`};
  })();

  // 現役期間（四段→終了）
  let termDays=null, termDisplay='';
  if(p4&&endDate){ const d=diffYMD(p4,endDate); termDays=diffDays(p4,endDate); termDisplay=`${d.year}年${d.month}ヶ月${d.day}日`; }

  // 現役年齢（生年月日→終了）
  let ageActiveDays=null, ageActiveDisplay='';
  if(birth&&endDate){ const d=diffYMD(birth,endDate); ageActiveDays=diffDays(birth,endDate); ageActiveDisplay=`${d.year}歳${d.month}ヶ月${d.day}日`; }

  return Object.assign({}, row, {
    '__dan_or_title__':danOrTitle,
    '__age_days__':ageDays,'__age_display__':ageDisplay,
    '__term_active_days__':termDays,'__term_active_display__':termDisplay,'__term_active_end__':endDateStr,
    '__age_active_days__':ageActiveDays,'__age_active_display__':ageActiveDisplay,'__age_active_end__':endDateStr
  });
}

// ---------- ユーティリティ ----------
function toDateSafe(s){if(!s)return null;const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function diffDays(a,b){return(!a||!b)?null:Math.floor((b-a)/86400000);}
function diffYMD(a,b){let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();
  if(d<0){d+=new Date(b.getFullYear(),b.getMonth(),0).getDate();m--;} if(m<0){m+=12;y--;} return {year:y,month:m,day:d};}
function formatDateYYYYMMDD(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return`${y}-${m}-${day}`;}
function formatDateYY(s){const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return s||'';return`${String(+m[1]%100).padStart(2,'0')}/${m[2]}/${m[3]}`;}
function toNumberSafe(v){const n=Number(v);return isNaN(n)?9999999:n;}
function numCmp(a,b){if(a==null&&b==null)return 0;if(a==null)return 1;if(b==null)return-1;return a-b;}

// ---------- UI ----------
function setupUI(){
  const sel=document.querySelector('section select');
  const radios=document.querySelectorAll('input[name="order"]');
  sel.addEventListener('change',()=>{
    currentMode=sel.value;
    const data=(currentOrder==='keep')?baseData:sortData(baseData,currentMode,currentOrder);
    renderTable(data,currentMode);
  });
  radios.forEach(r=>r.addEventListener('change',()=>{
    if(!r.checked)return;currentOrder=r.value;
    const data=(r.value==='keep')?baseData:sortData(baseData,currentMode,r.value);
    renderTable(data,currentMode);
  }));
}

// ---------- 並べ替え ----------
function sortData(data,mode,order){
  const dir=(order==='desc')?-1:1;
  const cp=data.slice();
  const keyMap={
    'kishi-no':'棋士番号',
    'age':'__age_days__',
    'term-active':'__term_active_days__',
    'age-active':'__age_active_days__'
  };
  if(keyMap[mode]) cp.sort((a,b)=>numCmp(a[keyMap[mode]],b[keyMap[mode]])*dir);
  else cp.sort((a,b)=>numCmp(toNumberSafe(a['席次']),toNumberSafe(b['席次']))*dir);
  return cp;
}

// ---------- 表示 ----------
function renderTable(rows,mode){
  const table=document.querySelector('table'),thead=table.querySelector('thead'),tbody=table.querySelector('tbody');
  let cols;
  if(mode==='term-active'){
    cols=[{key:'棋士名',label:'棋士名'},{key:'四段昇段日',label:'四段'},{key:'__term_active_end__',label:'終了'},{key:'__term_active_display__',label:'期間'}];
  }else if(mode==='age-active'){
    cols=[{key:'棋士名',label:'棋士名'},{key:'生年月日',label:'誕生'},{key:'__age_active_end__',label:'終了'},{key:'__age_active_display__',label:'年齢'}];
  }else{
    cols=[{key:'区分',label:'区分'},{key:'席次',label:'席次'},{key:'棋士名',label:'棋士名'},{key:'__dan_or_title__',label:'段位/称号'}];
  }
  thead.innerHTML='<tr>'+cols.map(c=>`<th>${c.label}</th>`).join('')+'</tr>';
  tbody.innerHTML=rows.map(row=>{
    return'<tr>'+cols.map(c=>{
      let val=row[c.key]||'';
      if(['四段昇段日','__term_active_end__','生年月日','__age_active_end__'].includes(c.key)) val=formatDateYY(val);
      return`<td>${val}</td>`;
    }).join('')+'</tr>';
  }).join('');
}