#include "WebSocketServer.h"
#include <iostream>

WebSocketServer::WebSocketServer() {
    // Set up message handlers
    m_server.set_open_handler(
        [this](websocket::ConnectionHandle hdl) { this->on_open(hdl); });
    m_server.set_close_handler(
        [this](websocket::ConnectionHandle hdl) { this->on_close(hdl); });
    m_server.set_message_handler(
        [this](websocket::ConnectionHandle hdl, const std::string& msg) { 
            this->on_message(hdl, msg); 
        });
}

WebSocketServer::~WebSocketServer() {
    stop();
}

void WebSocketServer::run(int port) {
    m_server.listen(port);
    m_server_thread = std::thread([this]() {
        m_server.run();
    });
}

void WebSocketServer::stop() {
    m_server.stop();
    if (m_server_thread.joinable()) {
        m_server_thread.join();
    }
}

void WebSocketServer::broadcast(const std::string& message) {
    m_server.broadcast(message);
}

void WebSocketServer::setOnMessageCallback(std::function<void(const std::string&)> callback) {
    m_on_message_callback = callback;
}

void WebSocketServer::on_open(websocket::ConnectionHandle hdl) {
    std::cout << "Client connected: " << hdl.id << std::endl;
    
    // Send initial game state to new client
    json welcome;
    welcome["type"] = "welcome";
    welcome["message"] = "Connected to Celestial Siege server";
    m_server.send(hdl, welcome.dump());
}

void WebSocketServer::on_close(websocket::ConnectionHandle hdl) {
    std::cout << "Client disconnected: " << hdl.id << std::endl;
}

void WebSocketServer::on_message(websocket::ConnectionHandle hdl, const std::string& msg) {
    std::cout << "Message from client " << hdl.id << ": " << msg << std::endl;
    
    try {
        json message = json::parse(msg);
        
        if (m_on_message_callback) {
            m_on_message_callback(msg);
        }
        
        // Echo back to confirm receipt
        json response;
        response["type"] = "ack";
        response["original"] = message;
        m_server.send(hdl, response.dump());
        
    } catch (const std::exception& e) {
        std::cerr << "Error parsing message: " << e.what() << std::endl;
    }
}