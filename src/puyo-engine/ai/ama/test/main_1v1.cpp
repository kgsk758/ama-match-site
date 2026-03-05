#include <iostream>
#include <vector>
#include <chrono>
#include <thread>
#include <string>
#include <vector>

#include "../core/core.h"
#include "../ai/ai.h"
#include "../lib/nlohmann/json.hpp"

using json = nlohmann::json;

// Helper function to load AI weights from config.json
void load_json(search::Configs& configs)
{
    std::ifstream file("config.json");
    if (!file.is_open()) {
        std::cerr << "Error: config.json not found. Please run the 'puyop' target first to generate it." << std::endl;
        exit(1);
    }
    json js;
    file >> js;
    file.close();
    from_json(js["build"], configs.build);
    from_json(js["fast"], configs.fast);
    from_json(js["freestyle"], configs.freestyle);
    from_json(js["ac"], configs.ac);
}

// Helper function to get a field's string representation
std::vector<std::string> field_to_strings(const Field& field) {
    std::vector<std::string> lines;
    for (int y = 12; y >= 0; --y) {
        std::string line = "";
        for (int x = 0; x < 6; ++x) {
            line += cell::to_char(const_cast<Field&>(field).get_cell(x, y));
        }
        lines.push_back(line);
    }
    return lines;
}


// Helper function to print the fields side-by-side
void print_game_state(const gaze::Player& p1, const gaze::Player& p2, int turn) {
    system("clear");
    printf("Turn: %d\n", turn);
    printf("P1 (Attack: %-5d | AllClear: %d)   P2 (Attack: %-5d | AllClear: %d)\n", p1.attack, p1.all_clear, p2.attack, p2.all_clear);
    printf("----------------------------------\n");

    auto p1_lines = field_to_strings(p1.field);
    auto p2_lines = field_to_strings(p2.field);

    for (size_t i = 0; i < p1_lines.size(); ++i) {
        printf("| %s |          | %s |\n", p1_lines[i].c_str(), p2_lines[i].c_str());
    }
    printf("----------------------------------\n");
    // Add a small delay to make the simulation watchable
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
}


int main(int argc, char** argv)
{
    srand(uint32_t(time(NULL)));

    // 1. Load AI configurations
    search::Configs configs;
    load_json(configs);
    const i32 TARGET_POINT = 70; // Score needed for one garbage puyo

    // 2. Set up the game
    u32 seed = (argc > 1) ? std::atoi(argv[1]) : (rand() & 0xFFFF);
    printf("seed: %d\n", seed);
    auto puyo_queue = cell::create_queue(seed);

    gaze::Player player1;
    gaze::Player player2;
    player1.all_clear = true;
    player2.all_clear = true;

    // Main game loop
    for (int i = 0; i < 200; ++i) {
        // P1's Turn
        {
            gaze::Player& self = player1;
            gaze::Player& enemy = player2;
            
            // Offset garbage
            i32 offset_garbage = std::min(self.attack, enemy.attack);
            self.attack -= offset_garbage;
            enemy.attack -= offset_garbage;

            // Drop pending garbage
            if (self.attack > 0) {
                self.field.drop_garbage(self.attack / 30);
                self.attack %= 30;
            }

            // Check for loss condition
            if (self.field.get_height(2) > 11) {
                printf("Player 2 Wins!\n");
                break;
            }

            // Set puyo queue for this turn
            self.queue = { puyo_queue[(i * 2) % 128], puyo_queue[(i * 2 + 1) % 128], puyo_queue[(i * 2 + 2) % 128] };
            enemy.queue = { puyo_queue[(i * 2 + 1) % 128], puyo_queue[(i * 2 + 2) % 128] }; // Enemy queue for prediction

            // Think
            auto ai_result = ai::think(self, enemy, search::Result(), configs, TARGET_POINT);

            // Act
            self.field.drop_pair(ai_result.placement.x, ai_result.placement.r, self.queue[0]);
            
            // Handle chain
            auto mask = self.field.pop();
            auto chain_score = chain::get_score(mask);
            if (chain_score.count > 0) {
                self.all_clear = false;
            }
            if (self.field.get_count() == 0) {
                self.all_clear = true;
                self.bonus += 2100;
            }

            // Add attack to enemy
            enemy.attack += (chain_score.score + self.bonus) / TARGET_POINT;
            self.bonus = 0;
            
            print_game_state(player1, player2, i * 2);
        }

        // P2's Turn
        {
            gaze::Player& self = player2;
            gaze::Player& enemy = player1;

            // Offset garbage
            i32 offset_garbage = std::min(self.attack, enemy.attack);
            self.attack -= offset_garbage;
            enemy.attack -= offset_garbage;
            
            // Drop pending garbage
            if (self.attack > 0) {
                self.field.drop_garbage(self.attack / 30);
                self.attack %= 30;
            }

            // Check for loss condition
            if (self.field.get_height(2) > 11) {
                printf("Player 1 Wins!\n");
                break;
            }

            // Set puyo queue for this turn
            self.queue = { puyo_queue[(i * 2 + 1) % 128], puyo_queue[(i * 2 + 2) % 128], puyo_queue[(i * 2 + 3) % 128] };
            enemy.queue = { puyo_queue[(i * 2 + 2) % 128], puyo_queue[(i * 2 + 3) % 128] };

            // Think
            auto ai_result = ai::think(self, enemy, search::Result(), configs, TARGET_POINT);

            // Act
            self.field.drop_pair(ai_result.placement.x, ai_result.placement.r, self.queue[0]);

            // Handle chain
            auto mask = self.field.pop();
            auto chain_score = chain::get_score(mask);
            if (chain_score.count > 0) {
                self.all_clear = false;
            }
            if (self.field.get_count() == 0) {
                self.all_clear = true;
                self.bonus += 2100;
            }
            
            // Add attack to enemy
            enemy.attack += (chain_score.score + self.bonus) / TARGET_POINT;
            self.bonus = 0;

            print_game_state(player1, player2, i * 2 + 1);
        }
    }

    return 0;
}
