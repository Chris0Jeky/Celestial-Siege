#pragma once

#include <cmath>

struct Vec2d {
    double x, y;
    
    Vec2d() : x(0), y(0) {}
    Vec2d(double x, double y) : x(x), y(y) {}
    
    Vec2d operator+(const Vec2d& other) const {
        return Vec2d(x + other.x, y + other.y);
    }
    
    Vec2d operator-(const Vec2d& other) const {
        return Vec2d(x - other.x, y - other.y);
    }
    
    Vec2d operator*(double scalar) const {
        return Vec2d(x * scalar, y * scalar);
    }
    
    double length() const {
        return std::sqrt(x * x + y * y);
    }
    
    Vec2d normalized() const {
        double len = length();
        if (len > 0) {
            return Vec2d(x / len, y / len);
        }
        return Vec2d(0, 0);
    }
};