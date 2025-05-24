#include "CellularAutomata.h"
#include <algorithm>

CellularAutomata::CellularAutomata(int width, int height, double cellSize)
    : m_width(width), m_height(height), m_cellSize(cellSize),
      m_grid(height, std::vector<CellType>(width, CellType::Empty)),
      m_nextGrid(height, std::vector<CellType>(width, CellType::Empty)),
      m_rng(std::random_device{}()) {
}

void CellularAutomata::initialize(double density) {
    std::uniform_real_distribution<> dist(0.0, 1.0);
    
    // Randomly seed the grid
    for (int y = 0; y < m_height; ++y) {
        for (int x = 0; x < m_width; ++x) {
            if (dist(m_rng) < density) {
                m_grid[y][x] = CellType::StarDust;
            }
        }
    }
    
    // Create some initial clusters
    std::uniform_int_distribution<> xDist(5, m_width - 5);
    std::uniform_int_distribution<> yDist(5, m_height - 5);
    
    for (int i = 0; i < 5; ++i) {
        int cx = xDist(m_rng);
        int cy = yDist(m_rng);
        int radius = 3;
        
        // Create a circular cluster
        for (int dy = -radius; dy <= radius; ++dy) {
            for (int dx = -radius; dx <= radius; ++dx) {
                if (dx*dx + dy*dy <= radius*radius) {
                    int x = cx + dx;
                    int y = cy + dy;
                    if (x >= 0 && x < m_width && y >= 0 && y < m_height) {
                        m_grid[y][x] = CellType::StarDust;
                    }
                }
            }
        }
    }
}

void CellularAutomata::update() {
    // Apply Game of Life rules to each cell
    for (int y = 0; y < m_height; ++y) {
        for (int x = 0; x < m_width; ++x) {
            m_nextGrid[y][x] = applyRules(x, y);
        }
    }
    
    // Swap grids
    std::swap(m_grid, m_nextGrid);
}

bool CellularAutomata::isBuildable(const Vec2d& worldPos) const {
    auto [x, y] = worldToGrid(worldPos);
    
    if (x < 0 || x >= m_width || y < 0 || y >= m_height) {
        return false;
    }
    
    // Can build on stardust or dense nebula
    CellType cell = m_grid[y][x];
    return cell == CellType::StarDust || cell == CellType::DenseNebula;
}

CellType CellularAutomata::getCellAt(const Vec2d& worldPos) const {
    auto [x, y] = worldToGrid(worldPos);
    
    if (x < 0 || x >= m_width || y < 0 || y >= m_height) {
        return CellType::Empty;
    }
    
    return m_grid[y][x];
}

std::pair<int, int> CellularAutomata::worldToGrid(const Vec2d& worldPos) const {
    int x = static_cast<int>(worldPos.x / m_cellSize);
    int y = static_cast<int>(worldPos.y / m_cellSize);
    return {x, y};
}

int CellularAutomata::countNeighbors(int x, int y, CellType type) const {
    int count = 0;
    
    for (int dy = -1; dy <= 1; ++dy) {
        for (int dx = -1; dx <= 1; ++dx) {
            if (dx == 0 && dy == 0) continue;
            
            int nx = x + dx;
            int ny = y + dy;
            
            if (nx >= 0 && nx < m_width && ny >= 0 && ny < m_height) {
                if (m_grid[ny][nx] == type || 
                    (type == CellType::StarDust && m_grid[ny][nx] == CellType::DenseNebula)) {
                    count++;
                }
            }
        }
    }
    
    return count;
}

CellType CellularAutomata::applyRules(int x, int y) const {
    CellType current = m_grid[y][x];
    int stardustNeighbors = countNeighbors(x, y, CellType::StarDust);
    
    // Modified Conway's Game of Life rules for space theme
    switch (current) {
        case CellType::Empty:
            // Birth: Empty space with exactly 3 stardust neighbors becomes stardust
            if (stardustNeighbors == 3) {
                return CellType::StarDust;
            }
            break;
            
        case CellType::StarDust:
            // Survival: Stardust with 2-3 neighbors survives
            if (stardustNeighbors == 2 || stardustNeighbors == 3) {
                return CellType::StarDust;
            }
            // Overcrowding: Too many neighbors create dense nebula
            else if (stardustNeighbors >= 4) {
                return CellType::DenseNebula;
            }
            // Death: Too few neighbors, stardust dissipates
            else {
                return CellType::Empty;
            }
            break;
            
        case CellType::DenseNebula:
            // Dense nebula slowly dissipates back to stardust
            if (stardustNeighbors <= 1) {
                return CellType::StarDust;
            }
            // Very dense areas might form asteroids
            else if (stardustNeighbors >= 6 && (x + y) % 7 == 0) {
                return CellType::Asteroid;
            }
            break;
            
        case CellType::Asteroid:
            // Asteroids are mostly permanent but can break apart
            if (stardustNeighbors == 0) {
                return CellType::Empty;
            }
            break;
    }
    
    return current;
}