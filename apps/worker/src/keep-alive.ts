// Worker Keep-Alive Service - Prevents Render from shutting down idle workers
import axios from 'axios';

const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const API_URL = process.env.API_URL || 'http://localhost:3001';

export function startKeepAlive() {
    console.log('[KEEP-ALIVE] Starting worker keep-alive service');

    setInterval(async () => {
        try {
            await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
            console.log('[KEEP-ALIVE] Ping successful - worker staying alive');
        } catch (e) {
            console.log('[KEEP-ALIVE] Ping failed (expected if API down)');
        }
    }, KEEP_ALIVE_INTERVAL);
}
