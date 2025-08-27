const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Porta do Railway ou 3000 local
const PORT = process.env.PORT || 3000;

// Armazenamento de salas
const rooms = new Map();

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Rota principal - servir o arquivo index.html
app.get('/', (req, res) => {
    const indexPath = path.resolve(__dirname, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Erro ao servir index.html:', err);
            res.status(500).send('Erro interno do servidor');
        }
    });
});

// Rota para o jogo original de batalha
app.get('/battle', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log(`🔌 Usuário conectado: ${socket.id}`);
    
    socket.on('createRoom', (data) => {
        const { roomCode, roomName, hostName, maxPlayers, gameMode } = data;
        
        if (rooms.has(roomCode)) {
            socket.emit('error', 'Código de sala já existe');
            return;
        }
        
        const room = {
            code: roomCode,
            name: roomName,
            host: socket.id,
            maxPlayers,
            gameMode,
            players: [{
                id: socket.id,
                name: hostName,
                isHost: true,
                role: null
            }]
        };
        
        rooms.set(roomCode, room);
        socket.join(roomCode);
        
        socket.emit('roomCreated', {
            roomCode,
            isHost: true,
            playerName: hostName,
            players: room.players
        });
        
        console.log(`🏠 Sala criada: ${roomCode} por ${hostName}`);
    });
    
    socket.on('joinRoom', (data) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', 'Sala não encontrada');
            return;
        }
        
        if (room.players.length >= room.maxPlayers) {
            socket.emit('error', 'Sala está cheia');
            return;
        }
        
        if (room.players.some(p => p.name === playerName)) {
            socket.emit('error', 'Nome já está em uso nesta sala');
            return;
        }
        
        const player = {
            id: socket.id,
            name: playerName,
            isHost: false,
            role: null
        };
        
        room.players.push(player);
        socket.join(roomCode);
        
        // Notifica o jogador que entrou
        socket.emit('roomJoined', {
            roomCode,
            isHost: false,
            playerName,
            players: room.players
        });
        
        // Notifica todos na sala sobre o novo jogador
        socket.to(roomCode).emit('playerJoined', {
            player,
            players: room.players
        });
        
        console.log(`👤 ${playerName} entrou na sala ${roomCode}`);
    });
    
    socket.on('leaveRoom', () => {
        const roomCode = Array.from(socket.rooms).find(room => room !== socket.id);
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                room.players = room.players.filter(p => p.id !== socket.id);
                
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                    console.log(`🗑️ Sala ${roomCode} removida (vazia)`);
                } else {
                    // Se o host saiu, promover próximo jogador
                    if (room.host === socket.id) {
                        room.host = room.players[0].id;
                        room.players[0].isHost = true;
                    }
                    
                    socket.to(roomCode).emit('playerLeft', {
                        players: room.players
                    });
                }
            }
            socket.leave(roomCode);
        }
    });
    
    socket.on('chatMessage', (data) => {
        const { roomCode, message, sender } = data;
        socket.to(roomCode).emit('chatMessage', {
            sender,
            message,
            timestamp: Date.now()
        });
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Usuário desconectado: ${socket.id}`);
        
        // Remove player from any room they were in
        for (const [roomCode, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                    console.log(`🗑️ Sala ${roomCode} removida (vazia)`);
                } else {
                    // Se o host desconectou, promover próximo jogador
                    if (room.host === socket.id) {
                        room.host = room.players[0].id;
                        room.players[0].isHost = true;
                    }
                    
                    io.to(roomCode).emit('playerLeft', {
                        players: room.players
                    });
                }
                break;
            }
        }
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Diretório de trabalho: ${__dirname}`);
    console.log(`📄 Arquivo index.html: ${path.resolve(__dirname, 'index.html')}`);
    console.log(`✅ Arquivo existe: ${require('fs').existsSync(path.resolve(__dirname, 'index.html'))}`);
    console.log(`🎮 The Resistance Online disponível em http://localhost:${PORT}`);
});

// Tratamento de erros
process.on('uncaughtException', (err) => {
    console.error('Erro não capturado:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Promise rejeitada:', err);
});