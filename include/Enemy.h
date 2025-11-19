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

    // Slow effect data
    double m_slowFactor;        // Current slow multiplier (1.0 = normal, 0.5 = half speed)
    double m_slowDuration;      // How long the slow effect lasts
    double m_baseSpeed;         // Original speed before slow effects

    Enemy(Vec2d position, double health = 100.0, double speed = 50.0, int reward = 10)
        : GameObject(GameObjectType::Enemy, position, 5.0, false),
          health(health), maxHealth(health), speed(speed), reward(reward),
          m_currentPathIndex(0), m_targetPosition(400, 300),
          m_pathRecalculateTimer(0), m_slowFactor(1.0), m_slowDuration(0.0),
          m_baseSpeed(speed) {}
    
    void update(double deltaTime) override {
        m_pathRecalculateTimer -= deltaTime;

        // Update slow effect
        if (m_slowDuration > 0) {
            m_slowDuration -= deltaTime;
            if (m_slowDuration <= 0) {
                // Slow effect expired, restore normal speed
                m_slowFactor = 1.0;
                speed = m_baseSpeed;
            }
        }

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

    void applySlow(double factor, double duration) {
        // Only apply if the new slow is stronger or the current slow is about to expire
        if (factor < m_slowFactor || m_slowDuration < 0.5) {
            m_slowFactor = factor;
            m_slowDuration = duration;
            speed = m_baseSpeed * m_slowFactor;
        } else if (m_slowFactor < 1.0) {
            // Refresh duration if already slowed with same or weaker effect
            m_slowDuration = std::max(m_slowDuration, duration);
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
        // Add slow effect visualization
        if (m_slowDuration > 0) {
            j["isSlowed"] = true;
            j["slowFactor"] = m_slowFactor;
        }
        return j;
    }
};