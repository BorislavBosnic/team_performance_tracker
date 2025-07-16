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
    const channelsContainer = document.getElementById('channels-container'); // NEW: Get channels container

    // --- Configuration ---
    const MAX_SCORE_FOR_BAR = 100;
    const MAX_MESSAGES_FOR_BAR = 20; // NEW: Define max messages for channel progress bar
    // ADMIN_PASSWORD is now only used/checked in the backend Netlify Function
    const PRIZE_POOL_AMOUNT = 50.00;

    // --- Global State ---
    let players = []; // Array: [ { id: 'uuid', name: '...', avatar_url: '...', score: ... }, ... ]
    let channels = []; // NEW: Array to store channel data
    let isLoading = true;

    // --- API Endpoints (Netlify Functions) ---
    const API_BASE = '/.netlify/functions';
    const GET_PLAYERS_URL = `${API_BASE}/get-players`;
    const ADD_PLAYER_URL = `${API_BASE}/add-player`;
    const UPDATE_SCORE_URL = `${API_BASE}/update-score`; // Expects { playerId, newScore }
    const DELETE_PLAYER_URL = `${API_BASE}/delete-player`; // Expects { playerId }
    const RESET_SCORES_URL = `${API_BASE}/reset-scores`; // Expects { password }
    const GET_CHANNELS_URL = `${API_BASE}/get-channels`; // NEW: Get channels URL

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

        // NEW: Handle loading state for channels container
        if (channelsContainer) { // Check if element exists before manipulating
            if (loading) {
                channelsContainer.innerHTML = `<p class="loading-message">${message}</p>`;
            } else if (channels.length === 0) {
                channelsContainer.innerHTML = '<p class="loading-message">No channel data found.</p>';
            }
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
    // NEW: Channel Card HTML Template (UPDATED)
    function createChannelCardHTML(channel) {
        const channelName = escapeHtml(channel.username || 'Unnamed Channel');
        const messageCount = typeof channel.scheduled_messages_count === 'number' ? channel.scheduled_messages_count-1 : 0;
    
        const barWidthPercentage = MAX_MESSAGES_FOR_BAR > 0
            ? Math.min(100, (messageCount / MAX_MESSAGES_FOR_BAR) * 100)
            : 0;
    
        // Determine the color gradient based on progress
        let barGradientStyle;
        if (barWidthPercentage < 50) {
            // Red gradient (similar to player-1-bar)
            barGradientStyle = 'background-image: linear-gradient(to right, #e74c3c, #c0392b); background-color: #e74c3c;';
        } else if (barWidthPercentage < 100) {
            // Yellow/Orange gradient (similar to player-3-bar)
            barGradientStyle = 'background-image: linear-gradient(to right, #f1c40f, #f39c12); background-color: #f1c40f;';
        } else {
            // Green gradient (similar to player-2-bar)
            barGradientStyle = 'background-image: linear-gradient(to right, #2ecc71, #27ae60); background-color: #2ecc71;';
        }
    
        return `
            <div class="channel-card">
                <h3 class="channel-name">@${channelName}</h3>
                <div class="message-count-display">
                    <span class="message-count-value">${messageCount}</span>
                    <span class="message-count-label">/ ${MAX_MESSAGES_FOR_BAR} messages scheduled</span>
                </div>
                <div class="channel-bar-track">
                    <div class="channel-bar-fill" style="width: ${barWidthPercentage}%; ${barGradientStyle}"></div>
                </div>
            </div>
        `;
    }

    // --- Core Rendering Function ---
    function renderPlayerList() {
        if (!playersContainer) return;
        if (isLoading && players.length === 0) { // Only show loading if actually loading and no data yet
            playersContainer.innerHTML = '<p class="loading-message">Loading players...</p>';
            // return; // Don't return if data might be partially loaded
        }

        // Sort players by score descending before rendering
        players.sort((a, b) => (b.score || 0) - (a.score || 0));

        if (players.length === 0 && !isLoading) { // Show "No players" only if not loading and empty
            playersContainer.innerHTML = '<p class="loading-message">No players yet. Add one to DB!</p>';
        } else if (players.length > 0) {
            playersContainer.innerHTML = players.map(createPlayerCardHTML).join('');
        }
        calculateAndDisplayPrizes();
        updateWinnerInfo();
        // Ensure controls are enabled after rendering if not loading
        playersContainer.querySelectorAll('button, input').forEach(el => el.disabled = false);
    }

    // NEW: Core Rendering Function for Channels (UPDATED)
    function renderChannels() {
        if (!channelsContainer) return;
        if (isLoading && channels.length === 0) { // Only show loading if actually loading and no data yet
            channelsContainer.innerHTML = '<p class="loading-message">Loading channels...</p>';
            // return; // Don't return if data might be partially loaded
        }

        if (channels.length === 0 && !isLoading) { // Show "No channels" only if not loading and empty
            channelsContainer.innerHTML = '<p class="loading-message">No channels found.</p>';
        } else if (channels.length > 0) {
            // Sort channels by message count descending
            channels.sort((a, b) => (b.scheduled_messages_count || 0) - (a.scheduled_messages_count || 0));
            channelsContainer.innerHTML = channels.map(createChannelCardHTML).join('');
        }
    }


    // --- API Call Functions ---

    async function fetchPlayers() {
        console.log("--- fetchPlayers() function entered ---");
        setLoadingState(true, "Fetching data..."); // Unified loading message for both fetches
        try {
            const response = await fetch(GET_PLAYERS_URL);
            const responseBody = await response.text();
            if (!response.ok) {
                 let errorDetail = response.statusText;
                 try {
                    const errorJson = JSON.parse(responseBody);
                    errorDetail = errorJson.error || errorJson.message || errorDetail;
                 } catch (parseError) { /* Ignore if body is not JSON */ }
                 throw new Error(`HTTP error! Status: ${response.status} - ${errorDetail}`);
            }
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
            // setLoadingState(false); // Only set to false after BOTH fetches are complete
            renderPlayerList();
        }
    }

    // NEW: Fetch Channels Function
    async function fetchChannels() {
        console.log("--- fetchChannels() function entered ---");
        setLoadingState(true, "Fetching data..."); // Unified loading message for both fetches
        try {
            const response = await fetch(GET_CHANNELS_URL);
            const responseBody = await response.text();
            if (!response.ok) {
                let errorDetail = response.statusText;
                try {
                    const errorJson = JSON.parse(responseBody);
                    errorDetail = errorJson.error || errorJson.message || errorDetail;
                } catch (parseError) { /* Ignore */ }
                throw new Error(`HTTP error! Status: ${response.status} - ${errorDetail}`);
            }
            channels = JSON.parse(responseBody);
            console.log("Channels fetched:", channels);
        } catch (error) {
            console.error("Failed to fetch channels:", error);
            channels = [];
            if (channelsContainer) {
                channelsContainer.innerHTML = `<p class="loading-message error">Error loading channel data: ${error.message}</p>`;
            }
        } finally {
            // setLoadingState(false); // Only set to false after BOTH fetches are complete
            renderChannels(); // Render channels after fetching
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

       // --- Event Listeners ---

    // ** Event Delegation for Player Card Actions **
    if (playersContainer) {
        playersContainer.addEventListener('click', (event) => {
            // Log 1: Check if listener fires at all and isLoading state
            console.log(`Click detected inside container. isLoading: ${isLoading}`);

            if (isLoading) {
                console.log("Action prevented because isLoading is true.");
                return; // Prevent actions while loading/updating
            }

            const target = event.target;
            // Log 2: See exactly what was clicked
            console.log("Clicked element:", target);

            // Find the player card associated with the click
            const playerCard = target.closest('.player-card');
            // Log 3: Check if player card was found
            console.log("Found player card:", playerCard);

            if (!playerCard) {
                console.log("Click was not inside a player card element.");
                return; // Click wasn't inside a player card we care about
            }

            const playerIdString = playerCard.dataset.playerId; // Get the ID as a string
            // Log 4: Check if player ID was retrieved (as string)
            console.log(`Retrieved player ID string: ${playerIdString}`);
            
            // Player IDs from Supabase are typically UUIDs (strings), not numbers.
            // Change parseInt to just use the string directly if your Supabase 'id' column is a UUID.
            // If it's an integer ID, then parseInt is correct. Assuming UUID for 'id' as per typical Supabase setups.
            const playerId = playerIdString; 
            console.log(playerId)
            // if (!playerId) {
            //     console.error("Could not retrieve player ID from data attribute:", playerIdString);
            //     return; 
            // }


            const player = players.find(p => p.id == playerId);
             // Log 5: Check if player data was found in the local array
             console.log("Found player data:", player);

            if (!player) {
                 console.error(`Could not find local player data for ID: ${playerId}. Sync issue?`);
                 return;
            }

            let currentScore = player.score || 0;
            let newScore = currentScore;
            let scoreChanged = false;

            // Handle Delete Button
            const deleteButton = target.closest('.delete-player-btn');
            if (deleteButton) {
                 // Log 6a: Confirm delete button logic reached
                 console.log(`Delete button clicked for player ID: ${playerId}`);
                 deletePlayer(playerId, player.name); // Call API function
                 return; // Stop processing other clicks for this event
            }

            // Handle +/- Buttons
            const controlButton = target.closest('.btn-decrement, .btn-increment');
            if (controlButton) {
                 // Log 6b: Confirm +/- button logic reached
                 console.log(`Control button clicked for player ID: ${playerId}`, controlButton.className);
                const pointsInputElement = playerCard.querySelector('.points-input');
                let points = parseInt(pointsInputElement.value, 10);
                if (isNaN(points) || points < 1) points = 1;
                pointsInputElement.value = '1'; // Reset input

                if (controlButton.classList.contains('btn-increment')) {
                    newScore += points;
                } else { // Decrement
                    newScore = Math.max(0, newScore - points);
                }
                scoreChanged = true;
            }
            // Handle Add Task Button
            else { // Use 'else' because it can't be both +/- and Add Task
                const addTaskButton = target.closest('.btn-add-task');
                if (addTaskButton) {
                    // Log 6c: Confirm Add Task button logic reached
                    console.log(`Add Task button clicked for player ID: ${playerId}`);
                    const taskRow = addTaskButton.closest('.task-row');
                    if (taskRow) {
                        const taskInputElement = taskRow.querySelector('.task-input');
                        const taskPoints = parseInt(taskRow.dataset.taskPoints, 10);
                        let quantity = parseInt(taskInputElement.value, 10);

                        if (isNaN(quantity) || quantity < 1) quantity = 1;
                        taskInputElement.value = '1'; // Reset input

                        if (!isNaN(taskPoints)) {
                            newScore += taskPoints * quantity;
                            scoreChanged = true;
                        } else {
                            console.warn("Task points data attribute missing or invalid.");
                        }
                    } else {
                         console.warn("Could not find parent .task-row for Add Task button.");
                    }
                }
            } // End Add Task Button check

            // If score changed, call the update API function
            if (scoreChanged && newScore !== currentScore) {
                // Log 7: Confirm score update is being triggered
                console.log(`Score changed from ${currentScore} to ${newScore}. Calling updateScore API...`);

                 // Optimistically update UI first for responsiveness (Optional but good UX)
                 const playerIndex = players.findIndex(p => p.id === playerId);
                 if (playerIndex > -1) {
                     players[playerIndex].score = newScore;
                     renderPlayerList(); // Re-render immediately
                 }
                 // Then send update to backend
                updateScore(playerId, newScore);
            } else if (scoreChanged) {
                // Log 8: Log if score calculated but didn't actually change
                 console.log("Score calculated but resulted in no change.");
            } else {
                // Log 9: Log if no relevant button was identified
                 console.log("No relevant score-changing button identified in this click.");
            }
        });
    } else {
         console.error("Players container not found on page load. Event listeners not attached.");
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
    // Use Promise.all to fetch both simultaneously and set loading to false once both are done
    Promise.all([
        fetchPlayers(),
        fetchChannels()
    ]).finally(() => {
        setLoadingState(false, "Data loaded."); // Set loading to false once all fetches are complete
    });

});