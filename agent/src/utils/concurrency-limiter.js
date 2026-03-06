class Semaphore {
    constructor(max) {
        this.max = max;
        this.count = 0;
        this.queue = [];
    }

    async acquire() {
        if (this.count < this.max) {
            this.count++;
            return true;
        }

        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    release() {
        this.count--;
        if (this.queue.length > 0) {
            this.count++;
            const next = this.queue.shift();
            next(true);
        }
    }
}

class ConcurrencyLimiter {
    constructor(config = {}) {
        this.limits = {
            shell: config.shell || 2,
            code: config.code || 2,
            screen: config.screen || 1,
            window: config.window || 1,
            default: config.default || 5
        };

        this.maxQueueDepth = config.maxQueueDepth || 10;
        this.semaphores = {};
        this.queues = {};

        for (const [key, limit] of Object.entries(this.limits)) {
            this.semaphores[key] = new Semaphore(limit);
            this.queues[key] = 0;
        }
    }

    async run(runtime, task) {
        const type = this.limits[runtime] ? runtime : 'default';
        const semaphore = this.semaphores[type];

        if (this.queues[type] >= this.maxQueueDepth) {
            const err = new Error('Max queue depth reached. Backpressure applied.');
            err.code = 'RESOURCE_CAP';
            throw err;
        }

        this.queues[type]++;
        try {
            await semaphore.acquire();
            return await task();
        } finally {
            semaphore.release();
            this.queues[type]--;
        }
    }

    getStats() {
        const stats = {};
        for (const key of Object.keys(this.limits)) {
            stats[key] = {
                active: this.semaphores[key].count,
                queued: this.queues[key] - this.semaphores[key].count,
                limit: this.limits[key]
            };
        }
        return stats;
    }
}

module.exports = ConcurrencyLimiter;
