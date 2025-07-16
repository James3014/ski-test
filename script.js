document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const questionsContainer = document.getElementById('questions-container');
    const difficultyFiltersContainer = document.getElementById('difficulty-filters');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const resortFiltersContainer = document.getElementById('resort-filters');
    const resortFilterWrapper = document.getElementById('resort-filter-wrapper');
    const casiLevelFiltersContainer = document.getElementById('casi-level-filters');
    const casiLevelFilterWrapper = document.getElementById('casi-level-filter-wrapper');
    const questionCount = document.getElementById('question-count');
    const answeredCountEl = document.getElementById('answered-count');
    const correctCountEl = document.getElementById('correct-count');
    const accuracyRateEl = document.getElementById('accuracy-rate');
    const resetBtn = document.getElementById('reset-btn');
    const startFilteredTestBtn = document.getElementById('start-filtered-test-btn');
    const startAllTestBtn = document.getElementById('start-all-test-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const backToPracticeBtn = document.getElementById('back-to-practice-btn');
    const exitTestBtn = document.getElementById('exit-test-btn');
    const testProgressEl = document.getElementById('test-progress');
    const testQuestionContainer = document.getElementById('test-question-container');
    const finalScoreEl = document.getElementById('final-score');
    const finalSummaryEl = document.getElementById('final-summary');
    const resultsContainer = document.getElementById('results-container');
    const modeViews = document.querySelectorAll('[data-mode-view]');
    const quizSelectionContainer = document.getElementById('quiz-selection');
    
    // Modals and Buttons
    const achievementsBtn = document.getElementById('achievements-btn');
    const achievementsModal = document.getElementById('achievements-modal');
    const closeAchievementsBtn = document.getElementById('close-achievements-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
    const leaderboardList = document.getElementById('leaderboard-list');
    const leaderboardForm = document.getElementById('leaderboard-form');
    const playerNameInput = document.getElementById('player-name');
    const shareResultsBtn = document.getElementById('share-results-btn');

    // Notifications
    const notificationModal = document.getElementById('notification-modal');
    const notificationIcon = document.getElementById('notification-icon');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    const closeNotificationBtn = document.getElementById('close-notification-btn');
    const xpAnimationContainer = document.getElementById('xp-animation-container');

    // State
    let allQuestions = [];
    let quizData = {};
    let currentFilters = { difficulty: '全部', category: '全部', casiLevel: '全部', resort: '全部' };
    let score = { answered: 0, correct: 0 };
    let appMode = 'practice';
    let currentQuizType = '';
    let testState = {
        questions: [],
        userAnswers: [],
        currentIndex: 0,
        finalScore: 0
    };
    let userProgress = {
        level: 1,
        xp: 0,
        achievements: []
    };
    let leaderboardData = [];

    const levelTiers = {
        1: { name: '雪地新手', xpNeeded: 100 },
        2: { name: '綠線巡航者', xpNeeded: 200 },
        3: { name: '藍線好手', xpNeeded: 300 },
        4: { name: '黑鑽大師', xpNeeded: 500 },
        5: { name: '雪山制霸者', xpNeeded: Infinity },
    };

    const xpRewards = {
        '易': 5,
        '中': 10,
        '難': 20
    };

    const achievementsList = {
        c1: { name: '初試啼聲', description: '第一次答對題目', icon: '&#127881;' },
        c5: { name: '連戰連勝', description: '連續答對 5 題', icon: '&#128293;' },
        c10: { name: '勢如破竹', description: '連續答對 10 題', icon: '&#127942;' },
        a10: { name: '學有所成', description: '總共答對 10 題', icon: '&#127891;' },
        a50: { name: '知識淵博', description: '總共答對 50 題', icon: '&#128218;' },
        l2: { name: '新秀崛起', description: '達到等級 2', icon: '&#11088;' },
        l5: { name: '雪山制霸', description: '達到等級 5', icon: '&#127941;' },
    };

    let achievementTrackers = {
        consecutiveCorrect: 0,
        totalCorrect: 0,
    };
    
    let correctSynth, incorrectSynth;
    let audioEnabled = false;

    async function fetchQuizData() {
        try {
            const [casiRes, karuizawaRes, kamuiRes] = await Promise.all([
                fetch('q.md'),
                fetch('sa-karuizawa.md'),
                fetch('sa-kamui.md')
            ]);

            if (!casiRes.ok || !karuizawaRes.ok || !kamuiRes.ok) {
                throw new Error('Failed to fetch one or more quiz files.');
            }

            const casiText = await casiRes.text();
            const karuizawaText = await karuizawaRes.text();
            const kamuiText = await kamuiRes.text();

            quizData = {
                "casi": casiText,
                "karuizawa": karuizawaText,
                "kamui": kamuiText
            };
            
            // Automatically select and load the first quiz by default
            const firstQuizKey = Object.keys(quizData)[0];
            if (firstQuizKey) {
                currentQuizType = firstQuizKey;
                initializeUI(quizData[firstQuizKey]);
                updateActiveButtons();
            }

        } catch (e) {
            console.error("Failed to load quiz data:", e);
            questionsContainer.innerHTML = `<p class=\"col-span-full text-center text-red-500\">無法載入題庫資料，請檢查檔案是否存在且格式正確。</p>`;
        }
    }

    function setupAudio() {
        if (audioEnabled || typeof Tone === 'undefined') return;
        try {
            correctSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 } }).toDestination();
            incorrectSynth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.3 } }).toDestination();
            audioEnabled = true;
        } catch (e) { console.error("Error initializing audio:", e); }
    }

    function playSound(isCorrect) {
        if (!audioEnabled) return;
        if (Tone.context.state !== 'running') { Tone.start().catch(e => console.error("Tone.start() failed:", e)); }
        if (isCorrect) { correctSynth.triggerAttackRelease("C5", "8n"); } else { incorrectSynth.triggerAttackRelease("A2", "8n"); }
    }

    // --- Notifications & Animations ---
    function showXpAnimation(amount) {
        const xpElement = document.createElement('div');
        xpElement.className = 'xp-animation';
        xpElement.textContent = `+${amount} XP`;
        xpAnimationContainer.appendChild(xpElement);
        setTimeout(() => xpElement.remove(), 1500);
    }

    function showNotification(icon, title, message) {
        notificationIcon.innerHTML = icon;
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notificationModal.classList.remove('hidden');
    }

    function closeNotification() {
        notificationModal.classList.add('hidden');
    }

    // --- Data Persistence ---
    function loadUserProgress() {
        const saved = localStorage.getItem('skiTestUserProgress');
        if (saved) userProgress = JSON.parse(saved);
        document.getElementById('user-progress-container').style.display = 'block';
        updateProgressUI();
    }

    function saveUserProgress() {
        localStorage.setItem('skiTestUserProgress', JSON.stringify(userProgress));
    }

    function loadLeaderboard() {
        const saved = localStorage.getItem('skiTestLeaderboard');
        if (saved) leaderboardData = JSON.parse(saved);
    }

    function saveLeaderboard() {
        localStorage.setItem('skiTestLeaderboard', JSON.stringify(leaderboardData));
    }

    // --- Core Systems ---
    function addXP(amount) {
        showXpAnimation(amount);
        userProgress.xp += amount;
        const currentTier = levelTiers[userProgress.level];
        if (currentTier && userProgress.xp >= currentTier.xpNeeded) {
            userProgress.level++;
            const newLevel = levelTiers[userProgress.level];
            if (newLevel) {
                showNotification('&#127942;', '等級提升！', `恭喜你升級！現在是 Lv.${userProgress.level} ${newLevel.name}！`);
                checkAchievements();
            }
        }
        saveUserProgress();
        updateProgressUI();
    }

    function updateProgressUI() {
        const currentTier = levelTiers[userProgress.level];
        if (!currentTier) return;
        const prevTierXP = userProgress.level > 1 ? levelTiers[userProgress.level - 1].xpNeeded : 0;
        const currentLevelXP = userProgress.xp - prevTierXP;
        const xpForNextLevel = currentTier.xpNeeded - prevTierXP;
        document.getElementById('user-level').textContent = `Lv. ${userProgress.level} ${currentTier.name}`;
        document.getElementById('user-xp').textContent = `${currentLevelXP} / ${xpForNextLevel} XP`;
        document.getElementById('xp-bar').style.width = `${Math.min((currentLevelXP / xpForNextLevel) * 100, 100)}%`;
    }

    function checkAchievements() {
        const newlyUnlocked = [];
        achievementTrackers.totalCorrect = score.correct;
        Object.keys(achievementsList).forEach(id => {
            if (userProgress.achievements.includes(id)) return;
            let unlocked = false;
            if (id.startsWith('c')) unlocked = achievementTrackers.consecutiveCorrect >= parseInt(id.slice(1));
            else if (id.startsWith('a')) unlocked = achievementTrackers.totalCorrect >= parseInt(id.slice(1));
            else if (id.startsWith('l')) unlocked = userProgress.level >= parseInt(id.slice(1));
            if (unlocked) newlyUnlocked.push(id);
        });

        if (newlyUnlocked.length > 0) {
            userProgress.achievements.push(...newlyUnlocked);
            saveUserProgress();
            newlyUnlocked.forEach((id, index) => {
                const achievement = achievementsList[id];
                setTimeout(() => {
                    showNotification(achievement.icon, '成就解鎖！', `${achievement.name} - ${achievement.description}`);
                }, 500 * (index + 1));
            });
        }
    }

    function renderAchievements() {
        const container = document.getElementById('achievements-list');
        container.innerHTML = Object.keys(achievementsList).map(id => {
            const achievement = achievementsList[id];
            const isUnlocked = userProgress.achievements.includes(id);
            return `
                <div class="flex items-center p-4 rounded-lg ${isUnlocked ? 'bg-green-100' : 'bg-slate-100'}">
                    <div class="text-4xl mr-4">${achievement.icon}</div>
                    <div>
                        <h4 class="font-bold text-slate-800 ${isUnlocked ? '' : 'text-slate-400'}">${achievement.name}</h4>
                        <p class="text-sm text-slate-500 ${isUnlocked ? '' : 'text-slate-400'}">${achievement.description}</p>
                    </div>
                    ${isUnlocked ? '<span class="ml-auto font-bold text-green-600">已解鎖</span>' : ''}
                </div>`;
        }).join('');
    }

    function renderLeaderboard() {
        leaderboardList.innerHTML = '';
        if (leaderboardData.length === 0) {
            leaderboardList.innerHTML = '<p class="text-center text-slate-500">排行榜還是空的，快來成為第一人！</p>';
            return;
        }
        leaderboardData.forEach((entry, index) => {
            const rankIcon = ['&#129351;', '&#129352;', '&#129353;'][index] || `${index + 1}.`;
            const element = document.createElement('div');
            element.className = 'flex items-center p-3 rounded-lg bg-slate-50';
            element.innerHTML = `
                <div class="font-bold text-lg w-12 text-center">${rankIcon}</div>
                <div class="flex-grow font-semibold text-slate-700">${entry.name}</div>
                <div class="font-bold text-sky-600 text-xl mr-4">${entry.score}分</div>
                <div class="text-sm text-slate-400">${new Date(entry.date).toLocaleDateString()}</div>
            `;
            leaderboardList.appendChild(element);
        });
    }

    async function shareResults() {
        const shareData = {
            title: '滑雪知識挑戰！',
            text: `我剛剛在單板滑雪互動題庫中獲得了 ${testState.finalScore} 分！你也來試試看吧！`,
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                showNotification('&#128279;', '分享成功', '感謝你的分享！');
            } else {
                navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
                showNotification('&#128203;', '已複製到剪貼簿', '分享連結已複製，快貼給你的朋友吧！');
            }
        } catch (err) {
            console.error("Share failed:", err);
            showNotification('&#10060;', '分享失敗', '無法完成分享，請稍後再試。');
        }
    }

    function parseMarkdownTable(markdownText) {
        if (!markdownText) return [];
        const lines = markdownText.trim().split('\n');
        if (lines.length < 3) return [];
        const headerCells = lines[0].split('|').map(h => h.trim());
        const headerMap = Object.fromEntries(headerCells.map((h, i) => [h, i]).filter(([h]) => h));
        return lines.slice(2).map(row => {
            if (!row.trim() || !row.includes('|')) return null;
            const cells = row.split('|').map(c => c.trim());
            return {
                id: cells[headerMap['題號']],
                question: cells[headerMap['題目']],
                options: ['A', 'B', 'C', 'D'].map(l => ({ letter: l, text: cells[headerMap[l]] })),
                answer: cells[headerMap['正解']],
                category: cells[headerMap['分類']],
                casiLevel: headerMap['CASI 等級'] ? cells[headerMap['CASI 等級']] : 'N/A',
                resortName: headerMap['雪場'] ? cells[headerMap['雪場']] : 'N/A',
                difficulty: cells[headerMap['難度']],
                explanation: cells[headerMap['解析']],
            };
        }).filter(Boolean);
    }

    function switchMode(mode) {
        appMode = mode;
        modeViews.forEach(view => view.classList.toggle('active', view.dataset.modeView === appMode));
    }

    function updateFilterButtons() {
        const difficultyOrder = ['易', '中', '難'];
        const casiLevelOrder = ['Lv1', 'Lv2', 'Lv3', 'Lv4', 'Park lv1', 'Park lv2', 'N/A'];

        const createButtons = (container, values, type) => {
            container.innerHTML = values.map(value => 
                `<button data-filter-type="${type}" data-filter-value="${value}" class="btn filter-btn px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200">${value}</button>`
            ).join('');
        };

        const allCategories = ['全部', ...new Set(allQuestions.map(q => q.category))];
        createButtons(categoryFiltersContainer, allCategories, 'category');

        const allDifficulties = ['全部', ...[...new Set(allQuestions.map(q => q.difficulty))].sort((a, b) => difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b))];
        createButtons(difficultyFiltersContainer, allDifficulties, 'difficulty');

        const hasCasiLevels = allQuestions.some(q => q.casiLevel && q.casiLevel !== 'N/A');
        casiLevelFilterWrapper.style.display = hasCasiLevels ? 'block' : 'none';
        if (hasCasiLevels) {
            const allCasiLevels = ['全部', ...[...new Set(allQuestions.map(q => q.casiLevel).filter(Boolean))].sort((a, b) => casiLevelOrder.indexOf(a) - casiLevelOrder.indexOf(b))];
            createButtons(casiLevelFiltersContainer, allCasiLevels, 'casiLevel');
        }

        const hasResorts = allQuestions.some(q => q.resortName && q.resortName !== 'N/A');
        resortFilterWrapper.style.display = hasResorts ? 'block' : 'none';
        if (hasResorts) {
            const allResorts = ['全部', ...new Set(allQuestions.map(q => q.resortName).filter(Boolean))];
            createButtons(resortFiltersContainer, allResorts, 'resort');
        }
        
        updateActiveButtons();
    }

    function getFilteredQuestions() {
        return allQuestions.filter(q => 
            (currentFilters.resort === '全部' || q.resortName === currentFilters.resort) &&
            (currentFilters.category === '全部' || q.category === currentFilters.category) &&
            (currentFilters.casiLevel === '全部' || q.casiLevel === currentFilters.casiLevel) &&
            (currentFilters.difficulty === '全部' || q.difficulty === currentFilters.difficulty)
        );
    }

    function renderPracticeQuestions() {
        const filtered = getFilteredQuestions();
        console.log(`Rendering ${filtered.length} practice questions.`);
        questionsContainer.innerHTML = '';
        if (filtered.length > 0) {
            filtered.forEach(q => questionsContainer.appendChild(createQuestionCard(q)));
        } else {
            questionsContainer.innerHTML = `<p class="col-span-full text-center text-slate-500">沒有符合篩選條件的題目。</p>`;
        }
        questionCount.textContent = `顯示 ${filtered.length} / ${allQuestions.length} 道題目`;
    }

    function updateScoreboard() {
        answeredCountEl.textContent = score.answered;
        correctCountEl.textContent = score.correct;
        accuracyRateEl.textContent = `${score.answered > 0 ? Math.round((score.correct / score.answered) * 100) : 0}%`;
    }
    
    function handleAnswer(card, optionBtn, isTest) {
        if (card.classList.contains('answered')) return;
        card.classList.add('answered');

        const questionId = card.dataset.questionId;
        const question = (isTest ? testState.questions : allQuestions).find(q => q.id === questionId);
        const selectedAnswer = optionBtn.dataset.option;
        const isCorrect = selectedAnswer === question.answer;
        
        playSound(isCorrect);

        if (isCorrect) {
            score.correct++;
            achievementTrackers.consecutiveCorrect++;
            optionBtn.classList.add('correct');
            addXP(xpRewards[question.difficulty] || 5);
        } else {
            achievementTrackers.consecutiveCorrect = 0;
            optionBtn.classList.add('incorrect');
            const correctOption = card.querySelector(`.option-btn[data-option="${question.answer}"]`);
            if (correctOption) correctOption.classList.add('correct');
        }

        if (!isTest) {
            score.answered++;
            updateScoreboard();
        }
        
        checkAchievements();
        card.querySelectorAll('.option-btn').forEach(btn => btn.classList.add('answered'));
        card.querySelector('.card-answer').classList.add('show');

        if (isTest) {
            testState.userAnswers.push({ questionId: question.id, selected: selectedAnswer });
            nextQuestionBtn.textContent = (testState.currentIndex < testState.questions.length - 1) ? '下一題' : '完成測驗';
            nextQuestionBtn.classList.remove('hidden');
        }
    }

    function startTest(questionSource) {
        if (questionSource.length < 20) {
            showNotification('&#128681;', '無法開始', `該範圍題目不足20題 (${questionSource.length}/20)，請擴大篩選範圍。`);
            return;
        }
        testState.questions = [...questionSource].sort(() => 0.5 - Math.random()).slice(0, 20);
        testState.userAnswers = [];
        testState.currentIndex = 0;
        switchMode('test');
        renderTestQuestion();
    }

    function renderTestQuestion() {
        testQuestionContainer.innerHTML = '';
        nextQuestionBtn.classList.add('hidden');
        const question = testState.questions[testState.currentIndex];
        testProgressEl.textContent = `第 ${testState.currentIndex + 1} / ${testState.questions.length} 題`;
        testQuestionContainer.appendChild(createQuestionCard(question));
    }

    function nextQuestion() {
        if (testState.currentIndex < testState.questions.length - 1) {
            testState.currentIndex++;
            renderTestQuestion();
        } else {
            showResults();
        }
    }

    function showResults() {
        const correctCount = testState.userAnswers.filter((ans, i) => ans.selected === testState.questions[i].answer).length;
        testState.finalScore = correctCount * 5;
        finalScoreEl.textContent = testState.finalScore;
        finalSummaryEl.textContent = `您答對了 ${correctCount} 題，答錯 ${20 - correctCount} 題。`;
        document.getElementById('leaderboard-form-container').style.display = 'block';
        leaderboardForm.reset();
        renderResults();
        switchMode('results');
    }

    function renderResults() {
        resultsContainer.innerHTML = testState.questions.map((q, i) => {
            const userAnswer = testState.userAnswers[i];
            const isCorrect = userAnswer.selected === q.answer;
            const optionsHTML = q.options.map(opt => {
                let c = 'option-btn border border-slate-300 p-3 rounded-lg mb-2';
                if (opt.letter === q.answer) c += ' correct';
                if (opt.letter === userAnswer.selected && !isCorrect) c += ' incorrect';
                return `<div class="${c}" data-option="${opt.letter}"><span class="font-bold mr-2">${opt.letter}.</span> ${opt.text}</div>`;
            }).join('');
            return `
                <div class="review-card bg-white rounded-xl shadow-md p-6 flex flex-col border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}">
                    <div class="flex-grow">
                        <h4 class="font-bold text-slate-800 mb-3">${q.id}: ${q.question}</h4>
                        <div class="options-container">${optionsHTML}</div>
                    </div>
                    <div class="review-answer show mt-4 pt-4 border-t border-slate-200">
                        <p class="font-bold text-green-600 mb-2">答案：${q.answer}</p>
                        <p class="text-sm text-slate-500">${q.explanation}</p>
                    </div>
                </div>`;
        }).join('');
    }

    function createQuestionCard(q) {
        const card = document.createElement('div');
        card.className = 'card bg-white rounded-xl shadow-md p-6 flex flex-col';
        card.dataset.questionId = q.id;
        const categoryDisplay = q.resortName && q.resortName !== 'N/A' ? `${q.resortName}｜${q.category}` : q.category;
        card.innerHTML = `
            <div class="flex-grow">
                <div class="flex justify-between items-start mb-2 gap-2 flex-wrap">
                    <div>
                        <span class="text-sm font-semibold text-sky-600">${categoryDisplay}</span>
                        ${q.casiLevel && q.casiLevel !== 'N/A' ? `<span class="ml-2 text-sm font-semibold text-purple-600">${q.casiLevel}</span>` : ''}
                    </div>
                    <span class="px-2 py-1 text-xs font-bold rounded-full ${q.difficulty === '易' ? 'bg-green-100 text-green-800' : q.difficulty === '中' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">${q.difficulty}</span>
                </div>
                <h4 class="font-bold text-slate-800 my-3">${q.id}</h4>
                <p class="text-slate-600 mb-4">${q.question}</p>
                <div class="options-container">${q.options.map(opt => `
                    <div class="option-btn border border-slate-300 p-3 rounded-lg mb-2" data-option="${opt.letter}">
                       <span class="font-bold mr-2">${opt.letter}.</span> ${opt.text}
                    </div>`).join('')}
                </div>
            </div>
            <div class="card-answer mt-4 pt-4 border-t border-slate-200" style="max-height:0; opacity:0; overflow:hidden;">
                <p class="font-bold text-green-600 mb-2">答案：${q.answer}</p>
                <p class="text-sm text-slate-500">${q.explanation}</p>
            </div>`;
        return card;
    }

    function updateActiveButtons() {
        document.querySelectorAll('.quiz-btn, .filter-btn').forEach(btn => {
            const type = btn.dataset.quiz ? 'quiz' : (btn.dataset.filterType || '');
            const value = btn.dataset.quiz || btn.dataset.filterValue;
            let isActive = (type === 'quiz') ? (currentQuizType === value) : (currentFilters[type] === value);
            btn.classList.toggle('active', isActive);
        });
    }
    
    function handleFilterClick(event) {
        const target = event.target.closest('.filter-btn');
        if (!target) return;
        currentFilters[target.dataset.filterType] = target.dataset.filterValue;
        updateActiveButtons();
        renderPracticeQuestions();
    }

    function resetPractice() {
        score = { answered: 0, correct: 0 };
        achievementTrackers.consecutiveCorrect = 0;
        updateScoreboard();
        currentFilters = { difficulty: '全部', category: '全部', casiLevel: '全部', resort: '全部' };
        if (allQuestions.length > 0) {
            updateFilterButtons();
            renderPracticeQuestions();
        } else {
            questionsContainer.innerHTML = '';
            questionCount.textContent = '請先選擇一個題庫';
            [difficultyFiltersContainer, categoryFiltersContainer, resortFiltersContainer, casiLevelFiltersContainer].forEach(c => c.innerHTML = '');
        }
        switchMode('practice');
    }
    
    function initializeUI(markdownText) {
        console.log("Initializing UI with new markdown data...");
        allQuestions = parseMarkdownTable(markdownText);
        console.log(`Parsed ${allQuestions.length} questions.`);
        if (allQuestions.length === 0) {
            console.warn("Warning: No questions were parsed from the markdown. Check the format.");
        }
        resetPractice();
    }
    
    async function handleQuizSelection(event) {
        const target = event.target.closest('.quiz-btn');
        if (!target) return;

        const quizKey = target.dataset.quiz;
        currentQuizType = quizKey; // Update currentQuizType for active button styling
        updateActiveButtons(); // Update active button styling

        if (quizKey === 'resort') {
            // Parse and combine questions from all resort MDs
            const karuizawaQuestions = parseMarkdownTable(quizData['karuizawa']);
            const kamuiQuestions = parseMarkdownTable(quizData['kamui']);
            allQuestions = [...karuizawaQuestions, ...kamuiQuestions]; // Directly set allQuestions
            console.log(`Loaded combined resort questions. Total: ${allQuestions.length}`);
            resetPractice(); // Reset filters and render
        } else if (quizData.hasOwnProperty(quizKey)) {
            const content = quizData[currentQuizType];
            initializeUI(content); // This will parse the markdown and set allQuestions
        } else {
            console.error(`Attempted to select a quiz with an unknown key: ${quizKey}`);
        }
    }

    // --- EVENT LISTENERS ---
    resetBtn.addEventListener('click', resetPractice);
    startFilteredTestBtn.addEventListener('click', () => startTest(getFilteredQuestions()));
    startAllTestBtn.addEventListener('click', () => startTest(allQuestions));
    nextQuestionBtn.addEventListener('click', nextQuestion);
    backToPracticeBtn.addEventListener('click', () => { resetPractice(); switchMode('practice'); });
    exitTestBtn.addEventListener('click', () => { resetPractice(); switchMode('practice'); });
    document.getElementById('filters').addEventListener('click', handleFilterClick);
    quizSelectionContainer.addEventListener('click', handleQuizSelection);
    questionsContainer.addEventListener('click', e => {
        const optionBtn = e.target.closest('.option-btn');
        if (optionBtn) handleAnswer(optionBtn.closest('.card'), optionBtn, false);
    });
    testQuestionContainer.addEventListener('click', e => {
        const optionBtn = e.target.closest('.option-btn');
        if (optionBtn) handleAnswer(optionBtn.closest('.card'), optionBtn, true);
    });
    achievementsBtn.addEventListener('click', () => {
        renderAchievements();
        achievementsModal.classList.remove('hidden');
    });
    closeAchievementsBtn.addEventListener('click', () => achievementsModal.classList.add('hidden'));
    leaderboardBtn.addEventListener('click', () => {
        renderLeaderboard();
        leaderboardModal.classList.remove('hidden');
    });
    closeLeaderboardBtn.addEventListener('click', () => leaderboardModal.classList.add('hidden'));
    closeNotificationBtn.addEventListener('click', closeNotification);
    [achievementsModal, leaderboardModal, notificationModal].forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });
    leaderboardForm.addEventListener('submit', e => {
        e.preventDefault();
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            const newEntry = { name: playerName, score: testState.finalScore, date: new Date().toISOString() };
            leaderboardData.push(newEntry);
            leaderboardData.sort((a, b) => b.score - a.score);
            leaderboardData = leaderboardData.slice(0, 10); // Keep top 10
            saveLeaderboard();
            document.getElementById('leaderboard-form-container').style.display = 'none';
            showNotification('&#127942;', '儲存成功', `你的成績已成功登上排行榜！`);
        }
    });
    shareResultsBtn.addEventListener('click', shareResults);

    // --- INITIAL LOAD ---
    window.addEventListener('load', async () => {
        setupAudio();
        loadUserProgress();
        loadLeaderboard();
        await fetchQuizData();
        // The default quiz is now loaded inside fetchQuizData
    });
});