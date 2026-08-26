#include "EngineCommon.hpp"
#include <hiredis/hiredis.h>
#include <cstdlib>
#include <cstring>
#include <csignal>
#include <chrono>
#include <thread>
#include <ctime>

using namespace std;
using json = nlohmann::json;

StationManager sm;
deque<Train> trains;

static volatile sig_atomic_t g_stop = 0;
static void HandleSignal(int) { g_stop = 1; }

static long long nowMs() {
    return chrono::duration_cast<chrono::milliseconds>(
        chrono::system_clock::now().time_since_epoch()).count();
}

static const char* envStr(const char* name, const char* def) {
    const char* v = getenv(name);
    return (v && *v) ? v : def;
}

static int envInt(const char* name, int def) {
    const char* v = getenv(name);
    return (v && *v) ? atoi(v) : def;
}

static redisContext* ConnectRedis() {
    const string host = envStr("REDIS_HOST", "localhost");
    const int port = envInt("REDIS_PORT", 6379);
    redisContext* c = redisConnect(host.c_str(), port);
    if (c == NULL || c->err) {
        cerr << "[worker] Redis connect error: " << (c ? c->errstr : "null ctx") << endl;
        if (c) redisFree(c);
        return nullptr;
    }
    return c;
}

static bool RedisPing(redisContext* c) {
    redisReply* reply = (redisReply*)redisCommand(c, "PING");
    if (!reply) return false;
    bool ok = (reply->type == REDIS_REPLY_STATUS);
    freeReplyObject(reply);
    return ok;
}

static bool redisSetJob(redisContext* c, const string& jobId, const json& value) {
    const int ttl = envInt("JOB_TTL_SECONDS", 600);
    string payload = value.dump();
    redisReply* reply = (redisReply*)redisCommand(
        c, "SET job:%s %s EX %d", jobId.c_str(), payload.c_str(), ttl);
    bool ok = reply && reply->type != REDIS_REPLY_ERROR;
    if (reply) freeReplyObject(reply);
    return ok;
}

static void HandleJob(redisContext* c, const json& msg) {
    string jobId = msg.value("jobId", "");
    if (jobId.empty()) return;

    string src = msg.value("source", "");
    string dst = msg.value("destination", "");
    int day     = msg.value("day", 1);
    int minB    = msg.value("min_buffer", 30);
    int maxB    = msg.value("max_buffer", 480);
    int maxLegs = msg.value("max_legs", 8);

    json proc;
    proc["status"] = "processing";
    proc["payload"] = msg;
    proc["startedAt"] = nowMs();
    redisSetJob(c, jobId, proc);

    json out;
    out["jobId"] = jobId;
    try {
        vector<JourneyResponse> results =
            GraphEngine::convenient(sm, src, dst, day, minB, maxB, maxLegs);
        out["status"] = "complete";
        out["results"] = results;
        out["completedAt"] = nowMs();
    } catch (const exception& e) {
        out["status"] = "failed";
        out["error"] = e.what();
        out["failedAt"] = nowMs();
    }
    redisSetJob(c, jobId, out);
    cerr << "[worker] job " << jobId << " -> " << out["status"].get<string>() << endl;
}

int main(int argc, char* argv[]) {
    string dataPath = (argc > 1) ? argv[1] : "./train_data";
    LoadData(dataPath);

    signal(SIGTERM, HandleSignal);
    signal(SIGINT, HandleSignal);

    const string queueName = envStr("QUEUE_NAME", "route_jobs");
    const int brpopTimeout = 3; // seconds, lets signal handler interrupt the loop

    while (!g_stop) {
        redisContext* c = ConnectRedis();
        if (!c) {
            cerr << "[worker] Redis unavailable, retrying in 2s..." << endl;
            this_thread::sleep_for(chrono::seconds(2));
            continue;
        }
        if (!RedisPing(c)) {
            cerr << "[worker] Redis PING failed, reconnecting..." << endl;
            redisFree(c);
            continue;
        }
        cerr << "[worker] consuming queue \"" << queueName << "\" (ttl="
             << envInt("JOB_TTL_SECONDS", 600) << "s)..." << endl;

        while (!g_stop) {
            redisReply* reply = (redisReply*)redisCommand(
                c, "BRPOP %s %d", queueName.c_str(), brpopTimeout);
            if (!reply) {
                cerr << "[worker] Redis connection lost, reconnecting..." << endl;
                break;
            }
            if (reply->type == REDIS_REPLY_NIL) {
                freeReplyObject(reply);
                continue; // BRPOP timeout, check g_stop again
            }
            if (reply->type == REDIS_REPLY_ARRAY && reply->elements == 2) {
                redisReply* val = reply->element[1];
                string jobStr(val->str, val->len);
                try {
                    json msg = json::parse(jobStr);
                    HandleJob(c, msg);
                } catch (const exception& e) {
                    cerr << "[worker] job parse error: " << e.what() << endl;
                }
            }
            freeReplyObject(reply);
        }

        redisFree(c);
        if (!g_stop) {
            cerr << "[worker] reconnecting in 2s..." << endl;
            this_thread::sleep_for(chrono::seconds(2));
        }
    }

    cerr << "[worker] exited" << endl;
    return 0;
}
