# Celestial Siege

A real-time multiplayer tower defense game built with C++ backend and JavaScript frontend.

## Overview

Celestial Siege is a tower defense game where players defend their planet from waves of enemies by strategically placing defensive towers. The game features:

- Real-time gameplay with WebSocket communication
- C++ game server handling physics and game logic
- Web-based client with HTML5 Canvas rendering
- JSON-based client-server communication protocol

## Architecture

### Backend (C++)
- Game state management and physics simulation
- WebSocket server for real-time communication
- JSON serialization for game objects
- Entity-Component-System inspired architecture

### Frontend (JavaScript/HTML5)
- Canvas-based 2D rendering
- WebSocket client for server communication
- Real-time game state synchronization
- Click-to-place tower mechanics

## Building and Running

### Prerequisites
- C++17 compatible compiler
- CMake 3.31 or higher
- Modern web browser with WebSocket support

### Building the Server
```bash
mkdir build
cd build
cmake ..
make
```

### Running the Game
1. Start the C++ server:
   ```bash
   ./build/Celestial_Siege
   ```

2. Open the web client:
   - Navigate to the `client` directory
   - Open `index.html` in a web browser
   - Click "Connect to Server" to start playing

## Game Controls
- Click on the canvas to place towers (costs resources)
- Towers automatically shoot at enemies within range
- Defend your base from enemy waves
- Earn resources by destroying enemies

## Project Structure
```
Celestial-Siege/
├── include/          # C++ header files
├── src/              # C++ source files
├── libs/             # Third-party libraries
├── client/           # Web frontend files
├── CMakeLists.txt    # Build configuration
└── README.md         # This file
```

