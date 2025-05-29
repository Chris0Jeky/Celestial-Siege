#include "PathfindingSystem.h"
#include "Planet.h"
#include <algorithm>
#include <limits>

PathfindingSystem::PathfindingSystem(int gridWidth, int gridHeight, double cellSize)
    : m_gridWidth(gridWidth), m_gridHeight(gridHeight), m_cellSize(cellSize) {
}

std::vector<Vec2d> PathfindingSystem::findPath(
    const Vec2d& start, 
    const Vec2d& end,
    const std::vector<std::unique_ptr<GameObject>>& objects,
    const PhysicsEngine& physics) {
    
    auto startGrid = worldToGrid(start);
    auto endGrid = worldToGrid(end);
    
    // Check if start and end are valid
    if (!isWalkable(startGrid.first, startGrid.second) || 
        !isWalkable(endGrid.first, endGrid.second)) {
        return {}; // No path possible
    }
    
    // A* algorithm with gravity-aware cost
    std::priority_queue<PathNode, std::vector<PathNode>, std::greater<PathNode>> openSet;
    std::unordered_set<std::pair<int, int>, GridHash> closedSet;
    std::unordered_map<std::pair<int, int>, double, GridHash> gScore;
    std::unordered_map<std::pair<int, int>, std::pair<int, int>, GridHash> cameFrom;
    
    // Initialize start node
    PathNode startNode;
    startNode.x = startGrid.first;
    startNode.y = startGrid.second;
    startNode.gCost = 0;
    startNode.hCost = heuristic(startNode.x, startNode.y, endGrid.first, endGrid.second);
    
    openSet.push(startNode);
    gScore[startGrid] = 0;
    
    while (!openSet.empty()) {
        PathNode current = openSet.top();
        openSet.pop();
        
        std::pair<int, int> currentGrid = {current.x, current.y};
        
        // Check if we reached the goal
        if (currentGrid == endGrid) {
            return reconstructPath(cameFrom, currentGrid);
        }
        
        // Skip if already processed
        if (closedSet.count(currentGrid) > 0) {
            continue;
        }
        
        closedSet.insert(currentGrid);
        
        // Check all neighbors
        for (const auto& neighborGrid : getNeighbors(current.x, current.y)) {
            if (closedSet.count(neighborGrid) > 0) {
                continue;
            }
            
            // Calculate gravity-aware cost
            Vec2d currentWorld = gridToWorld(current.x, current.y);
            Vec2d neighborWorld = gridToWorld(neighborGrid.first, neighborGrid.second);
            
            double gravityCost = calculateGravityCost(currentWorld, neighborWorld, objects, physics);
            double tentativeGScore = gScore[currentGrid] + gravityCost;
            
            // Check if this path to neighbor is better
            if (gScore.find(neighborGrid) == gScore.end() || 
                tentativeGScore < gScore[neighborGrid]) {
                
                gScore[neighborGrid] = tentativeGScore;
                cameFrom[neighborGrid] = currentGrid;
                
                PathNode neighborNode;
                neighborNode.x = neighborGrid.first;
                neighborNode.y = neighborGrid.second;
                neighborNode.gCost = tentativeGScore;
                neighborNode.hCost = heuristic(neighborNode.x, neighborNode.y, 
                                               endGrid.first, endGrid.second);
                
                openSet.push(neighborNode);
            }
        }
    }
    
    return {}; // No path found
}

void PathfindingSystem::updateObstacles(const std::vector<std::unique_ptr<GameObject>>& objects) {
    m_obstacles.clear();
    
    for (const auto& obj : objects) {
        // Mark static objects as obstacles (planets, towers)
        if (obj->isStatic && obj->alive) {
            auto gridPos = worldToGrid(obj->position);
            
            // Mark a radius around large objects
            if (obj->type == GameObjectType::Planet) {
                Planet* planet = static_cast<Planet*>(obj.get());
                int gridRadius = static_cast<int>(planet->radius / m_cellSize) + 1;
                
                for (int dy = -gridRadius; dy <= gridRadius; dy++) {
                    for (int dx = -gridRadius; dx <= gridRadius; dx++) {
                        if (dx*dx + dy*dy <= gridRadius*gridRadius) {
                            m_obstacles.insert({gridPos.first + dx, gridPos.second + dy});
                        }
                    }
                }
            } else {
                // For towers and other objects, just mark the cell
                m_obstacles.insert(gridPos);
            }
        }
    }
}

