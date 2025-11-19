#pragma once

#include "Enemy.h"
#include <memory>

enum class EnemyType {
    Basic = 0,
    Fast = 1,
    Tank = 2,
    Boss = 3
};

// Basic Enemy - standard balanced stats
class BasicEnemy : public Enemy {
public:
    BasicEnemy(Vec2d position, double healthMultiplier = 1.0)
        : Enemy(position, 100.0 * healthMultiplier, 50.0, 10) {
        m_enemyType = EnemyType::Basic;
    }

    json toJson() const override {
        json j = Enemy::toJson();
        j["enemyType"] = static_cast<int>(m_enemyType);
        return j;
    }

protected:
    EnemyType m_enemyType;
};

// Fast Enemy - low health, high speed, less reward
class FastEnemy : public Enemy {
public:
    FastEnemy(Vec2d position, double healthMultiplier = 1.0)
        : Enemy(position, 60.0 * healthMultiplier, 90.0, 8) {  // 40% less health, 80% faster, 20% less reward
        m_enemyType = EnemyType::Fast;
        mass = 3.0;  // Lighter, less affected by gravity
    }

    json toJson() const override {
        json j = Enemy::toJson();
        j["enemyType"] = static_cast<int>(m_enemyType);
        return j;
    }

protected:
    EnemyType m_enemyType;
};

// Tank Enemy - high health, slow speed, high reward
class TankEnemy : public Enemy {
public:
    TankEnemy(Vec2d position, double healthMultiplier = 1.0)
        : Enemy(position, 250.0 * healthMultiplier, 25.0, 25) {  // 150% more health, 50% slower, 150% more reward
        m_enemyType = EnemyType::Tank;
        mass = 15.0;  // Heavier, more affected by gravity
    }

    json toJson() const override {
        json j = Enemy::toJson();
        j["enemyType"] = static_cast<int>(m_enemyType);
        return j;
    }

protected:
    EnemyType m_enemyType;
};

// Boss Enemy - very high health, medium speed, massive reward
class BossEnemy : public Enemy {
public:
    BossEnemy(Vec2d position, double healthMultiplier = 1.0)
        : Enemy(position, 800.0 * healthMultiplier, 35.0, 100) {  // 8x health, 30% slower, 10x reward
        m_enemyType = EnemyType::Boss;
        mass = 25.0;  // Very heavy
    }

    json toJson() const override {
        json j = Enemy::toJson();
        j["enemyType"] = static_cast<int>(m_enemyType);
        j["isBoss"] = true;
        return j;
    }

protected:
    EnemyType m_enemyType;
};

// Factory function to create enemies by type
inline std::unique_ptr<Enemy> createEnemy(EnemyType type, Vec2d position, double healthMultiplier = 1.0) {
    switch (type) {
        case EnemyType::Basic:
            return std::make_unique<BasicEnemy>(position, healthMultiplier);
        case EnemyType::Fast:
            return std::make_unique<FastEnemy>(position, healthMultiplier);
        case EnemyType::Tank:
            return std::make_unique<TankEnemy>(position, healthMultiplier);
        case EnemyType::Boss:
            return std::make_unique<BossEnemy>(position, healthMultiplier);
        default:
            return std::make_unique<BasicEnemy>(position, healthMultiplier);
    }
}
