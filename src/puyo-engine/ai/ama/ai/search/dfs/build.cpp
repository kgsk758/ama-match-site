#include "build.h"

namespace dfs
{

namespace build
{

// Starts the depth first search (Modified for Emscripten: no threads)
Result search(Field field, cell::Queue queue, eval::Weight w, i32 thread_count)
{
    // We don't search if the input queue is too small
    if (queue.size() < 2) {
        return Result();
    }

    Result result = Result();

    // Initializes root
    Node root = Node {
        .field = field,
        .tear = 0,
        .waste = 0
    };

    // Generates all the possible first placements
    auto placements = move::generate(field, queue[0].first == queue[0].second);

    // Divides the works sequentially (Modified for Emscripten: no threads)
    while (placements.get_size() > 0)
    {
        move::Placement placement = placements[placements.get_size() - 1];
        placements.pop();

        // Creates candidate
        Candidate candidate = Candidate {
            .placement = placement,
            .eval = eval::Result(),
            .eval_fast = INT32_MIN
        };

        // Updates child node
        auto child = root;

        child.field.drop_pair(placement.x, placement.r, queue[0]);
        auto mask_pop = child.field.pop();

        // Death
        if (child.field.get_height(2) > 11) {
            continue;
        }

        // Updates child's stats
        child.tear += root.field.get_drop_pair_frame(placement.x, placement.r) - 1;
        child.waste += static_cast<i32>(mask_pop.get_size());

        candidate.eval_fast = eval::evaluate(child.field, child.tear, child.waste, w).value;

        // Continues searching to evaluate
        candidate.eval = build::dfs(child, queue, w, 1);

        // This child leads to a dead end, so we prune it
        if (candidate.eval.value == INT32_MIN) {
            continue;
        }

        // Pushes the candidate to result
        result.candidates.push_back(std::move(candidate));
    }

    return result;
};

// Depth first search (Fixed to Node& to match build.h)
eval::Result dfs(Node& node, cell::Queue& queue, eval::Weight& w, i32 depth)
{
    if (depth >= queue.size()) {
        return eval::evaluate(node.field, node.tear, node.waste, w);
    }

    auto placements = move::generate(node.field, queue[depth].first == queue[depth].second);

    eval::Result best = eval::Result();

    for (i32 i = 0; i < placements.get_size(); ++i) {
        auto placement = placements[i];

        auto child = node;

        child.field.drop_pair(placement.x, placement.r, queue[depth]);
        auto mask_pop = child.field.pop();

        // Death
        if (child.field.get_height(2) > 11) {
            continue;
        }

        // Updates child's stats
        child.tear += node.field.get_drop_pair_frame(placement.x, placement.r) - 1;
        child.waste += static_cast<i32>(mask_pop.get_size());

        // Recursion
        auto eval = dfs(child, queue, w, depth + 1);

        if (eval.value > best.value) {
            best = eval;
        }
    }

    return best;
};

};

};