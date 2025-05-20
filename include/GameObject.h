#pragma once

#include "Vec2d.h"
#include <memory>
#include "../libs/nlohmann/json.hpp"

using json = nlohmann::json;

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
    Vec2d forceAccumulator;  // For physics engine
    double mass;
    bool alive;
    bool isStatic;  // For planets and towers that don't move
    
    GameObject(GameObjectType type, Vec2d position, double mass = 1.0, bool isStatic = false)
        : id(next_id++), type(type), position(position), velocity(0, 0), 
          forceAccumulator(0, 0), mass(mass), alive(true), isStatic(isStatic) {}
    
    virtual ~GameObject() = default;
    
    virtual void update(double deltaTime) {
        // Base update does nothing - physics engine handles movement
    }
    
    virtual void render() const = 0;
    
    double distanceTo(const GameObject& other) const {
        return (position - other.position).length();
    }
    
    virtual json toJson() const {
        json j;
        j["id"] = id;
        j["type"] = static_cast<int>(type);
        j["position"] = json{{"x", position.x}, {"y", position.y}};
        j["velocity"] = json{{"x", velocity.x}, {"y", velocity.y}};
        return j;
    }
};

// JSON serialization helpers
inline void to_json(json& j, const Vec2d& v) {
    j = json{{"x", v.x}, {"y", v.y}};
}

inline void to_json(json& j, const GameObject& obj) {
    j = obj.toJson();
}