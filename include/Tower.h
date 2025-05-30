#pragma once

#include "GameObject.h"
#include <iostream>

class Tower : public GameObject {
public:
    double range;
    double damage;
    double fireRate;
    double cooldownRemaining;
    int cost;
    int upgradeLevel;
    static const int MAX_UPGRADE_LEVEL = 3;
    
    Tower(Vec2d position, double range = 100.0, double damage = 20.0, double fireRate = 1.0, int cost = 50)
        : GameObject(GameObjectType::Tower, position, 100.0, true),
          range(range), damage(damage), fireRate(fireRate), cooldownRemaining(0), cost(cost), upgradeLevel(0) {}
    
    void update(double deltaTime) override {
        if (cooldownRemaining > 0) {
            cooldownRemaining -= deltaTime;
        }
    }
    
    virtual bool canFire() const {
        return cooldownRemaining <= 0;
    }
    
    void fire() {
        cooldownRemaining = 1.0 / fireRate;
    }
    
    // Virtual method for derived classes to implement custom firing logic
    virtual void fireAt(GameObject* target, std::vector<std::unique_ptr<GameObject>>& objects) {
        // Default implementation - derived classes override this
        fire();
    }
    
    void render() const override {
        std::cout << "Tower at (" << position.x << ", " << position.y << ") with range " << range << std::endl;
    }
    
    json toJson() const override {
        json j = GameObject::toJson();
        j["range"] = range;
        j["damage"] = damage;
        j["fireRate"] = fireRate;
        j["upgradeLevel"] = upgradeLevel;
        j["upgradeCost"] = getUpgradeCost();
        return j;
    }
    
    bool canUpgrade() const {
        return upgradeLevel < MAX_UPGRADE_LEVEL;
    }
    
    int getUpgradeCost() const {
        return cost * (upgradeLevel + 2); // 100, 150, 200 for upgrades
    }
    
    void upgrade() {
        if (upgradeLevel < MAX_UPGRADE_LEVEL) {
            upgradeLevel++;
            damage *= 1.5;
            range *= 1.1;
            fireRate *= 1.2;
        }
    }
};