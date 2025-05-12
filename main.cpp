#include <iostream>
#include "GameWorld.h"

int main() {
    std::cout << "Celestial Siege - Tower Defense Game" << std::endl;
    std::cout << "Starting game..." << std::endl;
    
    GameWorld world;
    world.init();
    world.run();
    
    std::cout << "\nGame Over!" << std::endl;
    return 0;
}