const express = require('express');
const path = require('path');
const app = express();

// Porta do Railway ou 3000 local
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Rota principal - servir o arquivo resistance.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'resistance.html'));
});

// Rota para o jogo original de batalha
app.get('/battle', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🎮 The Resistance Online disponível em http://localhost:${PORT}`);
});

// Tratamento de erros
process.on('uncaughtException', (err) => {
    console.error('Erro não capturado:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Promise rejeitada:', err);
});