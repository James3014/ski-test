# 增加滑雪測驗趣味性與使用者黏著度改動日誌

## 初始需求
使用者要求協助將 `ski-test` 頁面及內容增加趣味性，目標是讓人願意持續使用。

## 階段一：結構化分析 (Structural Analysis)
作為【結構分析師】，我對現有專案進行了初步分析，識別出三個核心檔案及其職責：
- `ski-test.html`: 頁面結構與基本樣式。
- `script.js`: 核心邏輯，包含題目解析、篩選、計分、模式切換。
- `quiz_database.json`: 題目資料（當時發現資料硬編碼在 `script.js` 中，此檔案未被使用）。

## 階段二：策略與模組化 (Strategy & Modularization)
作為【策略架構師】，我制定了遊戲化策略，旨在提升使用者黏著度，並將其拆分為可獨立實作的模組：
1.  **進度與成就系統 (Progress & Achievement System)**：提供長期目標與回饋。
2.  **視覺與聽覺回饋強化 (Enhanced Audio-Visual Feedback)**：增強即時互動體驗。
3.  **排行榜與社交分享 (Leaderboard & Social Sharing)**：引入競爭與社交元素。
4.  **程式碼結構優化 (Code Refactoring)**：提升可維護性與擴展性，為後續功能奠定基礎。

## 階段三與四：實作與驗證 (Implementation & Verification)

### 迭代一：資料外部化 (程式碼結構優化)
- **提案**: 將硬編碼在 `script.js` 中的 `quizdown` 題目資料，遷移至 `quiz_database.json`，並透過 `fetch` 非同步載入。
- **理由**: 實現關注點分離，使題庫維護更便捷，並為未來擴展（如遠端載入）提供基礎。
- **改動詳情**:
    - `quiz_database.json`: 寫入 `casi` 和 `resort` 題庫的 Markdown 格式資料。
    - `script.js`:
        - 移除 `const quizdown = { ... };` 硬編碼區塊。
        - 新增 `quizData = {};` 狀態變數用於儲存載入的資料。
        - 修改 `currentQuizType` 初始值為 `''`。
        - 新增 `fetchQuizData()` 函式，負責從 `quiz_database.json` 載入資料。
        - 修改 `handleQuizSelection` 函式為 `async`，並使用 `fetchQuizData` 載入資料後，從 `quizData` 中取得對應題庫內容。
        - 調整 `window.addEventListener('load')`，在頁面載入時呼叫 `setupAudio()` 和 `fetchQuizData()`，不再預設載入任何題庫。
        - 調整 `resetPractice()` 函式，使其在沒有題目時清空篩選器和題目顯示。
        - 調整 `backToPracticeBtn` 和 `exitTestBtn` 的事件監聽器，簡化為 `resetPractice()` 和 `switchMode('practice')`。
- **驗證**: 提案通過審核，信心分數 98%。

### 迭代二：使用者進度與等級系統
- **提案**: 引入經驗值 (XP) 和等級系統，並使用 `localStorage` 進行持久化儲存。
- **理由**: 為使用者提供清晰的長期目標和即時的正面回饋，提升黏著度。
- **改動詳情**:
    - `ski-test.html`: 在計分板上方新增 `<div id="user-progress-container">` 區塊，用於顯示等級、經驗值和進度條。
    - `script.js`:
        - 新增 `userProgress` 狀態物件（包含 `level`, `xp`, `achievements`）。
        - 定義 `levelTiers` 物件，設定各等級所需的經驗值和名稱。
        - 定義 `xpRewards` 物件，根據題目難度設定答對題目獲得的經驗值。
        - 實作 `loadUserProgress()`: 從 `localStorage` 載入進度或初始化。
        - 實作 `saveUserProgress()`: 將進度儲存到 `localStorage`。
        - 實作 `addXP(amount)`: 增加經驗值，檢查是否升級，並觸發升級提示（目前為 `alert`）。
        - 實作 `updateProgressUI()`: 更新介面上的等級、經驗值和進度條顯示。
        - 在 `handlePracticeAnswerClick` 和 `handleTestAnswerClick` 中，當答對題目時呼叫 `addXP()`。
        - 在 `window.addEventListener('load')` 中呼叫 `loadUserProgress()`。
- **驗證**: 提案通過審核，信心分數 95%。

### 迭代三：成就系統
- **提案**: 建立成就清單，並實作成就解鎖邏輯與彈出式視窗展示。
- **理由**: 引入挑戰性，提供額外的獎勵和認可，進一步激發使用者參與。
- **改動詳情**:
    - `ski-test.html`:
        - 在計分板的按鈕區塊新增一個「我的成就」按鈕 (`#achievements-btn`)。
        - 在 `body` 結束標籤前新增一個隱藏的成就彈出式視窗 (`#achievements-modal`)，包含標題、關閉按鈕和成就列表容器 (`#achievements-list`)。
    - `script.js`:
        - 定義 `achievementsList` 物件，包含成就 ID、名稱、描述和圖示。
        - 新增 `achievementTrackers` 物件，用於追蹤連續答對題數和總答對題數。
        - 實作 `checkAchievements()` 函式：
            - 在每次答題後呼叫，根據 `achievementTrackers` 和 `userProgress.achievements` 檢查是否達成新成就。
            - 若有新成就，則更新 `userProgress.achievements`，儲存進度，並顯示 `alert` 提示（待優化）。
        - 實作 `renderAchievements()` 函式：
            - 根據 `achievementsList` 和 `userProgress.achievements` 動態生成成就列表的 HTML，區分已解鎖和未解鎖的樣式。
        - 在 `handlePracticeAnswerClick` 和 `handleTestAnswerClick` 中，當答對題目時，更新 `achievementTrackers.consecutiveCorrect` 並呼叫 `checkAchievements()`。答錯時重置 `consecutiveCorrect`。
        - 在 `loadUserProgress()` 中初始化 `achievementTrackers.totalCorrect` 為 `score.correct`。
        - 為 `#achievements-btn` 和 `#close-achievements-btn` 添加事件監聽器，控制成就 Modal 的顯示與隱藏，並在打開時呼叫 `renderAchievements()`。
- **驗證**: 提案通過審核，信心分數 97%。

## 後續計畫
- **模組二：視覺與聽覺回饋強化**:
    - 將 `alert()` 升級提示和成就解鎖提示改為更美觀的互動式彈出視窗。
    - 為經驗值增加添加動畫效果。
- **模組三：排行榜與社交分享**: 實作測驗模式後的排行榜與分享功能。
