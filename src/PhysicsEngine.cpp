#include "PhysicsEngine.h"
#include <cmath>

void PhysicsEngine::update(std::vector<std::unique_ptr<GameObject>>& objects, double deltaTime) {
    // Step 1: Clear all force accumulators
    for (auto& obj : objects) {
        obj->forceAccumulator = Vec2d(0, 0);
    }
    
    // Step 2: Calculate gravitational forces between all objects
    for (size_t i = 0; i < objects.size(); ++i) {
        for (size_t j = i + 1; j < objects.size(); ++j) {
            auto& obj1 = objects[i];
            auto& obj2 = objects[j];
            
            // Skip if either object has no mass
            if (obj1->mass <= 0 || obj2->mass <= 0) continue;
            
            Vec2d force = calculateGravitationalForce(*obj1, *obj2);
            
            // Apply Newton's third law
            obj1->forceAccumulator = obj1->forceAccumulator + force;
            obj2->forceAccumulator = obj2->forceAccumulator - force;
        }
    }
    
    // Step 3: Update velocity and position based on forces
    for (auto& obj : objects) {
        // Skip static objects (planets, towers)
        if (obj->isStatic || !obj->alive) continue;
        
        // Special handling for projectiles - they're affected by gravity
        // This creates beautiful curved trajectories
        if (obj->type == GameObjectType::Projectile || obj->type == GameObjectType::Enemy) {
            // F = ma, so a = F/m
            Vec2d acceleration = obj->forceAccumulator * (1.0 / obj->mass);
            
            // Update velocity: v = v0 + a*t
            obj->velocity = obj->velocity + acceleration * deltaTime;
            
            // Update position: x = x0 + v*t
            obj->position = obj->position + obj->velocity * deltaTime;
        }
    }
}

Vec2d PhysicsEngine::calculateGravitationalForce(const GameObject& obj1, const GameObject& obj2) const {
    Vec2d direction = obj2.position - obj1.position;
    double distanceSq = direction.length() * direction.length();
    
    // Avoid division by zero and extreme forces at very close distances
    if (distanceSq < 1.0) distanceSq = 1.0;
    
    // F = G * (m1 * m2) / r^2
    double forceMagnitude = (GRAVITATIONAL_CONSTANT * obj1.mass * obj2.mass) / distanceSq;
    
    // Force vector points from obj1 to obj2
    return direction.normalized() * forceMagnitude;
}

Vec2d PhysicsEngine::getGravityAt(const Vec2d& position, const std::vector<std::unique_ptr<GameObject>>& objects) const {
    Vec2d totalGravity(0, 0);
    
    for (const auto& obj : objects) {
        // Only consider objects with significant mass (planets)
        if (obj->mass < 100) continue;
        
        Vec2d direction = obj->position - position;
        double distanceSq = direction.length() * direction.length();
        
        if (distanceSq < 1.0) distanceSq = 1.0;
        
        // Gravitational field strength at this point
        double fieldStrength = (GRAVITATIONAL_CONSTANT * obj->mass) / distanceSq;
        totalGravity = totalGravity + direction.normalized() * fieldStrength;
    }
    
    return totalGravity;
}