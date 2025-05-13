#pragma once

#include <string>
#include <set>
#include <functional>
#include <thread>
#include <chrono>
#include <iostream>
#include <memory>
#include <vector>

namespace websocket {

class ConnectionHandle {
public:
    int id;
    explicit ConnectionHandle(int id) : id(id) {}
    bool operator<(const ConnectionHandle& other) const {
        return id < other.id;
    }
};

class Message {
public:
    std::string payload;
    ConnectionHandle handle;
    
    Message(const std::string& data, const ConnectionHandle& hdl) 
        : payload(data), handle(hdl) {}
};

using MessageHandler = std::function<void(ConnectionHandle, const std::string&)>;
using ConnectionHandler = std::function<void(ConnectionHandle)>;

class Server {
private:
    std::set<ConnectionHandle> m_connections;
    MessageHandler m_on_message;
    ConnectionHandler m_on_open;
    ConnectionHandler m_on_close;
    bool m_running = false;
    int m_next_conn_id = 1;
    int m_port = 0;
    
public:
    Server() = default;
    
    void set_message_handler(MessageHandler handler) {
        m_on_message = handler;
    }
    
    void set_open_handler(ConnectionHandler handler) {
        m_on_open = handler;
    }
    
    void set_close_handler(ConnectionHandler handler) {
        m_on_close = handler;
    }
    
    void listen(int port) {
        m_port = port;
        std::cout << "WebSocket server configured to listen on port " << port << std::endl;
    }
    
    void run() {
        m_running = true;
        std::cout << "WebSocket server running on port " << m_port << std::endl;
        
        // Simulate accepting connections
        std::thread connection_simulator([this]() {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            if (m_running && m_on_open) {
                ConnectionHandle hdl(m_next_conn_id++);
                m_connections.insert(hdl);
                m_on_open(hdl);
            }
        });
        connection_simulator.detach();
        
        // Keep server running
        while (m_running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
    
    void stop() {
        m_running = false;
        for (const auto& conn : m_connections) {
            if (m_on_close) {
                m_on_close(conn);
            }
        }
        m_connections.clear();
    }
    
    void send(ConnectionHandle hdl, const std::string& message) {
        if (m_connections.find(hdl) != m_connections.end()) {
            std::cout << "Sending to connection " << hdl.id << ": " 
                      << message.substr(0, 50) << "..." << std::endl;
        }
    }
    
    void broadcast(const std::string& message) {
        for (const auto& conn : m_connections) {
            send(conn, message);
        }
    }
    
    const std::set<ConnectionHandle>& get_connections() const {
        return m_connections;
    }
};

} // namespace websocket