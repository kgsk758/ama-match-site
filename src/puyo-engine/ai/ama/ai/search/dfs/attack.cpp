#include "attack.h"

namespace dfs
{

namespace attack
{

// Searches for all possible attacks
Result search(
    Field field,
    cell::Queue queue,
    bool detect,
    i32 frame_delay,
    i32 thread_count
)
{
    if (queue.size() < 2) {
        return Result();
    }

    Result result = Result();

    // Creates root
    Node root = Node {
        .field = field,
        .score = 0,
        .frame = 0
    };

    // Generates placements
    auto placements = move::generate(field, queue[0].first == queue[0].second);

    // Divides the works sequentially (Modified for Emscripten: no threads)
    while (placements.get_size() > 0)
    {
        move::Placement placement = placements[placements.get_size() - 1];
        placements.pop();

        // Creates candidate
        Candidate candidate = Candidate {
            .placement = placement,
            .attack_max = attack::Data(),
            .attacks = std::vector<attack::Data>(),
            .attacks_ac = std::vector<attack::Data>(),
            .attacks_detect = std::vector<attack::Data>()
        };

        candidate.attacks.reserve(512);
        candidate.attacks_detect.reserve(512);

        // Creates child node
        auto child = root;

        child.field.drop_pair(placement.x, placement.r, queue[0]);
        auto mask_pop = child.field.pop();

        // Checks for death
        if (child.field.get_height(2) > 11) {
            continue;
        }

        // Gets chain score
        auto chain = chain::get_score(mask_pop);

        if (chain.count > 0) {
            // Pushes attack to the candidate
            auto attack = attack::Data {
                .count = chain.count,
                .score = chain.score,
                .score_total = chain.score,
                .frame = 0,
                .frame_real = root.field.get_drop_pair_frame(placement.x, placement.r),
                .all_clear = child.field.is_empty(),
                .redundancy = INT32_MAX,
                .link = eval::get_link(child.field),
                .parent = root.field,
                .result = child.field
            };

            candidate.attacks.push_back(attack);

            // Checks for all clear
            if (attack.all_clear) {
                candidate.attacks_ac.push_back(attack);
            }
        }

        // Updates max attack
        candidate.attack_max = candidate.attacks.empty() ? attack::Data() : candidate.attacks.back();

        // Accumulates stats
        child.score += chain.score;
        child.frame += root.field.get_drop_pair_frame(placement.x, placement.r) + chain.count * 2 + frame_delay;

        // Continues searching
        attack::dfs(
            child,
            queue,
            candidate,
            1,
            detect,
            frame_delay
        );

        // Dead end
        if (candidate.attacks.empty()) {
            continue;
        }

        // Pushes candidate to result
        result.candidates.push_back(candidate);
    }

    return result;
};

// Depth first search
void dfs(
    Node& node,
    cell::Queue& queue,
    Candidate& candidate,
    i32 depth,
    bool detect,
    i32 frame_delay
)
{
    if (depth >= queue.size()) {
        return;
    }

    // Generates placements
    auto placements = move::generate(node.field, queue[depth].first == queue[depth].second);

    for (i32 i = 0; i < placements.get_size(); ++i) {
        auto placement = placements[i];

        // Creates child node
        auto child = node;

        child.field.drop_pair(placement.x, placement.r, queue[depth]);
        auto mask_pop = child.field.pop();

        // Checks for death
        if (child.field.get_height(2) > 11) {
            continue;
        }

        // Gets chain score
        auto chain = chain::get_score(mask_pop);

        // Accumulates stats
        child.score += chain.score;
        child.frame += node.field.get_drop_pair_frame(placement.x, placement.r) + chain.count * 2 + frame_delay;

        if (chain.count > 0) {
            // Pushes attack to the candidate
            auto attack = attack::Data {
                .count = chain.count,
                .score = chain.score,
                .score_total = child.score,
                .frame = depth,
                .frame_real = child.frame,
                .all_clear = child.field.is_empty(),
                .redundancy = INT32_MAX,
                .link = eval::get_link(child.field),
                .parent = node.field,
                .result = child.field
            };

            candidate.attacks.push_back(attack);

            // Updates max attack
            if (dfs::attack::cmp_main(candidate.attack_max, attack)) {
                candidate.attack_max = attack;
            }

            // Checks for all clear
            if (attack.all_clear) {
                candidate.attacks_ac.push_back(attack);
            }

            // Continues searching
            dfs(
                child,
                queue,
                candidate,
                depth + 1,
                detect,
                frame_delay
            );
        }
        else if (detect) {
            // Continues searching
            dfs(
                child,
                queue,
                candidate,
                depth + 1,
                detect,
                frame_delay
            );
        }
    }
};

} // namespace attack

} // namespace dfs
