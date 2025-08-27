// Coup Online - Server-side Game Logic
class CoupServer {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        this.characters = ['duke', 'assassin', 'captain', 'ambassador', 'contess'];
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Coup: User connected: ${socket.id}`);

            socket.on('createRoom', (data) => this.createRoom(socket, data));
            socket.on('joinRoom', (data) => this.joinRoom(socket, data));
            socket.on('leaveRoom', () => this.leaveRoom(socket));
            socket.on('startGame', (data) => this.startGame(socket, data));
            socket.on('chatMessage', (data) => this.handleChatMessage(socket, data));
            socket.on('gameChatMessage', (data) => this.handleGameChatMessage(socket, data));
            socket.on('takeAction', (data) => this.handleAction(socket, data));
            socket.on('challengeAction', (data) => this.handleChallenge(socket, data));
            socket.on('blockAction', (data) => this.handleBlock(socket, data));
            socket.on('passReaction', (data) => this.handlePass(socket, data));
            socket.on('cardSelection', (data) => this.handleCardSelection(socket, data));
            socket.on('loseInfluence', (data) => this.handleLoseInfluence(socket, data));
            
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }

    createRoom(socket, data) {
        const roomCode = this.generateRoomCode();
        
        if (this.rooms.has(roomCode)) {
            socket.emit('error', 'Código de sala já existe');
            return;
        }

        const room = {
            code: roomCode,
            host: socket.id,
            players: [{
                id: socket.id,
                name: data.hostName,
                isHost: true,
                coins: 2,
                influences: [],
                revealedInfluences: 0,
                connected: true
            }],
            gameSettings: data.gameSettings,
            gameState: {
                phase: 'lobby',
                deck: [],
                revealedCards: [],
                currentPlayer: null,
                currentAction: null,
                pendingReactions: [],
                turnCount: 0,
                actionCount: 0,
                gameStartTime: null
            }
        };

        this.rooms.set(roomCode, room);
        socket.join(roomCode);

        socket.emit('roomCreated', {
            roomCode: roomCode,
            isHost: true,
            playerName: data.hostName,
            players: room.players,
            gameSettings: room.gameSettings
        });

        console.log(`🏠 Coup: Room created: ${roomCode} by ${data.hostName}`);
    }

    joinRoom(socket, data) {
        const room = this.rooms.get(data.roomCode);
        
        if (!room) {
            socket.emit('error', 'Sala não encontrada');
            return;
        }

        if (room.players.length >= room.gameSettings.maxPlayers) {
            socket.emit('error', 'Sala está cheia');
            return;
        }

        if (room.players.some(p => p.name === data.playerName)) {
            socket.emit('error', 'Nome já está em uso nesta sala');
            return;
        }

        if (room.gameState.phase !== 'lobby') {
            socket.emit('error', 'Jogo já está em andamento');
            return;
        }

        const player = {
            id: socket.id,
            name: data.playerName,
            isHost: false,
            coins: 2,
            influences: [],
            revealedInfluences: 0,
            connected: true
        };

        room.players.push(player);
        socket.join(data.roomCode);

        socket.emit('roomJoined', {
            roomCode: data.roomCode,
            isHost: false,
            playerName: data.playerName,
            players: room.players,
            gameSettings: room.gameSettings
        });

        socket.to(data.roomCode).emit('playerJoined', {
            player: player,
            players: room.players
        });

        console.log(`👤 Coup: ${data.playerName} joined room ${data.roomCode}`);
    }

    startGame(socket, data) {
        const room = this.rooms.get(data.roomCode);
        
        if (!room) {
            socket.emit('error', 'Sala não encontrada');
            return;
        }

        if (room.host !== socket.id) {
            socket.emit('error', 'Apenas o host pode iniciar o jogo');
            return;
        }

        if (room.players.length < 2) {
            socket.emit('error', 'Mínimo de 2 jogadores necessário');
            return;
        }

        this.initializeGame(room);
        this.distributeDeck(room);
        this.dealCards(room);

        // Set first player randomly
        const randomIndex = Math.floor(Math.random() * room.players.length);
        room.gameState.currentPlayer = room.players[randomIndex].id;
        room.gameState.gameStartTime = Date.now();

        // Notify all players
        room.players.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.id);
            if (socket) {
                socket.emit('gameStarted', {
                    players: this.getPublicPlayerInfo(room),
                    currentPlayer: room.gameState.currentPlayer,
                    influences: player.influences,
                    coins: player.coins,
                    deck: { length: room.gameState.deck.length },
                    playerId: player.id,
                    gameSettings: room.gameSettings
                });
            }
        });

        this.io.to(data.roomCode).emit('actionTaken', {
            message: 'Jogo iniciado! Cartas distribuídas.',
            type: 'system'
        });

        console.log(`🎮 Coup: Game started in room ${data.roomCode}`);
    }

    initializeGame(room) {
        room.gameState.phase = 'game';
        room.gameState.deck = [];
        room.gameState.revealedCards = [];
        room.gameState.currentAction = null;
        room.gameState.pendingReactions = [];
        room.gameState.turnCount = 0;
        room.gameState.actionCount = 0;
        
        // Reset player states
        room.players.forEach(player => {
            player.coins = 2;
            player.influences = [];
            player.revealedInfluences = 0;
        });
    }

    distributeDeck(room) {
        const playerCount = room.players.length;
        let cardsPerCharacter;

        // Determine cards per character based on player count
        if (playerCount <= 6) {
            cardsPerCharacter = 3;
        } else if (playerCount <= 8) {
            cardsPerCharacter = 4;
        } else {
            cardsPerCharacter = 5;
        }

        // Create deck
        const characters = room.gameSettings.inquisitorMode 
            ? ['duke', 'assassin', 'captain', 'inquisitor', 'contess']
            : ['duke', 'assassin', 'captain', 'ambassador', 'contess'];

        room.gameState.deck = [];
        characters.forEach(character => {
            for (let i = 0; i < cardsPerCharacter; i++) {
                room.gameState.deck.push(character);
            }
        });

        // Shuffle deck
        this.shuffleDeck(room.gameState.deck);
    }

    dealCards(room) {
        const cardsPerPlayer = room.gameSettings.twoPlayerMode ? 1 : 2;
        
        room.players.forEach(player => {
            player.influences = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                if (room.gameState.deck.length > 0) {
                    player.influences.push(room.gameState.deck.pop());
                }
            }
        });

        // Special 2-player mode setup
        if (room.gameSettings.twoPlayerMode && room.players.length === 2) {
            this.setup2PlayerMode(room);
        }
    }

    setup2PlayerMode(room) {
        // 2-player mode: each player drafts 1 card from 5, gets 1 random from remaining 3
        room.players.forEach((player, index) => {
            // First player starts with 1 coin, second with 2
            player.coins = index === 0 ? 1 : 2;
            
            // Deal additional card for draft selection (simplified for now)
            if (room.gameState.deck.length > 0) {
                player.influences.push(room.gameState.deck.pop());
            }
        });
    }

    handleAction(socket, data) {
        const room = this.rooms.get(data.roomCode);
        if (!room || room.gameState.phase !== 'game') {
            socket.emit('error', 'Jogo não encontrado ou não iniciado');
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            socket.emit('error', 'Jogador não encontrado');
            return;
        }

        if (room.gameState.currentPlayer !== socket.id) {
            socket.emit('error', 'Não é seu turno');
            return;
        }

        // Validate action
        if (!this.validateAction(room, player, data.action, data.target)) {
            return;
        }

        // Set pending action
        room.gameState.currentAction = {
            player: socket.id,
            action: data.action,
            target: data.target,
            resolved: false
        };

        // Check if action can be challenged or blocked
        const canChallenge = this.canChallengeAction(data.action);
        const blockOptions = this.getBlockOptions(data.action);
        const canBlock = blockOptions.length > 0;

        if (canChallenge || canBlock) {
            // Set up reaction phase
            room.gameState.pendingReactions = [];
            const otherPlayers = room.players.filter(p => p.id !== socket.id && this.hasInfluences(p));
            
            otherPlayers.forEach(otherPlayer => {
                const otherSocket = this.io.sockets.sockets.get(otherPlayer.id);
                if (otherSocket) {
                    const reactionData = {
                        title: `${player.name} quer usar ${this.getActionName(data.action)}`,
                        canChallenge: canChallenge,
                        canBlock: canBlock && this.canPlayerBlock(otherPlayer, data.action, data.target),
                        blockOptions: canBlock ? blockOptions : []
                    };
                    
                    otherSocket.emit('reactionRequired', reactionData);
                    room.gameState.pendingReactions.push(otherPlayer.id);
                }
            });

            // Set timeout for reactions
            setTimeout(() => {
                this.resolveReactions(room);
            }, 15000);

            this.io.to(data.roomCode).emit('actionTaken', {
                message: `${player.name} quer usar ${this.getActionName(data.action)}${data.target ? ` em ${this.getPlayerName(room, data.target)}` : ''}`,
                type: 'action'
            });
        } else {
            // Execute action immediately
            this.executeAction(room, room.gameState.currentAction);
        }
    }

    validateAction(room, player, action, target) {
        // Check coins requirements
        if (action === 'coup' && player.coins < 7) {
            return false;
        }
        
        if (action === 'assassinate' && player.coins < 3) {
            return false;
        }

        // Check mandatory coup
        if (player.coins >= 10 && action !== 'coup') {
            return false;
        }

        // Validate target
        if (['coup', 'assassinate', 'steal'].includes(action)) {
            if (!target) return false;
            const targetPlayer = room.players.find(p => p.id === target);
            if (!targetPlayer || !this.hasInfluences(targetPlayer)) return false;
        }

        return true;
    }

    canChallengeAction(action) {
        return ['tax', 'assassinate', 'steal', 'exchange'].includes(action);
    }

    getBlockOptions(action) {
        const blockMap = {
            'foreign-aid': ['duke'],
            'assassinate': ['contess'],
            'steal': ['captain', 'ambassador', 'inquisitor']
        };
        
        return blockMap[action] || [];
    }

    canPlayerBlock(player, action, target) {
        if (action === 'steal' && target === player.id) {
            return true;
        }
        if (action === 'assassinate' && target === player.id) {
            return true;
        }
        if (action === 'foreign-aid') {
            return true;
        }
        return false;
    }

    handleChallenge(socket, data) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.currentAction) {
            return;
        }

        const challenger = room.players.find(p => p.id === socket.id);
        const actionPlayer = room.players.find(p => p.id === room.gameState.currentAction.player);
        
        if (!challenger || !actionPlayer) {
            return;
        }

        // Remove challenger from pending reactions
        room.gameState.pendingReactions = room.gameState.pendingReactions.filter(id => id !== socket.id);

        // Resolve challenge
        this.resolveChallenge(room, challenger, actionPlayer, room.gameState.currentAction.action);
    }

    resolveChallenge(room, challenger, actionPlayer, action) {
        const requiredCharacter = this.getRequiredCharacter(action);
        const hasCharacter = actionPlayer.influences.includes(requiredCharacter);

        if (hasCharacter) {
            // Challenge failed - challenger loses influence
            this.io.to(room.code).emit('challengeResult', {
                challengeSuccessful: false,
                message: `${challenger.name} contestou ${actionPlayer.name}, mas ${actionPlayer.name} tinha ${this.getCharacterName(requiredCharacter)}! ${challenger.name} perde uma influência.`,
                loseInfluence: true,
                playerId: challenger.id
            });

            this.requestInfluenceLoss(room, challenger);
            
            // Shuffle the character back into deck
            const cardIndex = actionPlayer.influences.indexOf(requiredCharacter);
            actionPlayer.influences.splice(cardIndex, 1);
            room.gameState.deck.push(requiredCharacter);
            this.shuffleDeck(room.gameState.deck);
            
            // Deal new card
            if (room.gameState.deck.length > 0) {
                actionPlayer.influences.push(room.gameState.deck.pop());
            }

            // Execute the action
            setTimeout(() => {
                this.executeAction(room, room.gameState.currentAction);
            }, 2000);
            
        } else {
            // Challenge successful - action player loses influence
            this.io.to(room.code).emit('challengeResult', {
                challengeSuccessful: true,
                message: `${challenger.name} contestou ${actionPlayer.name} com sucesso! ${actionPlayer.name} não tinha ${this.getCharacterName(requiredCharacter)} e perde uma influência.`,
                loseInfluence: true,
                playerId: actionPlayer.id
            });

            this.requestInfluenceLoss(room, actionPlayer);
            
            // Cancel the action and move to next player
            room.gameState.currentAction = null;
            setTimeout(() => {
                this.nextTurn(room);
            }, 2000);
        }

        // Clear pending reactions
        room.gameState.pendingReactions = [];
    }

    handleBlock(socket, data) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.currentAction) {
            return;
        }

        const blocker = room.players.find(p => p.id === socket.id);
        if (!blocker) {
            return;
        }

        // Remove blocker from pending reactions
        room.gameState.pendingReactions = room.gameState.pendingReactions.filter(id => id !== socket.id);

        // Set up block challenge
        room.gameState.currentBlock = {
            player: socket.id,
            character: data.character,
            originalAction: room.gameState.currentAction
        };

        const actionPlayer = room.players.find(p => p.id === room.gameState.currentAction.player);
        const actionSocket = this.io.sockets.sockets.get(actionPlayer.id);

        if (actionSocket) {
            actionSocket.emit('reactionRequired', {
                title: `${blocker.name} quer bloquear com ${this.getCharacterName(data.character)}`,
                canChallenge: true,
                canBlock: false,
                blockOptions: []
            });
        }

        this.io.to(room.code).emit('actionTaken', {
            message: `${blocker.name} quer bloquear com ${this.getCharacterName(data.character)}`,
            type: 'block'
        });

        // Set timeout for block challenge
        setTimeout(() => {
            if (room.gameState.currentBlock) {
                // Block not challenged - block succeeds
                this.resolveBlock(room, true);
            }
        }, 15000);
    }

    resolveBlock(room, blockSuccessful) {
        const block = room.gameState.currentBlock;
        if (!block) return;

        const blocker = room.players.find(p => p.id === block.player);
        
        if (blockSuccessful) {
            this.io.to(room.code).emit('actionTaken', {
                message: `${blocker.name} bloqueou a ação com sucesso!`,
                type: 'block'
            });

            // Cancel the original action
            room.gameState.currentAction = null;
            room.gameState.currentBlock = null;
            
            this.nextTurn(room);
        } else {
            // Block failed, execute original action
            const originalAction = block.originalAction;
            room.gameState.currentBlock = null;
            
            this.executeAction(room, originalAction);
        }
    }

    handlePass(socket, data) {
        const room = this.rooms.get(data.roomCode);
        if (!room) {
            return;
        }

        // Remove player from pending reactions
        room.gameState.pendingReactions = room.gameState.pendingReactions.filter(id => id !== socket.id);

        // If no more pending reactions, resolve
        if (room.gameState.pendingReactions.length === 0) {
            this.resolveReactions(room);
        }
    }

    resolveReactions(room) {
        // Clear any remaining pending reactions
        room.gameState.pendingReactions = [];

        if (room.gameState.currentAction && !room.gameState.currentAction.resolved) {
            this.executeAction(room, room.gameState.currentAction);
        }
    }

    executeAction(room, action) {
        if (!action || action.resolved) {
            return;
        }

        action.resolved = true;
        const player = room.players.find(p => p.id === action.player);
        const targetPlayer = action.target ? room.players.find(p => p.id === action.target) : null;

        if (!player) {
            return;
        }

        room.gameState.actionCount++;
        let message = '';

        switch (action.action) {
            case 'income':
                player.coins += 1;
                message = `${player.name} recebeu 1 moeda (Renda)`;
                break;

            case 'foreign-aid':
                player.coins += 2;
                message = `${player.name} recebeu 2 moedas (Ajuda Externa)`;
                break;

            case 'coup':
                if (player.coins >= 7 && targetPlayer) {
                    player.coins -= 7;
                    message = `${player.name} deu um golpe em ${targetPlayer.name}`;
                    this.requestInfluenceLoss(room, targetPlayer);
                }
                break;

            case 'tax':
                player.coins += 3;
                message = `${player.name} coletou 3 moedas (Taxar - Duque)`;
                break;

            case 'assassinate':
                if (player.coins >= 3 && targetPlayer) {
                    player.coins -= 3;
                    message = `${player.name} assassinou ${targetPlayer.name}`;
                    this.requestInfluenceLoss(room, targetPlayer);
                }
                break;

            case 'steal':
                if (targetPlayer) {
                    const stolenCoins = Math.min(2, targetPlayer.coins);
                    targetPlayer.coins -= stolenCoins;
                    player.coins += stolenCoins;
                    message = `${player.name} extorquiu ${stolenCoins} moeda(s) de ${targetPlayer.name} (Capitão)`;
                }
                break;

            case 'exchange':
                this.handleExchange(room, player);
                message = `${player.name} está trocando cartas (Embaixador)`;
                break;
        }

        this.io.to(room.code).emit('actionTaken', {
            message: message,
            type: 'action'
        });

        // Update game state
        this.updateGameState(room);

        // Check win condition
        if (this.checkWinCondition(room)) {
            return;
        }

        // Move to next turn (with delay for exchange)
        setTimeout(() => {
            room.gameState.currentAction = null;
            this.nextTurn(room);
        }, action.action === 'exchange' ? 5000 : 1000);
    }

    handleExchange(room, player) {
        // Draw 2 cards from deck
        const drawnCards = [];
        for (let i = 0; i < 2 && room.gameState.deck.length > 0; i++) {
            drawnCards.push(room.gameState.deck.pop());
        }

        // Combine with current influences
        const availableCards = [...player.influences.filter(card => card !== 'revealed'), ...drawnCards];
        
        // Send card selection to player
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
            socket.emit('cardSelection', {
                title: 'Escolha suas cartas (mantenha ' + player.influences.filter(card => card !== 'revealed').length + ')',
                cards: availableCards,
                required: player.influences.filter(card => card !== 'revealed').length
            });
        }

        // Store exchange data
        room.gameState.pendingExchange = {
            player: player.id,
            availableCards: availableCards,
            required: player.influences.filter(card => card !== 'revealed').length
        };
    }

    handleCardSelection(socket, data) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.pendingExchange) {
            return;
        }

        const exchange = room.gameState.pendingExchange;
        if (exchange.player !== socket.id) {
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            return;
        }

        // Update player's influences
        const selectedCards = data.selectedCards.map(index => exchange.availableCards[index]);
        const remainingCards = exchange.availableCards.filter((_, index) => !data.selectedCards.includes(index));

        // Replace non-revealed influences
        const newInfluences = [];
        let selectedIndex = 0;
        
        player.influences.forEach(influence => {
            if (influence === 'revealed') {
                newInfluences.push('revealed');
            } else {
                newInfluences.push(selectedCards[selectedIndex++]);
            }
        });

        player.influences = newInfluences;

        // Return remaining cards to deck
        remainingCards.forEach(card => {
            room.gameState.deck.push(card);
        });
        
        this.shuffleDeck(room.gameState.deck);

        // Clear exchange state
        room.gameState.pendingExchange = null;

        this.io.to(room.code).emit('actionTaken', {
            message: `${player.name} terminou a troca de cartas`,
            type: 'action'
        });

        this.updateGameState(room);
    }

    requestInfluenceLoss(room, player) {
        if (!this.hasInfluences(player)) {
            return;
        }

        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
            socket.emit('cardSelection', {
                title: 'Escolha uma influência para revelar',
                cards: player.influences.filter(card => card !== 'revealed'),
                required: 1
            });
        }

        // Store influence loss data
        room.gameState.pendingInfluenceLoss = {
            player: player.id
        };
    }

    handleLoseInfluence(socket, data) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.pendingInfluenceLoss) {
            return;
        }

        if (room.gameState.pendingInfluenceLoss.player !== socket.id) {
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            return;
        }

        // Find the card to reveal
        const activeInfluences = player.influences.filter(card => card !== 'revealed');
        const cardToReveal = activeInfluences[data.cardIndex];
        
        if (cardToReveal) {
            // Reveal the influence
            const influenceIndex = player.influences.indexOf(cardToReveal);
            player.influences[influenceIndex] = 'revealed';
            player.revealedInfluences++;

            // Add to revealed cards pile
            room.gameState.revealedCards.push(cardToReveal);

            this.io.to(room.code).emit('actionTaken', {
                message: `${player.name} perdeu uma influência (${this.getCharacterName(cardToReveal)})`,
                type: 'system'
            });
        }

        // Clear influence loss state
        room.gameState.pendingInfluenceLoss = null;

        // Update game state
        this.updateGameState(room);

        // Check win condition
        this.checkWinCondition(room);
    }

    nextTurn(room) {
        if (room.gameState.phase !== 'game') {
            return;
        }

        // Find next active player
        const currentIndex = room.players.findIndex(p => p.id === room.gameState.currentPlayer);
        let nextIndex = (currentIndex + 1) % room.players.length;
        
        // Skip eliminated players
        while (!this.hasInfluences(room.players[nextIndex])) {
            nextIndex = (nextIndex + 1) % room.players.length;
        }

        room.gameState.currentPlayer = room.players[nextIndex].id;
        room.gameState.turnCount++;

        this.updateGameState(room);

        this.io.to(room.code).emit('actionTaken', {
            message: `Turno de ${room.players[nextIndex].name}`,
            type: 'system'
        });
    }

    checkWinCondition(room) {
        const activePlayers = room.players.filter(p => this.hasInfluences(p));
        
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            const gameEndTime = Date.now();
            const gameDuration = gameEndTime - room.gameState.gameStartTime;

            // Create ranking
            const ranking = [...room.players].sort((a, b) => {
                const aInfluences = a.influences.filter(card => card !== 'revealed').length;
                const bInfluences = b.influences.filter(card => card !== 'revealed').length;
                return bInfluences - aInfluences;
            });

            this.io.to(room.code).emit('gameEnded', {
                winner: winner,
                ranking: ranking.map(p => ({
                    name: p.name,
                    influences: p.influences.filter(card => card !== 'revealed').length
                })),
                totalTurns: room.gameState.turnCount,
                totalActions: room.gameState.actionCount,
                duration: gameDuration
            });

            // Reset room to lobby state
            room.gameState.phase = 'lobby';
            console.log(`🏆 Coup: Game ended in room ${room.code}, winner: ${winner.name}`);
            
            return true;
        }

        return false;
    }

    updateGameState(room) {
        const publicPlayerInfo = this.getPublicPlayerInfo(room);
        
        this.io.to(room.code).emit('gameStateUpdate', {
            players: publicPlayerInfo,
            currentPlayer: room.gameState.currentPlayer,
            deck: { length: room.gameState.deck.length },
            revealedCards: room.gameState.revealedCards
        });

        // Send private info to each player
        room.players.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.id);
            if (socket && this.hasInfluences(player)) {
                socket.emit('gameStateUpdate', {
                    influences: player.influences,
                    coins: player.coins
                });
            }
        });
    }

    getPublicPlayerInfo(room) {
        return room.players.map(player => ({
            id: player.id,
            name: player.name,
            isHost: player.isHost,
            coins: player.coins,
            influences: player.influences.filter(card => card !== 'revealed').length,
            revealedInfluences: player.revealedInfluences,
            connected: player.connected
        }));
    }

    hasInfluences(player) {
        return player.influences.some(card => card !== 'revealed');
    }

    getRequiredCharacter(action) {
        const actionMap = {
            'tax': 'duke',
            'assassinate': 'assassin',
            'steal': 'captain',
            'exchange': 'ambassador'
        };
        
        return actionMap[action];
    }

    getCharacterName(character) {
        const names = {
            'duke': 'Duque',
            'assassin': 'Assassino',
            'captain': 'Capitão',
            'ambassador': 'Embaixador',
            'contess': 'Condessa',
            'inquisitor': 'Inquisidor'
        };
        
        return names[character] || character;
    }

    getActionName(action) {
        const names = {
            'income': 'Renda',
            'foreign-aid': 'Ajuda Externa',
            'coup': 'Golpe',
            'tax': 'Taxar',
            'assassinate': 'Assassinar',
            'steal': 'Extorquir',
            'exchange': 'Trocar'
        };
        
        return names[action] || action;
    }

    getPlayerName(room, playerId) {
        const player = room.players.find(p => p.id === playerId);
        return player ? player.name : 'Desconhecido';
    }

    handleChatMessage(socket, data) {
        socket.to(data.roomCode).emit('chatMessage', {
            sender: data.sender,
            message: data.message,
            timestamp: Date.now()
        });
    }

    handleGameChatMessage(socket, data) {
        socket.to(data.roomCode).emit('gameChatMessage', {
            sender: data.sender,
            message: data.message,
            timestamp: Date.now()
        });
    }

    leaveRoom(socket) {
        for (const [roomCode, room] of this.rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                room.players.splice(playerIndex, 1);

                if (room.players.length === 0) {
                    this.rooms.delete(roomCode);
                    console.log(`🗑️ Coup: Room ${roomCode} deleted (empty)`);
                } else {
                    // Promote new host if needed
                    if (room.host === socket.id) {
                        room.host = room.players[0].id;
                        room.players[0].isHost = true;
                    }

                    socket.to(roomCode).emit('playerLeft', {
                        players: this.getPublicPlayerInfo(room)
                    });

                    // If game is in progress, handle player elimination
                    if (room.gameState.phase === 'game') {
                        player.connected = false;
                        this.checkWinCondition(room);
                    }
                }
                break;
            }
        }
    }

    handleDisconnect(socket) {
        console.log(`🔌 Coup: User disconnected: ${socket.id}`);
        this.leaveRoom(socket);
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}

module.exports = CoupServer;