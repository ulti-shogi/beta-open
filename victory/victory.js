// victory.js
// victory.html 専用のシンプル版。
// 今のところ、叡王戦(title-eiou.csv) と 達人戦(tour-tatsujin.csv) だけ対応。
// UI の表示/非表示と「表示する」ボタンの動作までを一通り整える。

document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("section");
  const table   = document.querySelector("table");
  const thead   = table.querySelector("thead");
  const tbody   = table.querySelector("tbody");

  // ---- section 内 UI ----
  const modeRadios       = section.querySelectorAll('input[name="mode"]');
  const matchModeRadios  = section.querySelectorAll('input[name="matchMode"]');
  const kisenSelect      = section.querySelector('select[name="kisen"]');
  const yearSelect       = section.querySelector('select[name="year"]');
  const rankingSelect    = section.querySelector('select[name="rankingTarget"]');
  const rankingSortRadios= section.querySelectorAll('input[name="rankingSort"]');
  const otherTargetSelect= section.querySelector('select[name="otherTarget"]');
  const otherPlayerSelect= section.querySelector('select[name="otherPlayer"]');
  const generalModeRadios= section.querySelectorAll('input[name="generalMode"]');
  const generalKisenSelect = section.querySelector('select[name="generalKisen"]');
  const generalYearSelect  = section.querySelector('select[name="generalYear"]');
  const displayButton    = section.querySelector('button[type="button"]');

  // ---- 説明文 <p> たち ----
  const matchModeLabelP   = matchModeRadios[0].parentElement.previousElementSibling;
  const kisenLabelP       = kisenSelect.previousElementSibling;
  const yearLabelP        = yearSelect.previousElementSibling;
  const rankingLabelP     = rankingSelect.previousElementSibling;
  const rankingSortLabelP = rankingSortRadios[0].parentElement.previousElementSibling;
  const otherTargetLabelP = otherTargetSelect.previousElementSibling;
  const otherPlayerLabelP = otherPlayerSelect.previousElementSibling;
  const generalModeLabelP = generalModeRadios[0].parentElement.previousElementSibling;
  const generalKisenLabelP= generalKisenSelect.previousElementSibling;
  const generalYearLabelP = generalYearSelect.previousElementSibling;

  // ラベルグループをまとめて表示/非表示するヘルパー
  function setLabelGroupVisible(firstLabel, visible) {
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

  // ---- CSV 読み込み（タイトル戦: title-eiou.csv）----
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
            // 引き分けだけの特殊ケースはとりあえず保持者を winner 扱い
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

  // ---- CSV 読み込み（一般棋戦: tour-tatsujin.csv）----
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

  // ---- UI の表示・非表示 ----
  function updateUIVisibility() {
    const mode = getMainMode();
    const matchMode   = getMatchMode();
    const generalMode = getGeneralMode();

    const isMatch   = mode === "match";
    const isRank    = mode === "ranking";
    const isGeneral = mode === "general";
    const isOther   = mode === "other";

    // 番勝負用
    matchModeLabelP.style.display = isMatch ? "" : "none";
    setLabelGroupVisible(matchModeRadios[0].parentElement, isMatch);
    kisenLabelP.style.display = isMatch && matchMode === "kisen" ? "" : "none";
    kisenSelect.style.display  = isMatch && matchMode === "kisen" ? "" : "none";
    yearLabelP.style.display   = isMatch && matchMode === "year" ? "" : "none";
    yearSelect.style.display   = isMatch && matchMode === "year" ? "" : "none";

    // ランキング用
    rankingLabelP.style.display = isRank ? "" : "none";
    rankingSelect.style.display = isRank ? "" : "none";
    rankingSortLabelP.style.display = isRank ? "" : "none";
    setLabelGroupVisible(rankingSortRadios[0].parentElement, isRank);

    // その他用
    otherTargetLabelP.style.display = isOther ? "" : "none";
    otherTargetSelect.style.display = isOther ? "" : "none";
    otherPlayerLabelP.style.display = isOther && otherTargetSelect.value === "player" ? "" : "none";
    otherPlayerSelect.style.display = isOther && otherTargetSelect.value === "player" ? "" : "none";

    // 一般棋戦用
    generalModeLabelP.style.display = isGeneral ? "" : "none";
    setLabelGroupVisible(generalModeRadios[0].parentElement, isGeneral);
    generalKisenLabelP.style.display = isGeneral && generalMode === "kisen" ? "" : "none";
    generalKisenSelect.style.display = isGeneral && generalMode === "kisen" ? "" : "none";
    generalYearLabelP.style.display  = isGeneral && generalMode === "year" ? "" : "none";
    generalYearSelect.style.display  = isGeneral && generalMode === "year" ? "" : "none";
  }

  // ---- 表のクリア ----
  function clearTable() {
    thead.innerHTML = "";
    tbody.innerHTML = "";
  }

  // ---- ① 番勝負一覧（タイトル戦）棋戦ごと ----
  function renderTitleByKisen(kisenName) {
    clearTable();
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

  // ---- ② タイトル獲得ランキング（今は叡王戦のみ）----
  function renderTitleRanking() {
    clearTable();

    const stats = new Map(); // name -> {name, appear, win, lose}

    TITLE_MATCHES.forEach(r => {
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

  // ---- ③ 一般棋戦一覧（達人戦のみ）棋戦ごと ----
  function renderTourByKisen(kisenValue) {
    clearTable();
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

  // ---- ③ 一般棋戦一覧 年度ごと ----
  function renderTourByYear(yearValue) {
    clearTable();
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

  // ---- その他モード（ひとまずプレースホルダー）----
  function renderOther() {
    clearTable();
    thead.innerHTML = "<tr><th>メッセージ</th></tr>";
    tbody.innerHTML = "<tr><td>「その他」の集計はまだ victory.js では未実装です。</td></tr>";
  }

  // ---- 表示ボタン押下 ----
  function handleDisplay() {
    const mode = getMainMode();

    if (mode === "match") {
      const mm = getMatchMode();
      if (mm === "kisen") {
        const kisenName = kisenSelect.value || "叡王戦";
        renderTitleByKisen(kisenName);
      } else {
        const yearVal = yearSelect.value || (TITLE_MATCHES[0] ? TITLE_MATCHES[0].year : "");
        renderTitleByYear(yearVal);
      }
    } else if (mode === "ranking") {
      renderTitleRanking();
    } else if (mode === "general") {
      const gm = getGeneralMode();
      if (gm === "kisen") {
        const kisenName = generalKisenSelect.value || "達人戦";
        renderTourByKisen(kisenName);
      } else {
        const yearVal = generalYearSelect.value || (TOUR_MATCHES[0] ? TOUR_MATCHES[0].year : "");
        renderTourByYear(yearVal);
      }
    } else {
      renderOther();
    }
  }

  // ---- イベント登録 ----
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
  otherTargetSelect.addEventListener("change", () => {
    updateUIVisibility();
  });
  displayButton.addEventListener("click", handleDisplay);

  // ---- CSV 読み込み & 初期化 ----
  Promise.all([
    loadTitleCSV("title-eiou.csv"),
    loadTourCSV("tour-tatsujin.csv")
  ]).then(([titleRows, tourRows]) => {
    TITLE_MATCHES = titleRows;
    TOUR_MATCHES  = tourRows;

    initTitleYearOptions();
    initTourYearOptions();
    updateUIVisibility();
    handleDisplay(); // 初期表示
  }).catch(err => {
    console.error("CSV 読み込みエラー:", err);
    clearTable();
    thead.innerHTML = "<tr><th>エラー</th></tr>";
    tbody.innerHTML = "<tr><td>データの読み込みに失敗しました。</td></tr>";
  });
});