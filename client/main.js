// Game state
let gameState = {
    objects: [],
    playerHealth: 100,
    playerResources: 200,
    currentWave: 0
};

// Track previous game state for detecting changes
let previousGameState = {
    objects: [],
    playerResources: 200
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Particle system for visual effects
const particleSystem = new ParticleSystem();

// WebSocket connection
let ws = null;
let isConnected = false;

// Tower selection state
let selectedTower = null;
let buildMode = true; // true = placing towers, false = selecting towers

// Statistics tracking
let gameStats = {
    kills: 0,
    score: 0,
    wavesCompleted: 0
};

// Wave announcement state
let waveAnnouncement = {
    text: '',
    lifetime: 0,
    isBoss: false
};

// Debug/visualization toggles
let showDebugPanel = false;
let showGravityField = false;
let showPathfinding = false;

// Performance monitoring
let performanceStats = {
    fps: 60,
    frameCount: 0,
    lastTime: performance.now(),
    objectCount: 0,
    particleCount: 0
};

// Special abilities
let playerAbilities = {
    meteorStrike: {
        cooldown: 0,
        maxCooldown: 20,
        cost: 100,
        ready: true
    },
    freezeWave: {
        cooldown: 0,
        maxCooldown: 30,
        cost: 150,
        ready: true
    },
    repair: {
        cooldown: 0,
        maxCooldown: 40,
        cost: 200,
        ready: true
    }
};

// Build preview
let buildPreview = {
    x: 0,
    y: 0,
    visible: false,
    valid: true
};

// UI elements
const healthSpan = document.getElementById('health');
const resourcesSpan = document.getElementById('resources');
const waveSpan = document.getElementById('wave');
const killsSpan = document.getElementById('kills');
const scoreSpan = document.getElementById('score');
const statusSpan = document.getElementById('status');
const connectBtn = document.getElementById('connectBtn');
const towerInfoPanel = document.getElementById('towerInfo');
const upgradeBtn = document.getElementById('upgradeBtn');
const deselectBtn = document.getElementById('deselectBtn');

// Rendering configuration
const RENDER_CONFIG = {
    1: { color: '#888888', radius: 30, name: 'Planet' },     // Planet
    2: { color: '#ff4444', radius: 8, name: 'Enemy' },       // Enemy (default)
    3: { color: '#44ff44', radius: 12, name: 'Tower' },      // Tower
    4: { color: '#ffff00', radius: 3, name: 'Projectile' }   // Projectile
};

// Enemy type visual config
const ENEMY_TYPES = {
    0: { color: '#ff4444', radius: 8, name: 'Basic' },      // Basic - red, normal
    1: { color: '#44ff44', radius: 6, name: 'Fast' },       // Fast - green, small
    2: { color: '#8844ff', radius: 12, name: 'Tank' },      // Tank - purple, large
    3: { color: '#ff8800', radius: 20, name: 'BOSS' }       // Boss - orange, huge
};

// Tower type colors
const TOWER_COLORS = {
    0: '#44ff44', // Basic - green
    1: '#ff8844', // Splash - orange
    2: '#44aaff', // Slow - blue
    3: '#ff44ff'  // Gravity - purple
};

// Connect button handler
connectBtn.addEventListener('click', () => {
    if (!isConnected) {
        connectToServer();
    } else {
        disconnectFromServer();
    }
});

// Tower selection for building
let selectedTowerType = 0;
const towerButtons = document.querySelectorAll('.tower-btn');

towerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        towerButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTowerType = parseInt(btn.dataset.type);
        buildMode = true;
        selectedTower = null;
        towerInfoPanel.classList.add('hidden');
    });
});

// Tower names
const TOWER_NAMES = {
    0: 'Basic Tower',
    1: 'Splash Tower',
    2: 'Slow Tower',
    3: 'Gravity Tower'
};

// Canvas click handler
canvas.addEventListener('click', (event) => {
    if (!isConnected) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if clicking on a tower (for selection)
    const clickedTower = getTowerAtPosition(x, y);

    if (clickedTower) {
        // Select tower
        selectedTower = clickedTower;
        buildMode = false;
        showTowerInfo(clickedTower);
    } else if (buildMode) {
        // Build new tower
        const message = {
            action: 'build_tower',
            position: { x: x, y: y },
            towerType: selectedTowerType
        };
        ws.send(JSON.stringify(message));
    }
});

