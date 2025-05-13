#pragma once

#include "GameObject.h"
#include <iostream>

class Enemy : public GameObject {
public:
    double health;
    double maxHealth;
    double speed;
    int reward;
    
    Enemy(Vec2d position, double health = 100.0, double speed = 50.0, int reward = 10)
        : GameObject(GameObjectType::Enemy, position, 1.0), 
          health(health), maxHealth(health), speed(speed), reward(reward) {}
    
    void update(double deltaTime) override {
        GameObject::update(deltaTime);
        // Enemy-specific update logic
    }
    
    void takeDamage(double damage) {
        health -= damage;
        if (health <= 0) {
            alive = false;
        }
    }
    
    void render() const override {
        std::cout << "Enemy at (" << position.x << ", " << position.y << ") with " << health << "/" << maxHealth << " HP" << std::endl;
    }
    
    json toJson() const override {
        json j = GameObject::toJson();
        j["health"] = health;
        j["maxHealth"] = maxHealth;
        return j;
    }
};