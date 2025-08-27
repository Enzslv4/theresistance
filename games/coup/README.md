# 👑 Coup Online

Uma implementação completa e funcional do jogo de cartas Coup para navegadores web, desenvolvido em JavaScript com Socket.IO para comunicação em tempo real.

## ✨ Características Principais

### 🎮 Funcionalidades Core
- **Sistema de Salas**: Criar/entrar em salas com códigos únicos
- **Multijogador**: Suporte para 2-10 jogadores simultâneos  
- **Tempo Real**: Comunicação instantânea via WebSockets
- **Chat Integrado**: Sistema de chat durante lobby e jogo
- **Interface Responsiva**: Funciona perfeitamente em desktop e mobile

### 🃏 Mecânicas do Jogo
- **5 Personagens**: Duque, Assassino, Capitão, Embaixador, Condessa
- **Sistema de Blefe**: Use ações sem ter as cartas (arrisque ser contestado)
- **Contestações**: Desafie outros jogadores quando suspeitar de blefe
- **Bloqueios**: Use personagens para bloquear ações contra você
- **Distribuição Dinâmica**: Cartas ajustadas automaticamente por número de jogadores

### 🎯 Ações Disponíveis

#### Ações Gerais
- **Renda**: +1 moeda (sempre funciona)
- **Ajuda Externa**: +2 moedas (bloqueável pelo Duque)
- **Golpe**: 7 moedas, elimina uma influência (não bloqueável)

#### Ações de Personagem
- **🏛️ Duque**: Taxar (+3 moedas) / Bloquear Ajuda Externa
- **🗡️ Assassino**: Assassinar (3 moedas, elimina influência)
- **🏴‍☠️ Capitão**: Extorquir (2 moedas de outro jogador)
- **🎭 Embaixador**: Trocar cartas com o baralho
- **👸 Condessa**: Bloquear Assassinato

### ⚔️ Sistema de Contestações
- **Contestar**: Desafie ações de personagem suspeitas
- **Consequências**: Perdedor da contestação perde uma influência
- **Reembaralhamento**: Cartas contestadas com sucesso são reembaralhadas
- **Timer**: 15 segundos para decidir contestar/bloquear

### 🎲 Variantes Implementadas

#### Modo 2 Jogadores
- Configuração especial de moedas iniciais
- Sistema de draft de cartas
- Opção de "Golpe Declarado"

#### Inquisidor
- Substitui o Embaixador
- **Investigar**: Ver carta de oponente
- **Trocar**: 1 carta em vez de 2

#### Outras Opções
- Arte diferente para cartas
- Configurações customizadas por sala

## 🎨 Interface e UX

### 🖥️ Layout do Jogo
- **Área Central**: Baralho da Corte, cartas reveladas, tesouro
- **Área do Jogador**: Suas cartas de influência e moedas
- **Área dos Oponentes**: Status visível de outros jogadores
- **Log de Ações**: Histórico completo de todas as jogadas
- **Chat do Jogo**: Comunicação estratégica em tempo real

### 🎭 Elementos Visuais
- **Cartas Animadas**: Efeitos visuais para ações
- **Cores Temáticas**: Cada personagem tem cor única
- **Feedback em Tempo Real**: Indicadores claros de turno e ações
- **Responsivo**: Interface adaptativa para todos os tamanhos de tela

### ⏰ Sistema de Timers
- **Reações**: 15 segundos para contestar/bloquear
- **Indicadores Visuais**: Contagem regressiva clara
- **Auto-pass**: Passa automaticamente se não reagir

## 🔧 Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica
- **CSS3**: Estilização moderna com gradientes e animações
- **JavaScript ES6+**: Lógica do cliente com classes
- **Socket.IO Client**: Comunicação em tempo real

### Backend
- **Node.js**: Servidor JavaScript
- **Express.js**: Framework web
- **Socket.IO**: WebSockets para tempo real
- **Lógica de Jogo**: Sistema completo de regras implementado

## 🚀 Como Jogar

1. **Acesse** o hub de jogos
2. **Clique** em "Coup Online"
3. **Crie** uma sala ou **entre** com código
4. **Configure** as variantes desejadas (apenas host)
5. **Aguarde** outros jogadores (mínimo 2)
6. **Inicie** o jogo e divirta-se!

## 🎯 Regras Rápidas

### Objetivo
Seja o último jogador com pelo menos uma carta de **Influência** para vencer!

### Como Vencer
- **Eliminate** todos os outros jogadores
- **Use** blefe e dedução
- **Gerencie** suas moedas e influências

### Regras Especiais
- **Golpe Obrigatório**: Com 10+ moedas, DEVE dar golpe
- **Ordem de Resolução**: Contestações antes de bloqueios
- **Cartas Reveladas**: Vão para área pública (fora do jogo)

## 🎮 Características Avançadas

### 🧠 Sistema de IA (Futuro)
- Bots para treinar sozinho
- Diferentes níveis de dificuldade
- Estratégias adaptativas

### 📊 Estatísticas (Futuro)
- Histórico de partidas
- Taxa de blefe por jogador
- Personagens mais utilizados
- Rankings globais

### 🏆 Torneios (Futuro)
- Sistema de brackets
- Salas privadas para torneios
- Espectadores com chat separado

## 🐛 Tratamento de Erros

### 🔄 Reconexão
- Reconexão automática em desconexões
- Preservação do estado do jogo
- Indicadores de jogadores desconectados

### ⚡ Performance
- Sincronização eficiente de estado
- Validação server-side de todas as ações
- Prevenção de trapaças e bugs

### 🛡️ Segurança
- Validação rigorosa de inputs
- Estados do jogo protegidos no servidor
- Prevenção de ações inválidas

---

## 📝 Notas do Desenvolvedor

Este é um projeto completo que implementa fielmente as regras originais do Coup, com algumas melhorias para o ambiente digital:

- **Sistema de Timers**: Evita jogos infinitos
- **Logs Detalhados**: Facilita acompanhar estratégias
- **Interface Intuitiva**: Reduz curva de aprendizado
- **Variantes Incluídas**: Mais opções de jogo

O código está estruturado de forma modular, facilitando futuras expansões e melhorias.

### Próximos Passos Sugeridos
1. Sistema de ranking persistente
2. Replay de partidas importantes  
3. Modo tutorial interativo
4. IA para partidas solo
5. Torneios automatizados

---

**🎲 Divirta-se blefando e eliminando seus oponentes! 👑**