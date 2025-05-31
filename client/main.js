// Game state
let gameState = {
    objects: [],
    playerHealth: 100,
    playerResources: 200,
    currentWave: 0
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
    gameState = newState;
    updateUI();
}

function updateUI() {
    healthSpan.textContent = `Health: ${gameState.playerHealth}`;
    resourcesSpan.textContent = `Resources: ${gameState.playerResources}`;
    waveSpan.textContent = `Wave: ${gameState.currentWave}`;
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
            } else if (obj.type === 3) {
                // Tower range indicator
                ctx.beginPath();
                ctx.arc(obj.position.x, obj.position.y, obj.range || 100, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(68, 255, 68, 0.2)';
                ctx.stroke();
            }
        });
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
function gameLoop() {
    render();
    requestAnimationFrame(gameLoop);
}

// Initialize
updateUI();
gameLoop();