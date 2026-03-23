document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const p1Zone = document.getElementById('player1-zone');
    const p2Zone = document.getElementById('player2-zone');
    const p1Tray = document.getElementById('p1-dice-tray');
    const p2Tray = document.getElementById('p2-dice-tray');
    const p1TotalEl = document.getElementById('p1-total');
    const p2TotalEl = document.getElementById('p2-total');
    const p1ScoreEl = document.getElementById('p1-score');
    const p2ScoreEl = document.getElementById('p2-score');
    const p1DisplayName = document.getElementById('p1-display-name');
    const p2DisplayName = document.getElementById('p2-display-name');
    const roundCounter = document.getElementById('round-counter');
    
    const rollBtn = document.getElementById('roll-btn');
    const resetBtn = document.getElementById('reset-btn');
    const matchStatus = document.getElementById('match-status');
    const rollSound = document.getElementById('roll-sound');
    
    const modeBtns = document.querySelectorAll('.mode-btn');
    const diceBtns = document.querySelectorAll('.dice-btn');
    const dashTabs = document.querySelectorAll('.dash-tab');
    
    // Modal Elements
    const nameModal = document.getElementById('name-modal');
    const p1Input = document.getElementById('p1-input');
    const p2Input = document.getElementById('p2-input');
    const startBattleBtn = document.getElementById('start-battle-btn');
    
    // State
    let gameMode = 'solo'; 
    let currentPlayer = 1;
    let currentDiceType = 'd6';
    let p1Roll = 0, p2Roll = 0;
    let p1Wins = 0, p2Wins = 0;
    let matchHistory = [];
    
    // Championship State
    let champRound = 1;
    let p1TotalScore = 0;
    let p2TotalScore = 0;
    let totalRollsInRound = 0; 

    // --- DSA SECTION (Restored) ---
    let memo = {};
    function countWays(n, s, target) {
        if (target < n || target > n * s) return 0;
        if (n === 1) return (target >= 1 && target <= s) ? 1 : 0;
        const key = `${n}-${target}`;
        if (memo[key] !== undefined) return memo[key];
        let ways = 0;
        for (let i = 1; i <= s; ++i) ways += countWays(n - 1, s, target - i);
        return memo[key] = ways;
    }
    
    // --- STATISTICS LAYER (Chart.js) ---
    let rollStats = new Array(21).fill(0); 
    let rollChart = null;

    function initChart() {
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js not loaded. Statistics will be disabled.");
            return;
        }
        const chartEl = document.getElementById('roll-chart');
        if (!chartEl) return;
        const ctx = chartEl.getContext('2d');
        rollChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 6}, (_, i) => i + 1),
                datasets: [{
                    label: 'Roll Frequency',
                    data: new Array(6).fill(0),
                    backgroundColor: 'rgba(139, 92, 246, 0.6)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function updateChart(val) {
        if (!rollChart) return;
        rollStats[val]++;
        const sideMax = parseInt(currentDiceType.substring(1));
        
        if (rollChart.data.labels.length !== sideMax) {
            rollChart.data.labels = Array.from({length: sideMax}, (_, i) => i + 1);
        }
        
        const newData = [];
        for(let i=1; i<=sideMax; i++) newData.push(rollStats[i]);
        
        rollChart.data.datasets[0].data = newData;
        rollChart.update();
    }

    // --- PLAYER HISTORY LAYER ---
    let players = JSON.parse(localStorage.getItem('dicePlayers') || '{}');

    function savePlayerWin(name) {
        if (!name || name === 'Player 1' || name === 'Player 2') return;
        players[name] = (players[name] || 0) + 1;
        localStorage.setItem('dicePlayers', JSON.stringify(players));
        updatePlayersUI();
    }

    function updatePlayersUI() {
        const list = document.getElementById('player-history-list');
        if (!list) return;
        const sorted = Object.entries(players).sort((a,b) => b[1] - a[1]);
        
        if (sorted.length === 0) {
            list.innerHTML = '<div class="empty-history">No players registered</div>';
            return;
        }
        
        list.innerHTML = sorted.map(([name, wins]) => `
            <div class="player-entry">
                <span class="player-tag">${name}</span>
                <span class="player-wins">${wins} Wins</span>
            </div>
        `).join('');
    }

    // --- CORE LOGIC ---

    function updateMatchStatus(msg, color = 'white') {
        if (matchStatus) {
            matchStatus.textContent = msg;
            matchStatus.style.color = color;
        }
    }

    function clearArena() {
        p1Tray.innerHTML = '<div class="empty-state">Waiting...</div>';
        p2Tray.innerHTML = '<div class="empty-state">Waiting...</div>';
        p1TotalEl.textContent = '0';
        p2TotalEl.textContent = '0';
        p1Zone.classList.remove('winner', 'active');
        p2Zone.classList.remove('winner', 'active');
        
        if (gameMode === 'solo') {
            currentPlayer = 1;
            p1Zone.classList.add('active');
            updateMatchStatus("Solo Practice Mode");
            roundCounter.style.display = 'none';
        } else if (gameMode === 'battle') {
            currentPlayer = 1;
            p1Zone.classList.add('active');
            updateMatchStatus(`${p1DisplayName.textContent}'s Turn`);
            roundCounter.style.display = 'none';
        } else if (gameMode === 'champ') {
            currentPlayer = 1;
            champRound = 1;
            p1TotalScore = 0;
            p2TotalScore = 0;
            totalRollsInRound = 0;
            p1Zone.classList.add('active');
            updateRoundUI();
            updateMatchStatus(`${p1DisplayName.textContent}'s Turn (Round 1)`);
        }
    }

    function updateRoundUI() {
        if (roundCounter) {
            roundCounter.textContent = `ROUND ${champRound}/5`;
            roundCounter.style.display = 'block';
        }
    }

    async function rollDice() {
        const tray = currentPlayer === 1 ? p1Tray : p2Tray;
        const totalEl = currentPlayer === 1 ? p1TotalEl : p2TotalEl;
        const zone = currentPlayer === 1 ? p1Zone : p2Zone;
        const name = currentPlayer === 1 ? p1DisplayName.textContent : p2DisplayName.textContent;
        
        tray.innerHTML = '';
        rollBtn.disabled = true;
        updateMatchStatus(`${name} rolling...`, 'var(--primary)');
        
        if (rollSound) {
            rollSound.currentTime = 0;
            rollSound.play().catch(() => {});
        }

        const sideMax = parseInt(currentDiceType.substring(1));
        const rollResult = Math.floor(Math.random() * sideMax) + 1;
        
        updateChart(rollResult);

        const dice = document.createElement('div');
        dice.className = `dice ${currentDiceType}`;
        if (currentDiceType === 'd6') {
            dice.innerHTML = `<div class="face front">1</div><div class="face back">6</div><div class="face right">3</div><div class="face left">4</div><div class="face top">5</div><div class="face bottom">2</div>`;
        } else {
            dice.innerHTML = `<div class="face single">${rollResult}</div>`;
        }
        tray.appendChild(dice);

        const rotations = { 1: 'rotateX(0deg) rotateY(0deg)', 2: 'rotateX(-90deg) rotateY(0deg)', 3: 'rotateX(0deg) rotateY(-90deg)', 4: 'rotateX(0deg) rotateY(90deg)', 5: 'rotateX(90deg) rotateY(0deg)', 6: 'rotateX(180deg) rotateY(0deg)' };

        setTimeout(() => {
            if (currentDiceType === 'd6') dice.style.transform = rotations[rollResult];
            else dice.style.transform = 'rotateX(360deg) rotateY(360deg)';
            
            if (gameMode === 'champ') {
                if (currentPlayer === 1) {
                    p1TotalScore += rollResult;
                    p1TotalEl.textContent = p1TotalScore;
                    currentPlayer = 2;
                    p1Zone.classList.remove('active');
                    p2Zone.classList.add('active');
                    updateMatchStatus(`${p2DisplayName.textContent}'s Turn`, '#ec4899');
                    rollBtn.disabled = false;
                } else {
                    p2TotalScore += rollResult;
                    p2TotalEl.textContent = p2TotalScore;
                    if (champRound < 5) {
                        champRound++;
                        currentPlayer = 1;
                        p2Zone.classList.remove('active');
                        p1Zone.classList.add('active');
                        updateRoundUI();
                        updateMatchStatus(`${p1DisplayName.textContent}'s Turn`, '#8b5cf6');
                        rollBtn.disabled = false;
                    } else {
                        determineWinner();
                    }
                }
            } else if (gameMode === 'battle') {
                totalEl.textContent = rollResult;
                if (currentPlayer === 1) {
                    p1Roll = rollResult;
                    currentPlayer = 2;
                    p1Zone.classList.remove('active');
                    p2Zone.classList.add('active');
                    updateMatchStatus(`${p2DisplayName.textContent}'s Turn`, '#ec4899');
                    rollBtn.disabled = false;
                } else {
                    p2Roll = rollResult;
                    determineWinner();
                }
            } else {
                totalEl.textContent = rollResult;
                updateMatchStatus("Roll Complete!");
                rollBtn.disabled = false;
            }
        }, 1000);
    }

    function determineWinner() {
        p2Zone.classList.remove('active');
        let winMsg = "";
        let winnerNum = 0;
        let p1Final = gameMode === 'champ' ? p1TotalScore : p1Roll;
        let p2Final = gameMode === 'champ' ? p2TotalScore : p2Roll;

        if (p1Final > p2Final) {
            winMsg = `${p1DisplayName.textContent.toUpperCase()} WINS!`;
            p1Zone.classList.add('winner');
            p1Wins++;
            p1ScoreEl.textContent = p1Wins;
            winnerNum = 1;
            savePlayerWin(p1DisplayName.textContent);
        } else if (p2Final > p1Final) {
            winMsg = `${p2DisplayName.textContent.toUpperCase()} WINS!`;
            p2Zone.classList.add('winner');
            p2Wins++;
            p2ScoreEl.textContent = p2Wins;
            winnerNum = 2;
            savePlayerWin(p2DisplayName.textContent);
        } else {
            winMsg = "IT'S A DRAW!";
        }

        updateMatchStatus(winMsg, winnerNum === 1 ? '#8b5cf6' : (winnerNum === 2 ? '#ec4899' : '#fbbf24'));
        addHistoryEntry(winMsg, `${p1Final} vs ${p2Final}`);
        
        rollBtn.disabled = false;
        rollBtn.textContent = "NEW MATCH";
        rollBtn.onclick = () => {
            clearArena();
            rollBtn.textContent = "ROLL DICE";
            rollBtn.onclick = rollDice;
        };
    }

    function addHistoryEntry(result, score) {
        const entry = { result, score, time: new Date().toLocaleTimeString() };
        matchHistory.unshift(entry);
        if (matchHistory.length > 10) matchHistory.pop();
        updateHistoryUI();
    }

    function updateHistoryUI() {
        const list = document.getElementById('match-history-list');
        if (!list) return;
        if (matchHistory.length === 0) {
            list.innerHTML = '<div class="empty-history">No matches yet</div>';
            return;
        }
        list.innerHTML = matchHistory.map(e => `
            <div class="history-entry">
                <div class="entry-label"><strong>${e.result}</strong><br>${e.time}</div>
                <div class="entry-value">${e.score}</div>
            </div>
        `).join('');
    }

    // --- DASHBOARD TABS ---
    dashTabs.forEach(tab => tab.addEventListener('click', () => {
        dashTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        ['history', 'stats', 'players', 'lab'].forEach(id => {
            const el = document.getElementById(`dash-${id}`);
            if (el) el.style.display = target === id ? 'block' : 'none';
        });
    }));

    // --- LISTENERS ---

    if (rollBtn) rollBtn.onclick = rollDice;

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            p1Wins = 0; p2Wins = 0;
            p1ScoreEl.textContent = 0;
            p2ScoreEl.textContent = 0;
            matchHistory = [];
            updateHistoryUI();
            clearArena();
        });
    }

    modeBtns.forEach(btn => btn.addEventListener('click', () => {
        const mode = btn.id.split('-')[1];
        if (mode === 'champ' || mode === 'battle') {
            nameModal.classList.add('show');
            gameMode = mode;
        } else {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameMode = 'solo';
            p1DisplayName.textContent = "Player 1";
            p2DisplayName.textContent = "Player 2";
            clearArena();
        }
    }));

    if (startBattleBtn) {
        startBattleBtn.addEventListener('click', () => {
            const n1 = p1Input.value.trim() || "Player 1";
            const n2 = p2Input.value.trim() || "Player 2";
            p1DisplayName.textContent = n1;
            p2DisplayName.textContent = n2;
            nameModal.classList.remove('show');
            
            modeBtns.forEach(b => b.classList.remove('active'));
            const modeEl = document.getElementById(`mode-${gameMode}`);
            if (modeEl) modeEl.classList.add('active');
            clearArena();
        });
    }

    diceBtns.forEach(btn => btn.addEventListener('click', () => {
        diceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDiceType = btn.dataset.type;
        // Reset chart for new dice type
        rollStats = new Array(21).fill(0);
        if (rollChart) {
            const sideMax = parseInt(currentDiceType.substring(1));
            rollChart.data.labels = Array.from({length: sideMax}, (_, i) => i + 1);
            rollChart.data.datasets[0].data = new Array(sideMax).fill(0);
            rollChart.update();
        }
    }));

    const labCalcBtn = document.getElementById('lab-calc');
    if (labCalcBtn) {
        labCalcBtn.addEventListener('click', () => {
            const n = parseInt(document.getElementById('lab-n').value);
            const t = parseInt(document.getElementById('lab-target').value);
            const s = parseInt(currentDiceType.substring(1));
            memo = {};
            const ways = countWays(n, s, t);
            const prob = ((ways / Math.pow(s, n)) * 100).toFixed(4);
            const resultEl = document.getElementById('lab-result');
            if (resultEl) resultEl.textContent = `Result: ${prob}% (${ways} ways)`;
        });
    }

    // Initialize
    initChart();
    updatePlayersUI();
    clearArena();
});
