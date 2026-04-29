/**
 * MEMORY MANAGER
 * =======================
 * Sistem "Stateless Execution" (Kural: Agent geçmiş bilmez) prensibiyle çalışır.
 * Ancak Merkezi bir State'e ihtiyaç varsa bu menajer üzerinden sadece 
 * log veya geçici cache ataması yapılır.
 */
'use strict';

class MemoryManager {
    constructor() {
        this.cache = new Map();
    }

    setStatelessLog(jobId, data) {
        // En fazla 5 saniye hafızada tutulacak log/kanıt verisi
        this.cache.set(jobId, {
            data,
            timestamp: Date.now()
        });

        setTimeout(() => {
            this.cache.delete(jobId);
        }, 5000);
    }

    getLog(jobId) {
        return this.cache.get(jobId) || null;
    }
    
    clear() {
        this.cache.clear();
    }
}

module.exports = new MemoryManager();
