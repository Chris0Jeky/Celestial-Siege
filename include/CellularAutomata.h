#pragma once

#include "Vec2d.h"
#include <vector>
#include <random>

enum class CellType {
    Empty = 0,
    StarDust = 1,
    DenseNebula = 2,
    Asteroid = 3
};

class CellularAutomata {
public:
    CellularAutomata(int width, int height, double cellSize = 20.0);
    
    // Initialize the grid with random seed pattern
    void initialize(double density = 0.45);
    
    // Run one generation of Game of Life rules
    void update();
    
    // Check if a position is buildable (has stardust)
    bool isBuildable(const Vec2d& worldPos) const;
    
    // Get cell type at world position
    CellType getCellAt(const Vec2d& worldPos) const;
    
    // Get the entire grid for rendering
    const std::vector<std::vector<CellType>>& getGrid() const { return m_grid; }
    
    int getWidth() const { return m_width; }
    int getHeight() const { return m_height; }
    double getCellSize() const { return m_cellSize; }
    
private:
    int m_width;
    int m_height;
    double m_cellSize;
    std::vector<std::vector<CellType>> m_grid;
    std::vector<std::vector<CellType>> m_nextGrid;
    std::mt19937 m_rng;
    
    // Convert world position to grid coordinates
    std::pair<int, int> worldToGrid(const Vec2d& worldPos) const;
    
    // Count neighbors of specific type
    int countNeighbors(int x, int y, CellType type) const;
    
    // Apply Game of Life rules
    CellType applyRules(int x, int y) const;
};