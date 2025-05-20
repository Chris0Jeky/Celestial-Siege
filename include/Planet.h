#pragma once

#include "GameObject.h"
#include <iostream>

class Planet : public GameObject {
public:
    double radius;
    int owner; // 0 = neutral, 1 = player, -1 = enemy
    
    Planet(Vec2d position, double radius = 30.0, double mass = 5000.0, int owner = 0)
        : GameObject(GameObjectType::Planet, position, mass, true), radius(radius), owner(owner) {}
    
    void render() const override {
        std::cout << "Planet at (" << position.x << ", " << position.y << ") with radius " << radius << std::endl;
    }
    
    json toJson() const override {
        json j = GameObject::toJson();
        j["radius"] = radius;
        j["owner"] = owner;
        return j;
    }
};