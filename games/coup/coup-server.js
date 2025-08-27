// Coup Online - Server-side Game Logic
const CoupAI = require('./coup-ai');

class CoupServer {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        this.characters = ['duke', 'assassin', 'captain', 'ambassador', 'contess'];
        this.bots = new Map(); // Store bot instances
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Coup: User connected: ${socket.id}`);

            socket.on('coup:createRoom', (data) => this.createRoom(socket, data));
            socket.on('coup:joinRoom', (data) => this.joinRoom(socket, data));
            socket.on('coup:leaveRoom', () => this.leaveRoom(socket));
            socket.on('coup:startGame', (data) => this.startGame(socket, data));
            socket.on('coup:addBot', (data) => this.addBot(socket, data));
            socket.on('coup:removeBot', (data) => this.removeBot(socket, data));
            socket.on('coup:chatMessage', (data) => this.handleChatMessage(socket, data));
            socket.on('coup:gameChatMessage', (data) => this.handleGameChatMessage(socket, data));
            socket.on('coup:takeAction', (data) => this.handleAction(socket, data));
            socket.on('coup:challengeAction', (data) => this.handleChallenge(socket, data));
            socket.on('coup:blockAction', (data) => this.handleBlock(socket, data));
            socket.on('coup:passReaction', (data) => this.handlePass(socket, data));
            socket.on('coup:cardSelection', (data) => this.handleCardSelection(socket, data));
            socket.on('coup:loseInfluence', (data) => this.handleLoseInfluence(socket, data));
            
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

    addBot(socket, data) {
        const room = this.rooms.get(data.roomCode);
        
        if (!room) {
            socket.emit('error', 'Sala não encontrada');
            return;
        }

        if (room.host !== socket.id) {
            socket.emit('error', 'Apenas o host pode adicionar bots');
            return;
        }

        if (room.players.length >= room.gameSettings.maxPlayers) {
            socket.emit('error', 'Sala está cheia');
            return;
        }

        if (room.gameState.phase !== 'lobby') {
            socket.emit('error', 'Não é possível adicionar bots durante o jogo');
            return;
        }

        const difficulty = data.difficulty || 'medium';
        const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const botAI = new CoupAI(difficulty);
        
        const botNames = [
            'Magnus Bot', 'Alice AI', 'Charlie CPU', 'Diana Droid',
            'Eddie Engine', 'Fiona Fighter', 'Gary Ghost', 'Helen Hacker',
            'Ivan Intel', 'Julia Judge', 'Kevin Knight', 'Luna Logic'
        ];
        
        const usedNames = room.players.map(p => p.name);
        
        // Generate potential bot names with difficulty suffix
        const potentialNames = botNames.map(name => `${name} [${difficulty.toUpperCase()}]`);
        const availableNames = potentialNames.filter(name => !usedNames.includes(name));
        
        let botName;
        if (availableNames.length > 0) {
            botName = availableNames[Math.floor(Math.random() * availableNames.length)];
        } else {
            // Fallback: create unique name with counter
            let counter = 1;
            do {
                botName = `Bot ${counter} [${difficulty.toUpperCase()}]`;
                counter++;
            } while (usedNames.includes(botName));
        }

        const botPlayer = {
            id: botId,
            name: botName,
            isHost: false,
            isBot: true,
            coins: 2,
            influences: [],
            revealedInfluences: 0,
            connected: true,
            difficulty: difficulty
        };

        room.players.push(botPlayer);
        this.bots.set(botId, botAI);

        // Notify all players about the new bot
        this.io.to(data.roomCode).emit('playerJoined', {
            player: botPlayer,
            players: room.players
        });

        this.io.to(data.roomCode).emit('chatMessage', {
            sender: 'Sistema',
            message: `Bot ${botName} (${difficulty}) foi adicionado à sala`,
            timestamp: Date.now(),
            isSystem: true
        });

        console.log(`🤖 Coup: Bot ${botName} (${difficulty}) added to room ${data.roomCode}`);
    }

    removeBot(socket, data) {
        const room = this.rooms.get(data.roomCode);
        
        if (!room) {
            socket.emit('error', 'Sala não encontrada');
            return;
        }

        if (room.host !== socket.id) {
            socket.emit('error', 'Apenas o host pode remover bots');
            return;
        }

        if (room.gameState.phase !== 'lobby') {
            socket.emit('error', 'Não é possível remover bots durante o jogo');
            return;
        }

        const botIndex = room.players.findIndex(p => p.id === data.botId && p.isBot);
        
        if (botIndex === -1) {
            socket.emit('error', 'Bot não encontrado');
            return;
        }

        const bot = room.players[botIndex];
        room.players.splice(botIndex, 1);
        this.bots.delete(data.botId);

        // Notify all players about bot removal
        this.io.to(data.roomCode).emit('playerLeft', {
            players: room.players
        });

        this.io.to(data.roomCode).emit('chatMessage', {
            sender: 'Sistema',
            message: `Bot ${bot.name} foi removido da sala`,
            timestamp: Date.now(),
            isSystem: true
        });

        console.log(`🤖 Coup: Bot ${bot.name} removed from room ${data.roomCode}`);
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

    handleAction(socket, data, botId = null) {
        const room = this.rooms.get(data.roomCode);
        if (!room || room.gameState.phase !== 'game') {
            if (socket) socket.emit('error', 'Jogo não encontrado ou não iniciado');
            return;
        }

        const playerId = botId || (socket ? socket.id : null);
        const player = room.players.find(p => p.id === playerId);
        if (!player) {
            if (socket) socket.emit('error', 'Jogador não encontrado');
            return;
        }

        if (room.gameState.currentPlayer !== playerId) {
            if (socket) socket.emit('error', 'Não é seu turno');
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
            const otherPlayers = room.players.filter(p => p.id !== playerId && this.hasInfluences(p));
            
            otherPlayers.forEach(otherPlayer => {
                const reactionData = {
                    title: `${player.name} quer usar ${this.getActionName(data.action)}`,
                    canChallenge: canChallenge,
                    canBlock: canBlock && this.canPlayerBlock(otherPlayer, data.action, data.target),
                    blockOptions: canBlock ? blockOptions : []
                };

                if (otherPlayer.isBot) {
                    // Handle bot reactions
                    room.gameState.pendingReactions.push(otherPlayer.id);
                    const botAI = this.bots.get(otherPlayer.id);
                    let delay = botAI ? botAI.getReactionDelay() : 1000;
                    
                    // Speed up if all remaining players are bots
                    const allBots = room.players.every(p => p.isBot || !this.hasInfluences(p));
                    if (allBots) {
                        delay = Math.min(delay, 300);
                    }
                    
                    setTimeout(() => {
                        this.processBotReaction(room, otherPlayer, reactionData, player, data.action);
                    }, delay);
                } else {
                    // Handle human player reactions
                    const otherSocket = this.io.sockets.sockets.get(otherPlayer.id);
                    if (otherSocket) {
                        otherSocket.emit('reactionRequired', reactionData);
                        room.gameState.pendingReactions.push(otherPlayer.id);
                    }
                }
            });

            // Set timeout for reactions - shorter for bot-heavy games
            const allPlayersAreBots = room.players.every(p => p.isBot || !this.hasInfluences(p));
            const reactionTimeout = allPlayersAreBots ? 3000 : 15000;
            
            setTimeout(() => {
                this.resolveReactions(room);
            }, reactionTimeout);

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

    handleChallenge(socket, data, botId = null) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.currentAction) {
            return;
        }

        const challengerId = botId || (socket ? socket.id : null);
        const challenger = room.players.find(p => p.id === challengerId);
        const actionPlayer = room.players.find(p => p.id === room.gameState.currentAction.player);
        
        if (!challenger || !actionPlayer) {
            return;
        }

        // Remove challenger from pending reactions
        room.gameState.pendingReactions = room.gameState.pendingReactions.filter(id => id !== challengerId);

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

            // Execute the action - faster for bot games
            const allPlayersBots = room.players.every(p => p.isBot || !this.hasInfluences(p));
            const executionDelay = allPlayersBots ? 200 : 500;
            setTimeout(() => {
                this.executeAction(room, room.gameState.currentAction);
            }, executionDelay);
            
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
            const turnDelay = room.players.every(p => p.isBot || !this.hasInfluences(p)) ? 200 : 500;
            setTimeout(() => {
                this.nextTurn(room);
            }, turnDelay);
        }

        // Clear pending reactions
        room.gameState.pendingReactions = [];
    }

    handleBlock(socket, data, botId = null) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.currentAction) {
            return;
        }

        const blockerId = botId || (socket ? socket.id : null);
        const blocker = room.players.find(p => p.id === blockerId);
        if (!blocker) {
            return;
        }

        // Remove blocker from pending reactions
        room.gameState.pendingReactions = room.gameState.pendingReactions.filter(id => id !== blockerId);

        // Set up block challenge
        room.gameState.currentBlock = {
            player: blockerId,
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

        // Set timeout for block challenge - shorter for bot games
        const blockTimeout = room.players.every(p => p.isBot || !this.hasInfluences(p)) ? 3000 : 15000;
        setTimeout(() => {
            if (room.gameState.currentBlock) {
                // Block not challenged - block succeeds
                this.resolveBlock(room, true);
            }
        }, blockTimeout);
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

    handlePass(socket, data, botId = null) {
        const room = this.rooms.get(data.roomCode);
        if (!room) {
            return;
        }

        const playerId = botId || (socket ? socket.id : null);

        // Remove player from pending reactions
        room.gameState.pendingReactions = room.gameState.pendingReactions.filter(id => id !== playerId);

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

        // Move to next turn (with shorter delays)
        const allBots = room.players.every(p => p.isBot || !this.hasInfluences(p));
        const actionDelay = allBots ? 
            (action.action === 'exchange' ? 500 : 200) : 
            (action.action === 'exchange' ? 1000 : 500);
        setTimeout(() => {
            room.gameState.currentAction = null;
            this.nextTurn(room);
        }, actionDelay);
    }

    handleExchange(room, player) {
        // Draw 2 cards from deck
        const drawnCards = [];
        for (let i = 0; i < 2 && room.gameState.deck.length > 0; i++) {
            drawnCards.push(room.gameState.deck.pop());
        }

        // Combine with current influences
        const availableCards = [...player.influences.filter(card => card !== 'revealed'), ...drawnCards];
        
        // Handle exchange for bots vs humans
        if (player.isBot) {
            // Handle bot exchange automatically
            const exchangeDelay = room.players.every(p => p.isBot || !this.hasInfluences(p)) ? 300 : 600;
            setTimeout(() => {
                this.processBotCardSelection(room, player, {
                    type: 'exchange',
                    availableCards: availableCards,
                    required: player.influences.filter(card => card !== 'revealed').length
                });
            }, exchangeDelay);
        } else {
            // Send card selection to human player
            const socket = this.io.sockets.sockets.get(player.id);
            if (socket) {
                socket.emit('cardSelection', {
                    title: 'Escolha suas cartas (mantenha ' + player.influences.filter(card => card !== 'revealed').length + ')',
                    cards: availableCards,
                    required: player.influences.filter(card => card !== 'revealed').length
                });
            }
        }

        // Store exchange data
        room.gameState.pendingExchange = {
            player: player.id,
            availableCards: availableCards,
            required: player.influences.filter(card => card !== 'revealed').length
        };
    }

    handleCardSelection(socket, data, botId = null) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.pendingExchange) {
            return;
        }

        const playerId = botId || (socket ? socket.id : null);
        const exchange = room.gameState.pendingExchange;
        if (exchange.player !== playerId) {
            return;
        }

        const player = room.players.find(p => p.id === playerId);
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

        if (player.isBot) {
            // Handle bot influence loss automatically
            const botDelay = room.players.every(p => p.isBot || !this.hasInfluences(p)) ? 200 : 300;
            setTimeout(() => {
                this.processBotCardSelection(room, player, {
                    type: 'loseInfluence',
                    player: player.id
                });
            }, botDelay);
        } else {
            const socket = this.io.sockets.sockets.get(player.id);
            if (socket) {
                socket.emit('cardSelection', {
                    title: 'Escolha uma influência para revelar',
                    cards: player.influences.filter(card => card !== 'revealed'),
                    required: 1
                });
            }
        }

        // Store influence loss data
        room.gameState.pendingInfluenceLoss = {
            player: player.id
        };
    }

    handleLoseInfluence(socket, data, botId = null) {
        const room = this.rooms.get(data.roomCode);
        if (!room || !room.gameState.pendingInfluenceLoss) {
            return;
        }

        const playerId = botId || (socket ? socket.id : null);
        if (room.gameState.pendingInfluenceLoss.player !== playerId) {
            return;
        }

        const player = room.players.find(p => p.id === playerId);
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

        const currentPlayer = room.players[nextIndex];
        this.io.to(room.code).emit('actionTaken', {
            message: `Turno de ${currentPlayer.name}`,
            type: 'system'
        });

        // If current player is a bot, make it play automatically
        if (currentPlayer.isBot) {
            // Check if all players are bots for turbo mode
            const allBots = room.players.every(p => p.isBot || !this.hasInfluences(p));
            const delay = allBots ? 200 : 800;
            
            setTimeout(() => {
                this.processBotTurn(room, currentPlayer);
            }, delay);
            
            // Safety timeout: Force bot to take income after 30 seconds max
            setTimeout(() => {
                if (room.gameState.currentPlayer === currentPlayer.id && room.gameState.phase === 'game') {
                    console.log(`⚠️ Bot ${currentPlayer.name} timeout - forcing income action`);
                    this.handleAction(null, {
                        roomCode: room.code,
                        action: 'income'
                    }, currentPlayer.id);
                }
            }, 30000);
        }
    }

    processBotTurn(room, botPlayer) {
        const botAI = this.bots.get(botPlayer.id);
        if (!botAI) {
            console.error(`Bot AI not found for ${botPlayer.id}`);
            this.nextTurn(room);
            return;
        }

        try {
            const gameState = this.getBotGameState(room, botPlayer);
            const decision = botAI.decideTurn(gameState, botPlayer);
            
            console.log(`🤖 Bot ${botPlayer.name} decided: ${decision.action}${decision.target ? ` -> ${this.getPlayerName(room, decision.target)}` : ''}`);

            // Execute the bot's action
            this.handleAction(null, {
                roomCode: room.code,
                action: decision.action,
                target: decision.target
            }, botPlayer.id);

        } catch (error) {
            console.error('Bot decision error:', error);
            // Fallback to income if there's an error
            this.handleAction(null, {
                roomCode: room.code,
                action: 'income'
            }, botPlayer.id);
        }
    }

    getBotGameState(room, botPlayer) {
        // Create a sanitized game state for the bot AI
        return {
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                coins: p.coins,
                influences: p.influences.filter(card => card !== 'revealed').length,
                revealedInfluences: p.revealedInfluences,
                isBot: p.isBot || false
            })),
            revealedCards: [...room.gameState.revealedCards],
            deckCount: room.gameState.deck.length,
            currentPlayer: room.gameState.currentPlayer,
            turnCount: room.gameState.turnCount
        };
    }

    processBotReaction(room, botPlayer, reactionData, actionPlayer, action) {
        const botAI = this.bots.get(botPlayer.id);
        if (!botAI || !room.gameState.pendingReactions.includes(botPlayer.id)) {
            return;
        }

        try {
            const gameState = this.getBotGameState(room, botPlayer);
            const decision = botAI.decideReaction(reactionData, botPlayer, gameState, actionPlayer, action);
            
            console.log(`🤖 Bot ${botPlayer.name} reaction: Challenge=${decision.challenge}, Block=${decision.block}`);

            // Remove bot from pending reactions first
            room.gameState.pendingReactions = room.gameState.pendingReactions.filter(id => id !== botPlayer.id);

            if (decision.challenge) {
                this.handleChallenge(null, { roomCode: room.code }, botPlayer.id);
            } else if (decision.block) {
                this.handleBlock(null, { 
                    roomCode: room.code, 
                    character: decision.blockCharacter 
                }, botPlayer.id);
            } else {
                this.handlePass(null, { roomCode: room.code }, botPlayer.id);
            }

        } catch (error) {
            console.error('Bot reaction error:', error);
            // Default to pass on error
            this.handlePass(null, { roomCode: room.code }, botPlayer.id);
        }
    }

    processBotCardSelection(room, botPlayer, selectionData) {
        const botAI = this.bots.get(botPlayer.id);
        if (!botAI) {
            return;
        }

        try {
            const gameState = this.getBotGameState(room, botPlayer);
            
            if (selectionData.type === 'exchange') {
                const selectedCards = botAI.selectCardsToKeep(
                    selectionData.availableCards, 
                    selectionData.required, 
                    botPlayer, 
                    gameState
                );
                
                this.handleCardSelection(null, {
                    roomCode: room.code,
                    selectedCards: selectedCards
                }, botPlayer.id);
                
            } else if (selectionData.type === 'loseInfluence') {
                const cardIndex = botAI.selectInfluenceToLose(botPlayer, gameState);
                
                this.handleLoseInfluence(null, {
                    roomCode: room.code,
                    cardIndex: cardIndex
                }, botPlayer.id);
            }

        } catch (error) {
            console.error('Bot card selection error:', error);
            // Fallback to random selection
            if (selectionData.type === 'loseInfluence') {
                const activeCards = botPlayer.influences
                    .map((card, index) => ({ card, index }))
                    .filter(c => c.card !== 'revealed');
                const randomIndex = Math.floor(Math.random() * activeCards.length);
                
                this.handleLoseInfluence(null, {
                    roomCode: room.code,
                    cardIndex: activeCards[randomIndex].index
                }, botPlayer.id);
            }
        }
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