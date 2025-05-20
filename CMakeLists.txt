cmake_minimum_required(VERSION 3.31)
project(Celestial_Siege)

set(CMAKE_CXX_STANDARD 17)

# Include directories
include_directories(include)

# Source files
set(SOURCES
    main.cpp
    src/GameObject.cpp
    src/GameWorld.cpp
    src/WebSocketServer.cpp
    src/PhysicsEngine.cpp
)

# Header files
set(HEADERS
    include/Vec2d.h
    include/GameObject.h
    include/Planet.h
    include/Enemy.h
    include/Tower.h
    include/Projectile.h
    include/GameWorld.h
    include/WebSocketServer.h
    include/ConsoleRenderer.h
    include/PhysicsEngine.h
)

add_executable(Celestial_Siege ${SOURCES} ${HEADERS})
