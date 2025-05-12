#pragma once

#include "GameObject.h"
#include <iostream>

class Tower : public GameObject {
public:
    double range;
    double damage;
    double fireRate;
    double cooldown;
    int cost;
    
    Tower(Vec2d position, double range = 100.0, double damage = 20.0, double fireRate = 1.0, int cost = 50)
        : GameObject(GameObjectType::Tower, position, 5.0),
          range(range), damage(damage), fireRate(fireRate), cooldown(0), cost(cost) {}
    
    void update(double deltaTime) override {
        if (cooldown > 0) {
            cooldown -= deltaTime;
        }
    }
    
    bool canFire() const {
        return cooldown <= 0;
    }
    
    void fire() {
        cooldown = 1.0 / fireRate;
    }
    
    void render() const override {
        std::cout << "Tower at (" << position.x << ", " << position.y << ") with range " << range << std::endl;
    }
};