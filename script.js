// ページ読み込み時に保存されたデータをチェック
window.onload = function() {
  loadData();
};

// 日数を計算する関数
function calculateDays(birthDateString) {
  const birthDate = new Date(birthDateString);
  birthDate.setHours(0, 0, 0, 0); // 時間をリセット
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時間をリセット

  // ミリ秒の差分を計算し、日数に変換
  const diffTime = today - birthDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// データを保存して表示を切り替える処理
function saveData() {
  const name = document.getElementById('nameInput').value;
  const date = document.getElementById('dateInput').value;

  if (!name || !date) {
    alert("名前と生年月日を入力してください。");
    return;
  }

  const babyData = { name: name, birthDate: date };
  // ブラウザのlocalStorageに保存
  localStorage.setItem('babyData', JSON.stringify(babyData));
  
  loadData();
}

// データを読み込んで画面に表示する処理
function loadData() {
  const savedData = localStorage.getItem('babyData');
  
  if (savedData) {
    const babyData = JSON.parse(savedData);
    const days = calculateDays(babyData.birthDate);

    document.getElementById('displayName').innerText = babyData.name;
    // 0日目（当日）ではなく「1日目」と数える場合は +1 してください
    document.getElementById('displayDays').innerHTML = `${days}<span>日目</span>`;

    // フォームを隠して結果を表示
    document.getElementById('form-area').style.display = 'none';
    document.getElementById('result-area').style.display = 'block';
  }
}

// データを削除して入力フォームに戻る処理
function resetData() {
  if (confirm("登録情報を削除して最初からやり直しますか？")) {
    localStorage.removeItem('babyData');
    
    // 入力欄をクリア
    document.getElementById('nameInput').value = '';
    document.getElementById('dateInput').value = '';

    // 結果を隠してフォームを表示
    document.getElementById('form-area').style.display = 'block';
    document.getElementById('result-area').style.display = 'none';
  }
}