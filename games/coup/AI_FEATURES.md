# 🤖 Sistema de IA para Coup Online

## Características da IA Implementada

### 🧠 Inteligência Básica
- **3 níveis de dificuldade**: Fácil, Médio, Difícil
- **4 personalidades**: Conservador, Agressivo, Equilibrado, Imprevisível
- **Sistema de memória**: Lembra ações anteriores dos jogadores
- **Análise de risco**: Avalia probabilidades de contestação e bloqueio

### 🎯 Tomada de Decisões

#### Ações no Turno
- **Análise de moedas**: Prioriza ações baseadas na situação financeira
- **Avaliação de risco**: Considera chance de ser contestado ao blefar
- **Identificação de ameaças**: Foca em eliminar jogadores perigosos
- **Estratégia adaptativa**: Ajusta comportamento baseado no estado do jogo

#### Reações (Contestar/Bloquear)
- **Análise de histórico**: Usa memória de ações anteriores
- **Cálculo de probabilidades**: Estima se o oponente realmente tem a carta
- **Timing realístico**: Delays naturais para simular tempo de "pensamento"
- **Blefe inteligente**: Pode bloquear sem ter a carta necessária

### 🃏 Gerenciamento de Cartas
- **Seleção inteligente**: Mantém cartas mais valiosas em trocas
- **Perda estratégica**: Escolhe qual influência revelar baseado na situação
- **Avaliação de valor**: Cada carta tem score dinâmico baseado no contexto

### ⚙️ Parâmetros por Dificuldade

#### 🟢 Fácil
- **Taxa de blefe**: 50% da personalidade base
- **Precisão de contestação**: 40%
- **Retenção de memória**: 60%
- **Tempo de reação**: 3-8 segundos

#### 🟡 Médio  
- **Taxa de blefe**: 100% da personalidade base
- **Precisão de contestação**: 65%
- **Retenção de memória**: 80%
- **Tempo de reação**: 2-6 segundos

#### 🔴 Difícil
- **Taxa de blefe**: 130% da personalidade base
- **Precisão de contestação**: 85%
- **Retenção de memória**: 95%
- **Tempo de reação**: 1-4 segundos

### 🎭 Personalidades de Bot

#### 🛡️ Conservador
- **Taxa de blefe**: 20%
- **Taxa de contestação**: 30%
- **Tolerância ao risco**: 40%
- **Comportamento**: Joga de forma cautelosa, raramente blefa

#### ⚔️ Agressivo
- **Taxa de blefe**: 60%
- **Taxa de contestação**: 70%
- **Tolerância ao risco**: 80%
- **Comportamento**: Joga agressivamente, blefa frequentemente

#### ⚖️ Equilibrado
- **Taxa de blefe**: 40%
- **Taxa de contestação**: 50%
- **Tolerância ao risco**: 60%
- **Comportamento**: Estratégia balanceada e versátil

#### 🎲 Imprevisível
- **Taxa de blefe**: Aleatória (0-80%)
- **Taxa de contestação**: Aleatória (0-80%)
- **Tolerância ao risco**: Aleatória (0-90%)
- **Comportamento**: Completamente imprevisível

### 🔧 Funcionalidades Técnicas

#### Interface de Usuário
- **Seleção de dificuldade**: Dropdown para escolher nível dos bots
- **Botão de adicionar**: Adiciona bot com um clique
- **Identificação visual**: Badges especiais para bots
- **Remoção fácil**: Botão para remover bots (apenas host)

#### Integração com Servidor
- **Execução automática**: Bots jogam automaticamente em seus turnos
- **Reações inteligentes**: Respondem a ações de outros jogadores
- **Gerenciamento de estado**: Mantém informações de jogo atualizadas
- **Fallbacks de erro**: Comportamento padrão em caso de erro

### 🎯 Estratégias Implementadas

#### Avaliação de Ações
1. **Renda**: Ação segura para construir economia
2. **Ajuda Externa**: Avalia chance de bloqueio pelo Duque  
3. **Golpe**: Prioriza eliminar ameaças quando possível
4. **Taxar**: Equilibra ganho vs risco de contestação
5. **Assassinar**: Foca em alvos estratégicos
6. **Extorquir**: Prefere jogadores com mais moedas
7. **Trocar**: Usado para melhorar mão de cartas

#### Seleção de Alvos
- **Jogadores com muitas moedas**: Ameaça de golpe
- **Múltiplas influências**: Jogadores difíceis de eliminar
- **Histórico de ações**: Considera comportamento anterior
- **Posição estratégica**: Avalia impacto no jogo

#### Sistema de Memória
- **Ações recentes**: Lembra últimas jogadas de cada player
- **Cartas reveladas**: Rastreia que cartas saíram do jogo
- **Padrões de comportamento**: Identifica jogadores blifadores
- **Esquecimento gradual**: Simula memória imperfeita

### 🚀 Como Usar

1. **Criar Sala**: Como host, crie uma sala normalmente
2. **Escolher Dificuldade**: Selecione nível dos bots no dropdown
3. **Adicionar Bots**: Clique no botão "🤖 Adicionar Bot"
4. **Gerenciar**: Remova bots clicando no "✕" ao lado deles
5. **Jogar**: Inicie o jogo normalmente - bots jogam automaticamente

### 🎮 Experiência de Jogo

#### Para Jogadores Iniciantes
- **Prática segura**: Aprenda sem pressão de outros players
- **Observação**: Veja estratégias diferentes em ação
- **Progressão**: Comece com bots fáceis, aumente dificuldade

#### Para Jogadores Experientes  
- **Teste de estratégias**: Experimente novas abordagens
- **Complemento de mesa**: Complete salas com poucos players
- **Desafio**: Bots difíceis oferecem competição real

### 🔮 Melhorias Futuras

#### Planejadas
- **IA adaptativa**: Aprende com padrões do jogador humano
- **Personalidades nomeadas**: Bots com características únicas
- **Chat com IA**: Bots podem enviar mensagens estratégicas
- **Análise pós-jogo**: Estatísticas de performance dos bots

#### Possíveis Expansões
- **Machine Learning**: IA que melhora com experiência
- **Estilos de jogo**: Mais personalidades especializadas
- **Dificuldade dinâmica**: Ajuste automático baseado no player
- **Replay com IA**: Reviva jogos substituindo players por bots

---

## 🏆 Resultado

O sistema de IA do Coup oferece:
- **Oponentes inteligentes** que simulam jogadores reais
- **Experiência completa** para prática e diversão
- **Escalabilidade** para qualquer tamanho de grupo
- **Aprendizado** através da observação de estratégias
- **Entretenimento** garantido mesmo jogando sozinho

**A IA está pronta para proporcionar partidas emocionantes e desafiadoras! 🎯**