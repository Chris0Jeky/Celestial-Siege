#pragma once

#include "Tower.h"
#include "GameObject.h"
#include "Enemy.h"
#include <vector>
#include <memory>

enum class TowerType {
    Basic = 0,
    Splash = 1,
    Slow = 2,
    Gravity = 3
};

// Basic Tower - standard single-target damage
class BasicTower : public Tower {
public:
    BasicTower(Vec2d position) 
        : Tower(position, 100, 20, 1.0, 50) {
        m_towerType = TowerType::Basic;
    }
    
    json toJson() const override {
        json j = Tower::toJson();
        j["towerType"] = static_cast<int>(m_towerType);
        return j;
    }
    
protected:
    TowerType m_towerType;
};

// Splash Tower - area damage to all enemies in range
class SplashTower : public Tower {
public:
    SplashTower(Vec2d position) 
        : Tower(position, 120, 15, 1.5, 75) { // Larger range, slower fire rate, more expensive
        m_towerType = TowerType::Splash;
        m_splashRadius = 50;
    }
    
    void fireAt(GameObject* target, std::vector<std::unique_ptr<GameObject>>& objects) override {
        // Deal damage to all enemies within splash radius
        Vec2d targetPos = target->position;
        
        for (auto& obj : objects) {
            if (obj->type == GameObjectType::Enemy && obj->alive) {
                double dist = (obj->position - targetPos).length();
                if (dist <= m_splashRadius) {
                    Enemy* enemy = static_cast<Enemy*>(obj.get());
                    enemy->takeDamage(damage);
                }
            }
        }
        
        cooldownRemaining = 1.0 / fireRate;
    }
    
    json toJson() const override {
        json j = Tower::toJson();
        j["towerType"] = static_cast<int>(m_towerType);
        j["splashRadius"] = m_splashRadius;
        return j;
    }
    
protected:
    TowerType m_towerType;
    double m_splashRadius;
};

// Slow Tower - reduces enemy movement speed
class SlowTower : public Tower {
public:
    SlowTower(Vec2d position) 
        : Tower(position, 80, 5, 2.0, 60) { // Shorter range, minimal damage, fast fire rate
        m_towerType = TowerType::Slow;
        m_slowFactor = 0.5;
        m_slowDuration = 3.0;
    }
    
    void fireAt(GameObject* target, std::vector<std::unique_ptr<GameObject>>& objects) override {
        if (target->type == GameObjectType::Enemy) {
            Enemy* enemy = static_cast<Enemy*>(target);
            // Apply slow effect (would need to add slow system to Enemy class)
            enemy->takeDamage(damage);
            // TODO: Implement slow effect
        }
        
        cooldownRemaining = 1.0 / fireRate;
    }
    
    json toJson() const override {
        json j = Tower::toJson();
        j["towerType"] = static_cast<int>(m_towerType);
        j["slowFactor"] = m_slowFactor;
        return j;
    }
    
protected:
    TowerType m_towerType;
    double m_slowFactor;
    double m_slowDuration;
};

// Gravity Tower - creates a gravity well to affect projectiles and enemies
class GravityTower : public Tower {
public:
    GravityTower(Vec2d position) 
        : Tower(position, 150, 0, 0, 100) { // Large range, no damage, no firing, expensive
        m_towerType = TowerType::Gravity;
        m_gravityStrength = 1000.0; // Additional mass for gravity calculations
        mass = 500.0; // Make it have significant mass
        
        // Gravity towers don't fire, they constantly affect nearby objects
        fireRate = 0;
    }
    
    void update(double deltaTime) override {
        // Gravity towers don't have traditional cooldowns
        // Their effect is constant through the physics engine
    }
    
    void fireAt(GameObject* target, std::vector<std::unique_ptr<GameObject>>& objects) override {
        // Gravity towers don't fire - their effect is through physics
    }
    
    bool canFire() const override {
        return false; // Never fires projectiles
    }
    
    json toJson() const override {
        json j = Tower::toJson();
        j["towerType"] = static_cast<int>(m_towerType);
        j["gravityStrength"] = m_gravityStrength;
        return j;
    }
    
protected:
    TowerType m_towerType;
    double m_gravityStrength;
};

// Factory function to create towers by type
inline std::unique_ptr<Tower> createTower(TowerType type, Vec2d position) {
    switch (type) {
        case TowerType::Basic:
            return std::make_unique<BasicTower>(position);
        case TowerType::Splash:
            return std::make_unique<SplashTower>(position);
        case TowerType::Slow:
            return std::make_unique<SlowTower>(position);
        case TowerType::Gravity:
            return std::make_unique<GravityTower>(position);
        default:
            return std::make_unique<BasicTower>(position);
    }
}