import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BinanceService {
  private baseUrl = 'https://api.binance.com/api/v3';
  private cachedBitcoinPrice: { price: number; timestamp: number } | null = null;
  private cacheExpiryMs = 120000; // 2 minutes in milliseconds
  private apiRequest$: Observable<number> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Get the current average Bitcoin price
   * @returns Observable with the current average Bitcoin price in USDT
   */
  getBitcoinPrice(): Observable<number> {
    const now = Date.now();
    
    // If we have a cached price and it's not expired, return it
    if (this.cachedBitcoinPrice && now - this.cachedBitcoinPrice.timestamp < this.cacheExpiryMs) {
      console.log('Using cached BTC price data, expires in', 
                  Math.round((this.cacheExpiryMs - (now - this.cachedBitcoinPrice.timestamp)) / 1000), 'seconds');
      return of(this.cachedBitcoinPrice.price);
    }
    
    // If there's already an ongoing API request, return it
    if (this.apiRequest$) {
      console.log('Reusing existing BTC price API request');
      return this.apiRequest$;
    }
    
    console.log('Making new BTC average price API request');
    
    // Get the current average price
    this.apiRequest$ = this.http.get<{mins: number; price: string; closeTime: number}>(`${this.baseUrl}/avgPrice`, {
      params: {
        symbol: 'BTCUSDT'
      }
    }).pipe(
      map(response => {
        const price = Number(response.price);
        
        // Update the cache
        this.cachedBitcoinPrice = {
          price,
          timestamp: Date.now()
        };
        
        // Reset the ongoing request after a delay to prevent race conditions
        setTimeout(() => {
          this.apiRequest$ = null;
        }, 1000);
        
        return price;
      }),
      shareReplay(1) // Share the response with all subscribers
    );
    
    return this.apiRequest$;
  }

  getTimestampFromDate(date: Date): number {
    return date.getTime();
  }
  
  /**
   * Get the remaining time in seconds until the cache expires
   * @returns The number of seconds until cache expiry, or 0 if cache is expired/empty
   */
  getCacheExpiryTime(): number {
    if (!this.cachedBitcoinPrice) {
      return 0;
    }
    
    const expiresAt = this.cachedBitcoinPrice.timestamp + this.cacheExpiryMs;
    const now = Date.now();
    
    if (expiresAt <= now) {
      return 0;
    }
    
    return Math.round((expiresAt - now) / 1000);
  }
  
  /**
   * Clear the cached Bitcoin price, forcing the next call to fetch fresh data
   */
  clearCache(): void {
    this.cachedBitcoinPrice = null;
    this.apiRequest$ = null;
  }
}
