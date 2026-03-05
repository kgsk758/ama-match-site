#include "beam.h"

namespace beam
{

void expand(
    const cell::Pair& pair,
    node::Data& node,
    const eval::Weight& w,
    std::function<void(node::Data&, const move::Placement&, const chain::Score&)> callback
)
{
    // Generates placements
    auto placements = move::generate(node.field, pair.first == pair.second);

    for (i32 i = 0; i < placements.get_size(); ++i) {
        auto placement = placements[i];

        // Creates child node
        auto child = node;

        child.field.drop_pair(placement.x, placement.r, pair);
        auto mask_pop = child.field.pop();

        // Checks for death
        if (child.field.get_height(2) > 11) {
            continue;
        }

        // Gets chain score
        auto chain = chain::get_score(mask_pop);

        callback(child, placement, chain);
    }
};

void think(
    const cell::Pair& pair,
    std::vector<Candidate>& candidates,
    Layer& parents,
    Layer& children,
    const eval::Weight& w
)
{
    // Clears the children layer
    children.clear();

    for (i32 i = 0; i < parents.data.size(); ++i) {
        auto& node = parents.data[i];

        expand(pair, node, w, [&] (node::Data& child, const move::Placement& placement, const chain::Score& chain) {
            // Root node
            if (node.index == -1) {
                child.index = placement.x * 4 + static_cast<i32>(placement.r);
            }

            // Evaluation
            eval::evaluate(child, w);

            // Action
            // We use the chain score as the action score
            eval::action(child, 0, 0, w);

            child.score.action += chain.score;

            // Transposition table
            auto [found, entry] = children.table.get(node::get_hash(child));

            if (found) {
                if (entry->action + entry->eval < child.score.action + child.score.eval) {
                    entry->action = child.score.action;
                    entry->eval = child.score.eval;
                }

                return;
            }

            children.add(child);
        });
    }

    // Sorts the layer
    children.sort();
};

Result search(
    Field field,
    cell::Queue queue,
    eval::Weight w,
    Configs configs
)
{
    if (queue.empty()) {
        return Result();
    }

    // Layers
    Layer layer0 = Layer(configs.width);
    Layer layer1 = Layer(configs.width);
    Layer* layers[2] = { &layer0, &layer1 };

    // Initial node
    node::Data node_initial = {
        .field = field,
        .score = node::Score(),
        .index = -1
    };

    layers[0]->data.push_back(node_initial);

    // Continuous search
    std::vector<Candidate> dummy_candidates;
    for (i32 depth = 0; depth < queue.size(); ++depth) {
        think(queue[depth], dummy_candidates, *layers[depth % 2], *layers[(depth + 1) % 2], w);
    }

    // Results
    Result result = Result();
    auto& leaf = *layers[queue.size() % 2];

    for (i32 i = 0; i < leaf.data.size(); ++i) {
        auto& node = leaf.data[i];

        Candidate candidate = Candidate {
            .placement = move::Placement { static_cast<i8>(node.index / 4), static_cast<direction::Type>(node.index % 4) },
            .score = static_cast<size_t>(node.score.action + node.score.eval)
        };

        result.candidates.push_back(candidate);
    }

    return result;
};

Result search_multi(
    Field field,
    cell::Queue queue,
    eval::Weight w,
    Configs configs
)
{
    if (queue.empty()) {
        return Result();
    }

    Result result = Result();

    // Creates random queues
    std::vector<cell::Queue> queues;

    for (auto i = 0; i < static_cast<i32>(beam::BRANCH); ++i) {
        auto q = queue;
        auto qrng = beam::get_queue_random(i, configs.depth - queue.size());

        q.insert(q.end(), qrng.begin(), qrng.end());

        queues.push_back(q);
    }

    // Modified for Emscripten: no threads
    for (i32 i = 0; i < static_cast<i32>(beam::BRANCH); ++i) {
        auto b = beam::search(field, queues[i], w, configs);

        if (b.candidates.empty()) {
            continue;
        }

        // If this is the first finished search
        if (result.candidates.empty()) {
            result = b;
            continue;
        }

        // Accumulates the biggest scores of each candidate
        for (auto& c1 : result.candidates) {
            for (auto& c2 : b.candidates) {
                if (c1.placement == c2.placement) {
                    c1.score += c2.score;
                    break;
                }
            }
        }
    }

    return result;
};

cell::Queue get_queue_random(i32 id, size_t count)
{
    u32 seed = id;
    auto rng = [&] () -> u32 {
        seed = (seed * u32(0x5D588B65) + u32(0x269EC3)) & u32(0xFFFFFFFF);
        return seed;
    };

    cell::Queue result;

    for (i32 i = 0; i < static_cast<i32>(count); ++i) {
        result.push_back({ cell::Type(rng() % 4), cell::Type(rng() % 4) });
    }

    return result;
};

} // namespace beam
