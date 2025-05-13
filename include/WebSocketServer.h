#pragma once

#include "../libs/websocket/websocket_server.hpp"
#include "../libs/nlohmann/json.hpp"
#include <string>
#include <functional>
#include <thread>

using json = nlohmann::json;

class WebSocketServer {
private:
    websocket::Server m_server;
    std::function<void(const std::string&)> m_on_message_callback;
    std::thread m_server_thread;
    
public:
    WebSocketServer();
    ~WebSocketServer();
    
    void run(int port);
    void stop();
    void broadcast(const std::string& message);
    void setOnMessageCallback(std::function<void(const std::string&)> callback);
    
private:
    void on_open(websocket::ConnectionHandle hdl);
    void on_close(websocket::ConnectionHandle hdl);
    void on_message(websocket::ConnectionHandle hdl, const std::string& msg);
};