/* Runs model calls with a head start: the first candidate starts alone, and if it hasn't answered after hedgeMs
   (or has failed), the next one starts too. The first good answer wins and the calls still running are cancelled.
   So one stuck model costs hedgeMs, not its whole timeout. At most two calls run at once.

   candidates: [{ label, provider, backup, run(signal) => Promise<text> }] in order of preference.
   Backups only start once fewer than reserveMs of the budget is left, or when everything before them has failed. */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms).unref?.());

async function firstAnswer(candidates, { budgetMs, reserveMs = 0, hedgeMs, callTimeoutMs, isRetryable, onFailure = () => {} }) {
    const deadline = Date.now() + budgetMs;
    const stoppedProviders = new Set();
    const running = new Map();
    const failures = [];
    let next = 0, lastStart = 0, key = 0;
    // A call needs at least this much time to be worth starting.
    const minRoom = Math.min(5000, budgetMs / 4);
    const remaining = () => deadline - Date.now();
    const primariesLeft = () => candidates.slice(next).some(c => !c.backup && !stoppedProviders.has(c.provider));

    // Starts the next candidate that is allowed to run now. Returns false when none can.
    function startNext({ allowBackupEarly = false } = {}) {
        while (next < candidates.length) {
            const c = candidates[next];
            if (stoppedProviders.has(c.provider)) { next++; continue; }
            // Gemini calls stop early enough to leave the reserve for the backups; backups get whatever is left.
            const room = remaining() - (c.backup ? 0 : reserveMs);
            if (!c.backup && room < minRoom) { next++; continue; }
            if (c.backup && !allowBackupEarly && remaining() > reserveMs && (running.size || primariesLeft())) return false;
            if (room < minRoom) return false;
            next++;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(new DOMException('The call timed out.', 'TimeoutError')), c.backup ? room : Math.min(callTimeoutMs, room));
            const id = ++key;
            const promise = c.run(controller.signal)
                .then(text => ({ id, c, text }), error => ({ id, c, error }))
                .finally(() => clearTimeout(timer));
            running.set(id, { controller, promise });
            lastStart = Date.now();
            return true;
        }
        return false;
    }

    startNext({ allowBackupEarly: true });
    while (running.size) {
        const canHedge = running.size < 2 && next < candidates.length;
        const waits = [...running.values()].map(r => r.promise);
        if (canHedge) waits.push(sleep(Math.max(0, hedgeMs - (Date.now() - lastStart))).then(() => 'hedge'));
        waits.push(sleep(Math.max(0, remaining())).then(() => 'deadline'));
        const result = await Promise.race(waits);
        if (result === 'deadline') break;
        if (result === 'hedge') {
            // Nothing could start (e.g. backups waiting for their turn): wait for a running call instead of spinning.
            if (!startNext()) await Promise.race([...running.values()].map(r => r.promise));
            continue;
        }
        running.delete(result.id);
        if (!result.error) {
            for (const r of running.values()) r.controller.abort(new DOMException('Another model answered first.', 'AbortError'));
            return { text: result.text, label: result.c.label, failures };
        }
        failures.push({ label: result.c.label, error: result.error });
        onFailure(result.c, result.error);
        // A bad key or a bad request fails the same way on every model, so stop using that provider.
        if (!isRetryable(result.error)) stoppedProviders.add(result.c.provider);
        if (!running.size) startNext({ allowBackupEarly: !primariesLeft() });
    }
    for (const r of running.values()) r.controller.abort(new DOMException('Out of time.', 'TimeoutError'));
    const error = new Error(failures.length ? failures[failures.length - 1].error.message : 'No model answered in time.');
    error.failures = failures;
    error.timedOut = !failures.length || running.size > 0;
    throw error;
}

module.exports = { firstAnswer };
