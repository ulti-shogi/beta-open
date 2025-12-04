// title-8（一般棋戦対応）

document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("section");
  const table   = document.querySelector("table");
  const thead   = table.querySelector("thead");
  const tbody   = table.querySelector("tbody");

  // --- section 内のUIたち ---
  const modeRadios          = section.querySelectorAll('input[name="mode"]');
  const matchModeRadios     = section.querySelectorAll('input[name="matchMode"]');
  const kisenSelect         = section.querySelector('select[name="kisen"]');
  const yearSelect          = section.querySelector('select[name="year"]');
  const rankingSelect       = section.querySelector('select[name="rankingTarget"]');
  const otherSelect         = section.querySelector('select[name="otherTarget"]');
  const otherPlayerSelect   = section.querySelector('select[name="otherPlayer"]');
  const rankingSortRadios   = section.querySelectorAll('input[name="rankingSort"]');
  const generalModeRadios   = section.querySelectorAll('input[name="generalMode"]');
  const generalKisenSelect  = section.querySelector('select[name="generalKisen"]');
  const generalYearSelect   = section.querySelector('select[name="generalYear"]');
  const displayButton       = section.querySelector("button");

  // 説明文の <p> たち（前の兄弟要素を使って取得）
  const kisenLabelP   = kisenSelect.previousElementSibling;   // 「棋戦を選択してください。（棋戦ごと）」
  const yearLabelP    = yearSelect.previousElementSibling;    // 「年度を選択してください。（年度ごと）」
  const rankingLabelP = rankingSelect.previousElementSibling; // 「ランキングの対象を選択してください。」

  // その他モードの説明 <p>
  const otherLabelP       = otherSelect ? otherSelect.previousElementSibling : null;
  const otherPlayerLabelP = otherPlayerSelect ? otherPlayerSelect.previousElementSibling : null;

  // 一般棋戦モードの説明 <p>
  let generalModeLabelP    = null;
  let generalKisenLabelP   = null;
  let generalYearLabelP    = null;
  if (generalModeRadios.length > 0) {
    const generalModeFirstLabel = generalModeRadios[0].parentElement;
    generalModeLabelP = generalModeFirstLabel
      ? generalModeFirstLabel.previousElementSibling
      : null;
  }
  if (generalKisenSelect) {
    generalKisenLabelP = generalKisenSelect.previousElementSibling;
  }
  if (generalYearSelect) {
    generalYearLabelP = generalYearSelect.previousElementSibling;
  }

  // 並べ替え基準（rankingSort）の説明文 <p>
  let rankingSortLabelP = null;
  if (rankingSortRadios.length > 0) {
    const rankingSortFirstLabel = rankingSortRadios[0].parentElement;
    rankingSortLabelP = rankingSortFirstLabel
      ? rankingSortFirstLabel.previousElementSibling
      : null;
  }

  // 「番勝負一覧の表示方法を選択してください。」の <p>
  const matchModeFirstLabel = matchModeRadios[0].parentElement;
  const matchModeLabelP     = matchModeFirstLabel.previousElementSibling;

  // 棋戦の標準順（タイトル戦）
  const KISEN_ORDER = [
    "竜王戦","名人戦","叡王戦","王位戦",
    "王座戦","棋聖戦","棋王戦","王将戦",
    "十段戦","九段戦"
  ];

  // 年度ごと表示のときの棋戦順（タイトル戦）
  const YEAR_VIEW_ORDER = [
    "叡王戦","名人戦","棋聖戦","王位戦",
    "王座戦","竜王戦","王将戦","棋王戦"
  ];

  // 一般棋戦の表示順
  const GENERAL_KISEN_ORDER = [
    "朝日杯",
    "銀河戦",
    "NHK杯",
    "JT杯",
    "達人戦",
    "新人王戦",
    "青流戦"
  ];

  // 全番勝負データ（タイトル10CSV分）
  let ALL_MATCHES = [];
  // 一般棋戦データ（7CSV分）
  let GENERAL_MATCHES = [];

  // ===== CSV読み込み（単純なカンマ区切り想定） =====
  function loadCSV(path) {
    return fetch(path)
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length === 0) return [];
        const header = lines[0].split(",").map(s => s.trim());

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(",");
          const obj = {};
          header.forEach((key, idx) => {
            obj[key] = (cols[idx] ?? "").trim();
          });

          // 数値にしておく（存在する列だけ）
          if ("期" in obj)   obj["期"]   = Number(obj["期"]   || 0);
          if ("回" in obj)   obj["回"]   = Number(obj["回"]   || 0);
          if ("年度" in obj) obj["年度"] = Number(obj["年度"] || 0);
          if ("勝" in obj)   obj["勝"]   = Number(obj["勝"]   || 0);
          if ("敗" in obj)   obj["敗"]   = Number(obj["敗"]   || 0);
          if ("持" in obj)   obj["持"]   = Number(obj["持"]   || 0);

          rows.push(obj);
        }
        return rows;
      });
  }

  // ===== 年度セレクトボックスの選択肢を初期化（タイトル戦） =====
  function initYearOptions() {
    if (!yearSelect) return;

    const yearSet = new Set();
    ALL_MATCHES.forEach(r => {
      const y = r["年度"];
      if (typeof y === "number" && y > 0) {
        yearSet.add(y);
      }
    });

    const years = Array.from(yearSet).sort((a, b) => b - a); // 新しい年度を上に

    yearSelect.innerHTML = "";
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    });
  }

  // ===== 年度セレクトボックスの選択肢を初期化（一般棋戦） =====
  function initGeneralYearOptions() {
    if (!generalYearSelect) return;

    const yearSet = new Set();
    GENERAL_MATCHES.forEach(r => {
      const y = r["年度"];
      if (typeof y === "number" && y > 0) {
        yearSet.add(y);
      }
    });

    const years = Array.from(yearSet).sort((a, b) => b - a); // 新しい年度を上に

    generalYearSelect.innerHTML = "";
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      generalYearSelect.appendChild(opt);
    });
  }

  // ===== 棋士名セレクト（otherPlayer）の選択肢を初期化 =====
  // 並び順：タイトル戦通算登場回数が多い順
  //         同率なら通算獲得数が多い方
  //         それでも同率なら名前順
  function initPlayerOptions() {
    if (!otherPlayerSelect) return;

    // タイトル戦のみを対象に、棋士ごとの登場・獲得を集計
    const statsMap = new Map(); // key: 棋士名, value: {棋士名, 登場, 獲得}

    function ensure(name) {
      if (!statsMap.has(name)) {
        statsMap.set(name, { 棋士名: name, 登場: 0, 獲得: 0 });
      }
      return statsMap.get(name);
    }

    ALL_MATCHES.forEach(r => {
      if (!isTitleMatch(r)) return;

      const winner = r["優勝者"];
      const loser  = r["相手"];

      if (winner) {
        const w = ensure(winner);
        w.登場++;
        w.獲得++;
      }
      if (loser) {
        const l = ensure(loser);
        l.登場++;
        // 敗退はここでは使わないのでカウントしない
      }
    });

    // 配列にして、指定のルールでソート
    const players = Array.from(statsMap.values());
    players.sort((a, b) => {
      // 1. 登場回数の多い順
      if (b.登場 !== a.登場) return b.登場 - a.登場;
      // 2. 登場が同じなら獲得数の多い順
      if (b.獲得 !== a.獲得) return b.獲得 - a.獲得;
      // 3. それでも同じなら名前順
      return a.棋士名.localeCompare(b.棋士名, "ja");
    });

    // セレクトを埋める（表示は棋士名のみ）
    otherPlayerSelect.innerHTML = "";
    players.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.棋士名;
      opt.textContent = p.棋士名;
      otherPlayerSelect.appendChild(opt);
    });
  }

  // ===== UI の表示・非表示を切り替える =====
  function updateUIVisibility() {
    const mode = getMainMode();
    const matchMode = getMatchMode();
    const generalMode = getGeneralMode();

    if (mode === "match") {
      // ① 番勝負一覧モード（タイトル）
      setVisible(matchModeLabelP, true);
      matchModeRadios.forEach(r => setVisible(r.parentElement, true));

      if (matchMode === "kisen") {
        // 棋戦ごと：棋戦セレクトを表示、年度セレクトは隠す
        setVisible(kisenLabelP, true);
        setVisible(kisenSelect, true);
        setVisible(yearLabelP, false);
        setVisible(yearSelect, false);
      } else {
        // 年度ごと：年度セレクトを表示、棋戦セレクトは隠す
        setVisible(kisenLabelP, false);
        setVisible(kisenSelect, false);
        setVisible(yearLabelP, true);
        setVisible(yearSelect, true);
      }

      // ランキング用UIは隠す
      setVisible(rankingLabelP, false);
      setVisible(rankingSelect, false);
      if (rankingSortLabelP) setVisible(rankingSortLabelP, false);
      rankingSortRadios.forEach(r => setVisible(r.parentElement, false));

      // その他用UIも隠す
      if (otherLabelP) setVisible(otherLabelP, false);
      if (otherSelect) setVisible(otherSelect, false);
      if (otherPlayerLabelP) setVisible(otherPlayerLabelP, false);
      if (otherPlayerSelect) setVisible(otherPlayerSelect, false);

      // 一般棋戦用UIも隠す
      if (generalModeLabelP) setVisible(generalModeLabelP, false);
      generalModeRadios.forEach(r => setVisible(r.parentElement, false));
      if (generalKisenLabelP) setVisible(generalKisenLabelP, false);
      if (generalKisenSelect) setVisible(generalKisenSelect, false);
      if (generalYearLabelP) setVisible(generalYearLabelP, false);
      if (generalYearSelect) setVisible(generalYearSelect, false);

    } else if (mode === "ranking") {
      // ② 獲得等ランキングモード（タイトル）
      setVisible(matchModeLabelP, false);
      matchModeRadios.forEach(r => setVisible(r.parentElement, false));

      setVisible(kisenLabelP, false);
      setVisible(kisenSelect, false);
      setVisible(yearLabelP, false);
      setVisible(yearSelect, false);

      setVisible(rankingLabelP, true);
      setVisible(rankingSelect, true);
      if (rankingSortLabelP) setVisible(rankingSortLabelP, true);
      rankingSortRadios.forEach(r => setVisible(r.parentElement, true));

      // その他用UIは隠す
      if (otherLabelP) setVisible(otherLabelP, false);
      if (otherSelect) setVisible(otherSelect, false);
      if (otherPlayerLabelP) setVisible(otherPlayerLabelP, false);
      if (otherPlayerSelect) setVisible(otherPlayerSelect, false);

      // 一般棋戦用UIも隠す
      if (generalModeLabelP) setVisible(generalModeLabelP, false);
      generalModeRadios.forEach(r => setVisible(r.parentElement, false));
      if (generalKisenLabelP) setVisible(generalKisenLabelP, false);
      if (generalKisenSelect) setVisible(generalKisenSelect, false);
      if (generalYearLabelP) setVisible(generalYearLabelP, false);
      if (generalYearSelect) setVisible(generalYearSelect, false);

    } else if (mode === "other") {
      // ③ その他モード（タイトル）
      setVisible(matchModeLabelP, false);
      matchModeRadios.forEach(r => setVisible(r.parentElement, false));

      setVisible(kisenLabelP, false);
      setVisible(kisenSelect, false);
      setVisible(yearLabelP, false);
      setVisible(yearSelect, false);

      setVisible(rankingLabelP, false);
      setVisible(rankingSelect, false);
      if (rankingSortLabelP) setVisible(rankingSortLabelP, false);
      rankingSortRadios.forEach(r => setVisible(r.parentElement, false));

      if (otherLabelP) setVisible(otherLabelP, true);
      if (otherSelect) setVisible(otherSelect, true);

      // otherTarget が player のときだけ棋士名セレクトを表示
      const otherMode = otherSelect ? otherSelect.value : "";
      const showPlayer = otherMode === "player";
      if (otherPlayerLabelP) setVisible(otherPlayerLabelP, showPlayer);
      if (otherPlayerSelect) setVisible(otherPlayerSelect, showPlayer);

      // 一般棋戦用UIも隠す
      if (generalModeLabelP) setVisible(generalModeLabelP, false);
      generalModeRadios.forEach(r => setVisible(r.parentElement, false));
      if (generalKisenLabelP) setVisible(generalKisenLabelP, false);
      if (generalKisenSelect) setVisible(generalKisenSelect, false);
      if (generalYearLabelP) setVisible(generalYearLabelP, false);
      if (generalYearSelect) setVisible(generalYearSelect, false);

    } else if (mode === "general") {
      // ④ 一般棋戦一覧モード
      setVisible(matchModeLabelP, false);
      matchModeRadios.forEach(r => setVisible(r.parentElement, false));

      setVisible(kisenLabelP, false);
      setVisible(kisenSelect, false);
      setVisible(yearLabelP, false);
      setVisible(yearSelect, false);

      setVisible(rankingLabelP, false);
      setVisible(rankingSelect, false);
      if (rankingSortLabelP) setVisible(rankingSortLabelP, false);
      rankingSortRadios.forEach(r => setVisible(r.parentElement, false));

      if (otherLabelP) setVisible(otherLabelP, false);
      if (otherSelect) setVisible(otherSelect, false);
      if (otherPlayerLabelP) setVisible(otherPlayerLabelP, false);
      if (otherPlayerSelect) setVisible(otherPlayerSelect, false);

      // 一般棋戦UIを表示
      if (generalModeLabelP) setVisible(generalModeLabelP, true);
      generalModeRadios.forEach(r => setVisible(r.parentElement, true));

      if (generalMode === "kisen") {
        if (generalKisenLabelP) setVisible(generalKisenLabelP, true);
        if (generalKisenSelect) setVisible(generalKisenSelect, true);
        if (generalYearLabelP) setVisible(generalYearLabelP, false);
        if (generalYearSelect) setVisible(generalYearSelect, false);
      } else {
        if (generalKisenLabelP) setVisible(generalKisenLabelP, false);
        if (generalKisenSelect) setVisible(generalKisenSelect, false);
        if (generalYearLabelP) setVisible(generalYearLabelP, true);
        if (generalYearSelect) setVisible(generalYearSelect, true);
      }
    }
  }

  function setVisible(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  // ===== モード取得 =====
  function getMainMode() {
    const checked = Array.from(modeRadios).find(r => r.checked);
    return checked ? checked.value : "match";
  }

  function getMatchMode() {
    const checked = Array.from(matchModeRadios).find(r => r.checked);
    return checked ? checked.value : "kisen";
  }

  function getGeneralMode() {
    const checked = Array.from(generalModeRadios).find(r => r.checked);
    return checked ? checked.value : "kisen";
  }

  function getRankingSort() {
    const checked = Array.from(rankingSortRadios).find(r => r.checked);
    return checked ? checked.value : "獲得";
  }

  // ===== テーブルクリア =====
  function clearTable() {
    thead.innerHTML = "";
    tbody.innerHTML = "";
  }

  // ===== タイトル戦として扱うかどうか =====
  function isTitleMatch(row) {
    const kisen = row["棋戦"];
    const ki    = row["期"];

    // 王座戦: 第30期まではタイトル戦扱いではない
    if (kisen === "王座戦" && ki <= 30) return false;
    // 叡王戦: 第2期まではタイトル戦扱いではない
    if (kisen === "叡王戦" && ki <= 2)  return false;

    return true;
  }

  // ===== ①-a 棋戦ごとの番勝負一覧（タイトル戦） =====
  function renderMatchesByKisen(kisenName) {
    clearTable();

    const rows = ALL_MATCHES.filter(r => r["棋戦"] === kisenName);

    rows.sort((a, b) => b["期"] - a["期"]);

    thead.innerHTML = `
      <tr>
        <th>年度</th>
        <th>期</th>
        <th>優勝者</th>
        <th>勝</th>
        <th>敗</th>
        <th>相手</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r["年度"]}</td>
        <td>${r["期"]}</td>
        <td>${r["優勝者"]}</td>
        <td>${r["勝"]}</td>
        <td>${r["敗"]}</td>
        <td>${r["相手"]}</td>
      </tr>
    `).join("");
  }

  // ===== ①-b 年度ごとの番勝負一覧（タイトル戦） =====
  function renderMatchesByYear(year) {
    clearTable();

    const targetYear = Number(year);
    if (!targetYear) {
      thead.innerHTML = "<tr><th>年度</th></tr>";
      tbody.innerHTML = "<tr><td>年度が正しく選択されていません。</td></tr>";
      return;
    }

    const rows = ALL_MATCHES.filter(r => r["年度"] === targetYear);

    rows.sort((a, b) => {
      const ai = YEAR_VIEW_ORDER.indexOf(a["棋戦"]);
      const bi = YEAR_VIEW_ORDER.indexOf(b["棋戦"]);
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;

      if (aIdx !== bIdx) return aIdx - bIdx;
      return b["期"] - a["期"];
    });

    thead.innerHTML = `
      <tr>
        <th>棋戦</th>
        <th>期</th>
        <th>優勝者</th>
        <th>勝</th>
        <th>敗</th>
        <th>相手</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r["棋戦"]}</td>
        <td>${r["期"]}</td>
        <td>${r["優勝者"]}</td>
        <td>${r["勝"]}</td>
        <td>${r["敗"]}</td>
        <td>${r["相手"]}</td>
      </tr>
    `).join("");
  }

  // ===== 一般棋戦：棋戦ごとの一覧 =====
  function renderGeneralByKisen(kisenName) {
    clearTable();

    const rows = GENERAL_MATCHES.filter(r => r["棋戦"] === kisenName);

    // 回（期）の降順で並べる
    rows.sort((a, b) => {
      if (b["回"] !== a["回"]) return b["回"] - a["回"];
      if (b["年度"] !== a["年度"]) return b["年度"] - a["年度"];
      return a["優勝者"].localeCompare(b["優勝者"], "ja");
    });

    const hasScore = (kisenName === "新人王戦" || kisenName === "青流戦");

    thead.innerHTML = `
      <tr>
        <th>棋戦</th>
        <th>回</th>
        <th>年度</th>
        <th>優勝者</th>
        <th>勝</th>
        <th>敗</th>
        <th>準優勝</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r["棋戦"]}</td>
        <td>${r["回"]}</td>
        <td>${r["年度"]}</td>
        <td>${r["優勝者"]}</td>
        <td>${hasScore ? r["勝"] : ""}</td>
        <td>${hasScore ? r["敗"] : ""}</td>
        <td>${r["準優勝"]}</td>
      </tr>
    `).join("");
  }

  // ===== 一般棋戦：年度ごとの一覧 =====
  function renderGeneralByYear(year) {
    clearTable();

    const targetYear = Number(year);
    if (!targetYear) {
      thead.innerHTML = "<tr><th>年度</th></tr>";
      tbody.innerHTML = "<tr><td>年度が正しく選択されていません。</td></tr>";
      return;
    }

    const rows = GENERAL_MATCHES.filter(r => r["年度"] === targetYear);

    rows.sort((a, b) => {
      const ai = GENERAL_KISEN_ORDER.indexOf(a["棋戦"]);
      const bi = GENERAL_KISEN_ORDER.indexOf(b["棋戦"]);
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;

      if (aIdx !== bIdx) return aIdx - bIdx;
      if (b["回"] !== a["回"]) return b["回"] - a["回"];
      return a["優勝者"].localeCompare(b["優勝者"], "ja");
    });

    thead.innerHTML = `
      <tr>
        <th>棋戦</th>
        <th>回</th>
        <th>年度</th>
        <th>優勝者</th>
        <th>勝</th>
        <th>敗</th>
        <th>準優勝</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(r => {
      const kisenName = r["棋戦"];
      const hasScore = (kisenName === "新人王戦" || kisenName === "青流戦");
      return `
        <tr>
          <td>${r["棋戦"]}</td>
          <td>${r["回"]}</td>
          <td>${r["年度"]}</td>
          <td>${r["優勝者"]}</td>
          <td>${hasScore ? r["勝"] : ""}</td>
          <td>${hasScore ? r["敗"] : ""}</td>
          <td>${r["準優勝"]}</td>
        </tr>
      `;
    }).join("");
  }

  // ===== ②-1 棋士別タイトル獲得ランキング（通算 or 棋戦別） =====
  function renderRanking(targetKisen) {
    clearTable();

    let baseMatches;
    if (!targetKisen || targetKisen === "通算") {
      baseMatches = ALL_MATCHES;
    } else {
      baseMatches = ALL_MATCHES.filter(r => r["棋戦"] === targetKisen);
    }

    const matches = baseMatches.filter(isTitleMatch);

    const statsMap = new Map(); // key: 棋士名, value: {棋士名, 登場, 獲得, 敗退}

    function ensure(name) {
      if (!statsMap.has(name)) {
        statsMap.set(name, { 棋士名: name, 登場: 0, 獲得: 0, 敗退: 0 });
      }
      return statsMap.get(name);
    }

    matches.forEach(row => {
      const winner = row["優勝者"];
      const loser  = row["相手"];

      if (winner) {
        const w = ensure(winner);
        w.登場++;
        w.獲得++;
      }
      if (loser) {
        const l = ensure(loser);
        l.登場++;
        l.敗退++;
      }
    });

    let list = Array.from(statsMap.values());
    list.forEach(p => {
      p.勝率 = p.登場 > 0 ? p.獲得 / p.登場 : 0;
    });

    const sortKey = getRankingSort();

    list.sort((a, b) => {
      switch (sortKey) {
        case "登場":
          if (b.登場 !== a.登場) return b.登場 - a.登場;
          if (b.獲得 !== a.獲得) return b.獲得 - a.獲得;
          if (b.敗退 !== a.敗退) return b.敗退 - a.敗退;
          return a.棋士名.localeCompare(b.棋士名, "ja");

        case "敗退":
          if (b.敗退 !== a.敗退) return b.敗退 - a.敗退;
          if (b.登場 !== a.登場) return b.登場 - a.登場;
          if (b.獲得 !== a.獲得) return b.獲得 - a.獲得;
          return a.棋士名.localeCompare(b.棋士名, "ja");

        case "勝率":
          if (b.勝率 !== a.勝率) return b.勝率 - a.勝率;
          if (b.登場 !== a.登場) return b.登場 - a.登場;
          if (b.獲得 !== a.獲得) return b.獲得 - a.獲得;
          return a.棋士名.localeCompare(b.棋士名, "ja");

        case "獲得":
        default:
          if (b.獲得 !== a.獲得) return b.獲得 - a.獲得;
          if (b.登場 !== a.登場) return b.登場 - a.登場;
          return a.棋士名.localeCompare(b.棋士名, "ja");
      }
    });

    // 主軸だけで同順位判定
    function isSameRank(a, b) {
      switch (sortKey) {
        case "登場":
          return a.登場 === b.登場;
        case "敗退":
          return a.敗退 === b.敗退;
        case "勝率":
          return a.勝率 === b.勝率;
        case "獲得":
        default:
          return a.獲得 === b.獲得;
      }
    }

    let rank = 0;
    let prev = null;
    list.forEach((p, idx) => {
      if (!prev || !isSameRank(p, prev)) {
        rank = idx + 1;
      }
      p._rank = rank;
      prev = p;
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

    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${p._rank}</td>
        <td>${p.棋士名}</td>
        <td>${p.登場}</td>
        <td>${p.獲得}</td>
        <td>${p.敗退}</td>
        <td>${p.登場 > 0 ? p.勝率.toFixed(4) : ""}</td>
      </tr>
    `).join("");
  }

  // ===== ②-2 対戦カード別タイトル戦回数ランキング =====
  // 列：順位,回数,棋士A,Aの勝利数,Bの勝利数,棋士B
  function renderPairRanking() {
    clearTable();

    const matches = ALL_MATCHES.filter(isTitleMatch)
      .filter(r => r["優勝者"] && r["相手"]);

    const pairMap = new Map();

    matches.forEach(row => {
      const winner = row["優勝者"];
      const loser  = row["相手"];

      if (!winner || !loser) return;

      const a = winner.localeCompare(loser, "ja") <= 0 ? winner : loser;
      const b = winner.localeCompare(loser, "ja") <= 0 ? loser : winner;
      const key = `${a}|${b}`;

      if (!pairMap.has(key)) {
        pairMap.set(key, {
          name1: a,
          name2: b,
          wins1: 0,
          wins2: 0,
          count: 0
        });
      }
      const info = pairMap.get(key);
      info.count++;

      if (winner === a) {
        info.wins1++;
      } else {
        info.wins2++;
      }
    });

    const list = [];
    pairMap.forEach(info => {
      let A, B, Awin, Bwin;

      if (info.wins1 > info.wins2) {
        A    = info.name1;
        B    = info.name2;
        Awin = info.wins1;
        Bwin = info.wins2;
      } else if (info.wins2 > info.wins1) {
        A    = info.name2;
        B    = info.name1;
        Awin = info.wins2;
        Bwin = info.wins1;
      } else {
        // 勝利数が同じ場合：
        // 1. タイトル戦通算登場回数が多い方を左
        // 2. それでも同じなら名前順

        // タイトル戦通算登場回数を数える
        const countAppearances = (name) => {
          let count = 0;
          ALL_MATCHES.forEach(r => {
            if (!isTitleMatch(r)) return;
            if (r["優勝者"] === name || r["相手"] === name) {
              count++;
            }
          });
          return count;
        };

        const appear1 = countAppearances(info.name1);
        const appear2 = countAppearances(info.name2);

        if (appear1 > appear2) {
          A    = info.name1;
          B    = info.name2;
          Awin = info.wins1;
          Bwin = info.wins2;
        } else if (appear2 > appear1) {
          A    = info.name2;
          B    = info.name1;
          Awin = info.wins2;
          Bwin = info.wins1;
        } else {
          // 登場回数も同じなら名前順
          if (info.name1.localeCompare(info.name2, "ja") <= 0) {
            A    = info.name1;
            B    = info.name2;
            Awin = info.wins1;
            Bwin = info.wins2;
          } else {
            A    = info.name2;
            B    = info.name1;
            Awin = info.wins2;
            Bwin = info.wins1;
          }
        }
      }

      list.push({
        回数: info.count,
        棋士A: A,
        A勝: Awin,
        B勝: Bwin,
        棋士B: B
      });
    });

    list.sort((a, b) => {
      if (b.回数 !== a.回数) return b.回数 - a.回数;
      if (b.A勝 !== a.A勝)   return b.A勝   - a.A勝;
      const n1 = a.棋士A.localeCompare(b.棋士A, "ja");
      if (n1 !== 0) return n1;
      return a.棋士B.localeCompare(b.棋士B, "ja");
    });

    let rank = 0;
    let prev = null;
    list.forEach((p, idx) => {
      if (!prev || p.回数 !== prev.回数) {
        rank = idx + 1;
      }
      p._rank = rank;
      prev = p;
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

    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${p._rank}</td>
        <td>${p.回数}</td>
        <td>${p.棋士A}</td>
        <td>${p.A勝}</td>
        <td>${p.B勝}</td>
        <td>${p.棋士B}</td>
      </tr>
    `).join("");
  }

  // ===== ②-3 棋士別タイトル戦対戦回数ランキング =====
  // 列：順位,回数,相手,勝,敗,勝率
  function renderPlayerPairRanking(playerName) {
    clearTable();

    if (!playerName) {
      thead.innerHTML = "<tr><th>未選択</th></tr>";
      tbody.innerHTML = "<tr><td>棋士が選択されていません。</td></tr>";
      return;
    }

    const matches = ALL_MATCHES.filter(isTitleMatch)
      .filter(r => r["優勝者"] && r["相手"] &&
                   (r["優勝者"] === playerName || r["相手"] === playerName));

    const oppMap = new Map(); // key: 相手名

    matches.forEach(row => {
      const winner = row["優勝者"];
      const loser  = row["相手"];

      if (!winner || !loser) return;

      let opponent;
      let winForPlayer;

      if (winner === playerName) {
        opponent = loser;
        winForPlayer = true;
      } else if (loser === playerName) {
        opponent = winner;
        winForPlayer = false;
      } else {
        return;
      }

      if (!oppMap.has(opponent)) {
        oppMap.set(opponent, { 相手: opponent, 回数: 0, 勝: 0, 敗: 0 });
      }
      const info = oppMap.get(opponent);
      info.回数++;
      if (winForPlayer) {
        info.勝++;
      } else {
        info.敗++;
      }
    });

    const list = Array.from(oppMap.values());
    list.forEach(p => {
      p.勝率 = p.回数 > 0 ? p.勝 / p.回数 : 0;
    });

    // 並び順：回数 → 勝 → 相手名
    list.sort((a, b) => {
      if (b.回数 !== a.回数) return b.回数 - a.回数;
      if (b.勝 !== a.勝)     return b.勝   - a.勝;
      return a.相手.localeCompare(b.相手, "ja");
    });

    // 順位（回数だけで同順位判定）
    let rank = 0;
    let prev = null;
    list.forEach((p, idx) => {
      if (!prev || p.回数 !== prev.回数) {
        rank = idx + 1;
      }
      p._rank = rank;
      prev = p;
    });

    thead.innerHTML = `
      <tr>
        <th>棋士</th>
        <th colspan="5">${playerName}</th>
      </tr>
      <tr>
        <th>順位</th>
        <th>回数</th>
        <th>相手</th>
        <th>勝</th>
        <th>敗</th>
        <th>勝率</th>
      </tr>
    `;

    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${p._rank}</td>
        <td>${p.回数}</td>
        <td>${p.相手}</td>
        <td>${p.勝}</td>
        <td>${p.敗}</td>
        <td>${p.回数 > 0 ? p.勝率.toFixed(4) : ""}</td>
      </tr>
    `).join("");
  }

  // ===== 表示ボタンを押したときの動作 =====
  function handleDisplay() {
    const mode = getMainMode();

    if (mode === "match") {
      // タイトル戦：番勝負一覧
      const matchMode = getMatchMode();
      if (matchMode === "kisen") {
        const kisenName = kisenSelect.value || "竜王戦";
        renderMatchesByKisen(kisenName);
      } else {
        let yearValue = yearSelect ? yearSelect.value : "";
        if (!yearValue) {
          const years = ALL_MATCHES
            .map(r => r["年度"])
            .filter(y => typeof y === "number" && y > 0);
          const maxYear = years.length ? Math.max(...years) : 0;
          yearValue = String(maxYear);
          if (yearSelect && maxYear) {
            yearSelect.value = yearValue;
          }
        }
        renderMatchesByYear(yearValue);
      }
    } else if (mode === "ranking") {
      // タイトル戦：獲得等ランキング
      const target = rankingSelect.value || "通算";
      renderRanking(target);
    } else if (mode === "other") {
      // タイトル戦：その他
      const target = otherSelect ? otherSelect.value : "";
      if (target === "pair") {
        renderPairRanking();
      } else if (target === "player") {
        const playerName = otherPlayerSelect ? otherPlayerSelect.value : "";
        renderPlayerPairRanking(playerName);
      } else {
        clearTable();
        thead.innerHTML = "<tr><th>未対応</th></tr>";
        tbody.innerHTML = "<tr><td>この条件の表示はまだ実装されていません。</td></tr>";
      }
    } else if (mode === "general") {
      // 一般棋戦一覧
      const generalMode = getGeneralMode();
      if (generalMode === "kisen") {
        const name = generalKisenSelect ? (generalKisenSelect.value || "朝日杯") : "朝日杯";
        if (generalKisenSelect && !generalKisenSelect.value) {
          generalKisenSelect.value = name;
        }
        renderGeneralByKisen(name);
      } else {
        let yearValue = generalYearSelect ? generalYearSelect.value : "";
        if (!yearValue) {
          const years = GENERAL_MATCHES
            .map(r => r["年度"])
            .filter(y => typeof y === "number" && y > 0);
          const maxYear = years.length ? Math.max(...years) : 0;
          yearValue = String(maxYear);
          if (generalYearSelect && maxYear) {
            generalYearSelect.value = yearValue;
          }
        }
        renderGeneralByYear(yearValue);
      }
    }
  }

  // ===== イベント設定 =====
  modeRadios.forEach(r => {
    r.addEventListener("change", () => {
      updateUIVisibility();
    });
  });

  matchModeRadios.forEach(r => {
    r.addEventListener("change", () => {
      updateUIVisibility();
    });
  });

  if (otherSelect) {
    otherSelect.addEventListener("change", () => {
      updateUIVisibility();
    });
  }

  generalModeRadios.forEach(r => {
    r.addEventListener("change", () => {
      updateUIVisibility();
    });
  });

  displayButton.addEventListener("click", () => {
    handleDisplay();
  });

  // ===== 初期化：タイトル10CSV＋一般7CSVを読み込む =====
  const CSV_FILES = [
    "ryuou.csv",
    "meijin.csv",
    "eiou.csv",
    "oui.csv",
    "ouza.csv",
    "kisei.csv",
    "kiou.csv",
    "ousho.csv",
    "kudan.csv",
    "judan.csv"
  ];

  const GENERAL_CSV_FILES = [
    "asahi.csv",
    "ginga.csv",
    "nhk.csv",
    "jt.csv",
    "tatsujin.csv",
    "sinjin.csv",
    "kakogawa.csv"
  ];

  Promise.all([
    Promise.all(CSV_FILES.map(path => loadCSV(path))),
    Promise.all(GENERAL_CSV_FILES.map(path => loadCSV(path)))
  ])
    .then(([titleArrays, generalArrays]) => {
      ALL_MATCHES     = titleArrays.flat();
      GENERAL_MATCHES = generalArrays.flat();

      initYearOptions();
      initPlayerOptions();
      initGeneralYearOptions();

      // 初期状態：タイトル戦・番勝負一覧・棋戦ごと・竜王戦
      const modeMatch = Array.from(modeRadios).find(r => r.value === "match");
      if (modeMatch) modeMatch.checked = true;
      const matchKisen = Array.from(matchModeRadios).find(r => r.value === "kisen");
      if (matchKisen) matchKisen.checked = true;
      if (kisenSelect)   kisenSelect.value   = "竜王戦";
      if (rankingSelect) rankingSelect.value = "通算";
      if (generalKisenSelect) generalKisenSelect.value = "朝日杯";

      updateUIVisibility();

      // 初期表示は竜王戦の番勝負一覧（これまでどおり）
      renderMatchesByKisen("竜王戦");
    })
    .catch(err => {
      console.error("CSV読み込み中にエラーが発生しました:", err);
      clearTable();
      thead.innerHTML = "<tr><th>エラー</th></tr>";
      tbody.innerHTML = "<tr><td>データの読み込みに失敗しました。</td></tr>";
    });
});