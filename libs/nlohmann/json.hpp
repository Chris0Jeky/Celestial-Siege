#pragma once

#include <string>
#include <map>
#include <vector>
#include <sstream>
#include <memory>
#include <variant>
#include <stdexcept>
#include <functional>
#include <cctype>

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
        size_t index = 0;

        auto skip_ws = [&](void) {
            while (index < str.size() && std::isspace(static_cast<unsigned char>(str[index]))) {
                ++index;
            }
        };

        std::function<json()> parse_value;

        auto parse_string = [&]() -> std::string {
            if (str[index] != '"') {
                throw std::runtime_error("expected string");
            }
            ++index; // skip opening quote
            std::string result;
            while (index < str.size()) {
                char c = str[index++];
                if (c == '"') {
                    break;
                }
                if (c == '\\' && index < str.size()) {
                    // Handle simple escape sequences
                    char next = str[index++];
                    if (next == '"' || next == '\\' || next == '/') result.push_back(next);
                    else if (next == 'b') result.push_back('\b');
                    else if (next == 'f') result.push_back('\f');
                    else if (next == 'n') result.push_back('\n');
                    else if (next == 'r') result.push_back('\r');
                    else if (next == 't') result.push_back('\t');
                } else {
                    result.push_back(c);
                }
            }
            return result;
        };

        auto parse_number = [&]() -> json {
            size_t start = index;
            if (str[index] == '-' || str[index] == '+') ++index;
            while (index < str.size() && std::isdigit(static_cast<unsigned char>(str[index]))) ++index;
            bool is_float = false;
            if (index < str.size() && str[index] == '.') {
                is_float = true;
                ++index;
                while (index < str.size() && std::isdigit(static_cast<unsigned char>(str[index]))) ++index;
            }
            std::string num_str = str.substr(start, index - start);
            if (is_float) {
                return json(std::stod(num_str));
            }
            return json(std::stoi(num_str));
        };

        auto parse_array = [&]() -> json {
            array_t arr;
            ++index; // skip [
            skip_ws();
            if (index < str.size() && str[index] == ']') {
                ++index;
                return json(arr);
            }
            while (index < str.size()) {
                arr.push_back(parse_value());
                skip_ws();
                if (index < str.size() && str[index] == ',') {
                    ++index;
                    skip_ws();
                    continue;
                }
                if (index < str.size() && str[index] == ']') {
                    ++index;
                    break;
                }
                throw std::runtime_error("invalid array syntax");
            }
            return json(arr);
        };

        auto parse_object = [&]() -> json {
            object_t obj;
            ++index; // skip {
            skip_ws();
            if (index < str.size() && str[index] == '}') {
                ++index;
                return json(obj);
            }
            while (index < str.size()) {
                skip_ws();
                std::string key = parse_string();
                skip_ws();
                if (str[index] != ':') {
                    throw std::runtime_error("expected : after key");
                }
                ++index;
                skip_ws();
                obj[key] = parse_value();
                skip_ws();
                if (index < str.size() && str[index] == ',') {
                    ++index;
                    skip_ws();
                    continue;
                }
                if (index < str.size() && str[index] == '}') {
                    ++index;
                    break;
                }
                throw std::runtime_error("invalid object syntax");
            }
            return json(obj);
        };

        parse_value = [&]() -> json {
            skip_ws();
            if (index >= str.size()) {
                throw std::runtime_error("unexpected end of input");
            }
            char c = str[index];
            if (c == '"') return json(parse_string());
            if (c == '{') return parse_object();
            if (c == '[') return parse_array();
            if (std::isdigit(static_cast<unsigned char>(c)) || c == '-' || c == '+') return parse_number();
            if (str.compare(index, 4, "true") == 0) { index += 4; return json(true); }
            if (str.compare(index, 5, "false") == 0) { index += 5; return json(false); }
            if (str.compare(index, 4, "null") == 0) { index += 4; return json(nullptr); }
            throw std::runtime_error("invalid JSON value");
        };

        json result = parse_value();
        skip_ws();
        if (index != str.size()) {
            throw std::runtime_error("trailing characters in JSON");
        }
        return result;
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