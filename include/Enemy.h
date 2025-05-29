#pragma once

#include "GameObject.h"
#include <iostream>
#include <vector>

class Enemy : public GameObject {
public:
    double health;
    double maxHealth;
    double speed;
    int reward;
    
    // Pathfinding data
    std::vector<Vec2d> m_path;
    size_t m_currentPathIndex;
    Vec2d m_targetPosition;
    double m_pathRecalculateTimer;
    
    Enemy(Vec2d position, double health = 100.0, double speed = 50.0, int reward = 10)
        : GameObject(GameObjectType::Enemy, position, 5.0, false), 
          health(health), maxHealth(health), speed(speed), reward(reward),
          m_currentPathIndex(0), m_targetPosition(400, 300),
          m_pathRecalculateTimer(0) {}
    
    void update(double deltaTime) override {
        m_pathRecalculateTimer -= deltaTime;
        
        // Check if we've reached current path node
        if (!m_path.empty() && m_currentPathIndex < m_path.size()) {
            Vec2d currentTarget = m_path[m_currentPathIndex];
            double distToNode = (currentTarget - position).length();
            
            if (distToNode < 10.0) { // Reached node threshold
                advanceOnPath();
            }
        }
    }
    
    void takeDamage(double damage) {
        health -= damage;
        if (health <= 0) {
            alive = false;
        }
    }
    
    void setPath(const std::vector<Vec2d>& path) {
        m_path = path;
        m_currentPathIndex = 0;
        m_pathRecalculateTimer = 3.0; // Recalculate every 3 seconds
    }
    
    void setTarget(const Vec2d& target) {
        m_targetPosition = target;
    }
    
    Vec2d getNextPathTarget() const {
        if (m_path.empty() || m_currentPathIndex >= m_path.size()) {
            return m_targetPosition; // Fall back to direct movement
        }
        return m_path[m_currentPathIndex];
    }
    
    void advanceOnPath() {
        if (m_currentPathIndex < m_path.size()) {
            m_currentPathIndex++;
        }
    }
    
    bool needsNewPath() const {
        return m_path.empty() || m_currentPathIndex >= m_path.size() || 
               m_pathRecalculateTimer <= 0;
    }
    
    void render() const override {
        std::cout << "Enemy at (" << position.x << ", " << position.y << ") with " << health << "/" << maxHealth << " HP" << std::endl;
    }
    
    json toJson() const override {
        json j = GameObject::toJson();
        j["health"] = health;
        j["maxHealth"] = maxHealth;
        // Optionally add path visualization data
        if (!m_path.empty()) {
            j["hasPath"] = true;
            j["pathLength"] = static_cast<int>(m_path.size());
        }
        return j;
    }
};