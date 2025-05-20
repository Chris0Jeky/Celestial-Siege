#pragma once

#include "Vec2d.h"
#include "GameObject.h"
#include <vector>
#include <memory>

class PhysicsEngine {
public:
    // Gravitational constant - tuned for gameplay
    static constexpr double GRAVITATIONAL_CONSTANT = 100.0;
    
    // Update all objects with gravitational forces
    void update(std::vector<std::unique_ptr<GameObject>>& objects, double deltaTime);
    
    // Calculate gravity vector at a specific point (for pathfinding)
    Vec2d getGravityAt(const Vec2d& position, const std::vector<std::unique_ptr<GameObject>>& objects) const;
    
private:
    // Calculate gravitational force between two objects
    Vec2d calculateGravitationalForce(const GameObject& obj1, const GameObject& obj2) const;
};