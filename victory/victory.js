// victory-basic-2
// victory.html 専用・安全版
// タイトル戦: title-ryuou/meijin/…/eiou.csv をまとめて使用
// 一般棋戦 : tour-tatsujin.csv（今のところ達人戦のみ）

document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("section");
  const table   = document.querySelector("table");
  const thead   = table ? table.querySelector("thead") : null;
  const tbody   = table ? table.querySelector("tbody") : null;

  // ---- section 内 UI ----
  const modeRadios          = section ? section.querySelectorAll('input[name="mode"]') : [];
  const matchModeRadios     = section ? section.querySelectorAll('input[name="matchMode"]') : [];
  const kisenSelect         = section ? section.querySelector('select[name="kisen"]') : null;
  const yearSelect          = section ? section.querySelector('select[name="year"]') : null;
  const rankingSelect       = section ? section.querySelector('select[name="rankingTarget"]') : null;
  const rankingSortRadios   = section ? section.querySelectorAll('input[name="rankingSort"]') : [];
  const otherTargetSelect   = section ? section.querySelector('select[name="otherTarget"]') : null;
  const otherPlayerSelect   = section ? section.querySelector('select[name="otherPlayer"]') : null;
  const generalModeRadios   = section ? section.querySelectorAll('input[name="generalMode"]') : [];
  const generalKisenSelect  = section ? section.querySelector('select[name="generalKisen"]') : null;
  const generalYearSelect   = section ? section.querySelector('select[name="generalYear"]') : null;
  const displayButton       = section ? section.querySelector('button[type="button"]') : null;

  // ---- 説明文 <p> たち（null 安全版）----
  const matchModeLabelP    = (matchModeRadios[0] && matchModeRadios[0].parentElement.previousElementSibling) || null;
  const kisenLabelP        = kisenSelect ? kisenSelect.previousElementSibling : null;
  const yearLabelP         = yearSelect ? yearSelect.previousElementSibling : null;
  const rankingLabelP      = rankingSelect ? rankingSelect.previousElementSibling : null;
  const rankingSortLabelP  = (rankingSortRadios[0] && rankingSortRadios[0].parentElement.previousElementSibling) || null;
  const otherTargetLabelP  = otherTargetSelect ? otherTargetSelect.previousElementSibling : null;
  const otherPlayerLabelP  = otherPlayerSelect ? otherPlayerSelect.previousElementSibling : null;
  const generalModeLabelP  = (generalModeRadios[0] && generalModeRadios[0].parentElement.previousElementSibling) || null;
  const generalKisenLabelP = generalKisenSelect ? generalKisenSelect.previousElementSibling : null;
  const generalYearLabelP  = generalYearSelect ? generalYearSelect.previousElementSibling : null;

  // ラベルグループをまとめて表示/非表示するヘルパー（安全版）
  function setLabelGroupVisible(firstLabel, visible) {
    if (!firstLabel) return;
    let node = firstLabel;
    while (node && node.tagName === "LABEL") {
      node.style.display = visible ? "" : "none";
      node = node.nextElementSibling;
      if (node && node.tagName !== "LABEL") break;
    }
  }

  // ---- データ格納用 ----
  /** タイトル戦: {type:"title", match, year, period, holder, challenger, holderWin, challengerWin, draw, winner, loser, win, lose} */
  let TITLE_MATCHES = [];
  /** 一般棋戦: {type:"tour", match, year, period, winner, loser, win, lose} */
  let TOUR_MATCHES  = [];

  // ---- CSV 読み込み（タイトル戦）----
  function loadTitleCSV(path) {
    return fetch(path)
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length <= 1) return [];

        const header = lines[0].split(",").map(s => s.trim());
        const idx = {};
        header.forEach((key, i) => { idx[key] = i; });

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(",");

          const match   = (cols[idx.match]   || "").trim();
          const years   = Number((cols[idx.years]   || "0").trim());
          const period  = Number((cols[idx.period]  || "0").trim());
          const holder  = (cols[idx.holder]  || "").trim();
          const challenger = (cols[idx.challenger] || "").trim();
          const holderScore     = Number((cols[idx["holder-score"]]     || "0").trim());
          const challengerScore = Number((cols[idx["challenger-score"]] || "0").trim());
          const draw            = idx.draw != null ? Number((cols[idx.draw] || "0").trim()) : 0;

          let winner, loser, win, lose;
          if (holderScore > challengerScore) {
            winner = holder;
            loser  = challenger;
            win    = holderScore;
            lose   = challengerScore;
          } else if (holderScore < challengerScore) {
            winner = challenger;
            loser  = holder;
            win    = challengerScore;
            lose   = holderScore;
          } else {
            // 引き分けのみなど → とりあえず保持者を winner 扱い
            winner = holder;
            loser  = challenger;
            win    = holderScore;
            lose   = challengerScore;
          }

          rows.push({
            type: "title",
            match,
            year: years,
            period,
            holder,
            challenger,
            holderWin: holderScore,
            challengerWin: challengerScore,
            draw,
            winner,
            loser,
            win,
            lose
          });
        }
        return rows;
      });
  }

  // ---- CSV 読み込み（一般棋戦）----
  function loadTourCSV(path) {
    return fetch(path)
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length <= 1) return [];

        const header = lines[0].split(",").map(s => s.trim());
        const idx = {};
        header.forEach((key, i) => { idx[key] = i; });

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(",");

          const match   = (cols[idx.match]   || "").trim();
          const period  = Number((cols[idx.period] || "0").trim());
          const years   = Number((cols[idx.years]  || "0").trim());
          const winner  = (cols[idx.winner]  || "").trim();
          const runner  = (cols[idx["runner-up"]] || "").trim();
          const winScore  = idx["winner-score"] != null ? Number((cols[idx["winner-score"]]  || "0").trim()) : 0;
          const loseScore = idx["runner-score"] != null ? Number((cols[idx["runner-score"]] || "0").trim()) : 0;

          rows.push({
            type: "tour",
            match,
            year: years,
            period,
            winner,
            loser: runner,
            win: winScore,
            lose: loseScore
          });
        }
        return rows;
      });
  }

  // ---- 年度セレクト初期化（タイトル戦）----
  function initTitleYearOptions() {
    if (!yearSelect) return;
    const yearSet = new Set(TITLE_MATCHES.map(r => r.year).filter(y => y > 0));
    const years = Array.from(yearSet).sort((a, b) => b - a);
    yearSelect.innerHTML = "";
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    });
  }

  // ---- 年度セレクト初期化（一般棋戦）----
  function initTourYearOptions() {
    if (!generalYearSelect) return;
    const yearSet = new Set(TOUR_MATCHES.map(r => r.year).filter(y => y > 0));
    const years = Array.from(yearSet).sort((a, b) => b - a);
    generalYearSelect.innerHTML = "";
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      generalYearSelect.appendChild(opt);
    });
  }

  // ---- モード取得 ----
  function getMainMode() {
    const r = Array.from(modeRadios).find(r => r.checked);
    return r ? r.value : "match";
  }
  function getMatchMode() {
    const r = Array.from(matchModeRadios).find(r => r.checked);
    return r ? r.value : "kisen";
  }
  function getGeneralMode() {
    const r = Array.from(generalModeRadios).find(r => r.checked);
    return r ? r.value : "kisen";
  }
  function getRankingSortKey() {
    const r = Array.from(rankingSortRadios).find(r => r.checked);
    return r ? r.value : "獲得";
  }

  // ---- UI の表示・非表示（null ガード付き）----
  function updateUIVisibility() {
    const mode        = getMainMode();
    const matchMode   = getMatchMode();
    const generalMode = getGeneralMode();

    const isMatch   = mode === "match";
    const isRank    = mode === "ranking";
    const isGeneral = mode === "general";
    const isOther   = mode === "other";

    // 番勝負用
    if (matchModeLabelP) matchModeLabelP.style.display = isMatch ? "" : "none";
    if (matchModeRadios[0]) setLabelGroupVisible(matchModeRadios[0].parentElement, isMatch);
    if (kisenLabelP)   kisenLabelP.style.display = isMatch && matchMode === "kisen" ? "" : "none";
    if (kisenSelect)   kisenSelect.style.display  = isMatch && matchMode === "kisen" ? "" : "none";
    if (yearLabelP)    yearLabelP.style.display   = isMatch && matchMode === "year" ? "" : "none";
    if (yearSelect)    yearSelect.style.display   = isMatch && matchMode === "year" ? "" : "none";

    // ランキング用
    if (rankingLabelP)     rankingLabelP.style.display = isRank ? "" : "none";
    if (rankingSelect)     rankingSelect.style.display = isRank ? "" : "none";
    if (rankingSortLabelP) rankingSortLabelP.style.display = isRank ? "" : "none";
    if (rankingSortRadios[0]) setLabelGroupVisible(rankingSortRadios[0].parentElement, isRank);

    // その他用
    const otherIsPlayer = isOther && otherTargetSelect && otherTargetSelect.value === "player";
    if (otherTargetLabelP) otherTargetLabelP.style.display = isOther ? "" : "none";
    if (otherTargetSelect) otherTargetSelect.style.display = isOther ? "" : "none";
    if (otherPlayerLabelP) otherPlayerLabelP.style.display = otherIsPlayer ? "" : "none";
    if (otherPlayerSelect) otherPlayerSelect.style.display = otherIsPlayer ? "" : "none";

    // 一般棋戦用
    if (generalModeLabelP) generalModeLabelP.style.display = isGeneral ? "" : "none";
    if (generalModeRadios[0]) setLabelGroupVisible(generalModeRadios[0].parentElement, isGeneral);
    if (generalKisenLabelP)   generalKisenLabelP.style.display = isGeneral && generalMode === "kisen" ? "" : "none";
    if (generalKisenSelect)   generalKisenSelect.style.display = isGeneral && generalMode === "kisen" ? "" : "none";
    if (generalYearLabelP)    generalYearLabelP.style.display  = isGeneral && generalMode === "year" ? "" : "none";
    if (generalYearSelect)    generalYearSelect.style.display  = isGeneral && generalMode === "year" ? "" : "none";
  }

  // ---- 表のクリア ----
  function clearTable() {
    if (thead) thead.innerHTML = "";
    if (tbody) tbody.innerHTML = "";
  }

  // ---- ① 番勝負一覧（タイトル戦）棋戦ごと ----
  function renderTitleByKisen(kisenName) {
    clearTable();
    if (!thead || !tbody) return;

    const rows = TITLE_MATCHES
      .filter(r => r.match === kisenName)
      .sort((a, b) => b.year - a.year || b.period - a.period);

    thead.innerHTML = `
      <tr>
        <th>年度</th>
        <th>期</th>
        <th>保持者</th>
        <th>挑戦者</th>
        <th>保持者勝</th>
        <th>挑戦者勝</th>
        <th>持将棋</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.year}</td>
        <td>${r.period}</td>
        <td>${r.holder}</td>
        <td>${r.challenger}</td>
        <td>${r.holderWin}</td>
        <td>${r.challengerWin}</td>
        <td>${r.draw}</td>
      </tr>
    `).join("");
  }

  // ---- ① 番勝負一覧（タイトル戦）年度ごと ----
  function renderTitleByYear(yearValue) {
    clearTable();
    if (!thead || !tbody) return;
    const y = Number(yearValue);

    const rows = TITLE_MATCHES
      .filter(r => r.year === y)
      .sort((a, b) => b.period - a.period);

    thead.innerHTML = `
      <tr>
        <th>棋戦</th>
        <th>期</th>
        <th>保持者</th>
        <th>挑戦者</th>
        <th>保持者勝</th>
        <th>挑戦者勝</th>
        <th>持将棋</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.match}</td>
        <td>${r.period}</td>
        <td>${r.holder}</td>
        <td>${r.challenger}</td>
        <td>${r.holderWin}</td>
        <td>${r.challengerWin}</td>
        <td>${r.draw}</td>
      </tr>
    `).join("");
  }

  // ---- ② タイトル獲得ランキング ----
  function renderTitleRanking() {
    clearTable();
    if (!thead || !tbody) return;

    const target = rankingSelect ? rankingSelect.value : "通算";

    let source = TITLE_MATCHES;
    if (target && target !== "通算") {
      source = TITLE_MATCHES.filter(r => r.match === target);
    }

    const stats = new Map(); // name -> {name, appear, win, lose}

    source.forEach(r => {
      if (r.winner) {
        if (!stats.has(r.winner)) stats.set(r.winner, { name: r.winner, appear: 0, win: 0, lose: 0 });
        stats.get(r.winner).appear++;
        stats.get(r.winner).win++;
      }
      if (r.loser) {
        if (!stats.has(r.loser)) stats.set(r.loser, { name: r.loser, appear: 0, win: 0, lose: 0 });
        stats.get(r.loser).appear++;
        stats.get(r.loser).lose++;
      }
    });

    let list = Array.from(stats.values());
    list.forEach(p => {
      p.rate = p.appear ? p.win / p.appear : 0;
    });

    const sortKey = getRankingSortKey();
    list.sort((a, b) => {
      if (sortKey === "登場") {
        if (b.appear !== a.appear) return b.appear - a.appear;
        if (b.win !== a.win) return b.win - a.win;
      } else if (sortKey === "敗退") {
        if (b.lose !== a.lose) return b.lose - a.lose;
        if (b.appear !== a.appear) return b.appear - a.appear;
      } else if (sortKey === "勝率") {
        if (b.rate !== a.rate) return b.rate - a.rate;
        if (b.appear !== a.appear) return b.appear - a.appear;
      } else { // 獲得
        if (b.win !== a.win) return b.win - a.win;
        if (b.appear !== a.appear) return b.appear - a.appear;
      }
      return a.name.localeCompare(b.name, "ja");
    });

    thead.innerHTML = `
      <tr>
        <th>順位</th>
        <th>棋士名</th>
        <th>登場</th>
        <th>獲得</th>
        <th>敗退</th>
        <th>勝率</th>
      </tr>
    `;

    let currentRank = 0;
    let lastValue = null;

    tbody.innerHTML = list.map((p, index) => {
      let keyValue;
      if (sortKey === "登場") keyValue = p.appear;
      else if (sortKey === "敗退") keyValue = p.lose;
      else if (sortKey === "勝率") keyValue = p.rate;
      else keyValue = p.win;

      if (lastValue === null || keyValue !== lastValue) {
        currentRank = index + 1;
        lastValue = keyValue;
      }

      return `
        <tr>
          <td>${currentRank}</td>
          <td>${p.name}</td>
          <td>${p.appear}</td>
          <td>${p.win}</td>
          <td>${p.lose}</td>
          <td>${p.rate.toFixed(4)}</td>
        </tr>
      `;
    }).join("");
  }

  // ---- ③ 一般棋戦一覧（棋戦ごと）----
  function renderTourByKisen(kisenValue) {
    clearTable();
    if (!thead || !tbody) return;

    const rows = TOUR_MATCHES
      .filter(r => r.match === kisenValue)
      .sort((a, b) => b.year - a.year || b.period - a.period);

    thead.innerHTML = `
      <tr>
        <th>年度</th>
        <th>回/期</th>
        <th>優勝者</th>
        <th>勝</th>
        <th>敗</th>
        <th>準優勝</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.year}</td>
        <td>${r.period}</td>
        <td>${r.winner}</td>
        <td>${r.win}</td>
        <td>${r.lose}</td>
        <td>${r.loser}</td>
      </tr>
    `).join("");
  }

  // ---- ③ 一般棋戦一覧（年度ごと）----
  function renderTourByYear(yearValue) {
    clearTable();
    if (!thead || !tbody) return;
    const y = Number(yearValue);

    const rows = TOUR_MATCHES
      .filter(r => r.year === y)
      .sort((a, b) => a.match.localeCompare(b.match, "ja") || b.period - a.period);

    thead.innerHTML = `
      <tr>
        <th>棋戦</th>
        <th>回/期</th>
        <th>優勝者</th>
        <th>勝</th>
        <th>敗</th>
        <th>準優勝</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.match}</td>
        <td>${r.period}</td>
        <td>${r.winner}</td>
        <td>${r.win}</td>
        <td>${r.lose}</td>
        <td>${r.loser}</td>
      </tr>
    `).join("");
  }

  // ---- その他モード（仮）----
  function renderOther() {
    clearTable();
    if (!thead || !tbody) return;
    thead.innerHTML = "<tr><th>メッセージ</th></tr>";
    tbody.innerHTML = "<tr><td>「その他」の集計は victory.js ではまだ未実装です。</td></tr>";
  }

  // ---- 表示ボタン押下 ----
  function handleDisplay() {
    const mode = getMainMode();

    if (mode === "match") {
      const mm = getMatchMode();
      if (mm === "kisen") {
        const kisenName = (kisenSelect && kisenSelect.value) || "竜王戦";
        renderTitleByKisen(kisenName);
      } else {
        const defaultYear = TITLE_MATCHES[0] ? TITLE_MATCHES[0].year : "";
        const yearVal = (yearSelect && yearSelect.value) || defaultYear;
        renderTitleByYear(yearVal);
      }
    } else if (mode === "ranking") {
      renderTitleRanking();
    } else if (mode === "general") {
      const gm = getGeneralMode();
      if (gm === "kisen") {
        const kisenName = (generalKisenSelect && generalKisenSelect.value) || (TOUR_MATCHES[0] ? TOUR_MATCHES[0].match : "");
        renderTourByKisen(kisenName);
      } else {
        const defaultYear = TOUR_MATCHES[0] ? TOUR_MATCHES[0].year : "";
        const yearVal = (generalYearSelect && generalYearSelect.value) || defaultYear;
        renderTourByYear(yearVal);
      }
    } else {
      renderOther();
    }
  }

  // ---- イベント登録（存在チェック付き）----
  modeRadios.forEach(r => r.addEventListener("change", () => {
    updateUIVisibility();
    clearTable();
  }));
  matchModeRadios.forEach(r => r.addEventListener("change", () => {
    updateUIVisibility();
    clearTable();
  }));
  generalModeRadios.forEach(r => r.addEventListener("change", () => {
    updateUIVisibility();
    clearTable();
  }));
  if (otherTargetSelect) {
    otherTargetSelect.addEventListener("change", () => {
      updateUIVisibility();
    });
  }
  if (displayButton) {
    displayButton.addEventListener("click", handleDisplay);
  }

  // 最初の状態で一度 UI を整えておく
  updateUIVisibility();

  // ---- CSV 読み込み & 初期化 ----
  Promise.all([
    loadTitleCSV("title-ryuou.csv"),
    loadTitleCSV("title-meijin.csv"),
    loadTitleCSV("title-oui.csv"),
    loadTitleCSV("title-ouza.csv"),
    loadTitleCSV("title-kisei.csv"),
    loadTitleCSV("title-kiou.csv"),
    loadTitleCSV("title-ousho.csv"),
    loadTitleCSV("title-eiou.csv"),
    loadTourCSV("tour-tatsujin.csv")
  ]).then(([
    ryuouRows,
    meijinRows,
    ouiRows,
    ouzaRows,
    kiseiRows,
    kiouRows,
    oushoRows,
    eiouRows,
    tourRows
  ]) => {
    // タイトル戦8棋戦ぶんをまとめる
    TITLE_MATCHES = [
      ...ryuouRows,
      ...meijinRows,
      ...ouiRows,
      ...ouzaRows,
      ...kiseiRows,
      ...kiouRows,
      ...oushoRows,
      ...eiouRows
    ];

    // 一般棋戦（今は達人戦のみ）
    TOUR_MATCHES = tourRows;

    // セレクトボックス類の初期化と表示
    initTitleYearOptions();
    initTourYearOptions();
    updateUIVisibility();
    handleDisplay(); // 初期表示
  }).catch(err => {
    console.error("CSV 読み込みエラー:", err);
    clearTable();
    if (thead && tbody) {
      thead.innerHTML = "<tr><th>エラー</th></tr>";
      tbody.innerHTML = "<tr><td>データの読み込みに失敗しました。</td></tr>";
    }
  });
});