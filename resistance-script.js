class ResistanceGame {
    constructor() {
        this.gameState = {
            screen: 'mainMenu',
            roomCode: null,
            isHost: false,
            playerName: '',
            players: [],
            gamePhase: 'lobby', // lobby, teamSelection, voting, mission, gameEnd
            currentMission: 1,
            currentLeader: 0,
            missions: [
                { teamSize: 2, completed: false, success: null, failsRequired: 1 },
                { teamSize: 3, completed: false, success: null, failsRequired: 1 },
                { teamSize: 2, completed: false, success: null, failsRequired: 1 },
                { teamSize: 3, completed: false, success: null, failsRequired: 1 }, // Will be 2 for 7+ players
                { teamSize: 3, completed: false, success: null, failsRequired: 1 }
            ],
            playerRole: null, // 'resistance' or 'spy'
            knownSpies: [],
            selectedTeam: [],
            votes: {},
            missionCards: {},
            rejectionCount: 0,
            gameMode: {
                assassin: false,
                specialRoles: false,
                ambush: false,
                deserter: false
            }
        };

        this.playerDistribution = {
            5: { resistance: 3, spies: 2 },
            6: { resistance: 4, spies: 2 },
            7: { resistance: 4, spies: 3 },
            8: { resistance: 5, spies: 3 },
            9: { resistance: 6, spies: 3 },
            10: { resistance: 6, spies: 4 }
        };

        this.missionTeamSizes = {
            5: [2, 3, 2, 3, 3],
            6: [2, 3, 4, 3, 4],
            7: [2, 3, 3, 4, 4],
            8: [3, 4, 4, 5, 5],
            9: [3, 4, 4, 5, 5],
            10: [3, 4, 4, 5, 5]
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.showScreen('mainMenu');
    }

    bindEvents() {
        // Main Menu
        document.getElementById('createRoomBtn').addEventListener('click', () => this.showScreen('roomCreation'));
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.showScreen('joinRoom'));
        document.getElementById('tutorialBtn').addEventListener('click', () => this.showScreen('tutorialScreen'));

        // Room Creation
        document.getElementById('createRoomConfirm').addEventListener('click', () => this.createRoom());
        document.getElementById('backToMenu').addEventListener('click', () => this.showScreen('mainMenu'));

        // Join Room
        document.getElementById('joinRoomConfirm').addEventListener('click', () => this.joinRoom());
        document.getElementById('backToMenuFromJoin').addEventListener('click', () => this.showScreen('mainMenu'));

        // Lobby
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('startSimulationBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('leaveLobby').addEventListener('click', () => this.leaveLobby());
        document.getElementById('sendMessage').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Game
        document.getElementById('confirmTeam').addEventListener('click', () => this.confirmTeamSelection());
        document.getElementById('approveTeam').addEventListener('click', () => this.vote('approve'));
        document.getElementById('rejectTeam').addEventListener('click', () => this.vote('reject'));
        document.getElementById('successCard').addEventListener('click', () => this.playMissionCard('success'));
        document.getElementById('failCard').addEventListener('click', () => this.playMissionCard('fail'));
        document.getElementById('sendGameMessage').addEventListener('click', () => this.sendGameChatMessage());
        document.getElementById('gameChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendGameChatMessage();
        });

        // Victory Screen
        document.getElementById('playAgain').addEventListener('click', () => this.playAgain());
        document.getElementById('backToMainMenu').addEventListener('click', () => this.showScreen('mainMenu'));

        // Tutorial
        document.getElementById('closeTutorial').addEventListener('click', () => this.showScreen('mainMenu'));

        // Auto-uppercase room code
        document.getElementById('roomCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    showScreen(screenName) {
        const screens = ['mainMenu', 'roomCreation', 'joinRoom', 'lobby', 'gameScreen', 'victoryScreen', 'tutorialScreen'];
        screens.forEach(screen => {
            document.getElementById(screen).classList.add('hidden');
        });
        document.getElementById(screenName).classList.remove('hidden');
        this.gameState.screen = screenName;
    }

    createRoom() {
        const hostName = document.getElementById('hostName').value.trim();
        const roomName = document.getElementById('roomName').value.trim();
        const maxPlayers = parseInt(document.getElementById('maxPlayers').value);

        if (!hostName || !roomName) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Generate room code
        const roomCode = this.generateRoomCode();
        
        // Set game mode options
        this.gameState.gameMode.assassin = document.getElementById('assassinMode').checked;
        this.gameState.gameMode.specialRoles = document.getElementById('specialRoles').checked;
        this.gameState.gameMode.ambush = document.getElementById('ambushMode').checked;
        this.gameState.gameMode.deserter = document.getElementById('deserterMode').checked;

        // Initialize game state
        this.gameState.roomCode = roomCode;
        this.gameState.isHost = true;
        this.gameState.playerName = hostName;
        this.gameState.maxPlayers = maxPlayers;
        this.gameState.roomName = roomName;

        // Set up mission team sizes based on player count
        this.gameState.missions = this.missionTeamSizes[maxPlayers].map((size, index) => ({
            teamSize: size,
            completed: false,
            success: null,
            failsRequired: (index === 3 && maxPlayers >= 7) ? 2 : 1 // 4th mission with 7+ players needs 2 fails
        }));

        // Add host as first player
        this.gameState.players = [{
            name: hostName,
            isHost: true,
            role: null
        }];

        this.enterLobby();
    }

    joinRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        const roomCode = document.getElementById('roomCode').value.trim();

        if (!playerName || !roomCode) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (roomCode.length !== 6) {
            alert('Código da sala deve ter 6 caracteres.');
            return;
        }

        // In a real implementation, this would connect to server
        // For demo purposes, simulate joining
        this.gameState.roomCode = roomCode;
        this.gameState.isHost = false;
        this.gameState.playerName = playerName;
        this.gameState.players = [
            { name: 'Host', isHost: true, role: null },
            { name: playerName, isHost: false, role: null }
        ];

        this.enterLobby();
    }

    enterLobby() {
        this.updateLobbyUI();
        this.showScreen('lobby');
        this.addSystemMessage(`${this.gameState.playerName} entrou na sala.`);
    }

    updateLobbyUI() {
        document.getElementById('lobbyTitle').textContent = `Sala: ${this.gameState.roomName || 'LOBBY'}`;
        document.getElementById('roomCodeDisplay').textContent = `Código: ${this.gameState.roomCode}`;
        document.getElementById('playerCount').textContent = `${this.gameState.players.length}/${this.gameState.maxPlayers || 5} jogadores`;

        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';

        this.gameState.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player-item ${player.isHost ? 'host' : ''}`;
            
            playerDiv.innerHTML = `
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="player-info">
                    <strong>${player.name}</strong>
                    ${player.isHost ? '<span style="color: var(--warning-yellow);">(Host)</span>' : ''}
                </div>
            `;
            
            playersList.appendChild(playerDiv);
        });

        // Show host controls if user is host
        const hostControls = document.getElementById('hostControls');
        if (this.gameState.isHost) {
            hostControls.classList.remove('hidden');
            const startBtn = document.getElementById('startGameBtn');
            startBtn.disabled = this.gameState.players.length < 5;
        } else {
            hostControls.classList.add('hidden');
        }
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    startGame() {
        if (this.gameState.players.length < 5) {
            alert('Mínimo de 5 jogadores necessário.');
            return;
        }

        this.distributeRoles();
        this.gameState.gamePhase = 'teamSelection';
        this.gameState.currentLeader = 0;
        this.showScreen('gameScreen');
        this.updateGameUI();
        this.startTeamSelectionPhase();
    }

    startSimulation() {
        // Add AI players to reach minimum of 5
        const currentPlayerCount = this.gameState.players.length;
        const targetPlayerCount = this.gameState.maxPlayers || 5;
        
        const aiNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy'];
        
        for (let i = currentPlayerCount; i < targetPlayerCount; i++) {
            this.gameState.players.push({
                name: aiNames[i - 1] || `Jogador ${i}`,
                isHost: false,
                role: null,
                isAI: true
            });
        }

        this.addSystemMessage(`🤖 ${targetPlayerCount - currentPlayerCount} jogadores AI adicionados. Iniciando simulação...`);
        this.updateLobbyUI();

        // Start game after a short delay
        setTimeout(() => {
            this.distributeRoles();
            this.gameState.gamePhase = 'teamSelection';
            this.gameState.currentLeader = 0;
            this.showScreen('gameScreen');
            this.updateGameUI();
            this.startTeamSelectionPhase();
        }, 1500);
    }

    distributeRoles() {
        const playerCount = this.gameState.players.length;
        const distribution = this.playerDistribution[playerCount];
        
        // Create role array
        const roles = [];
        for (let i = 0; i < distribution.resistance; i++) {
            roles.push('resistance');
        }
        for (let i = 0; i < distribution.spies; i++) {
            roles.push('spy');
        }

        // Shuffle roles
        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }

        // Assign roles
        this.gameState.players.forEach((player, index) => {
            player.role = roles[index];
        });

        // Set current player's role and spy knowledge
        const currentPlayer = this.gameState.players.find(p => p.name === this.gameState.playerName);
        if (currentPlayer) {
            this.gameState.playerRole = currentPlayer.role;
            
            if (currentPlayer.role === 'spy') {
                this.gameState.knownSpies = this.gameState.players
                    .filter(p => p.role === 'spy' && p.name !== this.gameState.playerName)
                    .map(p => p.name);
            }
        }

        this.updateRoleUI();
    }

    updateRoleUI() {
        const roleCard = document.getElementById('playerRole');
        const roleIcon = roleCard.querySelector('.role-icon');
        const roleName = roleCard.querySelector('.role-name');
        const roleTeam = roleCard.querySelector('.role-team');
        const spyInfo = document.getElementById('spyInfo');

        if (this.gameState.playerRole === 'resistance') {
            roleCard.className = 'role-card resistance';
            roleIcon.textContent = '🛡️';
            roleName.textContent = 'Agente da Resistência';
            roleTeam.textContent = 'Você luta pela liberdade';
            spyInfo.classList.add('hidden');
        } else if (this.gameState.playerRole === 'spy') {
            roleCard.className = 'role-card spy';
            roleIcon.textContent = '🕵️';
            roleName.textContent = 'Espião';
            roleTeam.textContent = 'Você trabalha para o governo';
            
            if (this.gameState.knownSpies.length > 0) {
                spyInfo.classList.remove('hidden');
                const spyList = document.getElementById('spyList');
                spyList.innerHTML = '';
                this.gameState.knownSpies.forEach(spyName => {
                    const spyDiv = document.createElement('div');
                    spyDiv.className = 'spy-name';
                    spyDiv.textContent = spyName;
                    spyList.appendChild(spyDiv);
                });
            }
        }
    }

    updateGameUI() {
        document.getElementById('gamePhase').textContent = this.getPhaseText();
        document.getElementById('missionCounter').textContent = `Missão ${this.gameState.currentMission} de 5`;

        // Update missions track
        this.gameState.missions.forEach((mission, index) => {
            const missionElement = document.querySelector(`[data-mission="${index + 1}"]`);
            const sizeElement = document.getElementById(`mission${index + 1}-size`);
            const resultElement = document.getElementById(`mission${index + 1}-result`);
            
            sizeElement.textContent = mission.teamSize;
            
            if (mission.completed) {
                resultElement.className = `mission-result ${mission.success ? 'success' : 'fail'}`;
                resultElement.textContent = mission.success ? '✅' : '❌';
            } else {
                resultElement.className = 'mission-result pending';
                resultElement.textContent = '';
            }
        });

        // Update rejection track
        document.getElementById('rejectionCount').textContent = this.gameState.rejectionCount;
        const dots = document.querySelectorAll('.rejection-dots .dot');
        dots.forEach((dot, index) => {
            if (index < this.gameState.rejectionCount) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update players list
        this.updateGamePlayersList();
    }

    updateGamePlayersList() {
        const playersList = document.getElementById('gamePlayersList');
        playersList.innerHTML = '';

        this.gameState.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'game-player';
            
            if (index === this.gameState.currentLeader) {
                playerDiv.classList.add('leader');
            }
            
            if (this.gameState.selectedTeam.includes(player.name)) {
                playerDiv.classList.add('on-team');
            }

            const status = index === this.gameState.currentLeader ? '👑' : 
                          this.gameState.selectedTeam.includes(player.name) ? '✅' : '👤';

            playerDiv.innerHTML = `
                <span class="player-status">${status}</span>
                <span class="player-name">${player.name}</span>
            `;
            
            playersList.appendChild(playerDiv);
        });
    }

    getPhaseText() {
        switch (this.gameState.gamePhase) {
            case 'teamSelection': return 'Seleção de Equipe';
            case 'voting': return 'Votação da Equipe';
            case 'mission': return 'Execução da Missão';
            case 'gameEnd': return 'Fim de Jogo';
            default: return 'Aguardando...';
        }
    }

    startTeamSelectionPhase() {
        this.gameState.gamePhase = 'teamSelection';
        this.gameState.selectedTeam = [];
        
        // Hide vote results from previous round
        document.getElementById('voteResults').classList.add('hidden');
        
        this.updateGameUI();

        const currentLeader = this.gameState.players[this.gameState.currentLeader];
        const isCurrentPlayerLeader = currentLeader.name === this.gameState.playerName;
        
        if (isCurrentPlayerLeader) {
            this.showTeamSelection();
        } else {
            this.showWaitingPhase(`Aguardando ${currentLeader.name} selecionar a equipe...`);
            
            // If leader is AI, simulate team selection
            if (currentLeader.isAI) {
                setTimeout(() => {
                    this.aiSelectTeam();
                }, 2000);
            }
        }

        // Update required team size display
        const requiredSize = this.gameState.missions[this.gameState.currentMission - 1].teamSize;
        document.getElementById('requiredTeamSize').textContent = requiredSize;
        
        // Add message about new round
        this.addGameMessage(`🏛️ Rodada ${this.gameState.currentMission} - Líder: ${currentLeader.name}`);
    }

    showTeamSelection() {
        this.hideAllPhases();
        document.getElementById('teamSelection').classList.remove('hidden');

        const playersContainer = document.getElementById('teamSelectionPlayers');
        playersContainer.innerHTML = '';

        this.gameState.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'selectable-player';
            playerDiv.dataset.playerName = player.name;
            
            playerDiv.innerHTML = `
                <span class="player-status">👤</span>
                <span class="player-name">${player.name}</span>
            `;

            playerDiv.addEventListener('click', () => this.togglePlayerSelection(player.name, playerDiv));
            playersContainer.appendChild(playerDiv);
        });
    }

    togglePlayerSelection(playerName, element) {
        const requiredSize = this.gameState.missions[this.gameState.currentMission - 1].teamSize;
        
        if (this.gameState.selectedTeam.includes(playerName)) {
            // Remove from team
            this.gameState.selectedTeam = this.gameState.selectedTeam.filter(name => name !== playerName);
            element.classList.remove('selected');
        } else {
            // Add to team if not full
            if (this.gameState.selectedTeam.length < requiredSize) {
                this.gameState.selectedTeam.push(playerName);
                element.classList.add('selected');
            }
        }

        // Update confirm button
        document.getElementById('confirmTeam').disabled = this.gameState.selectedTeam.length !== requiredSize;
        this.updateGamePlayersList();
    }

    confirmTeamSelection() {
        this.startVotingPhase();
    }

    aiSelectTeam() {
        const requiredSize = this.gameState.missions[this.gameState.currentMission - 1].teamSize;
        const currentLeader = this.gameState.players[this.gameState.currentLeader];
        
        // AI logic for team selection
        const availablePlayers = [...this.gameState.players];
        
        // If AI is a spy, try to include self and other spies
        // If AI is resistance, try to avoid known suspicious players
        if (currentLeader.role === 'spy') {
            // Spy leader: include self and try to include other spies if possible
            this.gameState.selectedTeam.push(currentLeader.name);
            
            const otherSpies = this.gameState.players.filter(p => 
                p.role === 'spy' && p.name !== currentLeader.name
            );
            
            // Add one other spy if possible and there's room
            if (otherSpies.length > 0 && requiredSize > 1) {
                const randomSpy = otherSpies[Math.floor(Math.random() * otherSpies.length)];
                this.gameState.selectedTeam.push(randomSpy.name);
            }
            
            // Fill remaining slots with resistance members randomly
            const resistanceMembers = this.gameState.players.filter(p => 
                p.role === 'resistance' && !this.gameState.selectedTeam.includes(p.name)
            );
            
            while (this.gameState.selectedTeam.length < requiredSize && resistanceMembers.length > 0) {
                const randomIndex = Math.floor(Math.random() * resistanceMembers.length);
                this.gameState.selectedTeam.push(resistanceMembers[randomIndex].name);
                resistanceMembers.splice(randomIndex, 1);
            }
            
        } else {
            // Resistance leader: try to select trustworthy players (including self)
            this.gameState.selectedTeam.push(currentLeader.name);
            
            // Add other players randomly (resistance AI doesn't know who are spies)
            const otherPlayers = this.gameState.players.filter(p => p.name !== currentLeader.name);
            
            while (this.gameState.selectedTeam.length < requiredSize && otherPlayers.length > 0) {
                const randomIndex = Math.floor(Math.random() * otherPlayers.length);
                this.gameState.selectedTeam.push(otherPlayers[randomIndex].name);
                otherPlayers.splice(randomIndex, 1);
            }
        }
        
        // Add message about team selection
        this.addGameMessage(`👥 ${currentLeader.name} selecionou a equipe: ${this.gameState.selectedTeam.join(', ')}`);
        
        // Update UI and proceed to voting
        this.updateGamePlayersList();
        setTimeout(() => {
            this.startVotingPhase();
        }, 1500);
    }

    startVotingPhase() {
        this.gameState.gamePhase = 'voting';
        this.gameState.votes = {};
        this.updateGameUI();
        this.showVotingPhase();
        
        // Add message about voting phase
        this.addGameMessage(`🗳️ Fase de votação iniciada - Todos os jogadores devem votar`);
    }

    showVotingPhase() {
        this.hideAllPhases();
        document.getElementById('votingPhase').classList.remove('hidden');

        // Re-enable voting buttons
        document.getElementById('approveTeam').disabled = false;
        document.getElementById('rejectTeam').disabled = false;

        const teamMembers = document.getElementById('teamMembers');
        teamMembers.innerHTML = '';

        this.gameState.selectedTeam.forEach(memberName => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'team-member';
            memberDiv.textContent = memberName;
            teamMembers.appendChild(memberDiv);
        });
    }

    vote(decision) {
        this.gameState.votes[this.gameState.playerName] = decision;
        
        // Disable voting buttons
        document.getElementById('approveTeam').disabled = true;
        document.getElementById('rejectTeam').disabled = true;

        // In real implementation, wait for all players to vote
        // For demo, simulate other players voting
        setTimeout(() => {
            this.simulateOtherVotes();
            this.resolveVoting();
        }, 2000);

        this.showWaitingPhase('Aguardando outros jogadores votarem...');
    }

    simulateOtherVotes() {
        this.gameState.players.forEach(player => {
            if (player.name !== this.gameState.playerName) {
                // Simple AI: spies try to reject if they're not on the team, resistance usually approves good teams
                const isOnTeam = this.gameState.selectedTeam.includes(player.name);
                const approveChance = player.role === 'spy' ? (isOnTeam ? 0.8 : 0.3) : 0.7;
                this.gameState.votes[player.name] = Math.random() < approveChance ? 'approve' : 'reject';
            }
        });
    }

    resolveVoting() {
        const approveCount = Object.values(this.gameState.votes).filter(vote => vote === 'approve').length;
        const rejectCount = Object.values(this.gameState.votes).filter(vote => vote === 'reject').length;
        
        const teamApproved = approveCount > rejectCount;

        // Show voting results
        this.showVotingResults();

        if (teamApproved) {
            this.gameState.rejectionCount = 0;
            this.addGameMessage(`✅ Equipe aprovada! (${approveCount} aprovações vs ${rejectCount} rejeições)`);
            setTimeout(() => {
                this.startMissionPhase();
            }, 3000);
        } else {
            this.gameState.rejectionCount++;
            
            if (this.gameState.rejectionCount >= 5) {
                this.endGame('spies', '5 rejeições consecutivas - os Espiões venceram!');
                return;
            }

            this.addGameMessage(`❌ Equipe rejeitada! (${rejectCount} rejeições vs ${approveCount} aprovações)`);

            // Move to next leader
            this.gameState.currentLeader = (this.gameState.currentLeader + 1) % this.gameState.players.length;
            
            setTimeout(() => {
                this.startTeamSelectionPhase();
            }, 4000);

            this.showWaitingPhase('Equipe rejeitada. Próximo líder selecionando...');
        }

        this.updateGameUI();
    }

    showVotingResults() {
        const voteResults = document.getElementById('voteResults');
        const approveVoters = document.getElementById('approveVoters');
        const rejectVoters = document.getElementById('rejectVoters');

        // Clear previous results
        approveVoters.innerHTML = '';
        rejectVoters.innerHTML = '';

        // Separate voters by their vote
        const approvedBy = [];
        const rejectedBy = [];

        Object.entries(this.gameState.votes).forEach(([playerName, vote]) => {
            const voterDiv = document.createElement('div');
            voterDiv.className = 'voter-name';
            voterDiv.textContent = playerName;

            if (vote === 'approve') {
                approveVoters.appendChild(voterDiv);
                approvedBy.push(playerName);
            } else {
                rejectVoters.appendChild(voterDiv);
                rejectedBy.push(playerName);
            }
        });

        // Show results
        voteResults.classList.remove('hidden');

        // Also add detailed voting info to chat for historical record
        if (approvedBy.length > 0) {
            this.addGameMessage(`✅ Aprovaram: ${approvedBy.join(', ')}`);
        }
        if (rejectedBy.length > 0) {
            this.addGameMessage(`❌ Rejeitaram: ${rejectedBy.join(', ')}`);
        }
    }

    startMissionPhase() {
        this.gameState.gamePhase = 'mission';
        this.gameState.missionCards = {};
        this.updateGameUI();

        const isPlayerOnTeam = this.gameState.selectedTeam.includes(this.gameState.playerName);
        
        // Add message about mission start
        this.addGameMessage(`⚔️ Missão ${this.gameState.currentMission} iniciada - Equipe: ${this.gameState.selectedTeam.join(', ')}`);
        
        if (isPlayerOnTeam) {
            this.showMissionPhase();
        } else {
            this.showWaitingPhase('Aguardando a equipe completar a missão...');
        }

        // Check if all team members are AI (and player is not on team)
        const teamMembers = this.gameState.selectedTeam.map(name => 
            this.gameState.players.find(p => p.name === name)
        );
        const allTeamMembersAreAI = teamMembers.every(member => member.isAI || member.name === this.gameState.playerName);
        
        // If player is not on team and all others are AI, simulate automatically
        if (!isPlayerOnTeam && teamMembers.every(member => member.isAI)) {
            setTimeout(() => {
                this.simulateAllAIMissionCards();
                this.resolveMission();
            }, 2500);
        }
        // If player is on team but other team members are AI, simulate them
        else if (isPlayerOnTeam && teamMembers.some(member => member.isAI)) {
            // This will be handled when player plays their card
        }
    }

    showMissionPhase() {
        this.hideAllPhases();
        document.getElementById('missionPhase').classList.remove('hidden');

        // Re-enable mission cards
        document.getElementById('successCard').disabled = false;
        document.getElementById('failCard').disabled = false;

        // Show fail card only for spies
        const failCard = document.getElementById('failCard');
        if (this.gameState.playerRole === 'resistance') {
            failCard.style.display = 'none';
        } else {
            failCard.style.display = 'flex';
        }
    }

    playMissionCard(card) {
        this.gameState.missionCards[this.gameState.playerName] = card;
        
        // Disable mission cards
        document.getElementById('successCard').disabled = true;
        document.getElementById('failCard').disabled = true;

        // In real implementation, wait for all team members
        // For demo, simulate other players
        setTimeout(() => {
            this.simulateOtherMissionCards();
            this.resolveMission();
        }, 2000);

        this.showWaitingPhase('Aguardando outros membros da equipe...');
    }

    simulateOtherMissionCards() {
        this.gameState.selectedTeam.forEach(memberName => {
            if (memberName !== this.gameState.playerName) {
                const player = this.gameState.players.find(p => p.name === memberName);
                // Resistance always plays success, spies might play fail
                if (player.role === 'resistance') {
                    this.gameState.missionCards[memberName] = 'success';
                } else {
                    // Spies have a chance to sabotage
                    this.gameState.missionCards[memberName] = Math.random() < 0.7 ? 'fail' : 'success';
                }
            }
        });
    }

    simulateAllAIMissionCards() {
        this.gameState.selectedTeam.forEach(memberName => {
            const player = this.gameState.players.find(p => p.name === memberName);
            
            // Only simulate AI players
            if (player.isAI) {
                // Resistance always plays success, spies might play fail
                if (player.role === 'resistance') {
                    this.gameState.missionCards[memberName] = 'success';
                } else {
                    // Spies have a chance to sabotage
                    this.gameState.missionCards[memberName] = Math.random() < 0.7 ? 'fail' : 'success';
                }
            }
        });
        
        // Add message about mission completion
        this.addGameMessage(`⚔️ A equipe completou a missão!`);
    }

    resolveMission() {
        const cards = Object.values(this.gameState.missionCards);
        const failCount = cards.filter(card => card === 'fail').length;
        const successCount = cards.filter(card => card === 'success').length;
        
        const mission = this.gameState.missions[this.gameState.currentMission - 1];
        const missionSuccessful = failCount < mission.failsRequired;
        
        mission.completed = true;
        mission.success = missionSuccessful;

        // Display mission result with detailed card breakdown
        const cardBreakdown = this.getMissionCardBreakdown(successCount, failCount);
        const resultText = missionSuccessful ? 
            `✅ Missão ${this.gameState.currentMission} bem-sucedida!` :
            `❌ Missão ${this.gameState.currentMission} fracassou!`;
        
        this.addGameMessage(resultText);
        this.addGameMessage(`📊 Cartas jogadas: ${cardBreakdown}`);

        // Check win conditions
        const completedMissions = this.gameState.missions.filter(m => m.completed);
        const successfulMissions = completedMissions.filter(m => m.success).length;
        const failedMissions = completedMissions.filter(m => !m.success).length;

        if (successfulMissions >= 3) {
            setTimeout(() => this.endGame('resistance', 'A Resistência completou 3 missões!'), 3000);
            return;
        }

        if (failedMissions >= 3) {
            setTimeout(() => this.endGame('spies', 'Os Espiões sabotaram 3 missões!'), 3000);
            return;
        }

        // Continue to next mission
        this.gameState.currentMission++;
        this.gameState.currentLeader = (this.gameState.currentLeader + 1) % this.gameState.players.length;
        
        setTimeout(() => {
            this.startTeamSelectionPhase();
        }, 3000);

        this.updateGameUI();
        this.showWaitingPhase('Preparando próxima missão...');
    }

    getMissionCardBreakdown(successCount, failCount) {
        let breakdown = [];
        
        if (successCount > 0) {
            breakdown.push(`${successCount} Sucesso${successCount > 1 ? 's' : ''} ✅`);
        }
        
        if (failCount > 0) {
            breakdown.push(`${failCount} Fracasso${failCount > 1 ? 's' : ''} ❌`);
        }
        
        return breakdown.length > 0 ? breakdown.join(', ') : 'Nenhuma carta jogada';
    }

    endGame(winner, reason) {
        this.gameState.gamePhase = 'gameEnd';
        
        // Clear chat only when game ends
        this.clearGameChat();
        
        const victoryTitle = document.getElementById('victoryTitle');
        const victoryTeam = document.getElementById('victoryTeam');
        const victoryDescription = document.getElementById('victoryDescription');

        if (winner === 'resistance') {
            victoryTitle.textContent = '🛡️ Vitória da Resistência!';
            victoryTeam.className = 'victory-team resistance';
            victoryTeam.textContent = 'A Resistência Triunfou!';
        } else {
            victoryTitle.textContent = '🕵️ Vitória dos Espiões!';
            victoryTeam.className = 'victory-team spies';
            victoryTeam.textContent = 'Os Espiões Dominaram!';
        }

        victoryDescription.textContent = reason;

        // Show final roles
        this.showFinalRoles();
        
        this.showScreen('victoryScreen');
    }

    showFinalRoles() {
        const finalRoles = document.getElementById('finalRoles');
        finalRoles.innerHTML = '';

        this.gameState.players.forEach(player => {
            const roleDiv = document.createElement('div');
            roleDiv.className = `final-role ${player.role}`;
            
            const roleName = player.role === 'resistance' ? 'Resistência' : 'Espião';
            const roleIcon = player.role === 'resistance' ? '🛡️' : '🕵️';
            
            roleDiv.innerHTML = `
                <span>${player.name}</span>
                <span>${roleIcon} ${roleName}</span>
            `;
            
            finalRoles.appendChild(roleDiv);
        });
    }

    hideAllPhases() {
        const phases = ['teamSelection', 'votingPhase', 'missionPhase', 'waitingPhase'];
        phases.forEach(phase => {
            document.getElementById(phase).classList.add('hidden');
        });
    }

    showWaitingPhase(message) {
        this.hideAllPhases();
        document.getElementById('waitingPhase').classList.remove('hidden');
        document.querySelector('#waitingPhase h3').textContent = message;
    }

    // Chat functions
    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (message) {
            this.addChatMessage(this.gameState.playerName, message);
            input.value = '';
        }
    }

    sendGameChatMessage() {
        const input = document.getElementById('gameChatInput');
        const message = input.value.trim();
        if (message) {
            this.addGameChatMessage(this.gameState.playerName, message);
            input.value = '';
        }
    }

    addChatMessage(sender, message, isSystem = false) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isSystem ? 'system' : ''}`;
        
        if (isSystem) {
            messageDiv.textContent = message;
        } else {
            messageDiv.innerHTML = `<span class="sender">${sender}:</span> ${message}`;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addGameChatMessage(sender, message) {
        const chatMessages = document.getElementById('gameChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `<span class="sender">${sender}:</span> ${message}`;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addSystemMessage(message) {
        this.addChatMessage('', message, true);
    }

    addGameMessage(message) {
        this.addGameChatMessage('Sistema', message);
    }

    clearGameChat() {
        const chatMessages = document.getElementById('gameChatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }

    leaveLobby() {
        this.showScreen('mainMenu');
        this.gameState = {
            screen: 'mainMenu',
            roomCode: null,
            isHost: false,
            playerName: '',
            players: []
        };
    }

    playAgain() {
        // Clear chat for new game
        this.clearGameChat();
        
        // Reset game state but keep players
        this.gameState.gamePhase = 'lobby';
        this.gameState.currentMission = 1;
        this.gameState.currentLeader = 0;
        this.gameState.missions.forEach(mission => {
            mission.completed = false;
            mission.success = null;
        });
        this.gameState.playerRole = null;
        this.gameState.knownSpies = [];
        this.gameState.selectedTeam = [];
        this.gameState.votes = {};
        this.gameState.missionCards = {};
        this.gameState.rejectionCount = 0;
        
        this.gameState.players.forEach(player => {
            player.role = null;
        });

        this.showScreen('lobby');
        this.updateLobbyUI();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ResistanceGame();
});