#include "GameWorld.h"
#include <iostream>
#include "../libs/nlohmann/json.hpp"

void GameWorld::init() {
    // Create a solar system with planets that create gravitational fields
    m_objects.push_back(std::make_unique<Planet>(Vec2d(400, 300), 50, 8000.0, 1)); // Player's planet (massive)
    m_objects.push_back(std::make_unique<Planet>(Vec2d(150, 150), 30, 3000.0, 0)); // Neutral planet
    m_objects.push_back(std::make_unique<Planet>(Vec2d(650, 450), 25, 2500.0, 0)); // Neutral planet
    m_objects.push_back(std::make_unique<Planet>(Vec2d(200, 450), 20, 2000.0, -1)); // Enemy planet
    
    // Initialize cellular automata for dynamic terrain
    m_cellularAutomata.initialize(0.35); // 35% initial density
    
    // Initialize pathfinding obstacles
    m_pathfinding.updateObstacles(m_objects);
    
    // Set up WebSocket message handler
    m_webSocketServer.setOnMessageCallback(
        [this](const std::string& msg) { this->handleClientMessage(msg); });
    
    std::cout << "Celestial Siege initialized - Gravity simulation active!" << std::endl;
    std::cout << "Planets create gravitational fields that affect all objects" << std::endl;
    std::cout << "Dynamic terrain using Game of Life cellular automata" << std::endl;
    std::cout << "Enemies use gravity-aware A* pathfinding" << std::endl;
}

void GameWorld::run() {
    // Start WebSocket server
    m_webSocketServer.run(9002);
    std::cout << "WebSocket server started on port 9002" << std::endl;
    
    auto last_time = std::chrono::high_resolution_clock::now();
    m_running = true;
    
    while (m_running && m_playerHealth > 0) {
        auto current_time = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> elapsed = current_time - last_time;
        double deltaTime = elapsed.count();
        last_time = current_time;
        
        update(deltaTime);
        
        // Broadcast game state to all connected clients
        json state = getStateAsJson();
        m_webSocketServer.broadcast(state.dump());
        
        // Simple console output
        std::cout << "\rHealth: " << m_playerHealth << " Resources: " << m_playerResources 
                  << " Wave: " << m_currentWave << " Objects: " << m_objects.size() << std::flush;
        
        std::this_thread::sleep_for(std::chrono::milliseconds(16)); // ~60fps
    }
    
    m_webSocketServer.stop();
}

void GameWorld::update(double deltaTime) {
    // First, apply physics to all objects (gravity simulation)
    m_physicsEngine.update(m_objects, deltaTime);
    
    // Update pathfinding for enemies
    for (auto& obj : m_objects) {
        if (obj->type == GameObjectType::Enemy && obj->alive) {
            Enemy* enemy = static_cast<Enemy*>(obj.get());
            
            // Check if enemy needs a new path
            if (enemy->needsNewPath()) {
                // Find path to player's home planet
                std::vector<Vec2d> path = m_pathfinding.findPath(
                    enemy->position, 
                    m_objects[0]->position, // Player's planet
                    m_objects,
                    m_physicsEngine
                );
                enemy->setPath(path);
            }
            
            // Apply velocity towards next path target
            Vec2d target = enemy->getNextPathTarget();
            Vec2d direction = (target - enemy->position).normalized();
            enemy->velocity = direction * enemy->speed;
        }
    }
    
    // Then update individual objects
    for (auto& obj : m_objects) {
        obj->update(deltaTime);
    }
    
    // Update cellular automata periodically (every 2 seconds)
    m_cellularUpdateTimer += deltaTime;
    if (m_cellularUpdateTimer > 2.0) {
        m_cellularAutomata.update();
        m_cellularUpdateTimer = 0;
    }
    
    // Update wave timer
    m_waveTimer += deltaTime;
    if (m_waveTimer > 10.0) { // Spawn wave every 10 seconds
        spawnWave();
        m_waveTimer = 0;
    }
    
    // Handle tower shooting
    for (auto& obj : m_objects) {
        if (obj->type == GameObjectType::Tower && obj->alive) {
            Tower* tower = static_cast<Tower*>(obj.get());
            if (tower->canFire()) {
                // Find nearest enemy
                GameObject* nearestEnemy = nullptr;
                double nearestDistance = tower->range;
                
                for (auto& target : m_objects) {
                    if (target->type == GameObjectType::Enemy && target->alive) {
                        double dist = tower->distanceTo(*target);
                        if (dist < nearestDistance) {
                            nearestDistance = dist;
                            nearestEnemy = target.get();
                        }
                    }
                }
                
                if (nearestEnemy) {
                    // Use the new fireAt method which handles different tower types
                    tower->fireAt(nearestEnemy, m_objects);
                    
                    // Basic towers still spawn projectiles
                    if (dynamic_cast<BasicTower*>(tower) != nullptr) {
                        spawnProjectile(tower->position, nearestEnemy->position, tower->damage);
                    }
                }
            }
        }
    }
    
    handleCollisions();
    cleanupDeadObjects();
}

