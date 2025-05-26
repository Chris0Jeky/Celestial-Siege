#pragma once

#include "Vec2d.h"
#include "PhysicsEngine.h"
#include "GameObject.h"
#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <memory>
#include <cmath>

struct PathNode {
    int x, y;
    double gCost = 0;     // Cost from start
    double hCost = 0;     // Heuristic cost to end
    double fCost() const { return gCost + hCost; }
    
    // For priority queue (min-heap)
    bool operator>(const PathNode& other) const {
        return fCost() > other.fCost();
    }
};

// Hash function for grid coordinates
struct GridHash {
    std::size_t operator()(const std::pair<int, int>& p) const {
        auto h1 = std::hash<int>{}(p.first);
        auto h2 = std::hash<int>{}(p.second);
        return h1 ^ (h2 << 1);
    }
};

class PathfindingSystem {
public:
    PathfindingSystem(int gridWidth, int gridHeight, double cellSize);
    
    // Find path through gravity field
    std::vector<Vec2d> findPath(
        const Vec2d& start, 
        const Vec2d& end,
        const std::vector<std::unique_ptr<GameObject>>& objects,
        const PhysicsEngine& physics
    );
    
    // Set obstacles (planets, towers, etc.)
    void updateObstacles(const std::vector<std::unique_ptr<GameObject>>& objects);
    
    // Visualize gravity field (for debugging)
    double getGravityPotentialAt(const Vec2d& worldPos, 
                                  const std::vector<std::unique_ptr<GameObject>>& objects,
                                  const PhysicsEngine& physics) const;
    
private:
    int m_gridWidth;
    int m_gridHeight;
    double m_cellSize;
    std::unordered_set<std::pair<int, int>, GridHash> m_obstacles;
    
    // Convert between world and grid coordinates
    std::pair<int, int> worldToGrid(const Vec2d& worldPos) const;
    Vec2d gridToWorld(int x, int y) const;
    
    // Check if a grid cell is walkable
    bool isWalkable(int x, int y) const;
    
    // Get neighbors of a grid cell
    std::vector<std::pair<int, int>> getNeighbors(int x, int y) const;
    
    // Calculate movement cost considering gravity
    double calculateGravityCost(
        const Vec2d& from,
        const Vec2d& to,
        const std::vector<std::unique_ptr<GameObject>>& objects,
        const PhysicsEngine& physics
    ) const;
    
    // Heuristic function for A*
    double heuristic(int x1, int y1, int x2, int y2) const;
    
    // Reconstruct path from came_from map
    std::vector<Vec2d> reconstructPath(
        const std::unordered_map<std::pair<int, int>, std::pair<int, int>, GridHash>& cameFrom,
        std::pair<int, int> current
    ) const;
};