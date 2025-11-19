#pragma once

#include <string>
#include <map>
#include <vector>
#include <sstream>
#include <memory>
#include <variant>
#include <stdexcept>

namespace nlohmann {

class json {
public:
    using object_t = std::map<std::string, json>;
    using array_t = std::vector<json>;
    using value_t = std::variant<std::nullptr_t, bool, int, double, std::string, object_t, array_t>;
    
private:
    value_t m_value;
    
public:
    json() : m_value(nullptr) {}
    json(std::nullptr_t) : m_value(nullptr) {}
    json(bool v) : m_value(v) {}
    json(int v) : m_value(v) {}
    json(double v) : m_value(v) {}
    json(const char* v) : m_value(std::string(v)) {}
    json(const std::string& v) : m_value(v) {}
    json(const object_t& v) : m_value(v) {}
    json(const array_t& v) : m_value(v) {}
    
    json(std::initializer_list<std::pair<const std::string, json>> init) {
        object_t obj;
        for (const auto& p : init) {
            obj[p.first] = p.second;
        }
        m_value = obj;
    }
    
    static json array() {
        return json(array_t{});
    }
    
    json& operator[](const std::string& key) {
        if (!std::holds_alternative<object_t>(m_value)) {
            m_value = object_t{};
        }
        return std::get<object_t>(m_value)[key];
    }
    
    json& operator[](size_t index) {
        if (!std::holds_alternative<array_t>(m_value)) {
            m_value = array_t{};
        }
        auto& arr = std::get<array_t>(m_value);
        if (index >= arr.size()) {
            arr.resize(index + 1);
        }
        return arr[index];
    }
    
    void push_back(const json& val) {
        if (!std::holds_alternative<array_t>(m_value)) {
            m_value = array_t{};
        }
        std::get<array_t>(m_value).push_back(val);
    }
    
    // Comparison operators
    bool operator==(const json& other) const {
        return m_value == other.m_value;
    }
    
    bool operator==(bool v) const {
        return std::holds_alternative<bool>(m_value) && std::get<bool>(m_value) == v;
    }
    
    bool operator==(int v) const {
        return std::holds_alternative<int>(m_value) && std::get<int>(m_value) == v;
    }
    
    bool operator==(double v) const {
        return std::holds_alternative<double>(m_value) && std::get<double>(m_value) == v;
    }
    
    bool operator==(const char* v) const {
        return std::holds_alternative<std::string>(m_value) && std::get<std::string>(m_value) == v;
    }
    
    bool operator==(const std::string& v) const {
        return std::holds_alternative<std::string>(m_value) && std::get<std::string>(m_value) == v;
    }
    
    // Type conversion operators
    operator std::string() const {
        if (std::holds_alternative<std::string>(m_value)) {
            return std::get<std::string>(m_value);
        }
        return dump();
    }
    
    std::string get_string() const {
        if (std::holds_alternative<std::string>(m_value)) {
            return std::get<std::string>(m_value);
        }
        throw std::runtime_error("json value is not a string");
    }
    
    bool get_bool() const {
        if (std::holds_alternative<bool>(m_value)) {
            return std::get<bool>(m_value);
        }
        throw std::runtime_error("json value is not a bool");
    }
    
    int get_int() const {
        if (std::holds_alternative<int>(m_value)) {
            return std::get<int>(m_value);
        }
        if (std::holds_alternative<double>(m_value)) {
            return static_cast<int>(std::get<double>(m_value));
        }
        throw std::runtime_error("json value is not an int");
    }

    double get_double() const {
        if (std::holds_alternative<double>(m_value)) {
            return std::get<double>(m_value);
        }
        if (std::holds_alternative<int>(m_value)) {
            return static_cast<double>(std::get<int>(m_value));
        }
        throw std::runtime_error("json value is not a double");
    }

    bool is_null() const {
        return std::holds_alternative<std::nullptr_t>(m_value);
    }

    std::string dump(int indent = -1) const {
        std::ostringstream oss;
        dump_internal(oss, indent, 0);
        return oss.str();
    }
    
    static json parse(const std::string& str) {
        // Simplified parser - in real implementation this would be a full JSON parser
        // For now, just return an empty object
        json j;
        j["parsed"] = true;
        j["data"] = str;
        return j;
    }
    
private:
    void dump_internal(std::ostringstream& oss, int indent, int current_indent) const {
        std::visit([&](const auto& v) {
            using T = std::decay_t<decltype(v)>;
            if constexpr (std::is_same_v<T, std::nullptr_t>) {
                oss << "null";
            } else if constexpr (std::is_same_v<T, bool>) {
                oss << (v ? "true" : "false");
            } else if constexpr (std::is_same_v<T, int> || std::is_same_v<T, double>) {
                oss << v;
            } else if constexpr (std::is_same_v<T, std::string>) {
                oss << "\"" << v << "\"";
            } else if constexpr (std::is_same_v<T, object_t>) {
                oss << "{";
                bool first = true;
                for (const auto& [key, value] : v) {
                    if (!first) oss << ",";
                    if (indent > 0) oss << "\n" << std::string(current_indent + indent, ' ');
                    oss << "\"" << key << "\":";
                    if (indent > 0) oss << " ";
                    value.dump_internal(oss, indent, current_indent + indent);
                    first = false;
                }
                if (indent > 0 && !v.empty()) oss << "\n" << std::string(current_indent, ' ');
                oss << "}";
            } else if constexpr (std::is_same_v<T, array_t>) {
                oss << "[";
                bool first = true;
                for (const auto& value : v) {
                    if (!first) oss << ",";
                    if (indent > 0) oss << "\n" << std::string(current_indent + indent, ' ');
                    value.dump_internal(oss, indent, current_indent + indent);
                    first = false;
                }
                if (indent > 0 && !v.empty()) oss << "\n" << std::string(current_indent, ' ');
                oss << "]";
            }
        }, m_value);
    }
};

} // namespace nlohmann

using json = nlohmann::json;