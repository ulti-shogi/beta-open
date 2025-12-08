// victory.js  将棋の殿堂「タイトル・一般棋戦検索」
// 新 CSV 仕様：
// タイトル戦 : match,years,period,holder,challenger,holder-score,challenger-score,draw
// 一般棋戦   : match,period,years,winner,runner-up,winner-score,runner-score

"use strict";

(function () {
  // ====== 設定 ======

  // タイトル戦 CSV と属性
  const TITLE_CONFIG = [
    { name: "竜王戦", file: "ryuou.csv", status: "current", periodLabel: "期" },
    { name: "名人戦", file: "meijin.csv", status: "current", periodLabel: "期" },
    { name: "叡王戦", file: "title-eiou.csv", status: "current", periodLabel: "期" },
    { name: "王位戦", file: "oui.csv", status: "current", periodLabel: "期" },
    { name: "王座戦", file: "ouza.csv", status: "current", periodLabel: "期" },
    { name: "棋聖戦", file: "kisei.csv", status: "current", periodLabel: "期" },
    { name: "棋王戦", file: "kiou.csv", status: "current", periodLabel: "期" },
    { name: "王将戦", file: "ousho.csv", status: "current", periodLabel: "期" },
    { name: "十段戦", file: "judan.csv", status: "ended", periodLabel: "期" },
    { name: "九段戦", file: "kudan.csv", status: "ended", periodLabel: "期" }
  ];

  // 一般棋戦 CSV と属性
  const GENERAL_CONFIG = [
    { name: "朝日杯", file: "asahi.csv", status: "current", periodLabel: "回" },
    { name: "銀河戦", file: "ginga.csv", status: "current", periodLabel: "期" },
    { name: "NHK杯", file: "nhk.csv", status: "current", periodLabel: "回" },
    { name: "JT杯", file: "jt.csv", status: "current", periodLabel: "回" },
    { name: "達人戦", file: "tour-tatsujin.csv", status: "current", periodLabel: "回" },
    { name: "新人王戦", file: "sinjin.csv", status: "current", periodLabel: "期" },
    { name: "青流戦", file: "kakogawa.csv", status: "ended", periodLabel: "期" }
  ];

  // 王座戦・叡王戦の「タイトル戦扱い」の開始期
  const OZA_TITLE_START_PERIOD = 31;
  const EIOU_TITLE_START_PERIOD = 3;

  // ====== データ格納 ======

  /** @type {Array<TitleMatch>} */
  let titleMatches = [];
  /** @type {Array<GeneralMatch>} */
  let generalMatches = [];

  // ====== 型のイメージ（JSDoc 用） ======
  /**
   * @typedef {Object} TitleMatch
   * @property {"title"} kind
   * @property {string} match   棋戦名（例：竜王戦）
   * @property {number} years   年度
   * @property {number} period  期
   * @property {string} holder
   * @property {string} challenger
   * @property {number} holderScore
   * @property {number} challengerScore
   * @property {number} draw
   * @property {string} winner
   * @property {string} loser
   * @property {number} winnerScore
   * @property {number} loserScore
   */

  /**
   * @typedef {Object} GeneralMatch
   * @property {"general"} kind
   * @property {string} match
   * @property {number} years
   * @property {number} period
   * @property {string} winner
   * @property {string} runnerUp
   * @property {number} winnerScore
   * @property {number} runnerScore
   */

  // ====== DOM 取得 ======
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const matchModeRadios = document.querySelectorAll('input[name="matchMode"]');
  const generalModeRadios = document.querySelectorAll('input[name="generalMode"]');

  const kisenSelect = document.querySelector('select[name="kisen"]');
  const yearSelect = document.querySelector('select[name="year"]');

  const rankingTargetSelect = document.querySelector('select[name="rankingTarget"]');
  const rankingSortRadios = document.querySelectorAll('input[name="rankingSort"]');

  const otherTargetSelect = document.querySelector('select[name="otherTarget"]');
  const otherPlayerSelect = document.querySelector('select[name="otherPlayer"]');

  const generalKisenSelect = document.querySelector('select[name="generalKisen"]');
  const generalYearSelect = document.querySelector('select[name="generalYear"]');

  const displayButton = document.querySelector('button[type="button"]');

  const table = document.querySelector("table");
  const thead = table ? table.querySelector("thead") : null;
  const tbody = table ? table.querySelector("tbody") : null;

  // ====== ユーティリティ ======

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const header = lines[0].split(",").map((s) => s.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(","); // 今回はカンマを含まない前提
      const obj = {};
      header.forEach((key, idx) => {
        obj[key] = (cols[idx] || "").trim();
      });
      rows.push(obj);
    }
    return rows;
  }

  function fetchCSV(path) {
    return fetch(path)
      .then((res) => {
        if (!res.ok) {
          throw new Error("CSV 読み込み失敗: " + path);
        }
        return res.text();
      })
      .then((text) => parseCSV(text));
  }

  function getCheckedValue(nodeList) {
    for (const n of nodeList) {
      if (n.checked) return n.value;
    }
    return "";
  }

  function clearTable() {
    if (thead) thead.innerHTML = "";
    if (tbody) tbody.innerHTML = "";
  }

  function formatRate(win, appear) {
    if (!appear) return "0.000";
    const r = win / appear;
    return r.toFixed(3);
  }

  // 「タイトル戦扱い」かどうか（ランキング側だけで使用）
  function isRealTitleMatch(row) {
    if (row.match === "王座戦" && row.period < OZA_TITLE_START_PERIOD) return false;
    if (row.match === "叡王戦" && row.period < EIOU_TITLE_START_PERIOD) return false;
    return true;
  }

  // config から period のラベル（回/期）を取得
  function getPeriodLabelForTitle(matchName) {
    const conf = TITLE_CONFIG.find((c) => c.name === matchName);
    return conf ? conf.periodLabel : "期";
  }
  function getPeriodLabelForGeneral(matchName) {
    const conf = GENERAL_CONFIG.find((c) => c.name === matchName);
    return conf ? conf.periodLabel : "回/期";
  }

  function isCurrentTitle(matchName) {
    const conf = TITLE_CONFIG.find((c) => c.name === matchName);
    return conf ? conf.status === "current" : true;
  }
  function isEndedTitle(matchName) {
    const conf = TITLE_CONFIG.find((c) => c.name === matchName);
    return conf ? conf.status === "ended" : false;
  }
  function isCurrentGeneral(matchName) {
    const conf = GENERAL_CONFIG.find((c) => c.name === matchName);
    return conf ? conf.status === "current" : true;
  }
  function isEndedGeneral(matchName) {
    const conf = GENERAL_CONFIG.find((c) => c.name === matchName);
    return conf ? conf.status === "ended" : false;
  }

  // ====== データ読み込み ======

  function loadAllData() {
    const titlePromises = TITLE_CONFIG.map((conf) =>
      fetchCSV(conf.file).then((rows) =>
        rows.map((r) => {
          const years = Number(r.years || r.year || 0);
          const period = Number(r.period || 0);

          const holder = r.holder || "";
          const challenger = r.challenger || "";
          const holderScore = Number(r["holder-score"] || 0);
          const challengerScore = Number(r["challenger-score"] || 0);
          const draw = Number(r.draw || 0);

          let winner = holder;
          let loser = challenger;
          let winnerScore = holderScore;
          let loserScore = challengerScore;

          if (challengerScore > holderScore) {
            winner = challenger;
            loser = holder;
            winnerScore = challengerScore;
            loserScore = holderScore;
          }

          /** @type {TitleMatch} */
          const obj = {
            kind: "title",
            match: conf.name,
            years,
            period,
            holder,
            challenger,
            holderScore,
            challengerScore,
            draw,
            winner,
            loser,
            winnerScore,
            loserScore
          };
          return obj;
        })
      )
    );

    const generalPromises = GENERAL_CONFIG.map((conf) =>
      fetchCSV(conf.file).then((rows) =>
        rows.map((r) => {
          const period = Number(r.period || 0);
          const years = Number(r.years || r.year || 0);
          const winner = r.winner || "";
          const runnerUp = r["runner-up"] || r.runner || "";
          const winnerScore = Number(r["winner-score"] || 0);
          const runnerScore = Number(r["runner-score"] || 0);

          /** @type {GeneralMatch} */
          const obj = {
            kind: "general",
            match: conf.name,
            years,
            period,
            winner,
            runnerUp,
            winnerScore,
            runnerScore
          };
          return obj;
        })
      )
    );

    return Promise.all([
      Promise.all(titlePromises),
      Promise.all(generalPromises)
    ]).then(([titleGroups, generalGroups]) => {
      titleMatches = titleGroups.flat();
      generalMatches = generalGroups.flat();
    });
  }

  // ====== UI 初期化 ======

  function populateYearOptions() {
    if (!yearSelect) return;
    const yearsSet = new Set();
    titleMatches.forEach((m) => {
      yearsSet.add(m.years);
    });
    const years = Array.from(yearsSet).filter((y) => y).sort((a, b) => b - a);
    yearSelect.innerHTML = years.map((y) => `<option value="${y}">${y}年度</option>`).join("");
  }

  function populateGeneralYearOptions() {
    if (!generalYearSelect) return;
    const yearsSet = new Set();
    generalMatches.forEach((m) => yearsSet.add(m.years));
    const years = Array.from(yearsSet).filter((y) => y).sort((a, b) => b - a);
    generalYearSelect.innerHTML = years.map((y) => `<option value="${y}">${y}年度</option>`).join("");
  }

  // その他モードの「棋士」選択肢
  function populateOtherPlayerOptions() {
    if (!otherPlayerSelect) return;
    const set = new Set();
    titleMatches.forEach((m) => {
      set.add(m.holder);
      set.add(m.challenger);
    });
    const players = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja"));
    otherPlayerSelect.innerHTML = players.map((p) => `<option value="${p}">${p}</option>`).join("");
  }

  // ランキング対象に「現行/終了/一般/総合」を追加
  function extendRankingTargets() {
    if (!rankingTargetSelect) return;
    const extra = [
      { value: "title-current", label: "通算（現行タイトル戦のみ）" },
      { value: "title-ended", label: "通算（終了タイトル戦のみ）" },
      { value: "general-all", label: "一般棋戦（全棋戦）" },
      { value: "general-current", label: "一般棋戦（現行一般棋戦のみ）" },
      { value: "general-ended", label: "一般棋戦（終了一般棋戦のみ）" },
      { value: "all-victory", label: "総合（タイトル＋一般棋戦）" }
    ];
    extra.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.value;
      opt.textContent = e.label;
      rankingTargetSelect.appendChild(opt);
    });
  }

  // モードごとの UI の表示/非表示
  function updateUIVisibility() {
    const mode = getCheckedValue(modeRadios);

    // 全体をいったん非表示
    const matchElems = [
      ...document.querySelectorAll('input[name="matchMode"]'),
      document.querySelector('p:nth-of-type(2)'),
      document.querySelector('p:nth-of-type(3)'),
      kisenSelect,
      yearSelect
    ];
    const rankingElems = [
      rankingTargetSelect,
      ...rankingSortRadios
    ];
    const rankingTexts = [
      document.querySelector('p:nth-of-type(5)'),
      document.querySelector('p:nth-of-type(6)')
    ];
    const otherElems = [
      otherTargetSelect,
      otherPlayerSelect
    ];
    const otherTexts = [
      document.querySelector('p:nth-of-type(7)'),
      document.querySelector('p:nth-of-type(8)')
    ];
    const generalElems = [
      ...document.querySelectorAll('input[name="generalMode"]'),
      generalKisenSelect,
      generalYearSelect
    ];
    const generalTexts = [
      document.querySelector('p:nth-of-type(9)'),
      document.querySelector('p:nth-of-type(10)')
    ];

    function setVisible(elems, show) {
      elems.forEach((el) => {
        if (!el) return;
        if (show) {
          el.style.display = "";
        } else {
          el.style.display = "none";
        }
      });
    }

    setVisible(matchElems, mode === "match");
    setVisible(rankingElems.concat(rankingTexts), mode === "ranking");
    setVisible(otherElems.concat(otherTexts), mode === "other");
    setVisible(generalElems.concat(generalTexts), mode === "general");

    // その他モードで「棋士選択」はターゲットが player のときだけ表示
    if (mode === "other") {
      const target = otherTargetSelect ? otherTargetSelect.value : "pair";
      if (otherPlayerSelect) {
        otherPlayerSelect.style.display = target === "player" ? "" : "none";
      }
      const p = document.querySelector('p:nth-of-type(8)');
      if (p) p.style.display = target === "player" ? "" : "none";
    }
  }

  // ====== 表示ロジック ======

  function handleDisplay() {
    const mode = getCheckedValue(modeRadios);

    if (mode === "match") {
      const sub = getCheckedValue(matchModeRadios);
      if (sub === "year") {
        renderTitleByYear();
      } else {
        renderTitleByKisen();
      }
    } else if (mode === "ranking") {
      renderRanking();
    } else if (mode === "general") {
      const sub = getCheckedValue(generalModeRadios);
      if (sub === "year") {
        renderGeneralByYear();
      } else {
        renderGeneralByKisen();
      }
    } else if (mode === "other") {
      const target = otherTargetSelect ? otherTargetSelect.value : "pair";
      if (target === "player") {
        renderPlayerPairRanking();
      } else {
        renderPairRanking();
      }
    }
  }

  // --- 1. タイトル戦：棋戦ごと一覧 ---
  function renderTitleByKisen() {
    if (!thead || !tbody) return;
    const kisen = kisenSelect ? kisenSelect.value : "";

    const rows = titleMatches
      .filter((m) => m.match === kisen)
      .slice()
      .sort((a, b) => {
        if (b.period !== a.period) return b.period - a.period;
        if (b.years !== a.years) return b.years - a.years;
        return a.holder.localeCompare(b.holder, "ja");
      });

    const periodLabel = getPeriodLabelForTitle(kisen);

    thead.innerHTML = `
      <tr>
        <th>年度</th>
        <th>${periodLabel}</th>
        <th>保持者</th>
        <th>挑戦者</th>
        <th>保持者勝</th>
        <th>挑戦者勝</th>
        <th>持将棋</th>
      </tr>
    `;

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${r.years}</td>
        <td>${r.period}</td>
        <td>${r.holder}</td>
        <td>${r.challenger}</td>
        <td>${r.holderScore}</td>
        <td>${r.challengerScore}</td>
        <td>${r.draw || ""}</td>
      </tr>
    `
      )
      .join("");
  }

  // --- 2. タイトル戦：年度ごと一覧 ---
  function renderTitleByYear() {
    if (!thead || !tbody) return;
    const year = yearSelect ? Number(yearSelect.value) : 0;

    const rows = titleMatches
      .filter((m) => m.years === year)
      .slice()
      .sort((a, b) => {
        // 棋戦の並び順は TITLE_CONFIG の順
        const ai = TITLE_CONFIG.findIndex((c) => c.name === a.match);
        const bi = TITLE_CONFIG.findIndex((c) => c.name === b.match);
        const aIdx = ai === -1 ? 999 : ai;
        const bIdx = bi === -1 ? 999 : bi;
        if (aIdx !== bIdx) return aIdx - bIdx;
        if (b.period !== a.period) return b.period - a.period;
        return a.holder.localeCompare(b.holder, "ja");
      });

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

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${r.match}</td>
        <td>${r.period}</td>
        <td>${r.holder}</td>
        <td>${r.challenger}</td>
        <td>${r.holderScore}</td>
        <td>${r.challengerScore}</td>
        <td>${r.draw || ""}</td>
      </tr>
    `
      )
      .join("");
  }

  // --- 3. 一般棋戦：棋戦ごと一覧 ---
  function renderGeneralByKisen() {
    if (!thead || !tbody) return;
    const kisen = generalKisenSelect ? generalKisenSelect.value : "";

    const rows = generalMatches
      .filter((m) => m.match === kisen)
      .slice()
      .sort((a, b) => {
        if (b.period !== a.period) return b.period - a.period;
        if (b.years !== a.years) return b.years - a.years;
        return a.winner.localeCompare(b.winner, "ja");
      });

    const periodLabel = getPeriodLabelForGeneral(kisen);

    thead.innerHTML = `
      <tr>
        <th>年度</th>
        <th>${periodLabel}</th>
        <th>優勝者</th>
        <th>準優勝</th>
        <th>勝</th>
        <th>敗</th>
      </tr>
    `;

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${r.years}</td>
        <td>${r.period}</td>
        <td>${r.winner}</td>
        <td>${r.runnerUp}</td>
        <td>${r.winnerScore}</td>
        <td>${r.runnerScore}</td>
      </tr>
    `
      )
      .join("");
  }

  // --- 4. 一般棋戦：年度ごと一覧 ---
  function renderGeneralByYear() {
    if (!thead || !tbody) return;
    const year = generalYearSelect ? Number(generalYearSelect.value) : 0;

    const rows = generalMatches
      .filter((m) => m.years === year)
      .slice()
      .sort((a, b) => {
        const ai = GENERAL_CONFIG.findIndex((c) => c.name === a.match);
        const bi = GENERAL_CONFIG.findIndex((c) => c.name === b.match);
        const aIdx = ai === -1 ? 999 : ai;
        const bIdx = bi === -1 ? 999 : bi;
        if (aIdx !== bIdx) return aIdx - bIdx;
        if (b.period !== a.period) return b.period - a.period;
        return a.winner.localeCompare(b.winner, "ja");
      });

    thead.innerHTML = `
      <tr>
        <th>棋戦</th>
        <th>回/期</th>
        <th>優勝者</th>
        <th>準優勝</th>
        <th>勝</th>
        <th>敗</th>
      </tr>
    `;

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${r.match}</td>
        <td>${r.period}</td>
        <td>${r.winner}</td>
        <td>${r.runnerUp}</td>
        <td>${r.winnerScore}</td>
        <td>${r.runnerScore}</td>
      </tr>
    `
      )
      .join("");
  }

  // --- 5. ランキング集計（タイトル・一般・総合） ---

  function buildStatsFromMatches(matches) {
    /** @type {Map<string, {name:string, appear:number, win:number, lose:number}>} */
    const map = new Map();

    function ensure(name) {
      if (!map.has(name)) {
        map.set(name, { name, appear: 0, win: 0, lose: 0 });
      }
      return map.get(name);
    }

    matches.forEach((m) => {
      // winner / loser を決める
      let winner = "";
      let loser = "";
      if (m.kind === "title") {
        winner = m.winner;
        loser = m.loser;
      } else {
        winner = m.winner;
        loser = m.runnerUp;
      }
      if (!winner || !loser) return;

      const w = ensure(winner);
      const l = ensure(loser);
      w.appear++;
      w.win++;
      l.appear++;
      l.lose++;
    });

    return Array.from(map.values());
  }

  function renderRanking() {
    if (!thead || !tbody) return;
    const target = rankingTargetSelect ? rankingTargetSelect.value : "通算";
    const sortKey = getCheckedValue(rankingSortRadios) || "獲得";

    /** @type {Array<TitleMatch|GeneralMatch>} */
    let targetMatches = [];

    if (target === "通算") {
      targetMatches = titleMatches.filter(isRealTitleMatch);
    } else if (target === "title-current") {
      targetMatches = titleMatches.filter(
        (m) => isRealTitleMatch(m) && isCurrentTitle(m.match)
      );
    } else if (target === "title-ended") {
      targetMatches = titleMatches.filter(
        (m) => isRealTitleMatch(m) && isEndedTitle(m.match)
      );
    } else if (target === "general-all") {
      targetMatches = generalMatches.slice();
    } else if (target === "general-current") {
      targetMatches = generalMatches.filter((m) => isCurrentGeneral(m.match));
    } else if (target === "general-ended") {
      targetMatches = generalMatches.filter((m) => isEndedGeneral(m.match));
    } else if (target === "all-victory") {
      targetMatches = titleMatches.filter(isRealTitleMatch).concat(generalMatches);
    } else {
      // 個別のタイトル戦
      targetMatches = titleMatches.filter(
        (m) => isRealTitleMatch(m) && m.match === target
      );
    }

    const stats = buildStatsFromMatches(targetMatches);

    stats.forEach((s) => {
      s.rate = s.appear ? s.win / s.appear : 0;
    });

    stats.sort((a, b) => {
      if (sortKey === "登場") {
        if (b.appear !== a.appear) return b.appear - a.appear;
        if (b.win !== a.win) return b.win - a.win;
      } else if (sortKey === "獲得") {
        if (b.win !== a.win) return b.win - a.win;
        if (b.appear !== a.appear) return b.appear - a.appear;
      } else if (sortKey === "敗退") {
        if (b.lose !== a.lose) return b.lose - a.lose;
        if (b.win !== a.win) return b.win - a.win;
      } else if (sortKey === "勝率") {
        if (b.rate !== a.rate) return b.rate - a.rate;
        if (b.win !== a.win) return b.win - a.win;
      }
      return a.name.localeCompare(b.name, "ja");
    });

    // 順位（同率同順）の付け方
    let currentRank = 0;
    let prevKey = null;
    stats.forEach((s, index) => {
      const key =
        sortKey === "登場"
          ? `${s.appear}`
          : sortKey === "獲得"
          ? `${s.win}`
          : sortKey === "敗退"
          ? `${s.lose}`
          : `${s.rate.toFixed(5)}`;
      if (key !== prevKey) {
        currentRank = index + 1;
        prevKey = key;
      }
      s.rank = currentRank;
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

    tbody.innerHTML = stats
      .map(
        (s) => `
      <tr>
        <td>${s.rank}</td>
        <td>${s.name}</td>
        <td>${s.appear}</td>
        <td>${s.win}</td>
        <td>${s.lose}</td>
        <td>${formatRate(s.win, s.appear)}</td>
      </tr>
    `
      )
      .join("");
  }

  // --- 6. 同一カード回数ランキング ---
  function renderPairRanking() {
    if (!thead || !tbody) return;

    /** @type {Map<string, {a:string,b:string,count:number,winA:number,winB:number}>} */
    const map = new Map();

    function makeKey(a, b) {
      return a < b ? a + "||" + b : b + "||" + a;
    }

    titleMatches.filter(isRealTitleMatch).forEach((m) => {
      const p1 = m.holder;
      const p2 = m.challenger;
      if (!p1 || !p2) return;
      const key = makeKey(p1, p2);
      if (!map.has(key)) {
        const [a, b] = p1 < p2 ? [p1, p2] : [p2, p1];
        map.set(key, { a, b, count: 0, winA: 0, winB: 0 });
      }
      const rec = map.get(key);
      rec.count++;
      // 勝敗を加算（a 視点）
      if (m.winner === rec.a) {
        rec.winA++;
      } else if (m.winner === rec.b) {
        rec.winB++;
      }
    });

    const list = Array.from(map.values());

    // A側は「勝ちが多い方」に差し替える
    list.forEach((r) => {
      if (r.winB > r.winA) {
        const oldA = r.a;
        r.a = r.b;
        r.b = oldA;
        const oldWinA = r.winA;
        r.winA = r.winB;
        r.winB = oldWinA;
      }
    });

    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.winA !== a.winA) return b.winA - a.winA;
      return a.a.localeCompare(b.a, "ja");
    });

    let currentRank = 0;
    let prevKey = null;
    list.forEach((r, idx) => {
      const key = String(r.count);
      if (key !== prevKey) {
        currentRank = idx + 1;
        prevKey = key;
      }
      r.rank = currentRank;
    });

    thead.innerHTML = `
      <tr>
        <th>順位</th>
        <th>回数</th>
        <th>棋士A</th>
        <th>Aの勝利数</th>
        <th>Bの勝利数</th>
        <th>棋士B</th>
      </tr>
    `;

    tbody.innerHTML = list
      .map(
        (r) => `
      <tr>
        <td>${r.rank}</td>
        <td>${r.count}</td>
        <td>${r.a}</td>
        <td>${r.winA}</td>
        <td>${r.winB}</td>
        <td>${r.b}</td>
      </tr>
    `
      )
      .join("");
  }

  // --- 7. 棋士別タイトル戦対戦回数ランキング ---
  function renderPlayerPairRanking() {
    if (!thead || !tbody) return;
    const player = otherPlayerSelect ? otherPlayerSelect.value : "";
    if (!player) {
      clearTable();
      return;
    }

    /** @type {Map<string,{opponent:string,count:number,win:number,lose:number}>} */
    const map = new Map();

    function ensure(opp) {
      if (!map.has(opp)) {
        map.set(opp, { opponent: opp, count: 0, win: 0, lose: 0 });
      }
      return map.get(opp);
    }

    titleMatches.filter(isRealTitleMatch).forEach((m) => {
      if (m.holder !== player && m.challenger !== player) return;
      const opp = m.holder === player ? m.challenger : m.holder;
      if (!opp) return;
      const rec = ensure(opp);
      rec.count++;
      if (m.winner === player) {
        rec.win++;
      } else if (m.loser === player) {
        rec.lose++;
      }
    });

    const list = Array.from(map.values());
    list.forEach((r) => {
      r.rate = r.count ? r.win / r.count : 0;
    });

    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.win !== a.win) return b.win - a.win;
      return a.opponent.localeCompare(b.opponent, "ja");
    });

    let currentRank = 0;
    let prevKey = null;
    list.forEach((r, idx) => {
      const key = String(r.count);
      if (key !== prevKey) {
        currentRank = idx + 1;
        prevKey = key;
      }
      r.rank = currentRank;
    });

    thead.innerHTML = `
      <tr>
        <th>順位</th>
        <th>回数</th>
        <th>相手</th>
        <th>勝</th>
        <th>敗</th>
        <th>勝率</th>
      </tr>
    `;

    tbody.innerHTML = list
      .map(
        (r) => `
      <tr>
        <td>${r.rank}</td>
        <td>${r.count}</td>
        <td>${r.opponent}</td>
        <td>${r.win}</td>
        <td>${r.lose}</td>
        <td>${formatRate(r.win, r.count)}</td>
      </tr>
    `
      )
      .join("");
  }

  // ====== イベント登録 & 初期表示 ======

  function attachEvents() {
    modeRadios.forEach((r) => {
      r.addEventListener("change", () => {
        updateUIVisibility();
        clearTable();
        handleDisplay();
      });
    });
    matchModeRadios.forEach((r) => {
      r.addEventListener("change", () => handleDisplay());
    });
    generalModeRadios.forEach((r) => {
      r.addEventListener("change", () => handleDisplay());
    });
    if (kisenSelect) {
      kisenSelect.addEventListener("change", () => handleDisplay());
    }
    if (yearSelect) {
      yearSelect.addEventListener("change", () => handleDisplay());
    }
    if (generalKisenSelect) {
      generalKisenSelect.addEventListener("change", () => handleDisplay());
    }
    if (generalYearSelect) {
      generalYearSelect.addEventListener("change", () => handleDisplay());
    }
    if (rankingTargetSelect) {
      rankingTargetSelect.addEventListener("change", () => handleDisplay());
    }
    rankingSortRadios.forEach((r) => {
      r.addEventListener("change", () => handleDisplay());
    });
    if (otherTargetSelect) {
      otherTargetSelect.addEventListener("change", () => {
        updateUIVisibility();
        handleDisplay();
      });
    }
    if (otherPlayerSelect) {
      otherPlayerSelect.addEventListener("change", () => handleDisplay());
    }
    if (displayButton) {
      displayButton.addEventListener("click", () => handleDisplay());
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadAllData()
      .then(() => {
        populateYearOptions();
        populateGeneralYearOptions();
        populateOtherPlayerOptions();
        extendRankingTargets();
        updateUIVisibility();
        attachEvents();
        handleDisplay(); // 初期表示
      })
      .catch((err) => {
        console.error(err);
        clearTable();
        if (thead) {
          thead.innerHTML = "<tr><th>エラー</th></tr>";
        }
        if (tbody) {
          tbody.innerHTML = "<tr><td>データ読み込みに失敗しました。</td></tr>";
        }
      });
  });
})();