// Find tower at clicked position
function getTowerAtPosition(x, y) {
    if (!gameState.objects) return null;

    const towers = gameState.objects.filter(obj => obj.type === 3);
    for (const tower of towers) {
        const dist = Math.sqrt(
            Math.pow(tower.position.x - x, 2) +
            Math.pow(tower.position.y - y, 2)
        );
        if (dist < 15) { // Click radius
            return tower;
        }
    }
    return null;
}

// Show tower info panel
function showTowerInfo(tower) {
    const towerTypeName = TOWER_NAMES[tower.towerType] || 'Unknown';

    document.getElementById('towerTypeName').textContent = towerTypeName;
    document.getElementById('towerLevel').textContent = (tower.upgradeLevel || 0) + 1;
    document.getElementById('towerDamage').textContent = Math.round(tower.damage || 0);
    document.getElementById('towerRange').textContent = Math.round(tower.range || 0);
    document.getElementById('towerFireRate').textContent = (tower.fireRate || 0).toFixed(2);

    const upgradeCost = tower.upgradeCost || 0;
    document.getElementById('upgradeCost').textContent = upgradeCost;

    // Disable upgrade button if max level or not enough resources
    const canUpgrade = (tower.upgradeLevel || 0) < 3;
    const hasResources = gameState.playerResources >= upgradeCost;
    upgradeBtn.disabled = !canUpgrade || !hasResources;

    if (!canUpgrade) {
        upgradeBtn.textContent = 'Max Level';
    } else {
        upgradeBtn.innerHTML = `Upgrade (Cost: <span id="upgradeCost">${upgradeCost}</span>)`;
    }

    towerInfoPanel.classList.remove('hidden');
}

// Upgrade button handler
upgradeBtn.addEventListener('click', () => {
    if (selectedTower && ws) {
        const message = {
            action: 'upgrade_tower',
            towerId: selectedTower.id
        };
        ws.send(JSON.stringify(message));
    }
});

// Deselect button handler
deselectBtn.addEventListener('click', () => {
    selectedTower = null;
    buildMode = true;
    towerInfoPanel.classList.add('hidden');
});

// Keyboard controls
document.addEventListener('keydown', (event) => {
    // F3 - Toggle debug panel
    if (event.key === 'F3') {
        event.preventDefault();
        showDebugPanel = !showDebugPanel;
    }
    // G - Toggle gravity field visualization
    if (event.key === 'g' || event.key === 'G') {
        showGravityField = !showGravityField;
    }
    // P - Toggle pathfinding visualization
    if (event.key === 'p' || event.key === 'P') {
        showPathfinding = !showPathfinding;
    }
    // Q - Meteor Strike
    if (event.key === 'q' || event.key === 'Q') {
        activateAbility('meteorStrike');
    }
    // W - Freeze Wave
    if (event.key === 'w' || event.key === 'W') {
        activateAbility('freezeWave');
    }
    // E - Repair
    if (event.key === 'e' || event.key === 'E') {
        activateAbility('repair');
    }
});

// Mouse move for build preview
canvas.addEventListener('mousemove', (event) => {
    if (!isConnected) return;

    const rect = canvas.getBoundingClientRect();
    buildPreview.x = event.clientX - rect.left;
    buildPreview.y = event.clientY - rect.top;
    buildPreview.visible = buildMode;

    // Check if location is valid for building
    if (buildMode && gameState.objects) {
        buildPreview.valid = true;
        // Check distance to other towers/planets
        for (const obj of gameState.objects) {
            if ((obj.type === 1 || obj.type === 3) && obj.alive) { // Planet or Tower
                const dist = Math.sqrt(
                    Math.pow(obj.position.x - buildPreview.x, 2) +
                    Math.pow(obj.position.y - buildPreview.y, 2)
                );
                if (dist < 40) {
                    buildPreview.valid = false;
                    break;
                }
            }
        }
    }
});

