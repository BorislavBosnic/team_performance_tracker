// script.js - Updated for Netlify Functions + Supabase Backend

document.addEventListener('DOMContentLoaded', () => {
    console.log("--- DOMContentLoaded fired ---");
    // --- DOM Elements ---
    const playersContainer = document.getElementById('players-container');
    const winnerInfoElement = document.getElementById('winner-info');
    const resetAllButton = document.getElementById('reset-all-btn');
    const resetFeedbackElement = document.getElementById('reset-feedback');
    const addPlayerForm = document.getElementById('add-player-form');
    const addPlayerFeedbackElement = document.getElementById('add-player-feedback');

    // --- Configuration ---
    const MAX_SCORE_FOR_BAR = 100;
    // ADMIN_PASSWORD is now only used/checked in the backend Netlify Function
    const PRIZE_POOL_AMOUNT = 50.00;

    // --- Global State ---
    let players = []; // Array: [ { id: 'uuid', name: '...', avatar_url: '...', score: ... }, ... ]
    let isLoading = true;

    // --- API Endpoints (Netlify Functions) ---
    const API_BASE = '/.netlify/functions';
    const GET_PLAYERS_URL = `${API_BASE}/get-players`;
    const ADD_PLAYER_URL = `${API_BASE}/add-player`;
    const UPDATE_SCORE_URL = `${API_BASE}/update-score`; // Expects { playerId, newScore }
    const DELETE_PLAYER_URL = `${API_BASE}/delete-player`; // Expects { playerId }
    const RESET_SCORES_URL = `${API_BASE}/reset-scores`; // Expects { password }

    // --- Helper Functions ---

    function setLoadingState(loading, message = "Loading...") {
        isLoading = loading;
        document.body.style.cursor = loading ? 'wait' : 'default';
        if (loading && playersContainer) {
            playersContainer.innerHTML = `<p class="loading-message">${message}</p>`;
        }
        // Check if container exists before trying to query inside it
        const containerExists = playersContainer && playersContainer.parentNode;

        if (!loading && players.length === 0 && containerExists) {
            playersContainer.innerHTML = '<p class="loading-message">No players found. Add one!</p>';
        }

        // Disable/enable forms and buttons during loading
        if (addPlayerForm) {
             addPlayerForm.querySelector('button').disabled = loading;
             addPlayerForm.querySelectorAll('input').forEach(el => el.disabled = loading);
        }
        if (resetAllButton) {
            resetAllButton.disabled = loading;
        }

        // Disable buttons within player cards only if the container exists
        if (containerExists) {
           playersContainer.querySelectorAll('button, input').forEach(el => el.disabled = loading);
        }
    }

    function showFeedback(element, message, isSuccess) {
        if (!element) return; // Safety check
        element.textContent = message;
        element.className = element.id.includes('add-player') ? 'add-player-feedback' : 'reset-feedback';
        element.classList.add(isSuccess ? 'success' : 'error');
        setTimeout(() => {
           if(element.textContent === message) {
               element.textContent = '';
               element.className = element.id.includes('add-player') ? 'add-player-feedback' : 'reset-feedback';
           }
        }, 4000);
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return ''; // Ensure input is a string
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "'");
     }

    // --- Player Card HTML Template ---
    function createPlayerCardHTML(player) {
        // Use the correct column name from Supabase: avatar_url
        const avatarUrl = player.avatar_url || 'placeholder.png';
        const playerName = player.name || 'Unnamed Player';
        const playerScore = typeof player.score === 'number' ? player.score : 0;

        const barWidthPercentage = MAX_SCORE_FOR_BAR > 0
            ? Math.min(100, (playerScore / MAX_SCORE_FOR_BAR) * 100)
            : 0;

        const totalPoints = players.reduce((sum, p) => sum + (p.score || 0), 0);
        let prizeAmount = 0;
        if (totalPoints > 0 && playerScore > 0) {
            prizeAmount = (playerScore / totalPoints) * PRIZE_POOL_AMOUNT;
        }
        const prizeShareText = `$${prizeAmount.toFixed(2)}`;

        // Use player.id (UUID from Supabase)
        const playerIndex = players.findIndex(p => p.id === player.id);
        const barColorClass = playerIndex >= 0 ? `player-${(playerIndex % 3) + 1}-bar` : 'player-1-bar'; // Assign color class dynamically

        return `
            <div class="player-card" data-player-id="${player.id}">
                 <button class="delete-player-btn" aria-label="Delete ${escapeHtml(playerName)}">×</button>
                <div class="player-info">
                    <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(playerName)} Avatar" class="avatar" onerror="this.src='https://via.placeholder.com/55/eeeeee/cccccc?text=N/A'; this.onerror=null;">
                    <h2 class="player-name">${escapeHtml(playerName)}</h2>
                </div>
                <div class="progress-section">
                    <div class="score-display">
                        <div>
                            <span class="score-label">Score:</span>
                            <span class="score-value">${playerScore}</span>
                        </div>
                        <div>
                            <span class="prize-share-label">Prize:</span>
                            <span class="prize-share-value">${prizeShareText}</span>
                        </div>
                    </div>
                    <div class="bar-track">
                         <div class="bar-fill ${barColorClass}" style="width: ${barWidthPercentage}%;"></div>
                    </div>
                </div>
                <div class="controls">
                    <button class="btn btn-decrement" aria-label="Decrease ${escapeHtml(playerName)} Score">-</button>
                    <input type="number" class="points-input" value="1" min="1" aria-label="Points to change for ${escapeHtml(playerName)}">
                    <button class="btn btn-increment" aria-label="Increase ${escapeHtml(playerName)} Score">+</button>
                </div>
                <div class="task-actions">
                    <div class="task-row" data-task-points="1">
                        <span class="task-icon">✉️</span> <span class="task-label">Telegram Post</span>
                        <input type="number" class="task-input" value="1" min="1"> <button class="btn btn-add-task">Add</button>
                    </div>
                     <div class="task-row" data-task-points="1">
                        <span class="task-icon">📱</span> <span class="task-label">IG Story</span>
                        <input type="number" class="task-input" value="1" min="1"> <button class="btn btn-add-task">Add</button>
                    </div>
                    <div class="task-row" data-task-points="3">
                        <span class="task-icon">🔄</span> <span class="task-label">IG Redesign</span>
                        <input type="number" class="task-input" value="1" min="1"> <button class="btn btn-add-task">Add</button>
                    </div>
                    <div class="task-row" data-task-points="7">
                        <span class="task-icon">✨</span> <span class="task-label">IG New Design</span>
                        <input type="number" class="task-input" value="1" min="1"> <button class="btn btn-add-task">Add</button>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Core Rendering Function ---
    function renderPlayerList() {
        if (!playersContainer) return;
        if (isLoading) {
            playersContainer.innerHTML = '<p class="loading-message">Loading...</p>';
            return; // Don't render if loading
        }

        // Sort players by score descending before rendering
        players.sort((a, b) => (b.score || 0) - (a.score || 0));

        if (players.length === 0) {
            playersContainer.innerHTML = '<p class="loading-message">No players yet. Add one above!</p>';
        } else {
            playersContainer.innerHTML = players.map(createPlayerCardHTML).join('');
        }
        calculateAndDisplayPrizes();
        updateWinnerInfo();
        // Ensure controls are enabled after rendering if not loading
        playersContainer.querySelectorAll('button, input').forEach(el => el.disabled = false);
    }

    // --- API Call Functions ---

    async function fetchPlayers() {
    console.log("--- fetchPlayers() function entered ---"); // Add this
        setLoadingState(true, "Fetching players...");
        try {
            const response = await fetch(GET_PLAYERS_URL);
             const responseBody = await response.text(); // Read body first
            if (!response.ok) {
                 // Try to parse error from body, otherwise use status text
                 let errorDetail = response.statusText;
                 try {
                    const errorJson = JSON.parse(responseBody);
                    errorDetail = errorJson.error || errorJson.message || errorDetail;
                 } catch (parseError) { /* Ignore if body is not JSON */ }
                 throw new Error(`HTTP error! Status: ${response.status} - ${errorDetail}`);
            }
             // Parse JSON only if response is ok
             players = JSON.parse(responseBody);
            console.log("Players fetched:", players);
        } catch (error) {
            console.error("Failed to fetch players:", error);
            players = [];
            if (winnerInfoElement) {
                winnerInfoElement.textContent = `Error loading player data: ${error.message}`;
                winnerInfoElement.className = 'winner-announcement error visible';
            }
        } finally {
            setLoadingState(false);
            renderPlayerList();
        }
    }

    async function addPlayer(name, avatarUrl) {
         setLoadingState(true, "Adding player...");
        try {
            const response = await fetch(ADD_PLAYER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, avatarUrl }), // Backend expects these names
            });
             const responseBody = await response.text();
            if (!response.ok) {
                 let errorDetail = response.statusText;
                 try {
                    const errorJson = JSON.parse(responseBody);
                    errorDetail = errorJson.error || errorJson.message || errorDetail;
                 } catch (parseError) { /* Ignore */ }
                 throw new Error(`HTTP ${response.status}: ${errorDetail}`);
            }
            const newPlayer = JSON.parse(responseBody);
            console.log("Player added:", newPlayer);
            showFeedback(addPlayerFeedbackElement, `Player "${escapeHtml(name)}" added!`, true);
            await fetchPlayers(); // Fetch updated list including the new player

        } catch (error) {
             console.error("Failed to add player:", error);
             showFeedback(addPlayerFeedbackElement, `Error: ${error.message}`, false);
             setLoadingState(false);
        }
        // Loading state turned off by fetchPlayers if successful
    }

    async function updateScore(playerId, newScore) {
         const scoreToUpdate = Math.max(0, Math.floor(newScore)); // Ensure non-negative integer
         console.log(`Sending update for player ${playerId} to score ${scoreToUpdate}`);
         // No full loading state, maybe disable specific card controls?
        try {
            const response = await fetch(UPDATE_SCORE_URL, {
                method: 'POST', // Or PUT/PATCH if function handles it
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, newScore: scoreToUpdate }), // Send correct payload
            });
             const responseBody = await response.text();
             if (!response.ok) {
                 let errorDetail = response.statusText;
                 try {
                    const errorJson = JSON.parse(responseBody);
                    errorDetail = errorJson.error || errorJson.message || errorDetail;
                 } catch (parseError) { /* Ignore */ }
                 throw new Error(`HTTP ${response.status}: ${errorDetail}`);
            }
             const updatedPlayer = JSON.parse(responseBody);
             console.log("Score updated successfully for:", updatedPlayer.id);
             // Update local state immediately for faster UI response
             const playerIndex = players.findIndex(p => p.id === playerId);
             if(playerIndex > -1) {
                players[playerIndex].score = updatedPlayer.score;
                renderPlayerList(); // Re-render with updated local data
             } else {
                await fetchPlayers(); // Fallback: refetch if local update fails
             }

        } catch (error) {
            console.error(`Error updating score for ${playerId}:`, error);
            showFeedback(resetFeedbackElement, `Error saving score: ${error.message}`, false);
             // Maybe fetch to resync after error
             await fetchPlayers();
        }
    }

    async function deletePlayer(playerId, playerName) {
         if (!confirm(`Are you sure you want to delete player "${escapeHtml(playerName)}"? This cannot be undone.`)) {
            return;
         }
         setLoadingState(true, `Deleting ${escapeHtml(playerName)}...`);
        try {
            const response = await fetch(DELETE_PLAYER_URL, {
                method: 'POST', // Or DELETE if function handles it
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId }), // Send correct payload
            });
             const responseBody = await response.text();
             if (!response.ok) {
                let errorDetail = response.statusText;
                 try {
                    const errorJson = JSON.parse(responseBody);
                    errorDetail = errorJson.error || errorJson.message || errorDetail;
                 } catch (parseError) { /* Ignore */ }
                 throw new Error(`HTTP ${response.status}: ${errorDetail}`);
             }
            const result = JSON.parse(responseBody);
            console.log("Player delete response:", result.message);
            await fetchPlayers(); // Fetch updated list after successful delete

        } catch (error) {
             console.error(`Failed to delete player ${playerId}:`, error);
             showFeedback(resetFeedbackElement, `Error deleting player: ${error.message}`, false);
             setLoadingState(false); // Ensure loading is off on error
        }
         // Loading state turned off by fetchPlayers if successful
    }

     async function resetAllScores(password) {
        setLoadingState(true, "Resetting scores...");
        try {
            const response = await fetch(RESET_SCORES_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password }), // Send password
            });
            const responseBody = await response.text();
            const result = JSON.parse(responseBody); // Parse JSON regardless of status

            if (!response.ok) {
                 // Use error message from backend if available
                 throw new Error(result.error || `HTTP error! Status: ${response.status}`);
            }

            console.log("Reset scores successful:", result.message);
            showFeedback(resetFeedbackElement, result.message || "Scores reset!", true);
            await fetchPlayers(); // Refresh the list after successful reset

        } catch (error) {
            console.error("Error resetting scores:", error);
            showFeedback(resetFeedbackElement, `Error: ${error.message}`, false);
             // Fetch players even on error to sync state
             await fetchPlayers();
        } finally {
            // setLoadingState(false); // fetchPlayers will turn it off
        }
    }

    // --- Update Calculations (Remain the same) ---
    function calculateAndDisplayPrizes() {
        if (!playersContainer || players.length === 0) return; // Don't calculate if no players/container

        const totalPoints = players.reduce((sum, player) => sum + (player.score || 0), 0);
        players.forEach(player => {
            const playerElement = playersContainer.querySelector(`.player-card[data-player-id="${player.id}"]`);
            if (!playerElement) return;
            const prizeShareElement = playerElement.querySelector('.prize-share-value');
            if (!prizeShareElement) return;

            let prizeAmount = 0;
            if (totalPoints > 0 && (player.score || 0) > 0) {
                prizeAmount = ((player.score || 0) / totalPoints) * PRIZE_POOL_AMOUNT;
            }
            prizeShareElement.textContent = `$${prizeAmount.toFixed(2)}`;
        });
    }

    function updateWinnerInfo() {
        if (!winnerInfoElement) return;
        // Logic remains the same, reads from global 'players' array
        let highestScore = -1;
        let winners = [];
        let totalScore = 0;

        if (players.length === 0) {
             winnerInfoElement.textContent = isLoading ? "Loading..." : "No players yet.";
             winnerInfoElement.className = 'winner-announcement no-scores visible';
             return;
        }

        players.forEach(player => {
            totalScore += (player.score || 0);
            if ((player.score || 0) > highestScore) {
                highestScore = player.score;
                winners = [player];
            } else if ((player.score || 0) === highestScore && highestScore >= 0) {
                 winners.push(player);
            }
        });

         winnerInfoElement.className = 'winner-announcement'; // Reset classes

        if (highestScore < 0 || (highestScore === 0 && totalScore === 0)) {
             winnerInfoElement.textContent = "Start scoring to see who leads!";
             winnerInfoElement.classList.add('no-scores');
        } else if (winners.length === 1) {
             const winner = winners[0];
             winnerInfoElement.textContent = `🏆 ${escapeHtml(winner.name)} is leading with ${highestScore} points!`;
        } else { // Tie condition
             const allTied = winners.length === players.length;
             const winnerNames = winners.map(p => escapeHtml(p.name)).join(' & ');

             if (allTied && players.length > 0) { // Check if there are players before saying all tied
                 winnerInfoElement.textContent = `🔥 It's a tight race! All players tied at ${highestScore}!`;
             } else {
                 winnerInfoElement.textContent = `⚡ Tie between ${winnerNames} at ${highestScore} points!`;
             }
             winnerInfoElement.classList.add('tie');
        }

        // Make visible if not loading or if there's content
        if (!isLoading || winnerInfoElement.textContent !== "Loading...") {
            requestAnimationFrame(() => {
                winnerInfoElement.classList.add('visible');
            });
        }
    }


    // --- Event Listeners ---

    // Event Delegation for Player Card Actions
    if (playersContainer) {
        playersContainer.addEventListener('click', (event) => {
            if (isLoading) return; // Prevent actions while loading/updating

            const target = event.target;
            const playerCard = target.closest('.player-card');
            if (!playerCard) return;

            const playerId = playerCard.dataset.playerId; // Get Supabase UUID
            const player = players.find(p => p.id === playerId);
            if (!player) return;

            let currentScore = player.score || 0;
            let newScore = currentScore;
            let scoreChanged = false;

            // Handle Delete Button
            if (target.closest('.delete-player-btn')) {
                deletePlayer(playerId, player.name); // Call API function
                return; // Stop processing other clicks
            }

            // Handle +/- Buttons
            const controlButton = target.closest('.btn-decrement, .btn-increment');
            if (controlButton) {
                const pointsInputElement = playerCard.querySelector('.points-input');
                let points = parseInt(pointsInputElement.value, 10);
                if (isNaN(points) || points < 1) points = 1;
                pointsInputElement.value = '1';

                if (controlButton.classList.contains('btn-increment')) {
                    newScore += points;
                } else {
                    newScore = Math.max(0, newScore - points);
                }
                scoreChanged = true;
            }
            // Handle Add Task Button
            else {
                const addTaskButton = target.closest('.btn-add-task');
                if (addTaskButton) {
                    const taskRow = addTaskButton.closest('.task-row');
                    if (taskRow) {
                        const taskInputElement = taskRow.querySelector('.task-input');
                        const taskPoints = parseInt(taskRow.dataset.taskPoints, 10);
                        let quantity = parseInt(taskInputElement.value, 10);

                        if (isNaN(quantity) || quantity < 1) quantity = 1;
                        taskInputElement.value = '1';

                        if (!isNaN(taskPoints)) {
                            newScore += taskPoints * quantity;
                            scoreChanged = true;
                        }
                    }
                }
            }

            // If score changed, call the update API function
            if (scoreChanged && newScore !== currentScore) {
                 // Optimistically update UI first for responsiveness
                 const playerIndex = players.findIndex(p => p.id === playerId);
                 if (playerIndex > -1) {
                     players[playerIndex].score = newScore;
                     renderPlayerList(); // Re-render immediately
                 }
                 // Then send update to backend
                updateScore(playerId, newScore);
            }
        });
    } else {
         console.error("Players container not found on page load.");
    }


    // Add Player Form Submission
    if (addPlayerForm) {
        addPlayerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (isLoading) return;

            const nameInput = document.getElementById('new-player-name');
            const avatarInput = document.getElementById('new-player-avatar');
            const name = nameInput.value.trim();
            const avatarUrl = avatarInput.value.trim();

            if (name && avatarUrl) {
                addPlayer(name, avatarUrl); // Call the API function
                nameInput.value = '';
                avatarInput.value = '';
                addPlayerFeedbackElement.textContent = '';
            } else {
                showFeedback(addPlayerFeedbackElement, "Please enter both name and avatar URL.", false);
            }
        });
    } else {
        console.error("Add player form not found on page load.");
    }


    // Reset All Scores Button
    if (resetAllButton) {
        resetAllButton.addEventListener('click', () => {
            if (isLoading || players.length === 0) return;

            if(resetFeedbackElement) resetFeedbackElement.textContent = '';

            const enteredPassword = prompt("Enter admin password to reset scores:"); // Use admin password from env var
            if (enteredPassword === null) {
                showFeedback(resetFeedbackElement, "Reset cancelled.", false);
                return;
            }
            // Password check is done in the backend function now
            resetAllScores(enteredPassword); // Call the function to trigger backend
        });
    } else {
         console.error("Reset button not found on page load.");
    }


    // --- Initial Load ---
    fetchPlayers(); // Load initial data when the page loads

});
