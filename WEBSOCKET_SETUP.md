# WebSocket Server Setup Guide

The current implementation includes a simplified WebSocket server that doesn't create actual network connections. To run the full client-server game, you have two options:

## Option 1: Use the Mock Server (Recommended for Testing)

The client includes a mock WebSocket server that simulates the game without needing the C++ backend:

1. Open `client/index.html` in your web browser
2. Click "Connect to Server" 
3. The mock server will simulate the full game experience

## Option 2: Implement Real WebSocket Server

To use real WebSockets, you'll need to integrate an actual WebSocket library:

### Using WebSocket++ (Recommended)

1. Download WebSocket++ and its dependencies (Boost.Asio)
2. Replace the simplified `libs/websocket/websocket_server.hpp` with the real library
3. Update `CMakeLists.txt` to link against Boost libraries:

```cmake
find_package(Boost REQUIRED COMPONENTS system thread)
target_link_libraries(Celestial_Siege ${Boost_LIBRARIES})
```

### Using uWebSockets

1. Install uWebSockets library
2. Modify `WebSocketServer.cpp` to use uWebSockets API
3. Update build configuration

### Using Simple-WebSocket-Server

1. Clone Simple-WebSocket-Server repository
2. Include it as a header-only library
3. Minimal changes needed to existing code

## Current Mock Implementation

The mock server (`client/mock-server.js`) provides:
- Full game simulation in the browser
- Enemy spawning and movement
- Tower placement and shooting
- Projectile physics
- Resource management
- Wave progression

This allows you to test and play the game without setting up a real WebSocket server.