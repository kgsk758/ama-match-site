#include <emscripten/bind.h>
#include <string>
#include <vector>
#include "ai/ai.h"
#include "lib/nlohmann/json.hpp"

using namespace emscripten;
using json = nlohmann::json;

// Global AI configurations
search::Configs g_configs;
gaze::Player g_player1;
gaze::Player g_player2;

void initAI(std::string configJson) {
    try {
        json js = json::parse(configJson);
        from_json(js["build"], g_configs.build);
        from_json(js["fast"], g_configs.fast);
        from_json(js["freestyle"], g_configs.freestyle);
        from_json(js["ac"], g_configs.ac);
    } catch (...) {
        // Handle error or use defaults
    }
}

void setField(int playerIdx, int x, int y, int type) {
    gaze::Player& p = (playerIdx == 0) ? g_player1 : g_player2;
    p.field.set_cell(x, y, static_cast<cell::Type>(type));
}

void clearField(int playerIdx) {
    gaze::Player& p = (playerIdx == 0) ? g_player1 : g_player2;
    p.field = Field();
}

void setQueue(int playerIdx, std::vector<int> colors) {
    gaze::Player& p = (playerIdx == 0) ? g_player1 : g_player2;
    p.queue.clear();
    for (size_t i = 0; i + 1 < colors.size(); i += 2) {
        p.queue.push_back({static_cast<cell::Type>(colors[i]), static_cast<cell::Type>(colors[i+1])});
    }
}

void setStats(int playerIdx, int attack, bool allClear, int bonus) {
    gaze::Player& p = (playerIdx == 0) ? g_player1 : g_player2;
    p.attack = attack;
    p.all_clear = allClear;
    p.bonus = bonus;
}

struct ThinkResult {
    int x;
    int r;
};

ThinkResult runThink(int targetPoint) {
    auto ai_result = ai::think(g_player1, g_player2, search::Result(), g_configs, targetPoint);
    return { ai_result.placement.x, static_cast<int>(ai_result.placement.r) };
}

EMSCRIPTEN_BINDINGS(ama_ai) {
    function("initAI", &initAI);
    function("setField", &setField);
    function("clearField", &clearField);
    function("setQueue", &setQueue);
    function("setStats", &setStats);
    function("runThink", &runThink);

    register_vector<int>("VectorInt");
    
    value_object<ThinkResult>("ThinkResult")
        .field("x", &ThinkResult::x)
        .field("r", &ThinkResult::r);
}
