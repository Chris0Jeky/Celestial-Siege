#include "GameWorld.h"
#include <iostream>
#include "../libs/nlohmann/json.hpp"

void GameWorld::init() {
    // Create some initial planets
    m_objects.push_back(std::make_unique<Planet>(Vec2d(400, 300), 50, 1)); // Player's planet
    m_objects.push_back(std::make_unique<Planet>(Vec2d(100, 100), 30, 0)); // Neutral planet
    m_objects.push_back(std::make_unique<Planet>(Vec2d(700, 500), 30, 0)); // Neutral planet
    
    std::cout << "Game world initialized with " << m_objects.size() << " objects" << std::endl;
}

void GameWorld::run() {
    auto last_time = std::chrono::high_resolution_clock::now();
    m_running = true;
    
    while (m_running && m_playerHealth > 0) {
        auto current_time = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> elapsed = current_time - last_time;
        double deltaTime = elapsed.count();
        last_time = current_time;
        
        update(deltaTime);
        
        // Simple console rendering
        std::cout << "\rHealth: " << m_playerHealth << " Resources: " << m_playerResources 
                  << " Wave: " << m_currentWave << " Objects: " << m_objects.size() << std::flush;
        
        std::this_thread::sleep_for(std::chrono::milliseconds(16)); // ~60fps
    }
}

void GameWorld::update(double deltaTime) {
    // Update all objects
    for (auto& obj : m_objects) {
        obj->update(deltaTime);
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
                    spawnProjectile(tower->position, nearestEnemy->position, tower->damage);
                    tower->fire();
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
    Tower tower(position);
    if (m_playerResources >= tower.cost) {
        m_playerResources -= tower.cost;
        m_objects.push_back(std::make_unique<Tower>(position));
        return true;
    }
    return false;
}

void GameWorld::spawnEnemy(Vec2d position) {
    // Make enemies move toward player base
    auto enemy = std::make_unique<Enemy>(position);
    Vec2d direction = (Vec2d(400, 300) - position).normalized();
    enemy->velocity = direction * enemy->speed;
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
    
    return state;
}