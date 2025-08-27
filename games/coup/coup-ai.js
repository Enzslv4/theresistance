// Coup AI - Artificial Intelligence for Bot Players
class CoupAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
        this.personality = this.generatePersonality();
        this.memory = {
            playerActions: new Map(), // Track what each player has claimed
            suspiciousActions: new Map(), // Track suspicious behaviors
            revealedCards: [],
            gameHistory: []
        };
        
        // Difficulty-based parameters
        this.params = this.getDifficultyParams(difficulty);
    }

    generatePersonality() {
        const personalities = [
            {
                name: 'Conservative',
                bluffRate: 0.2,
                challengeRate: 0.3,
                riskTolerance: 0.4,
                description: 'Joga de forma cautelosa, raramente blefa'
            },
            {
                name: 'Aggressive',
                bluffRate: 0.6,
                challengeRate: 0.7,
                riskTolerance: 0.8,
                description: 'Joga agressivamente, blefa frequentemente'
            },
            {
                name: 'Balanced',
                bluffRate: 0.4,
                challengeRate: 0.5,
                riskTolerance: 0.6,
                description: 'Joga de forma equilibrada'
            },
            {
                name: 'Unpredictable',
                bluffRate: Math.random() * 0.8,
                challengeRate: Math.random() * 0.8,
                riskTolerance: Math.random() * 0.9,
                description: 'Comportamento imprevisível'
            }
        ];

        return personalities[Math.floor(Math.random() * personalities.length)];
    }

    getDifficultyParams(difficulty) {
        const params = {
            easy: {
                bluffMultiplier: 0.5,
                challengeAccuracy: 0.4,
                memoryRetention: 0.6,
                strategyComplexity: 0.3,
                reactionTime: { min: 300, max: 1000 }
            },
            medium: {
                bluffMultiplier: 1.0,
                challengeAccuracy: 0.65,
                memoryRetention: 0.8,
                strategyComplexity: 0.6,
                reactionTime: { min: 200, max: 800 }
            },
            hard: {
                bluffMultiplier: 1.3,
                challengeAccuracy: 0.85,
                memoryRetention: 0.95,
                strategyComplexity: 0.9,
                reactionTime: { min: 100, max: 600 }
            },
            turbo: {
                bluffMultiplier: 1.0,
                challengeAccuracy: 0.7,
                memoryRetention: 0.8,
                strategyComplexity: 0.8,
                reactionTime: { min: 100, max: 500 }
            }
        };

        return params[difficulty] || params.medium;
    }

    // Main decision-making function for taking actions
    decideTurn(gameState, botPlayer) {
        this.updateMemory(gameState);
        
        const availableActions = this.getAvailableActions(botPlayer, gameState);
        const actionScores = new Map();

        // Score each available action
        for (const action of availableActions) {
            const score = this.scoreAction(action, botPlayer, gameState);
            actionScores.set(action, score);
        }

        // Select best action with some randomness based on difficulty
        const bestActions = this.selectBestActions(actionScores, 3);
        const selectedAction = this.addRandomness(bestActions);

        // Determine target if needed
        let target = null;
        if (['coup', 'assassinate', 'steal'].includes(selectedAction)) {
            target = this.selectTarget(selectedAction, botPlayer, gameState);
        }

        return {
            action: selectedAction,
            target: target,
            confidence: actionScores.get(selectedAction) || 0.5
        };
    }

    getAvailableActions(botPlayer, gameState) {
        const actions = ['income']; // Always available
        
        // Add actions based on coins
        if (botPlayer.coins >= 10) {
            return ['coup']; // Mandatory coup
        }
        
        if (botPlayer.coins >= 7) {
            actions.push('coup');
        }
        
        if (botPlayer.coins >= 3) {
            actions.push('assassinate');
        }

        // Add general actions
        actions.push('foreign-aid');

        // Add character actions
        actions.push('tax', 'steal', 'exchange');

        return actions;
    }

    scoreAction(action, botPlayer, gameState) {
        let score = 0;

        switch (action) {
            case 'income':
                score = this.scoreIncomeAction(botPlayer, gameState);
                break;
            case 'foreign-aid':
                score = this.scoreForeignAidAction(botPlayer, gameState);
                break;
            case 'coup':
                score = this.scoreCoupAction(botPlayer, gameState);
                break;
            case 'tax':
                score = this.scoreTaxAction(botPlayer, gameState);
                break;
            case 'assassinate':
                score = this.scoreAssassinateAction(botPlayer, gameState);
                break;
            case 'steal':
                score = this.scoreStealAction(botPlayer, gameState);
                break;
            case 'exchange':
                score = this.scoreExchangeAction(botPlayer, gameState);
                break;
        }

        // Apply personality modifiers
        score *= this.getPersonalityModifier(action);

        // Apply difficulty modifiers
        score *= this.params.strategyComplexity;

        return Math.max(0, Math.min(1, score));
    }

    scoreIncomeAction(botPlayer, gameState) {
        // Safe but low value - good when low on coins or being cautious
        let score = 0.3;
        
        if (botPlayer.coins < 3) score += 0.3; // Need coins
        if (this.isBeingTargeted(botPlayer, gameState)) score += 0.2; // Play safe
        
        return score;
    }

    scoreForeignAidAction(botPlayer, gameState) {
        let score = 0.5; // Better than income
        
        // Check likelihood of being blocked by Duke
        const dukeBlockChance = this.estimateDukeBlockChance(gameState);
        score *= (1 - dukeBlockChance);
        
        if (botPlayer.coins < 5) score += 0.2; // Need coins more
        
        return score;
    }

    scoreCoupAction(botPlayer, gameState) {
        let score = 0.4;
        
        if (botPlayer.coins >= 10) return 1.0; // Mandatory
        if (botPlayer.coins >= 7) {
            // Consider targets
            const threats = this.identifyThreats(botPlayer, gameState);
            if (threats.length > 0) {
                score += 0.4; // Good to eliminate threats
            }
        }
        
        return score;
    }

    scoreTaxAction(botPlayer, gameState) {
        let score = 0.6; // Good coin gain
        
        // Check if we actually have Duke
        const hasDuke = this.hasCharacter(botPlayer, 'duke');
        if (hasDuke) {
            score += 0.3; // Safe to use
        } else {
            // Bluffing - assess risk
            const challengeRisk = this.estimateChallengeRisk('tax', botPlayer, gameState);
            score *= (1 - challengeRisk);
            score *= (this.personality.bluffRate * this.params.bluffMultiplier);
        }
        
        if (botPlayer.coins < 4) score += 0.2; // Need coins
        
        return score;
    }

    scoreAssassinateAction(botPlayer, gameState) {
        if (botPlayer.coins < 3) return 0;
        
        let score = 0.7; // High impact action
        
        const hasAssassin = this.hasCharacter(botPlayer, 'assassin');
        if (hasAssassin) {
            score += 0.2;
        } else {
            const challengeRisk = this.estimateChallengeRisk('assassinate', botPlayer, gameState);
            score *= (1 - challengeRisk);
            score *= (this.personality.bluffRate * this.params.bluffMultiplier);
        }
        
        // Prefer targeting threats
        const threats = this.identifyThreats(botPlayer, gameState);
        if (threats.length > 0) score += 0.2;
        
        return score;
    }

    scoreStealAction(botPlayer, gameState) {
        let score = 0.5;
        
        const hasCaptain = this.hasCharacter(botPlayer, 'captain');
        if (hasCaptain) {
            score += 0.2;
        } else {
            const challengeRisk = this.estimateChallengeRisk('steal', botPlayer, gameState);
            score *= (1 - challengeRisk);
            score *= (this.personality.bluffRate * this.params.bluffMultiplier);
        }
        
        // Check for good targets (players with coins)
        const richPlayers = gameState.players.filter(p => 
            p.id !== botPlayer.id && p.coins >= 2 && this.hasInfluences(p)
        );
        
        if (richPlayers.length > 0) score += 0.3;
        
        return score;
    }

    scoreExchangeAction(botPlayer, gameState) {
        let score = 0.4;
        
        const hasAmbassador = this.hasCharacter(botPlayer, 'ambassador');
        if (hasAmbassador) {
            score += 0.3;
        } else {
            const challengeRisk = this.estimateChallengeRisk('exchange', botPlayer, gameState);
            score *= (1 - challengeRisk);
            score *= (this.personality.bluffRate * this.params.bluffMultiplier);
        }
        
        // More valuable when we have bad cards or need specific cards
        const activeInfluences = botPlayer.influences.filter(card => card !== 'revealed');
        if (activeInfluences.length === 1) score += 0.2; // Risky with one card
        
        return score;
    }

    // Decision making for reactions (challenges and blocks)
    decideReaction(reactionData, botPlayer, gameState, actionPlayer, action) {
        const decisions = {
            challenge: false,
            block: false,
            blockCharacter: null,
            confidence: 0.5
        };

        // Decide on challenging
        if (reactionData.canChallenge) {
            const shouldChallenge = this.shouldChallenge(action, actionPlayer, botPlayer, gameState);
            decisions.challenge = shouldChallenge.decision;
            decisions.confidence = shouldChallenge.confidence;
        }

        // Decide on blocking (only if not challenging)
        if (!decisions.challenge && reactionData.canBlock) {
            const blockDecision = this.shouldBlock(action, actionPlayer, botPlayer, gameState, reactionData.blockOptions);
            decisions.block = blockDecision.decision;
            decisions.blockCharacter = blockDecision.character;
            if (blockDecision.decision) {
                decisions.confidence = blockDecision.confidence;
            }
        }

        return decisions;
    }

    shouldChallenge(action, actionPlayer, botPlayer, gameState) {
        const requiredCharacter = this.getRequiredCharacter(action);
        if (!requiredCharacter) return { decision: false, confidence: 0 };

        // Base challenge probability based on personality and difficulty
        let challengeProbability = this.personality.challengeRate * this.params.challengeAccuracy;

        // Adjust based on memory and observations
        const playerHistory = this.memory.playerActions.get(actionPlayer.id) || [];
        const recentClaims = playerHistory.filter(h => h.character === requiredCharacter).length;
        
        if (recentClaims > 2) {
            challengeProbability += 0.3; // Suspicious repeated claims
        }

        // Check if we know they don't have the card (from revealed cards or previous exchanges)
        const revealedCards = this.memory.revealedCards;
        const characterCount = revealedCards.filter(card => card === requiredCharacter).length;
        const maxPossible = this.getMaxCharacterCards(gameState.players.length);
        
        if (characterCount >= maxPossible) {
            challengeProbability = 0.9; // They definitely don't have it
        }

        // Consider our own cards
        if (this.hasCharacter(botPlayer, requiredCharacter)) {
            challengeProbability += 0.2; // Less likely they have it too
        }

        // Random factor based on difficulty
        const randomFactor = (Math.random() - 0.5) * (1 - this.params.strategyComplexity);
        challengeProbability += randomFactor;

        const decision = challengeProbability > 0.5;
        return {
            decision: decision,
            confidence: Math.abs(challengeProbability - 0.5) * 2
        };
    }

    shouldBlock(action, actionPlayer, botPlayer, gameState, blockOptions) {
        if (!blockOptions || blockOptions.length === 0) {
            return { decision: false, character: null, confidence: 0 };
        }

        // Check if the action affects us
        const affectsUs = this.actionAffectsPlayer(action, actionPlayer, botPlayer, gameState);
        if (!affectsUs) {
            return { decision: false, character: null, confidence: 0 };
        }

        // Try to block with a character we actually have
        for (const character of blockOptions) {
            if (this.hasCharacter(botPlayer, character)) {
                return {
                    decision: true,
                    character: character,
                    confidence: 0.8
                };
            }
        }

        // Consider bluffing a block
        const bluffProbability = this.personality.bluffRate * this.params.bluffMultiplier;
        const shouldBluff = Math.random() < bluffProbability;

        if (shouldBluff && blockOptions.length > 0) {
            const randomCharacter = blockOptions[Math.floor(Math.random() * blockOptions.length)];
            return {
                decision: true,
                character: randomCharacter,
                confidence: 0.4
            };
        }

        return { decision: false, character: null, confidence: 0.2 };
    }

    // Card selection for exchanges and influence loss
    selectCardsToKeep(availableCards, keepCount, botPlayer, gameState) {
        // Score each card based on current game state
        const cardScores = availableCards.map((card, index) => ({
            card,
            index,
            score: this.scoreCardValue(card, botPlayer, gameState)
        }));

        // Sort by score and take the best ones
        cardScores.sort((a, b) => b.score - a.score);
        return cardScores.slice(0, keepCount).map(c => c.index);
    }

    selectInfluenceToLose(botPlayer, gameState) {
        const activeInfluences = botPlayer.influences
            .map((card, index) => ({ card, index }))
            .filter(c => c.card !== 'revealed');

        if (activeInfluences.length === 1) {
            return activeInfluences[0].index;
        }

        // Score each card and lose the least valuable one
        const cardScores = activeInfluences.map(c => ({
            ...c,
            score: this.scoreCardValue(c.card, botPlayer, gameState)
        }));

        cardScores.sort((a, b) => a.score - b.score);
        return cardScores[0].index;
    }

    selectTarget(action, botPlayer, gameState) {
        const possibleTargets = gameState.players.filter(p => 
            p.id !== botPlayer.id && this.hasInfluences(p)
        );

        if (possibleTargets.length === 0) return null;
        if (possibleTargets.length === 1) return possibleTargets[0].id;

        // Score each target
        const targetScores = possibleTargets.map(target => ({
            target,
            score: this.scoreTarget(target, action, botPlayer, gameState)
        }));

        targetScores.sort((a, b) => b.score - a.score);
        
        // Add some randomness to target selection
        const topTargets = targetScores.slice(0, Math.min(3, targetScores.length));
        const weights = topTargets.map((_, i) => Math.pow(2, topTargets.length - i - 1));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < topTargets.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return topTargets[i].target.id;
            }
        }

        return topTargets[0].target.id;
    }

    // Utility functions
    updateMemory(gameState) {
        // Update memory with current game state
        this.memory.revealedCards = [...gameState.revealedCards];
        
        // Clean up old memories based on retention rate
        if (Math.random() > this.params.memoryRetention) {
            this.forgetRandomMemory();
        }
    }

    hasCharacter(player, character) {
        return player.influences.includes(character);
    }

    hasInfluences(player) {
        return player.influences.some(card => card !== 'revealed');
    }

    estimateChallengeRisk(action, botPlayer, gameState) {
        const opponents = gameState.players.filter(p => 
            p.id !== botPlayer.id && this.hasInfluences(p)
        );
        
        let riskLevel = 0.3; // Base risk
        
        // Increase risk based on how many times we've used this action
        const ourHistory = this.memory.playerActions.get(botPlayer.id) || [];
        const actionCount = ourHistory.filter(h => h.action === action).length;
        riskLevel += actionCount * 0.1;
        
        // Increase risk if there are aggressive players
        riskLevel += opponents.length * 0.05;
        
        return Math.min(0.9, riskLevel);
    }

    estimateDukeBlockChance(gameState) {
        const opponents = gameState.players.filter(p => this.hasInfluences(p));
        return Math.min(0.7, opponents.length * 0.15);
    }

    identifyThreats(botPlayer, gameState) {
        return gameState.players.filter(p => {
            if (p.id === botPlayer.id || !this.hasInfluences(p)) return false;
            
            // Players with more coins are threats
            if (p.coins >= 7) return true;
            
            // Players with multiple influences are threats
            const activeInfluences = p.influences.filter(card => card !== 'revealed').length;
            if (activeInfluences > 1) return true;
            
            return false;
        });
    }

    scoreCardValue(character, botPlayer, gameState) {
        let score = 0.5; // Base value
        
        switch (character) {
            case 'duke':
                score = 0.8; // High value - good income and blocks foreign aid
                break;
            case 'assassin':
                score = 0.7; // High impact but costs coins
                if (botPlayer.coins >= 3) score += 0.1;
                break;
            case 'captain':
                score = 0.6; // Good for stealing and blocking
                break;
            case 'ambassador':
                score = 0.5; // Utility card
                break;
            case 'contess':
                score = 0.4; // Defensive only
                break;
        }
        
        return score;
    }

    scoreTarget(target, action, botPlayer, gameState) {
        let score = 0.5;
        
        // Prefer players with more influences
        const targetInfluences = target.influences.filter(card => card !== 'revealed').length;
        score += targetInfluences * 0.2;
        
        // For steal, prefer players with more coins
        if (action === 'steal') {
            score += Math.min(target.coins / 10, 0.3);
        }
        
        // Consider threat level
        if (target.coins >= 7) score += 0.2;
        if (target.coins >= 10) score += 0.3; // High priority
        
        return score;
    }

    actionAffectsPlayer(action, actionPlayer, botPlayer, gameState) {
        if (action === 'steal' || action === 'assassinate') {
            // These actions target specific players - we'd know if we're targeted
            return false; // We'll handle targeting separately
        }
        
        if (action === 'foreign-aid') {
            return true; // Anyone can block with Duke
        }
        
        return false;
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

    getMaxCharacterCards(playerCount) {
        if (playerCount <= 6) return 3;
        if (playerCount <= 8) return 4;
        return 5;
    }

    isBeingTargeted(botPlayer, gameState) {
        // Simple heuristic - if we have many coins or influences, we might be targeted
        const activeInfluences = botPlayer.influences.filter(card => card !== 'revealed').length;
        return botPlayer.coins >= 7 || activeInfluences > 1;
    }

    getPersonalityModifier(action) {
        const riskActions = ['tax', 'assassinate', 'steal', 'exchange'];
        if (riskActions.includes(action)) {
            return this.personality.riskTolerance;
        }
        return 1.0;
    }

    selectBestActions(actionScores, count = 3) {
        const sorted = Array.from(actionScores.entries())
            .sort(([,a], [,b]) => b - a);
        
        return sorted.slice(0, count);
    }

    addRandomness(bestActions) {
        if (bestActions.length === 0) return 'income';
        
        // Weight selection based on scores
        const weights = bestActions.map(([action, score]) => Math.pow(score, 2));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        if (totalWeight === 0) return bestActions[0][0];
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < bestActions.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return bestActions[i][0];
            }
        }
        
        return bestActions[0][0];
    }

    forgetRandomMemory() {
        // Randomly forget some memories to simulate imperfect memory
        if (this.memory.playerActions.size > 0) {
            const playerIds = Array.from(this.memory.playerActions.keys());
            const randomPlayer = playerIds[Math.floor(Math.random() * playerIds.length)];
            const playerHistory = this.memory.playerActions.get(randomPlayer);
            
            if (playerHistory && playerHistory.length > 0) {
                playerHistory.splice(Math.floor(Math.random() * playerHistory.length), 1);
                
                if (playerHistory.length === 0) {
                    this.memory.playerActions.delete(randomPlayer);
                }
            }
        }
    }

    // Get a random delay based on difficulty (simulate thinking time)
    getReactionDelay() {
        const { min, max } = this.params.reactionTime;
        return Math.random() * (max - min) + min;
    }

    // Record an action for memory
    recordAction(playerId, action, character = null) {
        if (!this.memory.playerActions.has(playerId)) {
            this.memory.playerActions.set(playerId, []);
        }
        
        const playerHistory = this.memory.playerActions.get(playerId);
        playerHistory.push({
            action,
            character,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (playerHistory.length > 10) {
            playerHistory.shift();
        }
    }

    // Get AI personality description for display
    getPersonalityDescription() {
        return `${this.personality.name} (${this.difficulty.toUpperCase()}) - ${this.personality.description}`;
    }
}

module.exports = CoupAI;