void GameWorld::spawnWave() {
    m_currentWave++;
    int enemyCount = 3 + m_currentWave * 2; // Increase enemies each wave
    
    for (int i = 0; i < enemyCount; i++) {
        double angle = (i * 2 * 3.14159) / enemyCount;
        Vec2d spawnPos(400 + cos(angle) * 300, 300 + sin(angle) * 300);
        spawnEnemy(spawnPos);
    }
}

void GameWorld::handleCollisions() {
    // Check projectile-enemy collisions
    for (auto& proj : m_objects) {
        if (proj->type == GameObjectType::Projectile && proj->alive) {
            Projectile* projectile = static_cast<Projectile*>(proj.get());
            
            for (auto& enemy : m_objects) {
                if (enemy->type == GameObjectType::Enemy && enemy->alive) {
                    if (projectile->distanceTo(*enemy) < 10) { // Hit radius
                        Enemy* e = static_cast<Enemy*>(enemy.get());
                        e->takeDamage(projectile->damage);
                        projectile->alive = false;
                        
                        if (!e->alive) {
                            m_playerResources += e->reward;
                        }
                        break;
                    }
                }
            }
        }
    }
    
    // Check enemy reaching player base
    for (auto& obj : m_objects) {
        if (obj->type == GameObjectType::Enemy && obj->alive) {
            // Assuming player base is at center (400, 300)
            if (obj->distanceTo(*m_objects[0]) < 60) { // Base radius
                m_playerHealth -= 10;
                obj->alive = false;
            }
        }
    }
}

void GameWorld::cleanupDeadObjects() {
    m_objects.erase(
        std::remove_if(m_objects.begin(), m_objects.end(),
            [](const std::unique_ptr<GameObject>& obj) {
                return !obj->alive;
            }),
        m_objects.end()
    );
}

bool GameWorld::placeTower(Vec2d position, int towerType) {
    // Check if position is buildable according to cellular automata
    if (!m_cellularAutomata.isBuildable(position)) {
        std::cout << "\nCannot build here - terrain is not suitable!" << std::endl;
        return false;
    }
    
    // Check for collision with existing objects
    for (const auto& obj : m_objects) {
        if (obj->alive && obj->isStatic) {
            double dist = (obj->position - position).length();
            if (dist < 40) { // Minimum distance between static objects
                std::cout << "\nToo close to existing structure!" << std::endl;
                return false;
            }
        }
    }
    
    // Create tower based on type
    auto tower = createTower(static_cast<TowerType>(towerType), position);
    if (m_playerResources >= tower->cost) {
        m_playerResources -= tower->cost;
        m_objects.push_back(std::move(tower));
        // Update pathfinding obstacles when new tower is placed
        m_pathfinding.updateObstacles(m_objects);
        return true;
    }
    return false;
}

void GameWorld::spawnEnemy(Vec2d position) {
    // Create enemy without initial velocity - pathfinding will handle movement
    auto enemy = std::make_unique<Enemy>(position);
    enemy->setTarget(m_objects[0]->position); // Target player's planet
    // Enemy will calculate gravity-aware path on first update
    m_objects.push_back(std::move(enemy));
}

void GameWorld::spawnProjectile(Vec2d from, Vec2d to, double damage) {
    m_objects.push_back(std::make_unique<Projectile>(from, to, damage));
}

json GameWorld::getStateAsJson() const {
    json state;
    state["objects"] = json::array();
    
    for (const auto& obj : m_objects) {
        if (obj->alive) {
            state["objects"].push_back(obj->toJson());
        }
    }
    
    state["playerHealth"] = m_playerHealth;
    state["playerResources"] = m_playerResources;
    state["currentWave"] = m_currentWave;
    
    // Add cellular automata grid data
    json gridData;
    gridData["width"] = m_cellularAutomata.getWidth();
    gridData["height"] = m_cellularAutomata.getHeight();
    gridData["cellSize"] = m_cellularAutomata.getCellSize();
    gridData["cells"] = json::array();
    
    const auto& grid = m_cellularAutomata.getGrid();
    for (int y = 0; y < m_cellularAutomata.getHeight(); ++y) {
        json row = json::array();
        for (int x = 0; x < m_cellularAutomata.getWidth(); ++x) {
            row.push_back(static_cast<int>(grid[y][x]));
        }
        gridData["cells"].push_back(row);
    }
    
    state["terrain"] = gridData;
    
    return state;
}

void GameWorld::handleClientMessage(const std::string& message) {
    try {
        json msg = json::parse(message);
        
        // Check if it has parsed flag from our simplified parser
        if (msg["parsed"].get_bool() == true) {
            // Extract actual data
            std::string data = msg["data"].get_string();
            
            // Simple string parsing for demonstration
            if (data.find("build_tower") != std::string::npos) {
                // Extract position from message (simplified)
                Vec2d position(400, 300); // Default position
                if (placeTower(position, 0)) {
                    std::cout << "\nTower placed at (" << position.x << ", " << position.y << ")" << std::endl;
                } else {
                    std::cout << "\nInsufficient resources to place tower" << std::endl;
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error handling message: " << e.what() << std::endl;
    }
}