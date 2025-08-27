// Coup Online - Client-side JavaScript
class CoupGame {
    constructor() {
        this.socket = io();
        this.gameState = {
            phase: 'menu',
            players: [],
            currentPlayer: null,
            myPlayerId: null,
            myPlayerName: '',
            roomCode: '',
            isHost: false,
            influences: [],
            coins: 2,
            deck: [],
            revealedCards: [],
            gameSettings: {
                maxPlayers: 6,
                inquisitorMode: false,
                twoPlayerMode: false,
                declaredCoup: false,
                differentArt: false
            }
        };
        
        this.characters = {
            'duke': { name: 'Duque', icon: '🏛️', color: '#6f42c1' },
            'assassin': { name: 'Assassino', icon: '🗡️', color: '#dc3545' },
            'captain': { name: 'Capitão', icon: '🏴‍☠️', color: '#17a2b8' },
            'ambassador': { name: 'Embaixador', icon: '🎭', color: '#28a745' },
            'contess': { name: 'Condessa', icon: '👸', color: '#e83e8c' },
            'inquisitor': { name: 'Inquisidor', icon: '🔍', color: '#fd7e14' }
        };
        
        this.reactionTimer = null;
        this.reactionTimeLeft = 15;
        
        this.initializeEventListeners();
        this.initializeSocketListeners();
        this.showScreen('mainMenu');
    }

    initializeEventListeners() {
        // Menu Navigation
        document.getElementById('createRoomBtn').addEventListener('click', () => this.showScreen('roomCreation'));
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.showScreen('joinRoom'));
        document.getElementById('tutorialBtn').addEventListener('click', () => this.showScreen('tutorialScreen'));
        document.getElementById('backToMenu').addEventListener('click', () => this.showScreen('mainMenu'));
        document.getElementById('backToMenuFromJoin').addEventListener('click', () => this.showScreen('mainMenu'));
        document.getElementById('closeTutorial').addEventListener('click', () => this.showScreen('mainMenu'));
        
        // Room Creation
        document.getElementById('createRoomConfirm').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomConfirm').addEventListener('click', () => this.joinRoom());
        
        // Lobby
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('leaveLobby').addEventListener('click', () => this.leaveRoom());
        document.getElementById('addBotBtn').addEventListener('click', () => this.addBot());
        document.getElementById('sendMessage').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Game Actions
        document.getElementById('incomeBtn').addEventListener('click', () => this.takeAction('income'));
        document.getElementById('foreignAidBtn').addEventListener('click', () => this.takeAction('foreign-aid'));
        document.getElementById('coupBtn').addEventListener('click', () => this.takeAction('coup'));
        document.getElementById('taxBtn').addEventListener('click', () => this.takeAction('tax'));
        document.getElementById('assassinateBtn').addEventListener('click', () => this.takeAction('assassinate'));
        document.getElementById('stealBtn').addEventListener('click', () => this.takeAction('steal'));
        document.getElementById('exchangeBtn').addEventListener('click', () => this.takeAction('exchange'));
        
        // Reactions
        document.getElementById('challengeBtn').addEventListener('click', () => this.challengeAction());
        document.getElementById('passBtn').addEventListener('click', () => this.passReaction());
        
        // Block buttons
        document.getElementById('blockDukeBtn').addEventListener('click', () => this.blockAction('duke'));
        document.getElementById('blockContessBtn').addEventListener('click', () => this.blockAction('contess'));
        document.getElementById('blockCaptainBtn').addEventListener('click', () => this.blockAction('captain'));
        document.getElementById('blockAmbassadorBtn').addEventListener('click', () => this.blockAction('ambassador'));
        
        // Card Selection
        document.getElementById('confirmSelection').addEventListener('click', () => this.confirmCardSelection());
        
