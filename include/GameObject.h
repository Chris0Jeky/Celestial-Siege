#pragma once

#include "Vec2d.h"
#include <memory>

enum class GameObjectType {
    Planet = 1,
    Enemy = 2,
    Tower = 3,
    Projectile = 4
};

class GameObject {
public:
    static int next_id;
    int id;
    GameObjectType type;
    Vec2d position;
    Vec2d velocity;
    double mass;
    bool alive;
    
    GameObject(GameObjectType type, Vec2d position, double mass = 1.0)
        : id(next_id++), type(type), position(position), velocity(0, 0), mass(mass), alive(true) {}
    
    virtual ~GameObject() = default;
    
    virtual void update(double deltaTime) {
        position = position + velocity * deltaTime;
    }
    
    virtual void render() const = 0;
    
    double distanceTo(const GameObject& other) const {
        return (position - other.position).length();
    }
};