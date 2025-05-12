#pragma once

#include "GameWorld.h"
#include <iostream>

class ConsoleRenderer {
public:
    static void render(const GameWorld& world) {
        system("clear"); // For Linux/Mac. Use "cls" for Windows
        
        std::cout << "=== Celestial Siege ===" << std::endl;
        std::cout << "Health: " << world.getPlayerHealth() 
                  << " | Resources: " << world.getPlayerResources() << std::endl;
        std::cout << "Objects in game: " << world.getObjects().size() << std::endl;
        std::cout << "-------------------" << std::endl;
        
        for (const auto& obj : world.getObjects()) {
            obj->render();
        }
        
        std::cout << "-------------------" << std::endl;
        std::cout << "Press Ctrl+C to exit" << std::endl;
    }
};