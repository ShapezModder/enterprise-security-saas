import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawlOptions {
    maxDepth?: number;
    maxPages?: number;
    timeout?: number; // milliseconds per request
    userAgent?: string;
    followExternal?: boolean;
}

export interface CrawlResult {
    urls: string[];
    forms: string[];
    endpoints: string[];
}

/**
 * Lightweight web crawler optimized for free-tier hosting
 * Memory-efficient, timeout-controlled, with strict limits
 */
export class LightweightCrawler {
    private visited = new Set<string>();
    private discovered = new Set<string>();
    private forms = new Set<string>();
    private endpoints = new Set<string>();
    private queue: Array<{ url: string; depth: number }> = [];
    private options: Required<CrawlOptions>;
    private baseDomain: string;

    constructor(startUrl: string, options: CrawlOptions = {}) {
        this.options = {
            maxDepth: options.maxDepth ?? 3,
            maxPages: options.maxPages ?? 50, // Strict limit for free tier
            timeout: options.timeout ?? 5000,
            userAgent: options.userAgent ?? 'Mozilla/5.0 (compatible; SecurityScanner/1.0)',
            followExternal: options.followExternal ?? false
        };

        const parsedUrl = new URL(startUrl);
        this.baseDomain = parsedUrl.hostname;
        this.queue.push({ url: startUrl, depth: 0 });
    }

    /**
     * Extract and normalize URLs from HTML
     */
    private extractUrls(html: string, baseUrl: string): string[] {
        const $ = cheerio.load(html);
        const urls: string[] = [];

        // Extract from anchor tags
        $('a[href]').each((_, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                try {
                    const absoluteUrl = new URL(href, baseUrl).toString();
                    urls.push(absoluteUrl);
                } catch {
                    // Invalid URL, skip
                }
            }
        });

        // Extract from forms (action attributes)
        $('form[action]').each((_, elem) => {
            const action = $(elem).attr('action');
            const method = $(elem).attr('method')?.toUpperCase() || 'GET';
            if (action) {
                try {
                    const absoluteUrl = new URL(action, baseUrl).toString();
                    this.forms.add(`${method} ${absoluteUrl}`);
                    urls.push(absoluteUrl);
                } catch {
                    // Invalid URL, skip
                }
            }
        });

        // Extract from JavaScript endpoints (common patterns)
        const scriptContent = $('script').text();
        const apiPatterns = [
            /['"](\/api\/[^'"]+)['"]/g,
            /['"](\/v\d+\/[^'"]+)['"]/g,
            /fetch\(['"']([^'"]+)['"']/g,
            /axios\.\w+\(['"']([^'"]+)['"']/g
        ];

        for (const pattern of apiPatterns) {
            let match;
            while ((match = pattern.exec(scriptContent)) !== null) {
                try {
                    const endpointUrl = new URL(match[1], baseUrl).toString();
                    this.endpoints.add(endpointUrl);
                } catch {
                    // Invalid URL, skip
                }
            }
        }

        return urls;
    }

    /**
     * Check if URL should be crawled
     */
    private shouldCrawl(url: string): boolean {
        try {
            const parsed = new URL(url);

            // Skip non-HTTP protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return false;
            }

            // Skip static files
            const staticExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.css', '.js', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
            if (staticExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext))) {
                return false;
            }

            // Check domain matching
            if (!this.options.followExternal && parsed.hostname !== this.baseDomain) {
                return false;
            }

            // Check if already visited
            if (this.visited.has(url)) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Fetch and parse a single page
     */
    private async crawlPage(url: string, depth: number): Promise<void> {
        if (this.visited.size >= this.options.maxPages) {
            return; // Hit page limit
        }

        if (depth > this.options.maxDepth) {
            return; // Hit depth limit
        }

        if (!this.shouldCrawl(url)) {
            return;
        }

        this.visited.add(url);
        this.discovered.add(url);

        try {
            const response = await axios.get(url, {
                timeout: this.options.timeout,
                headers: {
                    'User-Agent': this.options.userAgent
                },
                maxRedirects: 3,
                validateStatus: (status) => status < 500 // Accept 4xx responses
            });

            // Only parse HTML content
            const contentType = response.headers['content-type'] || '';
            if (!contentType.includes('text/html')) {
                return;
            }

            // Extract URLs from response
            const newUrls = this.extractUrls(response.data, url);

            // Add new URLs to queue
            for (const newUrl of newUrls) {
                if (!this.visited.has(newUrl) && this.shouldCrawl(newUrl)) {
                    this.queue.push({ url: newUrl, depth: depth + 1 });
                }
            }
        } catch (error) {
            // Silently fail for individual pages (timeout, 404, etc.)
            // This prevents one bad URL from stopping the entire crawl
        }
    }

    /**
     * Start crawling with breadth-first search
     */
    async crawl(): Promise<CrawlResult> {
        const startTime = Date.now();
        const maxCrawlTime = 60000; // 60 seconds total crawl time limit

        while (this.queue.length > 0) {
            // Check time limit
            if (Date.now() - startTime > maxCrawlTime) {
                break;
            }

            // Check page limit
            if (this.visited.size >= this.options.maxPages) {
                break;
            }

            const next = this.queue.shift();
            if (!next) break;

            await this.crawlPage(next.url, next.depth);
        }

        return {
            urls: Array.from(this.discovered),
            forms: Array.from(this.forms),
            endpoints: Array.from(this.endpoints)
        };
    }
}

/**
 * Quick crawl function for simple use cases
 */
export async function quickCrawl(
    startUrl: string,
    options: CrawlOptions = {}
): Promise<CrawlResult> {
    const crawler = new LightweightCrawler(startUrl, options);
    return await crawler.crawl();
}
