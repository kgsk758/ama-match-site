#include "search.h"

namespace search
{

Thread::Thread()
{
    this->thread = nullptr;
    this->results = {};
};

// Starts the search directly without threads for Emscripten compatibility
bool Thread::search(Field field, cell::Queue queue, Configs configs, std::optional<i32> trigger, bool stretch)
{
    // If thread is not null, it means there's a problem (though we don't use real threads now)
    if (this->thread != nullptr) {
        return false;
    }

    this->clear();

    auto r = Result();
    auto beam_configs = beam::Configs();

    if (trigger.has_value()) {
        beam_configs.trigger = trigger.value();
        beam_configs.stretch = stretch;
    }

    if (queue.size() > 2) {
        r.build = beam::search(field, queue, configs.build, beam_configs);

        if (!r.build.candidates.empty()) {
            std::sort(
                r.build.candidates.begin(),
                r.build.candidates.end(),
                [&] (const beam::Candidate& a, const beam::Candidate& b) {
                    if (beam_configs.stretch) {
                        return a.score > b.score;
                    }

                    bool a_enough = a.score / beam::BRANCH >= beam_configs.trigger;
                    bool b_enough = b.score / beam::BRANCH >= beam_configs.trigger;

                    if (a_enough && b_enough) {
                        return a.score < b.score;
                    }

                    return a.score > b.score;
                }
            );
        }
    }
    else {
        r.build = beam::search_multi(field, queue, configs.build, beam_configs);
        r.freestyle = dfs::build::search(field, queue, configs.freestyle);
        r.fast = dfs::build::search(field, queue, configs.fast);
        r.ac = dfs::build::search(field, queue, configs.ac);
    }

    this->results = r;
    // Set a dummy pointer to indicate "done"
    this->thread = (std::thread*)1; 

    return true;
};

std::optional<Result> Thread::get()
{
    if (this->thread == nullptr) {
        return {};
    }

    auto result = this->results;

    this->clear();

    return result;
};

void Thread::clear()
{
    this->thread = nullptr;
    this->results = {};
};

};