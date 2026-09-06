const milestones = [
  { min: 0, max: 30, period: "生後0〜1ヶ月", title: "手足をバタバタさせる", desc: "昼夜の区別がなく、短いサイクルで睡眠と授乳を繰り返します。" },
  { min: 31, max: 89, period: "生後1〜2ヶ月", title: "追視・あやすと笑う", desc: "動くものを目で追ったり、「あー」「うー」と声を出したりします。" },
  { min: 90, max: 149, period: "生後3〜4ヶ月", title: "首がすわる", desc: "うつぶせにすると頭をグッと持ち上げるようになります。自分の手を見つめる行動も。" },
  { min: 150, max: 209, period: "生後5〜6ヶ月", title: "寝返り・離乳食のスタート", desc: "寝返りができるようになり、視野が広がります。離乳食を始める時期でもあります。" },
  { min: 210, max: 269, period: "生後7〜8ヶ月", title: "おすわり・ずりばい", desc: "支えなしで座れるようになり、ずりばいで少しずつ移動し始める子もいます。" },
  { min: 270, max: 334, period: "生後9〜11ヶ月", title: "はいはい・つかまり立ち", desc: "行動範囲がぐっと広がります。大人の真似をしたり、後追いが激しくなることも。" },
  { min: 335, max: 365, period: "生後11ヶ月〜1歳", title: "伝い歩き", desc: "家具につかまって横に歩いたり、数秒間一人で立てるようになったりします。" },
  { min: 366, max: 540, period: "1歳〜1歳半", title: "一人歩き・言葉が出始める", desc: "トコトコ歩き始め、「マンマ」「ワンワン」など意味のある言葉が出始めます。" }
];

let actualIndex = -1;
let displayedIndex = 0;

window.onload = function() { loadData(); };

// 日付を YYYY年MM月DD日 の形式にする関数を追加
function formatDate(dateStringOrObj) {
  const d = new Date(dateStringOrObj);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function calculateDays(birthDateString) {
  const birthDate = new Date(birthDateString);
  birthDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
}

function saveData() {
  const name = document.getElementById('nameInput').value;
  const date = document.getElementById('dateInput').value;
  if (!name || !date) { alert("名前と生年月日を入力してください。"); return; }
  localStorage.setItem('babyData', JSON.stringify({ name: name, birthDate: date }));
  loadData();
}

function loadData() {
  const savedData = localStorage.getItem('babyData');
  if (savedData) {
    const babyData = JSON.parse(savedData);
    const days = calculateDays(babyData.birthDate);

    document.getElementById('displayName').innerText = babyData.name;
    document.getElementById('displayDays').innerHTML = `${days}<span>日目</span>`;

    // 生年月日と今日の日付を表示にセット
    document.getElementById('displayBirthDate').innerText = formatDate(babyData.birthDate);
    document.getElementById('displayTodayDate').innerText = formatDate(new Date());

    setupMilestoneCard(days);

    document.getElementById('form-area').style.display = 'none';
    document.getElementById('milestone-list-area').style.display = 'none';
    document.getElementById('result-area').style.display = 'block';
  }
}

function setupMilestoneCard(days) {
  actualIndex = milestones.findIndex(m => days >= m.min && days <= m.max);
  if (actualIndex === -1) {
    if (days < 0) {
      actualIndex = -1; displayedIndex = 0;
    } else {
      actualIndex = milestones.length; displayedIndex = milestones.length - 1;
    }
  } else {
    displayedIndex = actualIndex;
  }
  document.getElementById('currentMilestoneCard').style.display = 'block';
  updateMilestoneUI();
}

function updateMilestoneUI() {
  const m = milestones[displayedIndex];
  document.getElementById('currentPeriod').innerText = m.period;
  document.getElementById('currentTitle').innerText = m.title;
  document.getElementById('currentDesc').innerText = m.desc;

  const card = document.getElementById('currentMilestoneCard');
  const label = document.getElementById('milestoneLabel');
  card.classList.remove('card-past', 'card-current', 'card-future');

  if (displayedIndex === actualIndex) {
    label.innerText = "📍 いまの成長の目安";
    label.style.color = "#f57f17";
    card.classList.add('card-current');
  } else if (actualIndex !== -1 && displayedIndex < actualIndex || actualIndex === milestones.length) {
    label.innerText = "✅ 過去の目安";
    label.style.color = "#757575";
    card.classList.add('card-past');
  } else {
    label.innerText = "🌟 これからの目安";
    label.style.color = "#1976D2";
    card.classList.add('card-future');
  }

  document.getElementById('prevArrow').disabled = (displayedIndex === 0);
  document.getElementById('nextArrow').disabled = (displayedIndex === milestones.length - 1);
}

function prevMilestone() { if (displayedIndex > 0) { displayedIndex--; updateMilestoneUI(); } }
function nextMilestone() { if (displayedIndex < milestones.length - 1) { displayedIndex++; updateMilestoneUI(); } }

function showMilestoneList() {
  const savedData = localStorage.getItem('babyData');
  const days = savedData ? calculateDays(JSON.parse(savedData).birthDate) : -1;
  const container = document.getElementById('milestoneListContainer');
  container.innerHTML = ''; 

  milestones.forEach(m => {
    const item = document.createElement('div');
    item.className = 'milestone-item';
    
    if (days > m.max) {
      item.classList.add('past');
      item.innerHTML += `<div class="milestone-status" style="color: #888;">✅ 完了した目安</div>`;
    } else if (days >= m.min && days <= m.max) {
      item.classList.add('current');
      item.innerHTML += `<div class="milestone-status" style="color: #f57f17;">📍 今の時期</div>`;
    }

    item.innerHTML += `
      <div class="milestone-period">${m.period}</div>
      <div class="milestone-title">${m.title}</div>
      <div class="milestone-desc">${m.desc}</div>
    `;
    container.appendChild(item);
  });

  document.getElementById('result-area').style.display = 'none';
  document.getElementById('milestone-list-area').style.display = 'block';
  window.scrollTo(0, 0); 
}

function hideMilestoneList() {
  document.getElementById('milestone-list-area').style.display = 'none';
  document.getElementById('result-area').style.display = 'block';
  const days = calculateDays(JSON.parse(localStorage.getItem('babyData')).birthDate);
  setupMilestoneCard(days); 
  window.scrollTo(0, 0);
}

function resetData() {
  if (confirm("登録情報を削除して最初からやり直しますか？")) {
    localStorage.removeItem('babyData');
    document.getElementById('nameInput').value = '';
    document.getElementById('dateInput').value = '';
    document.getElementById('form-area').style.display = 'block';
    document.getElementById('result-area').style.display = 'none';
    document.getElementById('milestone-list-area').style.display = 'none';
  }
}