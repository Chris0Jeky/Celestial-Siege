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
                if (this.gameState.playerResources >= 50) {
                    this.gameState.playerResources -= 50;
                    this.gameState.objects.push({
                        id: Date.now(),
                        type: 3, // Tower
                        position: message.position,
                        range: 100,
                        damage: 20,
                        fireRate: 1
                    });
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
        
        let enemySpawnTimer = 0;
        let waveTimer = 0;
        
        // Simulate game updates
        this.gameInterval = setInterval(() => {
            const deltaTime = 0.016; // 60 FPS
            
            // Update enemies
            this.gameState.objects.forEach(obj => {
                if (obj.type === 2) { // Enemy
                    // Move towards center
                    const dx = 400 - obj.position.x;
                    const dy = 300 - obj.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        obj.position.x += (dx / dist) * 50 * deltaTime;
                        obj.position.y += (dy / dist) * 50 * deltaTime;
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
                    
                    if (nearestEnemy && (!tower.cooldown || tower.cooldown <= 0)) {
                        // Create projectile
                        this.gameState.objects.push({
                            id: Date.now() + Math.random(),
                            type: 4, // Projectile
                            position: { ...tower.position },
                            target: nearestEnemy.id,
                            damage: tower.damage || 20,
                            speed: 200
                        });
                        tower.cooldown = 1.0; // 1 second cooldown
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