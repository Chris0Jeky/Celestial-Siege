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

// Reset client-side state to avoid stale data when reconnecting
function resetClientState() {
    gameState = {
        objects: [],
        playerHealth: 100,
        playerResources: 200,
        currentWave: 0
    };
    previousGameState = {
        objects: [],
        playerResources: 200
    };
    gameStats = {
        kills: 0,
        score: 0,
        wavesCompleted: 0
    };
    waveAnnouncement = {
        text: '',
        lifetime: 0,
        isBoss: false
    };

    particleSystem.clear();
    selectedTower = null;
    buildMode = true;
    towerInfoPanel.classList.add('hidden');
    updateUI();
}

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

function connectToServer() {
    try {
        ws = new WebSocket('ws://localhost:9002');

        ws.onopen = () => {
            resetClientState();
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

    resetClientState();
}

function updateGameState(newState) {
    // Detect events and trigger particle effects
    detectGameEvents(gameState, newState);

    // Update state
    previousGameState = JSON.parse(JSON.stringify(gameState));
    gameState = newState;

    // Refresh selected tower reference using the latest state
    if (selectedTower && gameState.objects) {
        const updatedTower = gameState.objects.find(
            (obj) => obj.type === 3 && obj.id === selectedTower.id
        );

        if (updatedTower) {
            selectedTower = updatedTower;
            showTowerInfo(updatedTower);
        } else {
            selectedTower = null;
            buildMode = true;
            towerInfoPanel.classList.add('hidden');
        }
    }

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

    render();
    requestAnimationFrame(gameLoop);
}

// Initialize
updateUI();
gameLoop();