function connectToServer() {
    try {
        ws = new WebSocket('ws://localhost:9002');
        
        ws.onopen = () => {
            isConnected = true;
            statusSpan.textContent = 'Connected';
            statusSpan.className = 'connected';
            connectBtn.textContent = 'Disconnect';
            console.log('Connected to Celestial Siege server');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle different message types
                if (data.type === 'welcome') {
                    console.log('Server:', data.message);
                } else if (data.type === 'ack') {
                    console.log('Action acknowledged:', data.original);
                } else {
                    // Assume it's a game state update
                    updateGameState(data);
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            isConnected = false;
            statusSpan.textContent = 'Disconnected';
            statusSpan.className = 'disconnected';
            connectBtn.textContent = 'Connect to Server';
            console.log('Disconnected from server');
        };
        
    } catch (error) {
        console.error('Failed to connect:', error);
    }
}

function disconnectFromServer() {
    if (ws) {
        ws.close();
    }
}

function updateGameState(newState) {
    // Detect events and trigger particle effects
    detectGameEvents(gameState, newState);

    // Update state
    previousGameState = JSON.parse(JSON.stringify(gameState));
    gameState = newState;
    updateUI();
}

function detectGameEvents(oldState, newState) {
    // Detect enemy deaths
    const oldEnemies = oldState.objects ? oldState.objects.filter(obj => obj.type === 2) : [];
    const newEnemies = newState.objects ? newState.objects.filter(obj => obj.type === 2) : [];

    // Find enemies that were in old state but not in new state (died)
    oldEnemies.forEach(oldEnemy => {
        const stillExists = newEnemies.find(e =>
            Math.abs(e.position.x - oldEnemy.position.x) < 5 &&
            Math.abs(e.position.y - oldEnemy.position.y) < 5
        );
        if (!stillExists) {
            // Enemy died - update stats
            gameStats.kills++;

            // Score based on enemy type
            const scoreValues = {
                0: 10,   // Basic
                1: 15,   // Fast
                2: 30,   // Tank
                3: 200   // Boss
            };
            const scoreGain = scoreValues[oldEnemy.enemyType] || 10;
            gameStats.score += scoreGain;

            // Create explosion with color based on enemy type
            const enemyConfig = ENEMY_TYPES[oldEnemy.enemyType] || ENEMY_TYPES[0];
            const explosionSize = oldEnemy.isBoss ? 30 : (enemyConfig.radius * 0.4);
            const particleCount = oldEnemy.isBoss ? 50 : 20;

            particleSystem.createExplosion(
                oldEnemy.position.x,
                oldEnemy.position.y,
                enemyConfig.color,
                particleCount,
                100,
                explosionSize
            );

            // Show score gain
            particleSystem.createFloatingText(
                oldEnemy.position.x,
                oldEnemy.position.y - 10,
                `+${scoreGain}`,
                '#ffd700'
            );

            updateUI();
        }
    });

    // Detect projectile hits
    const oldProjectiles = oldState.objects ? oldState.objects.filter(obj => obj.type === 4) : [];
    const newProjectiles = newState.objects ? newState.objects.filter(obj => obj.type === 4) : [];

    oldProjectiles.forEach(oldProj => {
        const stillExists = newProjectiles.find(p =>
            Math.abs(p.position.x - oldProj.position.x) < 5 &&
            Math.abs(p.position.y - oldProj.position.y) < 5
        );
        if (!stillExists) {
            // Projectile disappeared - create hit spark
            particleSystem.createHitSpark(
                oldProj.position.x,
                oldProj.position.y,
                '#ffff00',
                8
            );
        }
    });

    // Detect resource gain
    if (newState.playerResources > oldState.playerResources) {
        const resourceGain = newState.playerResources - oldState.playerResources;
        // Show floating text at center top
        particleSystem.createFloatingText(
            400, 50,
            `+$${resourceGain}`,
            '#44ff44'
        );
    }
}

function updateUI() {
    healthSpan.textContent = `Health: ${gameState.playerHealth}`;
    resourcesSpan.textContent = `Resources: ${gameState.playerResources}`;
    const maxWaves = gameState.maxWaves || 15;
    waveSpan.textContent = `Wave: ${gameState.currentWave} / ${maxWaves}`;
    killsSpan.textContent = `Kills: ${gameStats.kills}`;
    scoreSpan.textContent = `Score: ${gameStats.score}`;

    // Wave completion bonus and announcement
    if (gameState.currentWave > gameStats.wavesCompleted) {
        const waveBonus = gameState.currentWave * 50;
        gameStats.score += waveBonus;
        gameStats.wavesCompleted = gameState.currentWave;

        // Show wave announcement
        const isBossWave = (gameState.currentWave % 5 === 0);
        waveAnnouncement.text = isBossWave
            ? `⚠️ BOSS WAVE ${gameState.currentWave} ⚠️`
            : `Wave ${gameState.currentWave}`;
        waveAnnouncement.lifetime = isBossWave ? 3.0 : 2.0;
        waveAnnouncement.isBoss = isBossWave;

        // Show wave bonus
        particleSystem.createFloatingText(
            400, 100,
            `Wave ${gameState.currentWave - 1} Complete! +${waveBonus}`,
            '#4a9eff'
        );
    }
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#001133';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cellular automata terrain
    if (gameState.terrain) {
        const cellSize = gameState.terrain.cellSize || 10;
        const cells = gameState.terrain.cells;
        
        if (cells) {
            for (let y = 0; y < cells.length; y++) {
                for (let x = 0; x < cells[y].length; x++) {
                    const cellType = cells[y][x];
                    let color = null;
                    
                    switch (cellType) {
                        case 1: // StarDust
                            color = 'rgba(100, 150, 255, 0.3)';
                            break;
                        case 2: // DenseNebula
                            color = 'rgba(200, 100, 255, 0.4)';
                            break;
                        case 3: // Asteroid
                            color = 'rgba(150, 150, 150, 0.6)';
                            break;
                    }
                    
                    if (color) {
                        ctx.fillStyle = color;
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }
        }
    }
    
    // Draw grid overlay (lighter)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw game objects
    if (gameState.objects) {
        gameState.objects.forEach(obj => {
            let config = RENDER_CONFIG[obj.type];
            if (!config) return;

            // Override with enemy-specific config if available
            if (obj.type === 2 && obj.enemyType !== undefined) {
                const enemyConfig = ENEMY_TYPES[obj.enemyType];
                if (enemyConfig) {
                    config = enemyConfig;
                }
            }

            ctx.beginPath();
            ctx.arc(obj.position.x, obj.position.y, config.radius, 0, Math.PI * 2);

            // Use tower-specific colors
            if (obj.type === 3 && obj.towerType !== undefined) {
                ctx.fillStyle = TOWER_COLORS[obj.towerType] || config.color;
            } else {
                ctx.fillStyle = config.color;
            }

            ctx.fill();

            // Boss glow effect
            if (obj.isBoss) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = config.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Projectile trails
            if (obj.type === 4) {
                particleSystem.createProjectileTrail(obj.position.x, obj.position.y, config.color);
            }

            // Draw additional info for specific types
            if (obj.type === 2 && obj.health !== undefined) {
                // Enemy health bar
                const barWidth = 30;
                const barHeight = 4;
                const healthPercent = obj.health / obj.maxHealth;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(
                    obj.position.x - barWidth/2,
                    obj.position.y - config.radius - 10,
                    barWidth,
                    barHeight
                );

                ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : '#ff4444';
                ctx.fillRect(
                    obj.position.x - barWidth/2,
                    obj.position.y - config.radius - 10,
                    barWidth * healthPercent,
                    barHeight
                );

                // Draw slow effect indicator
                if (obj.isSlowed) {
                    ctx.strokeStyle = '#44aaff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(obj.position.x, obj.position.y, config.radius + 3, 0, Math.PI * 2);
                    ctx.stroke();

                    // Add "ice" symbol or text
                    ctx.fillStyle = '#44aaff';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('❄', obj.position.x, obj.position.y - config.radius - 15);
                }
            } else if (obj.type === 3) {
                // Tower range indicator
                ctx.beginPath();
                ctx.arc(obj.position.x, obj.position.y, obj.range || 100, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(68, 255, 68, 0.2)';
                ctx.stroke();

                // Selected tower highlight
                if (selectedTower && selectedTower.id === obj.id) {
                    ctx.strokeStyle = '#ffff00';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(obj.position.x, obj.position.y, config.radius + 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.lineWidth = 1;

                    // Brighter range indicator for selected tower
                    ctx.beginPath();
                    ctx.arc(obj.position.x, obj.position.y, obj.range || 100, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
                    ctx.stroke();
                }

                // Upgrade level indicators
                const level = (obj.upgradeLevel || 0) + 1;
                if (level > 1) {
                    ctx.fillStyle = '#ffff00';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`★${level}`, obj.position.x, obj.position.y + config.radius + 12);
                }
            }
        });
    }
    
    // Draw particles (on top of everything else)
    particleSystem.draw(ctx);

    // Draw wave announcement
    if (waveAnnouncement.lifetime > 0) {
        const opacity = Math.min(1, waveAnnouncement.lifetime / 0.5);
        ctx.save();
        ctx.globalAlpha = opacity;

        if (waveAnnouncement.isBoss) {
            // Boss wave - animated warning
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 136, 0, ${pulse})`;
            ctx.font = 'bold 56px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(waveAnnouncement.text, canvas.width/2, canvas.height/2 - 150);
            ctx.fillText(waveAnnouncement.text, canvas.width/2, canvas.height/2 - 150);
        } else {
            // Normal wave
            ctx.fillStyle = '#4a9eff';
            ctx.font = 'bold 42px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(waveAnnouncement.text, canvas.width/2, canvas.height/2 - 150);
            ctx.fillText(waveAnnouncement.text, canvas.width/2, canvas.height/2 - 150);
        }

        ctx.restore();
    }

    // Draw game over / victory overlays
    if (gameState.gameState === 'victory') {
        ctx.fillStyle = 'rgba(0, 100, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#44ff44';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', canvas.width/2, canvas.height/2 - 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText('You successfully defended your planet!', canvas.width/2, canvas.height/2 + 20);
        ctx.font = '18px Arial';
        ctx.fillText(`Survived all ${gameState.currentWave} waves`, canvas.width/2, canvas.height/2 + 50);

        // Victory particles
        if (Math.random() < 0.3) {
            particleSystem.createExplosion(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                ['#44ff44', '#ffff00', '#44aaff'][Math.floor(Math.random() * 3)],
                10,
                80,
                4
            );
        }
    } else if (gameState.gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText('Your planet has been destroyed!', canvas.width/2, canvas.height/2 + 20);
        ctx.font = '18px Arial';
        ctx.fillText(`Survived ${gameState.currentWave} waves`, canvas.width/2, canvas.height/2 + 50);
    }

    // Draw gravity field visualization
    if (showGravityField) {
        drawGravityField(ctx);
    }

    // Draw build preview
    drawBuildPreview(ctx);

    // Draw debug panel
    if (showDebugPanel) {
        drawDebugPanel(ctx);
    }

    // Draw ability UI
    drawAbilityUI(ctx);

    // Draw connection status
    if (!isConnected) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Not Connected to Server', canvas.width/2, canvas.height/2);
        ctx.font = '16px Arial';
        ctx.fillText('Click "Connect to Server" to start', canvas.width/2, canvas.height/2 + 30);
    }

    ctx.textAlign = 'left';
}

// Activate special abilities
function activateAbility(abilityName) {
    if (!isConnected || !ws) return;

    const ability = playerAbilities[abilityName];

    // Check if ability is ready
    if (!ability.ready || ability.cooldown > 0) {
        console.log(`${abilityName} is on cooldown (${ability.cooldown.toFixed(1)}s remaining)`);
        return;
    }

    // Check if player has enough resources
    if (gameState.playerResources < ability.cost) {
        console.log(`Not enough resources for ${abilityName} (need ${ability.cost}, have ${gameState.playerResources})`);
        particleSystem.createFloatingText(400, 300, 'Not enough resources!', '#ff4444');
        return;
    }

    // Activate ability
    ability.cooldown = ability.maxCooldown;
    ability.ready = false;

    // Send ability activation to server
    const message = {
        action: 'special_ability',
        abilityType: abilityName
    };
    ws.send(JSON.stringify(message));

    // Client-side visual effects (optimistic)
    switch (abilityName) {
        case 'meteorStrike':
            // Create meteor particles falling from top
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * canvas.width;
                particleSystem.particles.push({
                    x: x,
                    y: -20,
                    vx: (Math.random() - 0.5) * 50,
                    vy: 300,
                    color: '#ff8844',
                    size: 4 + Math.random() * 6,
                    lifetime: 2.0,
                    maxLifetime: 2.0
                });
            }
            particleSystem.createFloatingText(400, 100, 'METEOR STRIKE!', '#ff8844');
            console.log('Meteor Strike activated!');
            break;

        case 'freezeWave':
            // Create freeze wave expanding from center
            particleSystem.createExplosion(400, 300, '#44aaff', 50, 200, 10);
            particleSystem.createFloatingText(400, 100, 'FREEZE WAVE!', '#44aaff');
            console.log('Freeze Wave activated!');
            break;

        case 'repair':
            // Create healing particles around base
            particleSystem.createExplosion(400, 300, '#44ff44', 30, 150, 8);
            particleSystem.createFloatingText(400, 100, 'REPAIR!', '#44ff44');
            console.log('Repair activated!');
            break;
    }
}

// Draw gravity field visualization
function drawGravityField(ctx) {
    if (!gameState.objects) return;

    // Find all massive objects (planets and gravity towers)
    const massiveObjects = gameState.objects.filter(obj =>
        obj.type === 1 || (obj.type === 3 && obj.towerType === 3)
    );

    if (massiveObjects.length === 0) return;

    // Draw gravity wells as concentric circles
    massiveObjects.forEach(obj => {
        const maxRadius = obj.type === 1 ? 200 : 150; // Planets have larger fields
        const rings = 5;

        for (let i = 1; i <= rings; i++) {
            const radius = (maxRadius / rings) * i;
            const opacity = (rings - i + 1) / (rings * 3); // Fade out

            ctx.beginPath();
            ctx.arc(obj.position.x, obj.position.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(138, 43, 226, ${opacity})`; // Purple gravity field
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw gravity well indicator
        ctx.fillStyle = 'rgba(138, 43, 226, 0.3)';
        ctx.beginPath();
        ctx.arc(obj.position.x, obj.position.y, 10, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw gravity vector field (sample points)
    const gridSize = 60;
    for (let x = gridSize/2; x < canvas.width; x += gridSize) {
        for (let y = gridSize/2; y < canvas.height; y += gridSize) {
            // Calculate net gravity at this point
            let gx = 0, gy = 0;

            massiveObjects.forEach(obj => {
                const dx = obj.position.x - x;
                const dy = obj.position.y - y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 100) { // Avoid singularity
                    const dist = Math.sqrt(distSq);
                    const strength = 10000 / distSq; // Simplified gravity calc
                    gx += (dx / dist) * strength;
                    gy += (dy / dist) * strength;
                }
            });

            const magnitude = Math.sqrt(gx * gx + gy * gy);
            if (magnitude > 0.5) {
                const scale = Math.min(magnitude / 10, 15);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (gx / magnitude) * scale, y + (gy / magnitude) * scale);
                ctx.strokeStyle = `rgba(138, 43, 226, ${Math.min(magnitude / 20, 0.8)})`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Arrow head
                const angle = Math.atan2(gy, gx);
                ctx.save();
                ctx.translate(x + (gx / magnitude) * scale, y + (gy / magnitude) * scale);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-5, -3);
                ctx.lineTo(-5, 3);
                ctx.closePath();
                ctx.fillStyle = `rgba(138, 43, 226, ${Math.min(magnitude / 20, 0.8)})`;
                ctx.fill();
                ctx.restore();
            }
        }
    }
}

// Draw debug panel
function drawDebugPanel(ctx) {
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 280, 200);

    ctx.fillStyle = '#44ff44';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';

    let y = 30;
    const lineHeight = 18;

    ctx.fillText('=== DEBUG PANEL ===', 20, y);
    y += lineHeight * 1.5;

    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';

    ctx.fillText(`FPS: ${performanceStats.fps}`, 20, y);
    y += lineHeight;

    ctx.fillText(`Objects: ${performanceStats.objectCount}`, 20, y);
    y += lineHeight;

    ctx.fillText(`Particles: ${performanceStats.particleCount}`, 20, y);
    y += lineHeight;

    ctx.fillText(`Wave: ${gameState.currentWave}/${gameState.maxWaves || 15}`, 20, y);
    y += lineHeight;

    ctx.fillText(`Health: ${gameState.playerHealth}`, 20, y);
    y += lineHeight;

    ctx.fillText(`Resources: ${gameState.playerResources}`, 20, y);
    y += lineHeight;

    ctx.fillText(`Score: ${gameStats.score}`, 20, y);
    y += lineHeight;

    y += lineHeight * 0.5;
    ctx.fillStyle = '#44aaff';
    ctx.fillText('Toggles:', 20, y);
    y += lineHeight;

    ctx.font = '11px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`[G] Gravity Field: ${showGravityField ? 'ON' : 'OFF'}`, 25, y);
    y += lineHeight;

    ctx.fillText(`[P] Pathfinding: ${showPathfinding ? 'ON' : 'OFF'}`, 25, y);
}

// Draw build preview
function drawBuildPreview(ctx) {
    if (!buildPreview.visible) return;

    const config = RENDER_CONFIG[3]; // Tower config
    const color = buildPreview.valid ? 'rgba(68, 255, 68, 0.5)' : 'rgba(255, 68, 68, 0.5)';

    // Ghost tower
    ctx.beginPath();
    ctx.arc(buildPreview.x, buildPreview.y, config.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Range indicator
    ctx.beginPath();
    ctx.arc(buildPreview.x, buildPreview.y, 100, 0, Math.PI * 2); // Default range
    ctx.strokeStyle = color;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cost indicator
    const towerCosts = [50, 75, 60, 100]; // Basic, Splash, Slow, Gravity
    const cost = towerCosts[selectedTowerType] || 50;
    ctx.fillStyle = buildPreview.valid ? '#44ff44' : '#ff4444';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`$${cost}`, buildPreview.x, buildPreview.y - config.radius - 15);
}

// Draw ability UI
function drawAbilityUI(ctx) {
    const abilities = [
        { name: 'Meteor Strike', key: 'Q', data: playerAbilities.meteorStrike, color: '#ff8844' },
        { name: 'Freeze Wave', key: 'W', data: playerAbilities.freezeWave, color: '#44aaff' },
        { name: 'Repair', key: 'E', data: playerAbilities.repair, color: '#44ff44' }
    ];

    const startX = canvas.width - 210;
    const startY = canvas.height - 120;
    const boxWidth = 200;
    const boxHeight = 30;
    const spacing = 5;

    abilities.forEach((ability, index) => {
        const y = startY + (boxHeight + spacing) * index;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(startX, y, boxWidth, boxHeight);

        // Border
        const ready = ability.data.ready && ability.data.cooldown === 0;
        ctx.strokeStyle = ready ? ability.color : '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, y, boxWidth, boxHeight);

        // Cooldown overlay
        if (ability.data.cooldown > 0) {
            const percent = ability.data.cooldown / ability.data.maxCooldown;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(startX, y, boxWidth * percent, boxHeight);
        }

        // Text
        ctx.fillStyle = ready ? '#ffffff' : '#888888';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`[${ability.key}] ${ability.name}`, startX + 5, y + 12);

        // Cost and cooldown
        ctx.font = '10px Arial';
        if (ability.data.cooldown > 0) {
            ctx.fillText(`${ability.data.cooldown.toFixed(1)}s`, startX + 5, y + 25);
        } else {
            ctx.fillText(`$${ability.data.cost}`, startX + 5, y + 25);
        }

        // Ready indicator
        if (ready && gameState.playerResources >= ability.data.cost) {
            ctx.fillStyle = ability.color;
            ctx.beginPath();
            ctx.arc(startX + boxWidth - 10, y + boxHeight/2, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Help text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('[F3] Debug Panel  [G] Gravity Field', canvas.width - 10, startY - 10);
}

// Start render loop
let lastTime = performance.now();
function gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // Update particle system
    particleSystem.update(deltaTime);

    // Update wave announcement
    if (waveAnnouncement.lifetime > 0) {
        waveAnnouncement.lifetime -= deltaTime;
    }

    // Update ability cooldowns
    for (const abilityName in playerAbilities) {
        const ability = playerAbilities[abilityName];
        if (ability.cooldown > 0) {
            ability.cooldown -= deltaTime;
            if (ability.cooldown <= 0) {
                ability.cooldown = 0;
                ability.ready = true;
            }
        }
    }

    // Update performance stats
    performanceStats.frameCount++;
    if (currentTime - performanceStats.lastTime >= 1000) {
        performanceStats.fps = performanceStats.frameCount;
        performanceStats.frameCount = 0;
        performanceStats.lastTime = currentTime;
    }
    performanceStats.objectCount = gameState.objects ? gameState.objects.length : 0;
    performanceStats.particleCount = particleSystem.particles.length + particleSystem.floatingTexts.length;

    render();
    requestAnimationFrame(gameLoop);
}

// Initialize
updateUI();
gameLoop();