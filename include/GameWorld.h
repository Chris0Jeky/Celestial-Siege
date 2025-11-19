#pragma once

#include "GameObject.h"
#include "Planet.h"
#include "Enemy.h"
#include "EnemyTypes.h"
#include "Tower.h"
#include "TowerTypes.h"
#include "Projectile.h"
#include "WebSocketServer.h"
#include "PhysicsEngine.h"
#include "CellularAutomata.h"
#include "PathfindingSystem.h"
#include <vector>
#include <memory>
#include <algorithm>
#include <chrono>
#include <thread>

enum class GameState {
    Playing,
    Victory,
    GameOver
};

class GameWorld {
private:
    std::vector<std::unique_ptr<GameObject>> m_objects;
    int m_playerHealth;
    int m_playerResources;
    double m_waveTimer;
    int m_currentWave;
    bool m_running;
    GameState m_gameState;
    WebSocketServer m_webSocketServer;
    PhysicsEngine m_physicsEngine;
    CellularAutomata m_cellularAutomata;
    double m_cellularUpdateTimer;
    PathfindingSystem m_pathfinding;

public:
    static const int MAX_WAVES = 15;  // Victory condition

    GameWorld()
        : m_playerHealth(100), m_playerResources(200),
          m_waveTimer(0), m_currentWave(0), m_running(false),
          m_gameState(GameState::Playing),
          m_cellularAutomata(80, 60, 10.0), m_cellularUpdateTimer(0),
          m_pathfinding(80, 60, 10.0) {}
    
    void init();
    void run();
    void update(double deltaTime);
    void spawnWave();
    void handleCollisions();
    void cleanupDeadObjects();
    
    bool placeTower(Vec2d position, int towerType);
    bool upgradeTower(int towerId);
    void spawnEnemy(Vec2d position);
    void spawnProjectile(Vec2d from, Vec2d to, double damage);
    
    const std::vector<std::unique_ptr<GameObject>>& getObjects() const { return m_objects; }
    int getPlayerHealth() const { return m_playerHealth; }
    int getPlayerResources() const { return m_playerResources; }
    
    json getStateAsJson() const;
    
private:
    void handleClientMessage(const std::string& message);
    void activateSpecialAbility(const std::string& abilityType);
};