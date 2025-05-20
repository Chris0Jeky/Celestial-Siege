#pragma once

#include "GameObject.h"
#include <iostream>

class Projectile : public GameObject {
public:
    double damage;
    double speed;
    int targetId;
    double lifetime;
    
    Projectile(Vec2d position, Vec2d targetPosition, double damage = 20.0, double speed = 200.0)
        : GameObject(GameObjectType::Projectile, position, 1.0, false),
          damage(damage), speed(speed), targetId(-1), lifetime(5.0) {
        
        // Calculate initial velocity towards target
        Vec2d direction = (targetPosition - position).normalized();
        velocity = direction * speed;
        // Now gravity will curve its path!
    }
    
    void update(double deltaTime) override {
        // Don't call base update - physics engine handles movement
        lifetime -= deltaTime;
        if (lifetime <= 0) {
            alive = false;
        }
    }
    
    void render() const override {
        std::cout << "Projectile at (" << position.x << ", " << position.y << ")" << std::endl;
    }
    
    json toJson() const override {
        json j = GameObject::toJson();
        j["damage"] = damage;
        j["speed"] = speed;
        return j;
    }
};