        // Game Chat
        document.getElementById('sendGameMessage').addEventListener('click', () => this.sendGameChatMessage());
        document.getElementById('gameChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendGameChatMessage();
        });
        
        // Victory Screen
        document.getElementById('playAgain').addEventListener('click', () => this.playAgain());
        document.getElementById('backToMainMenu').addEventListener('click', () => this.backToMainMenu());
        
        // Utility
        document.getElementById('clearLogBtn').addEventListener('click', () => this.clearGameLog());
        document.getElementById('showTutorial').addEventListener('click', () => this.showTutorial());
        
        // Game Settings Changes
        document.getElementById('maxPlayers').addEventListener('change', (e) => {
            const twoPlayerMode = document.getElementById('twoPlayerMode');
            const declaredCoup = document.getElementById('declaredCoup');
            
            if (e.target.value === '2') {
                twoPlayerMode.disabled = false;
                declaredCoup.disabled = false;
            } else {
                twoPlayerMode.disabled = true;
                twoPlayerMode.checked = false;
                declaredCoup.disabled = true;
                declaredCoup.checked = false;
            }
        });
    }

    initializeSocketListeners() {
        // Connection
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.addGameLog('Desconectado do servidor', 'system');
        });

        // Room Management
        this.socket.on('roomCreated', (data) => {
            this.gameState.roomCode = data.roomCode;
            this.gameState.isHost = data.isHost;
            this.gameState.myPlayerName = data.playerName;
            this.gameState.players = data.players;
            this.updateLobby();
            this.showScreen('lobby');
        });

        this.socket.on('roomJoined', (data) => {
            this.gameState.roomCode = data.roomCode;
            this.gameState.isHost = data.isHost;
            this.gameState.myPlayerName = data.playerName;
            this.gameState.players = data.players;
            this.updateLobby();
            this.showScreen('lobby');
        });

        this.socket.on('playerJoined', (data) => {
            this.gameState.players = data.players;
            this.updateLobby();
            this.addChatMessage('Sistema', `${data.player.name} entrou na sala`, true);
        });

        this.socket.on('playerLeft', (data) => {
            this.gameState.players = data.players;
            this.updateLobby();
            if (this.gameState.phase === 'game') {
                this.updateOpponentsList();
            }
        });

        // Chat
        this.socket.on('chatMessage', (data) => {
            this.addChatMessage(data.sender, data.message);
        });

        this.socket.on('gameChatMessage', (data) => {
            this.addGameChatMessage(data.sender, data.message);
        });

        // Game Events
        this.socket.on('gameStarted', (data) => {
            this.gameState.phase = 'game';
            this.gameState.players = data.players;
            this.gameState.currentPlayer = data.currentPlayer;
            this.gameState.influences = data.influences;
            this.gameState.coins = data.coins;
            this.gameState.deck = data.deck;
            this.gameState.myPlayerId = data.playerId;
            this.gameState.gameSettings = data.gameSettings;
            
            this.startGameTimer();
            this.updateGameUI();
            this.showScreen('gameScreen');
            this.addGameLog('Jogo iniciado!', 'system');
        });

        this.socket.on('gameStateUpdate', (data) => {
            this.gameState.players = data.players;
            this.gameState.currentPlayer = data.currentPlayer;
            this.gameState.influences = data.influences || this.gameState.influences;
            this.gameState.coins = data.coins !== undefined ? data.coins : this.gameState.coins;
            this.gameState.deck = data.deck || this.gameState.deck;
            this.gameState.revealedCards = data.revealedCards || this.gameState.revealedCards;
            
            this.updateGameUI();
        });

        this.socket.on('actionTaken', (data) => {
            this.addGameLog(data.message, data.type || 'action');
            this.updateGameUI();
        });

        this.socket.on('reactionRequired', (data) => {
            this.showReactionArea(data);
        });

        this.socket.on('reactionTimeout', () => {
            this.hideReactionArea();
        });

        this.socket.on('challengeResult', (data) => {
            this.addGameLog(data.message, 'challenge');
            this.handleChallengeResult(data);
        });

        this.socket.on('cardSelection', (data) => {
            this.showCardSelection(data);
        });

        this.socket.on('targetSelection', (data) => {
            this.showTargetSelection(data);
        });

        this.socket.on('gameEnded', (data) => {
            this.endGame(data);
        });

        this.socket.on('error', (message) => {
            alert(message);
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    createRoom() {
        const hostName = document.getElementById('hostName').value.trim();
        const roomName = document.getElementById('roomName').value.trim();
        const maxPlayers = parseInt(document.getElementById('maxPlayers').value);
        
        if (!hostName || !roomName) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const gameSettings = {
            maxPlayers: maxPlayers,
            inquisitorMode: document.getElementById('inquisitorMode').checked,
            twoPlayerMode: document.getElementById('twoPlayerMode').checked,
            declaredCoup: document.getElementById('declaredCoup').checked,
            differentArt: document.getElementById('differentArt').checked
        };

        this.socket.emit('coup:createRoom', {
            hostName,
            roomName,
            gameSettings
        });
    }

    joinRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();

        if (!playerName || !roomCode) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        this.socket.emit('coup:joinRoom', {
            playerName,
            roomCode
        });
    }

    updateLobby() {
        document.getElementById('lobbyTitle').textContent = `Sala: ${this.gameState.roomCode}`;
        document.getElementById('roomCodeDisplay').textContent = `Código: ${this.gameState.roomCode}`;
        document.getElementById('playerCount').textContent = `${this.gameState.players.length}/${this.gameState.gameSettings.maxPlayers} jogadores`;
        
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            let badges = '';
            if (player.isHost) {
                badges += '<span class="host-badge">Host</span>';
            }
            if (player.isBot) {
                badges += '<span class="bot-badge">Bot</span>';
                // Add remove button for bots if user is host
                if (this.gameState.isHost) {
                    badges += `<button class="remove-bot-btn" onclick="coupGame.removeBot('${player.id}')">✕</button>`;
                }
            }
            
            playerItem.innerHTML = `
                <span class="player-name">${player.name}</span>
                <div class="player-badges">${badges}</div>
            `;
            
            playersList.appendChild(playerItem);
        });

        // Show host controls
        if (this.gameState.isHost) {
            document.getElementById('hostControls').classList.remove('hidden');
            const startBtn = document.getElementById('startGameBtn');
            startBtn.disabled = this.gameState.players.length < 2;
        }

        // Update game settings display
        this.updateGameSettingsDisplay();
    }

    updateGameSettingsDisplay() {
        document.getElementById('maxPlayersDisplay').textContent = this.gameState.gameSettings.maxPlayers;
        
        const variantsDisplay = document.getElementById('variantsDisplay');
        const variants = [];
        
        if (this.gameState.gameSettings.inquisitorMode) variants.push('Inquisidor');
        if (this.gameState.gameSettings.twoPlayerMode) variants.push('Modo 2 Jogadores');
        if (this.gameState.gameSettings.declaredCoup) variants.push('Golpe Declarado');
        if (this.gameState.gameSettings.differentArt) variants.push('Arte Diferente');
        
        if (variants.length > 0) {
            variantsDisplay.innerHTML = `<p>Variantes: <span>${variants.join(', ')}</span></p>`;
        } else {
            variantsDisplay.innerHTML = '<p>Variantes: <span>Nenhuma</span></p>';
        }
    }

    startGame() {
        this.socket.emit('coup:startGame', { roomCode: this.gameState.roomCode });
    }

    leaveRoom() {
        this.socket.emit('coup:leaveRoom');
        this.showScreen('mainMenu');
        this.resetGameState();
    }

    addBot() {
        const difficulty = document.getElementById('botDifficulty').value;
        
        this.socket.emit('coup:addBot', {
            roomCode: this.gameState.roomCode,
            difficulty: difficulty
        });
    }

    removeBot(botId) {
        this.socket.emit('coup:removeBot', {
            roomCode: this.gameState.roomCode,
            botId: botId
        });
    }

    takeAction(action, target = null) {
        // Check if it's player's turn
        if (this.gameState.currentPlayer !== this.gameState.myPlayerId) {
            alert('Não é seu turno!');
            return;
        }

        // Validate action based on coins
        if (action === 'coup' && this.gameState.coins < 7) {
            alert('Você precisa de pelo menos 7 moedas para dar um golpe!');
            return;
        }

        if (action === 'assassinate' && this.gameState.coins < 3) {
            alert('Você precisa de pelo menos 3 moedas para assassinar!');
            return;
        }

        // Check mandatory coup
        if (this.gameState.coins >= 10 && action !== 'coup') {
            alert('Com 10 ou mais moedas, você DEVE dar um golpe!');
            return;
        }

        // If action requires target, show target selection
        if (['coup', 'assassinate', 'steal'].includes(action) && !target) {
            this.showTargetSelection({ action, message: 'Escolha um alvo:' });
            return;
        }

        this.socket.emit('coup:takeAction', {
            roomCode: this.gameState.roomCode,
            action: action,
            target: target
        });
    }

    challengeAction() {
        this.socket.emit('coup:challengeAction', {
            roomCode: this.gameState.roomCode
        });
        this.hideReactionArea();
    }

    blockAction(character) {
        this.socket.emit('coup:blockAction', {
            roomCode: this.gameState.roomCode,
            character: character
        });
        this.hideReactionArea();
    }

    passReaction() {
        this.socket.emit('coup:passReaction', {
            roomCode: this.gameState.roomCode
        });
        this.hideReactionArea();
    }

    showReactionArea(data) {
        const reactionArea = document.getElementById('reactionArea');
        const reactionTitle = document.getElementById('reactionTitle');
        const challengeSection = document.getElementById('challengeSection');
        const blockSection = document.getElementById('blockSection');
        
        reactionTitle.textContent = data.title || 'Reação Necessária';
        reactionArea.classList.remove('hidden');

        // Show/hide challenge section
        if (data.canChallenge) {
            challengeSection.classList.remove('hidden');
        } else {
            challengeSection.classList.add('hidden');
        }

        // Show/hide block section and appropriate block buttons
        if (data.canBlock && data.blockOptions) {
            blockSection.classList.remove('hidden');
            this.updateBlockOptions(data.blockOptions);
        } else {
            blockSection.classList.add('hidden');
        }

        // Start reaction timer
        this.startReactionTimer();
    }

    updateBlockOptions(options) {
        const blockButtons = document.querySelectorAll('.block-btn');
        blockButtons.forEach(btn => btn.style.display = 'none');

        options.forEach(option => {
            const btn = document.getElementById(`block${option.charAt(0).toUpperCase() + option.slice(1)}Btn`);
            if (btn) {
                btn.style.display = 'inline-block';
            }
        });
    }

    hideReactionArea() {
        document.getElementById('reactionArea').classList.add('hidden');
        this.clearReactionTimer();
    }

    startReactionTimer() {
        this.reactionTimeLeft = 15;
        this.updateReactionTimer();
        
        this.reactionTimer = setInterval(() => {
            this.reactionTimeLeft--;
            this.updateReactionTimer();
            
            if (this.reactionTimeLeft <= 0) {
                this.clearReactionTimer();
                this.passReaction();
            }
        }, 1000);
    }

    updateReactionTimer() {
        document.getElementById('reactionTimer').textContent = `${this.reactionTimeLeft}s`;
    }

    clearReactionTimer() {
        if (this.reactionTimer) {
            clearInterval(this.reactionTimer);
            this.reactionTimer = null;
        }
    }

    showCardSelection(data) {
        const cardSelectionArea = document.getElementById('cardSelectionArea');
        const cardSelectionTitle = document.getElementById('cardSelectionTitle');
        const availableCards = document.getElementById('availableCards');
        
        cardSelectionTitle.textContent = data.title || 'Selecionar Cartas';
        cardSelectionArea.classList.remove('hidden');
        
        // Clear previous cards
        availableCards.innerHTML = '';
        
        // Add available cards
        data.cards.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            cardElement.addEventListener('click', () => this.toggleCardSelection(cardElement, index));
            availableCards.appendChild(cardElement);
        });
        
        // Update confirm button state
        this.updateConfirmSelectionButton(data.required || 1);
    }

    createCardElement(character, index) {
        const cardElement = document.createElement('div');
        cardElement.className = 'selectable-card';
        cardElement.dataset.index = index;
        cardElement.dataset.character = character;
        
        const charInfo = this.characters[character];
        cardElement.innerHTML = `
            <div class="character-icon">${charInfo.icon}</div>
            <div class="character-name">${charInfo.name}</div>
        `;
        
        cardElement.style.borderColor = charInfo.color;
        
        return cardElement;
    }

    toggleCardSelection(cardElement, index) {
        cardElement.classList.toggle('selected');
        this.updateConfirmSelectionButton();
    }

    updateConfirmSelectionButton(required = 1) {
        const confirmBtn = document.getElementById('confirmSelection');
        const selectedCards = document.querySelectorAll('.selectable-card.selected');
        
        confirmBtn.disabled = selectedCards.length !== required;
    }

    confirmCardSelection() {
        const selectedCards = document.querySelectorAll('.selectable-card.selected');
        const selectedIndices = Array.from(selectedCards).map(card => parseInt(card.dataset.index));
        
        this.socket.emit('coup:cardSelection', {
            roomCode: this.gameState.roomCode,
            selectedCards: selectedIndices
        });
        
        document.getElementById('cardSelectionArea').classList.add('hidden');
    }

    showTargetSelection(data) {
        const targetSelection = document.getElementById('targetSelection');
        const targetPlayers = document.getElementById('targetPlayers');
        
        targetSelection.classList.remove('hidden');
        targetPlayers.innerHTML = '';
        
        // Add available targets (excluding current player)
        this.gameState.players.forEach(player => {
            if (player.id !== this.gameState.myPlayerId && player.influences > 0) {
                const targetElement = document.createElement('div');
                targetElement.className = 'target-player';
                targetElement.innerHTML = `
                    <div class="target-name">${player.name}</div>
                    <div class="target-info">${player.influences} influências, ${player.coins} moedas</div>
                `;
                
                targetElement.addEventListener('click', () => {
                    this.takeAction(data.action, player.id);
                    targetSelection.classList.add('hidden');
                });
                
                targetPlayers.appendChild(targetElement);
            }
        });
    }

    handleChallengeResult(data) {
        if (data.challengeSuccessful) {
            this.addGameLog(`Contestação bem-sucedida! ${data.message}`, 'challenge');
        } else {
            this.addGameLog(`Contestação falhou! ${data.message}`, 'challenge');
        }
        
        // Update game state
        this.updateGameUI();
        
        // If player lost influence, show influence selection
        if (data.loseInfluence && data.playerId === this.gameState.myPlayerId) {
            this.showInfluenceSelection();
        }
    }

    showInfluenceSelection() {
        this.addGameLog('Escolha uma influência para revelar', 'system');
        
        // Make influence cards selectable
        const influenceCards = document.querySelectorAll('.influence-card:not(.revealed)');
        influenceCards.forEach(card => {
            card.classList.add('selectable');
            card.addEventListener('click', (e) => {
                const cardIndex = parseInt(e.currentTarget.dataset.index);
                this.selectInfluenceToLose(cardIndex);
            });
        });
    }

    selectInfluenceToLose(cardIndex) {
        this.socket.emit('coup:loseInfluence', {
            roomCode: this.gameState.roomCode,
            cardIndex: cardIndex
        });
        
        // Remove selectable class from all cards
        document.querySelectorAll('.influence-card').forEach(card => {
            card.classList.remove('selectable');
        });
    }

    updateGameUI() {
        this.updatePlayerInfo();
        this.updateOpponentsList();
        this.updateActionButtons();
        this.updateCourtArea();
        this.updateInfluenceCards();
    }

    updatePlayerInfo() {
        document.getElementById('playerNameDisplay').textContent = this.gameState.myPlayerName;
        document.getElementById('playerCoins').textContent = this.gameState.coins;
        
        // Update current turn indicator
        const currentPlayerName = this.gameState.players.find(p => p.id === this.gameState.currentPlayer)?.name || 'Desconhecido';
        document.getElementById('currentTurn').textContent = `Turno de: ${currentPlayerName}`;
    }

    updateOpponentsList() {
        const opponentsList = document.getElementById('opponentsList');
        opponentsList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            if (player.id !== this.gameState.myPlayerId) {
                const opponentCard = document.createElement('div');
                opponentCard.className = 'opponent-card';
                
                if (player.id === this.gameState.currentPlayer) {
                    opponentCard.classList.add('active');
                }
                
                opponentCard.innerHTML = `
                    <div class="opponent-info">
                        <span class="opponent-name">${player.name}</span>
                        <span class="opponent-coins">
                            <span class="coin-icon">🪙</span>
                            ${player.coins}
                        </span>
                    </div>
                    <div class="opponent-influences">
                        ${this.createInfluenceIndicators(player.influences, player.revealedInfluences || 0)}
                    </div>
                `;
                
                opponentsList.appendChild(opponentCard);
            }
        });
    }

    createInfluenceIndicators(total, revealed) {
        let indicators = '';
        for (let i = 0; i < total; i++) {
            const isRevealed = i < revealed;
            indicators += `<div class="influence-indicator ${isRevealed ? 'revealed' : ''}"></div>`;
        }
        return indicators;
    }

    updateActionButtons() {
        const isMyTurn = this.gameState.currentPlayer === this.gameState.myPlayerId;
        const hasEnoughForCoup = this.gameState.coins >= 7;
        const hasEnoughForAssassinate = this.gameState.coins >= 3;
        const mustCoup = this.gameState.coins >= 10;
        
        // General actions
        document.getElementById('incomeBtn').disabled = !isMyTurn || mustCoup;
        document.getElementById('foreignAidBtn').disabled = !isMyTurn || mustCoup;
        document.getElementById('coupBtn').disabled = !isMyTurn || !hasEnoughForCoup;
        
        // Character actions
        document.getElementById('taxBtn').disabled = !isMyTurn || mustCoup;
        document.getElementById('assassinateBtn').disabled = !isMyTurn || !hasEnoughForAssassinate || mustCoup;
        document.getElementById('stealBtn').disabled = !isMyTurn || mustCoup;
        document.getElementById('exchangeBtn').disabled = !isMyTurn || mustCoup;
        
        // Highlight coup if mandatory
        if (mustCoup) {
            document.getElementById('coupBtn').classList.add('pulse');
            this.addGameLog('Você deve dar um golpe!', 'system');
        } else {
            document.getElementById('coupBtn').classList.remove('pulse');
        }
    }

    updateCourtArea() {
        // Update deck count
        const deckCount = this.gameState.deck.length || 0;
        document.getElementById('deckCount').textContent = deckCount;
        
        // Update treasury
        const totalCoins = this.gameState.players.reduce((sum, player) => sum + player.coins, 0);
        const treasuryCoins = 50 - totalCoins; // Assuming 50 coin limit
        document.getElementById('treasury').textContent = `Tesouro: ${treasuryCoins} moedas`;
        
        // Update revealed cards
        this.updateRevealedCards();
    }

    updateRevealedCards() {
        const revealedCardsArea = document.getElementById('revealedCardsArea');
        revealedCardsArea.innerHTML = '';
        
        if (this.gameState.revealedCards && this.gameState.revealedCards.length > 0) {
            this.gameState.revealedCards.forEach(character => {
                const cardElement = document.createElement('div');
                cardElement.className = 'revealed-card';
                
                const charInfo = this.characters[character];
                cardElement.innerHTML = `
                    <div class="character-icon">${charInfo.icon}</div>
                    <div class="character-name">${charInfo.name}</div>
                `;
                
                cardElement.style.borderColor = charInfo.color;
                revealedCardsArea.appendChild(cardElement);
            });
        } else {
            revealedCardsArea.innerHTML = '<div class="no-cards">Nenhuma carta revelada</div>';
        }
    }

    updateInfluenceCards() {
        const influenceCards = document.getElementById('playerInfluences');
        influenceCards.innerHTML = '';
        
        this.gameState.influences.forEach((character, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'influence-card';
            cardElement.dataset.index = index;
            cardElement.dataset.character = character;
            
            if (character === 'revealed') {
                cardElement.classList.add('revealed');
                cardElement.innerHTML = `
                    <div class="character-icon">💀</div>
                    <div class="character-name">Revelada</div>
                `;
            } else {
                const charInfo = this.characters[character];
                cardElement.innerHTML = `
                    <div class="character-icon">${charInfo.icon}</div>
                    <div class="character-name">${charInfo.name}</div>
                `;
                cardElement.style.borderColor = charInfo.color;
            }
            
            influenceCards.appendChild(cardElement);
        });
    }

    addGameLog(message, type = 'action') {
        const gameLog = document.getElementById('gameLog');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    clearGameLog() {
        document.getElementById('gameLog').innerHTML = '';
    }

    addChatMessage(sender, message, isSystem = false) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        if (isSystem) {
            messageElement.classList.add('system-message');
        }
        
        const timestamp = new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <span class="message-sender">${sender}:</span>
            <span class="message-content">${message}</span>
            <span class="message-time">${timestamp}</span>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addGameChatMessage(sender, message) {
        const chatMessages = document.getElementById('gameChatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const timestamp = new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <span class="message-sender">${sender}:</span>
            <span class="message-content">${message}</span>
            <span class="message-time">${timestamp}</span>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.socket.emit('coup:chatMessage', {
            roomCode: this.gameState.roomCode,
            message: message,
            sender: this.gameState.myPlayerName
        });
        
        // Add own message to chat
        this.addChatMessage(this.gameState.myPlayerName, message);
        input.value = '';
    }

    sendGameChatMessage() {
        const input = document.getElementById('gameChatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.socket.emit('coup:gameChatMessage', {
            roomCode: this.gameState.roomCode,
            message: message,
            sender: this.gameState.myPlayerName
        });
        
        // Add own message to chat
        this.addGameChatMessage(this.gameState.myPlayerName, message);
        input.value = '';
    }

    startGameTimer() {
        this.gameStartTime = Date.now();
    }

    endGame(data) {
        this.gameEndTime = Date.now();
        const gameDuration = Math.floor((this.gameEndTime - this.gameStartTime) / 1000);
        
        // Update victory screen
        document.getElementById('winnerName').textContent = data.winner.name;
        document.getElementById('gameDuration').textContent = `${Math.floor(gameDuration / 60)} min ${gameDuration % 60}s`;
        document.getElementById('totalTurns').textContent = data.totalTurns || 0;
        document.getElementById('totalActions').textContent = data.totalActions || 0;
        
        // Update player ranking
        const rankingList = document.getElementById('rankingList');
        rankingList.innerHTML = '';
        
        if (data.ranking) {
            data.ranking.forEach((player, index) => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <span class="rank-position">${index + 1}.</span>
                    <span class="rank-name">${player.name}</span>
                    <span class="rank-influences">${player.influences} influências</span>
                `;
                rankingList.appendChild(listItem);
            });
        }
        
        this.addGameLog(`${data.winner.name} venceu o jogo!`, 'system');
        this.showScreen('victoryScreen');
    }

    playAgain() {
        if (this.gameState.isHost) {
            this.socket.emit('startGame', { roomCode: this.gameState.roomCode });
        } else {
            this.showScreen('lobby');
        }
    }

    backToMainMenu() {
        this.leaveRoom();
    }

    showTutorial() {
        this.showScreen('tutorialScreen');
    }

    resetGameState() {
        this.gameState = {
            phase: 'menu',
            players: [],
            currentPlayer: null,
            myPlayerId: null,
            myPlayerName: '',
            roomCode: '',
            isHost: false,
            influences: [],
            coins: 2,
            deck: [],
            revealedCards: [],
            gameSettings: {
                maxPlayers: 6,
                inquisitorMode: false,
                twoPlayerMode: false,
                declaredCoup: false,
                differentArt: false
            }
        };
        
        this.clearReactionTimer();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new CoupGame();
    
    // Make game instance globally available for debugging
    window.coupGame = game;
    
    console.log('Coup Online initialized');
});