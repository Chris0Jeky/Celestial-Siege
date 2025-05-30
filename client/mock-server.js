// Mock WebSocket server for testing without a real C++ server
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;
        
        // Simulate connection
        setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this.onopen) this.onopen();
            
            // Send welcome message
            this.simulateMessage({
                type: 'welcome',
                message: 'Connected to Mock Celestial Siege server'
            });
            
            // Start sending game state updates
            this.startGameLoop();
        }, 100);
    }
    
    initializeTerrain() {
        const width = 80;
        const height = 60;
        const cellSize = 10;
        
        // Initialize empty grid
        this.terrainGrid = [];
        for (let y = 0; y < height; y++) {
            this.terrainGrid[y] = [];
            for (let x = 0; x < width; x++) {
                this.terrainGrid[y][x] = 0; // Empty
            }
        }
        
        // Randomly seed with stardust
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (Math.random() < 0.35) {
                    this.terrainGrid[y][x] = 1; // StarDust
                }
            }
        }
        
        // Create some initial clusters
        for (let i = 0; i < 5; i++) {
            const cx = Math.floor(Math.random() * (width - 10) + 5);
            const cy = Math.floor(Math.random() * (height - 10) + 5);
            const radius = 3;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx*dx + dy*dy <= radius*radius) {
                        const x = cx + dx;
                        const y = cy + dy;
                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            this.terrainGrid[y][x] = 1;
                        }
                    }
                }
            }
        }
        
        // Add terrain to game state
        this.gameState.terrain = {
            width: width,
            height: height,
            cellSize: cellSize,
            cells: this.terrainGrid
        };
        
        // Set up periodic updates
        this.terrainUpdateCounter = 0;
    }
    
    updateTerrain() {
        const width = this.gameState.terrain.width;
        const height = this.gameState.terrain.height;
        const newGrid = [];
        
        // Initialize new grid
        for (let y = 0; y < height; y++) {
            newGrid[y] = [];
            for (let x = 0; x < width; x++) {
                newGrid[y][x] = this.applyGameOfLifeRules(x, y);
            }
        }
        
        // Update the grid
        this.terrainGrid = newGrid;
        this.gameState.terrain.cells = this.terrainGrid;
    }
    
    countNeighbors(x, y, type) {
        let count = 0;
        const width = this.gameState.terrain.width;
        const height = this.gameState.terrain.height;
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (this.terrainGrid[ny][nx] === type || 
                        (type === 1 && this.terrainGrid[ny][nx] === 2)) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }
    
    applyGameOfLifeRules(x, y) {
        const current = this.terrainGrid[y][x];
        const stardustNeighbors = this.countNeighbors(x, y, 1);
        
        switch (current) {
            case 0: // Empty
                if (stardustNeighbors === 3) {
                    return 1; // Birth
                }
                break;
                
            case 1: // StarDust
                if (stardustNeighbors === 2 || stardustNeighbors === 3) {
                    return 1; // Survival
                } else if (stardustNeighbors >= 4) {
                    return 2; // Overcrowding -> DenseNebula
                } else {
                    return 0; // Death
                }
                break;
                
            case 2: // DenseNebula
                if (stardustNeighbors <= 1) {
                    return 1; // Dissipate to stardust
                } else if (stardustNeighbors >= 6 && (x + y) % 7 === 0) {
                    return 3; // Form asteroid
                }
                break;
                
            case 3: // Asteroid
                if (stardustNeighbors === 0) {
                    return 0; // Break apart
                }
                break;
        }
        
        return current;
    }
    
    send(data) {
        console.log('Mock server received:', data);
        
        // Parse and handle the message
        try {
            const message = JSON.parse(data);
            if (message.action === 'build_tower') {
                // Simulate tower placement
                this.simulateMessage({
                    type: 'ack',
                    original: message
                });
                
                // Update game state
                const towerType = message.towerType || 0;
                const towerCosts = { 0: 50, 1: 75, 2: 60, 3: 100 };
                const cost = towerCosts[towerType] || 50;
                
                if (this.gameState.playerResources >= cost) {
                    // Check if terrain is buildable
                    const gridX = Math.floor(message.position.x / this.gameState.terrain.cellSize);
                    const gridY = Math.floor(message.position.y / this.gameState.terrain.cellSize);
                    
                    if (gridX >= 0 && gridX < this.gameState.terrain.width && 
                        gridY >= 0 && gridY < this.gameState.terrain.height) {
                        const cellType = this.terrainGrid[gridY][gridX];
                        
                        // Can only build on stardust (1) or dense nebula (2)
                        if (cellType === 1 || cellType === 2) {
                            this.gameState.playerResources -= cost;
                            
                            // Create tower with type-specific properties
                            const towerConfigs = {
                                0: { range: 100, damage: 20, fireRate: 1 }, // Basic
                                1: { range: 120, damage: 15, fireRate: 1.5, splashRadius: 50 }, // Splash
                                2: { range: 80, damage: 5, fireRate: 2, slowFactor: 0.5 }, // Slow
                                3: { range: 150, damage: 0, fireRate: 0, mass: 500 } // Gravity
                            };
                            
                            const config = towerConfigs[towerType] || towerConfigs[0];
                            
                            this.gameState.objects.push({
                                id: Date.now(),
                                type: 3, // Tower
                                towerType: towerType,
                                position: message.position,
                                ...config
                            });
                        } else {
                            console.log('Cannot build here - unsuitable terrain!');
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    }
    
    close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) this.onclose();
        if (this.gameInterval) clearInterval(this.gameInterval);
    }
    
    simulateMessage(data) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }
    
    startGameLoop() {
        // Initialize game state
        this.gameState = {
            objects: [
                { id: 1, type: 1, position: { x: 400, y: 300 }, radius: 50, owner: 1 },
                { id: 2, type: 1, position: { x: 100, y: 100 }, radius: 30, owner: 0 },
                { id: 3, type: 1, position: { x: 700, y: 500 }, radius: 30, owner: 0 }
            ],
            playerHealth: 100,
            playerResources: 200,
            currentWave: 0
        };
        
        // Initialize cellular automata terrain
        this.initializeTerrain();
        
        let enemySpawnTimer = 0;
        let waveTimer = 0;
        
        // Simulate game updates
        this.gameInterval = setInterval(() => {
            const deltaTime = 0.016; // 60 FPS
            
            // Update terrain periodically (every 2 seconds)
            this.terrainUpdateCounter += deltaTime;
            if (this.terrainUpdateCounter > 2.0) {
                this.updateTerrain();
                this.terrainUpdateCounter = 0;
            }
            
            // Update enemies
            this.gameState.objects.forEach(obj => {
                if (obj.type === 2) { // Enemy
                    // Move towards center
                    const dx = 400 - obj.position.x;
                    const dy = 300 - obj.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        const speed = 50 * (obj.speedMultiplier || 1.0);
                        obj.position.x += (dx / dist) * speed * deltaTime;
                        obj.position.y += (dy / dist) * speed * deltaTime;
                    }
                    
                    // Check if reached base
                    if (dist < 60) {
                        obj.alive = false;
                        this.gameState.playerHealth -= 10;
                    }
                }
            });
            
            // Tower shooting
            this.gameState.objects.forEach(tower => {
                if (tower.type === 3) { // Tower
                    // Find nearest enemy
                    let nearestEnemy = null;
                    let nearestDist = tower.range || 100;
                    
                    this.gameState.objects.forEach(enemy => {
                        if (enemy.type === 2 && enemy.alive !== false) {
                            const dx = enemy.position.x - tower.position.x;
                            const dy = enemy.position.y - tower.position.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < nearestDist) {
                                nearestDist = dist;
                                nearestEnemy = enemy;
                            }
                        }
                    });
                    
                    if (nearestEnemy && (!tower.cooldown || tower.cooldown <= 0) && tower.fireRate > 0) {
                        // Handle different tower types
                        switch (tower.towerType) {
                            case 1: // Splash tower
                                // Damage all enemies in splash radius
                                this.gameState.objects.forEach(enemy => {
                                    if (enemy.type === 2 && enemy.alive !== false) {
                                        const dx = enemy.position.x - nearestEnemy.position.x;
                                        const dy = enemy.position.y - nearestEnemy.position.y;
                                        const dist = Math.sqrt(dx * dx + dy * dy);
                                        if (dist <= (tower.splashRadius || 50)) {
                                            enemy.health = (enemy.health || 100) - tower.damage;
                                            if (enemy.health <= 0) {
                                                enemy.alive = false;
                                                this.gameState.playerResources += 10;
                                            }
                                        }
                                    }
                                });
                                break;
                                
                            case 2: // Slow tower
                                // Apply slow effect
                                if (nearestEnemy) {
                                    nearestEnemy.speedMultiplier = tower.slowFactor || 0.5;
                                    // Remove slow after 3 seconds
                                    setTimeout(() => {
                                        if (nearestEnemy) nearestEnemy.speedMultiplier = 1.0;
                                    }, 3000);
                                    nearestEnemy.health = (nearestEnemy.health || 100) - tower.damage;
                                    if (nearestEnemy.health <= 0) {
                                        nearestEnemy.alive = false;
                                        this.gameState.playerResources += 10;
                                    }
                                }
                                break;
                                
                            case 3: // Gravity tower
                                // Gravity towers don't fire - their effect is passive
                                break;
                                
                            default: // Basic tower
                                // Create projectile
                                this.gameState.objects.push({
                                    id: Date.now() + Math.random(),
                                    type: 4, // Projectile
                                    position: { ...tower.position },
                                    target: nearestEnemy.id,
                                    damage: tower.damage || 20,
                                    speed: 200
                                });
                                break;
                        }
                        
                        tower.cooldown = 1.0 / (tower.fireRate || 1);
                    }
                    
                    if (tower.cooldown > 0) {
                        tower.cooldown -= deltaTime;
                    }
                }
            });
            
            // Update projectiles
            this.gameState.objects.forEach(proj => {
                if (proj.type === 4 && proj.target) {
                    const target = this.gameState.objects.find(o => o.id === proj.target);
                    if (target && target.alive !== false) {
                        const dx = target.position.x - proj.position.x;
                        const dy = target.position.y - proj.position.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < 10) {
                            // Hit!
                            target.health = (target.health || 100) - proj.damage;
                            if (target.health <= 0) {
                                target.alive = false;
                                this.gameState.playerResources += 10;
                            }
                            proj.alive = false;
                        } else {
                            // Move towards target
                            proj.position.x += (dx / dist) * proj.speed * deltaTime;
                            proj.position.y += (dy / dist) * proj.speed * deltaTime;
                        }
                    } else {
                        proj.alive = false;
                    }
                }
            });
            
            // Remove dead objects
            this.gameState.objects = this.gameState.objects.filter(obj => obj.alive !== false);
            
            // Spawn enemies
            waveTimer += deltaTime;
            if (waveTimer > 10) {
                waveTimer = 0;
                this.gameState.currentWave++;
                
                // Spawn wave
                const enemyCount = 3 + this.gameState.currentWave * 2;
                for (let i = 0; i < enemyCount; i++) {
                    const angle = (i * 2 * Math.PI) / enemyCount;
                    this.gameState.objects.push({
                        id: Date.now() + i,
                        type: 2, // Enemy
                        position: {
                            x: 400 + Math.cos(angle) * 350,
                            y: 300 + Math.sin(angle) * 350
                        },
                        health: 100,
                        maxHealth: 100,
                        alive: true
                    });
                }
            }
            
            // Send game state
            this.simulateMessage(this.gameState);
            
        }, 16); // ~60 FPS
    }
}

// Override WebSocket with mock when running without server
if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
    console.log('Using mock WebSocket server for local testing');
    window.WebSocket = MockWebSocket;
}