double PathfindingSystem::getGravityPotentialAt(const Vec2d& worldPos, 
                                                 const std::vector<std::unique_ptr<GameObject>>& objects,
                                                 const PhysicsEngine& physics) const {
    double potential = 0;
    
    // Calculate gravitational potential (sum of -G*m/r for all massive objects)
    for (const auto& obj : objects) {
        if (obj->mass > 0 && obj->alive) {
            Vec2d diff = obj->position - worldPos;
            double distSq = diff.length_sq();
            if (distSq > 1.0) { // Avoid singularity
                double dist = std::sqrt(distSq);
                potential -= physics.GRAVITATIONAL_CONSTANT * obj->mass / dist;
            }
        }
    }
    
    return potential;
}

std::pair<int, int> PathfindingSystem::worldToGrid(const Vec2d& worldPos) const {
    int x = static_cast<int>(worldPos.x / m_cellSize);
    int y = static_cast<int>(worldPos.y / m_cellSize);
    return {x, y};
}

Vec2d PathfindingSystem::gridToWorld(int x, int y) const {
    return Vec2d(x * m_cellSize + m_cellSize * 0.5, 
                 y * m_cellSize + m_cellSize * 0.5);
}

bool PathfindingSystem::isWalkable(int x, int y) const {
    if (x < 0 || x >= m_gridWidth || y < 0 || y >= m_gridHeight) {
        return false;
    }
    return m_obstacles.count({x, y}) == 0;
}

std::vector<std::pair<int, int>> PathfindingSystem::getNeighbors(int x, int y) const {
    std::vector<std::pair<int, int>> neighbors;
    
    // 8-directional movement
    const int dx[] = {-1, 0, 1, -1, 1, -1, 0, 1};
    const int dy[] = {-1, -1, -1, 0, 0, 1, 1, 1};
    
    for (int i = 0; i < 8; i++) {
        int nx = x + dx[i];
        int ny = y + dy[i];
        
        if (isWalkable(nx, ny)) {
            neighbors.push_back({nx, ny});
        }
    }
    
    return neighbors;
}

double PathfindingSystem::calculateGravityCost(
    const Vec2d& from,
    const Vec2d& to,
    const std::vector<std::unique_ptr<GameObject>>& objects,
    const PhysicsEngine& physics) const {
    
    // Base cost is the distance
    Vec2d diff = to - from;
    double distance = diff.length();
    
    // Calculate midpoint for gravity evaluation
    Vec2d midpoint = from + diff * 0.5;
    
    // Calculate net gravity force at midpoint
    Vec2d netGravity = {0, 0};
    for (const auto& obj : objects) {
        if (obj->mass > 0 && obj->alive && obj->isStatic) {
            Vec2d toObj = obj->position - midpoint;
            double distSq = toObj.length_sq();
            
            if (distSq > 1.0) { // Avoid singularity
                double forceMagnitude = physics.GRAVITATIONAL_CONSTANT * obj->mass / distSq;
                netGravity += toObj.normalized() * forceMagnitude;
            }
        }
    }
    
    // Calculate movement direction
    Vec2d moveDirection = diff.normalized();
    
    // Dot product tells us if we're moving with or against gravity
    // Positive = against gravity (harder), negative = with gravity (easier)
    double gravityWork = moveDirection.x * netGravity.x + moveDirection.y * netGravity.y;
    
    // Scale the gravity effect (this is a tunable parameter)
    const double GRAVITY_WEIGHT = 10.0;
    double gravityCost = gravityWork * GRAVITY_WEIGHT;
    
    // Calculate potential difference (climbing out of gravity well is expensive)
    double potentialFrom = getGravityPotentialAt(from, objects, physics);
    double potentialTo = getGravityPotentialAt(to, objects, physics);
    double potentialCost = std::max(0.0, potentialTo - potentialFrom) * 0.1;
    
    // Total cost must be positive
    double totalCost = distance + gravityCost + potentialCost;
    return std::max(0.1, totalCost);
}

double PathfindingSystem::heuristic(int x1, int y1, int x2, int y2) const {
    // Euclidean distance heuristic
    double dx = x2 - x1;
    double dy = y2 - y1;
    return std::sqrt(dx * dx + dy * dy) * m_cellSize;
}

std::vector<Vec2d> PathfindingSystem::reconstructPath(
    const std::unordered_map<std::pair<int, int>, std::pair<int, int>, GridHash>& cameFrom,
    std::pair<int, int> current) const {
    
    std::vector<Vec2d> path;
    
    // Build path backwards
    while (cameFrom.find(current) != cameFrom.end()) {
        path.push_back(gridToWorld(current.first, current.second));
        current = cameFrom.at(current);
    }
    
    // Add start position
    path.push_back(gridToWorld(current.first, current.second));
    
    // Reverse to get path from start to end
    std::reverse(path.begin(), path.end());
    
    return path;
}