import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;  // Maximum number of requests allowed
  windowMs: number;     // Time window in milliseconds
  endpoint: string;     // API endpoint to rate limit
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private static rateLimitMap = new Map<string, RateLimitRecord>();

  private static cleanupOldRecords() {
    const now = Date.now();
    for (const key of Array.from(this.rateLimitMap.keys())) {
        const record = this.rateLimitMap.get(key);
        if (record && now > record.resetTime) {
          this.rateLimitMap.delete(key);
        }
      }      
  }

  private static getClientIdentifier(request: NextRequest): string {
    // Prefer forwarded IP if available (e.g., when behind a proxy)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : request.ip;
    
    // Combine IP with endpoint for separate limits per endpoint
    return `${clientIp}-${request.nextUrl.pathname}`;
  }

  static middleware(config: RateLimitConfig) {
    return async (request: NextRequest) => {
      // Clean up old records periodically
      this.cleanupOldRecords();

      const clientId = this.getClientIdentifier(request);
      const now = Date.now();

      let record = this.rateLimitMap.get(clientId);

      // If no record exists or the window has expired, create a new record
      if (!record || now > record.resetTime) {
        record = {
          count: 1,
          resetTime: now + config.windowMs
        };
        this.rateLimitMap.set(clientId, record);
        return NextResponse.next();
      }

      // Increment request count
      record.count++;

      // Check if rate limit is exceeded
      if (record.count > config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        
        return NextResponse.json(
          {
            error: 'Too many requests',
            retryAfter: retryAfter
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString()
            }
          }
        );
      }

      // Update the record
      this.rateLimitMap.set(clientId, record);

      // Add rate limit headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (config.maxRequests - record.count).toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

      return response;
    };
  }
}