// Game state
let gameState = {
    objects: [],
    playerHealth: 100,
    playerResources: 200,
    currentWave: 0
};

// Track previous game state for detecting changes
let previousGameState = {
    objects: []
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Particle system for visual effects
const particleSystem = new ParticleSystem();

// WebSocket connection
let ws = null;
let isConnected = false;

// UI elements
const healthSpan = document.getElementById('health');
const resourcesSpan = document.getElementById('resources');
const waveSpan = document.getElementById('wave');
const statusSpan = document.getElementById('status');
const connectBtn = document.getElementById('connectBtn');

// Rendering configuration
const RENDER_CONFIG = {
    1: { color: '#888888', radius: 30, name: 'Planet' },     // Planet
    2: { color: '#ff4444', radius: 8, name: 'Enemy' },       // Enemy
    3: { color: '#44ff44', radius: 12, name: 'Tower' },      // Tower
    4: { color: '#ffff00', radius: 3, name: 'Projectile' }   // Projectile
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

// Tower selection
let selectedTowerType = 0;
const towerButtons = document.querySelectorAll('.tower-btn');

towerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        towerButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTowerType = parseInt(btn.dataset.type);
    });
});

// Canvas click handler
canvas.addEventListener('click', (event) => {
    if (!isConnected) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Send build tower command with selected type
    const message = {
        action: 'build_tower',
        position: { x: x, y: y },
        towerType: selectedTowerType
    };
    
    ws.send(JSON.stringify(message));
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
            // Enemy died - create explosion
            particleSystem.createExplosion(
                oldEnemy.position.x,
                oldEnemy.position.y,
                '#ff4444',
                20,
                100,
                3
            );
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
}

function updateUI() {
    healthSpan.textContent = `Health: ${gameState.playerHealth}`;
    resourcesSpan.textContent = `Resources: ${gameState.playerResources}`;
    const maxWaves = gameState.maxWaves || 15;
    waveSpan.textContent = `Wave: ${gameState.currentWave} / ${maxWaves}`;
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
            const config = RENDER_CONFIG[obj.type];
            if (!config) return;
            
            ctx.beginPath();
            ctx.arc(obj.position.x, obj.position.y, config.radius, 0, Math.PI * 2);
            
            // Use tower-specific colors
            if (obj.type === 3 && obj.towerType !== undefined) {
                ctx.fillStyle = TOWER_COLORS[obj.towerType] || config.color;
            } else {
                ctx.fillStyle = config.color;
            }
            
            ctx.fill();
            
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
            }
        });
    }
    
    // Draw particles (on top of everything else)
    particleSystem.draw(ctx);

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

    render();
    requestAnimationFrame(gameLoop);
}

// Initialize
updateUI();
gameLoop();