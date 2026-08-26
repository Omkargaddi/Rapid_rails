import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { randomUUID } from 'crypto';
import path from 'path';

const ENGINE_PATH = path.join(process.cwd(), 'train_engine');
const DATA_PATH   = path.join(process.cwd(), 'train_data');

class EngineClient {
    constructor({ enginePath = ENGINE_PATH, dataPath = DATA_PATH } = {}) {
        this.enginePath = enginePath;
        this.dataPath = dataPath;
        this.pending = new Map();
        this.engine = null;
        this.rl = null;
        this.ready = false;
        this.stopping = false;
        this._readyResolve = null;
    }

    start() {
        this._spawn();
        return this.waitReady();
    }

    _spawn() {
        this.engine = spawn(this.enginePath, [this.dataPath], {
            stdio: ['pipe', 'pipe', 'inherit'],
        });

        this.rl = createInterface({ input: this.engine.stdout });
        this.rl.on('line', (line) => this._onLine(line));

        this.engine.on('error', (err) => {
            console.error('[Engine] Failed to start binary:', err.message);
            console.error('[Engine] Make sure you ran `make` before starting the server.');
            this.ready = false;
            if (!this.stopping) process.exit(1);
        });

        this.engine.on('exit', (code) => {
            console.error(`[Engine] Process exited with code ${code}.`);
            this.ready = false;
            for (const [, handler] of this.pending) {
                clearTimeout(handler.timer);
                handler.reject(new Error('Engine process crashed'));
            }
            this.pending.clear();
            if (!this.stopping) {
                console.error('[Engine] Restarting in 1s...');
                setTimeout(() => this._spawn(), 1000);
            }
        });
    }

    _onLine(line) {
        if (!line.trim()) return;
        try {
            const msg = JSON.parse(line);
            if (!this.ready) {
                if (msg.status === 'ready') {
                    this.ready = true;
                    console.log(`[Engine] Ready — ${msg.trains} trains loaded.`);
                    if (this._readyResolve) {
                        this._readyResolve();
                        this._readyResolve = null;
                    }
                }
                return;
            }
            const { req_id, results, error } = msg;
            const handler = this.pending.get(req_id);
            if (!handler) return;

            this.pending.delete(req_id);
            clearTimeout(handler.timer);
            if (error) handler.reject(new Error(error));
            else       handler.resolve(results);

        } catch (e) {
            console.error('[Engine] Bad JSON from binary:', e.message);
        }
    }

    waitReady(timeoutMs = 60_000) {
        return new Promise((resolve, reject) => {
            if (this.ready) return resolve();
            const timer = setTimeout(() => {
                reject(new Error('Engine ready timeout'));
            }, timeoutMs);
            this._readyResolve = () => {
                clearTimeout(timer);
                resolve();
            };
        });
    }

    query(payload) {
        return new Promise((resolve, reject) => {
            if (!this.ready) return reject(new Error('Engine not ready yet'));

            const req_id = randomUUID();
            const timer = setTimeout(() => {
                if (this.pending.has(req_id)) {
                    this.pending.delete(req_id);
                    reject(new Error('Engine request timed out'));
                }
            }, 30_000);

            this.pending.set(req_id, {
                timer,
                resolve: (val) => { clearTimeout(timer); resolve(val); },
                reject:  (err) => { clearTimeout(timer); reject(err);  },
            });

            this.engine.stdin.write(JSON.stringify({ ...payload, req_id }) + '\n');
        });
    }

    stop() {
        this.stopping = true;
        if (this.engine) this.engine.kill();
    }
}

export default EngineClient;
