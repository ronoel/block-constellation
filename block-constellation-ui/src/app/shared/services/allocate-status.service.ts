import { Injectable, inject, signal } from '@angular/core';
import { TransactionInfoService } from '../../libs/components/transaction-info/transaction-info.service';
import { BehaviorSubject, Observable, catchError, forkJoin, from, of, timer } from 'rxjs';

// Interface to represent an allocation transaction
export interface AllocationTransaction {
  txid: string;
  amount: number;
  constellation: number;
  status: 'pending' | 'success' | 'abort_by_post_condition' | 'abort_by_response';
  timestamp: number;
}

// Interface for transaction update notifications
export interface TransactionNotification {
  txid: string;
  oldStatus: string;
  newStatus: string;
  amount: number;
  constellation: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AllocateStatusService {
  // Signal for the allocation transactions
  public readonly allocationsSignal = signal<AllocationTransaction[]>([]);
  
  // Signal for notifications about transaction status changes
  public readonly notificationsSignal = signal<TransactionNotification[]>([]);
  
  // Interval to check transaction status (in milliseconds)
  private readonly TRANSACTION_CHECK_INTERVAL = 5000;
  
  // Maximum age for completed transactions before removal (in milliseconds)
  private readonly COMPLETED_TRANSACTION_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
  
  // Local storage keys
  private readonly STORAGE_KEY = 'block-constellation-allocations';
  private readonly NOTIFICATION_KEY = 'block-constellation-notifications';
  
  // Inject the transaction info service
  private transactionInfoService = inject(TransactionInfoService);
  
  // BehaviorSubject to track when we should check transaction statuses
  private checkTransactionsSubject = new BehaviorSubject<boolean>(true);
  
  constructor() {
    // Load transactions and notifications from local storage when the service is initialized
    this.loadFromStorage();
    
    // Set up the timer to check transaction statuses at regular intervals
    this.setupStatusCheckTimer();
  }

  /**
   * Add a new allocation transaction to track
   * @param txid The transaction ID
   * @param amount The amount allocated (in sats)
   * @param constellation The constellation ID (0-23)
   */
  addAllocationTransaction(txid: string, amount: number, constellation: number): void {
    const newTransaction: AllocationTransaction = {
      txid,
      amount,
      constellation,
      status: 'pending',
      timestamp: Date.now()
    };
    
    // Get current transactions
    const currentTransactions = this.allocationsSignal();
    
    // Add the new transaction
    const updatedTransactions = [...currentTransactions, newTransaction];
    
    // Update the signal
    this.allocationsSignal.set(updatedTransactions);
    
    // Save to local storage
    this.saveTransactionsToStorage(updatedTransactions);
    
    // Trigger a check for transaction statuses
    this.checkTransactionsSubject.next(true);
  }
  
  /**
   * Save transactions to local storage
   * @param transactions The transactions to save
   */
  private saveTransactionsToStorage(transactions: AllocationTransaction[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
  }
  
  /**
   * Save notifications to local storage
   * @param notifications The notifications to save
   */
  private saveNotificationsToStorage(notifications: TransactionNotification[]): void {
    localStorage.setItem(this.NOTIFICATION_KEY, JSON.stringify(notifications));
  }
  
  /**
   * Load transactions and notifications from local storage
   */
  private loadFromStorage(): void {
    try {
      // Load transactions
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const transactions = JSON.parse(storedData) as AllocationTransaction[];
        this.allocationsSignal.set(transactions);
      }
      
      // Load notifications
      const storedNotifications = localStorage.getItem(this.NOTIFICATION_KEY);
      if (storedNotifications) {
        const notifications = JSON.parse(storedNotifications) as TransactionNotification[];
        this.notificationsSignal.set(notifications);
      }
    } catch (error) {
      console.error('Error loading data from local storage:', error);
      // If there's an error, clear the storage to prevent future errors
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.NOTIFICATION_KEY);
      this.allocationsSignal.set([]);
      this.notificationsSignal.set([]);
    }
  }
  
  /**
   * Set up a timer to check transaction statuses at regular intervals
   */
  private setupStatusCheckTimer(): void {
    // Check for pending transactions every TRANSACTION_CHECK_INTERVAL milliseconds
    timer(0, this.TRANSACTION_CHECK_INTERVAL).subscribe(() => {
      const allTransactions = this.allocationsSignal();
      const pendingTransactions = allTransactions.filter(tx => tx.status === 'pending');
      
      if (pendingTransactions.length > 0) {
        this.checkPendingTransactionsStatus(pendingTransactions);
      }
      
      // Clean up old completed transactions
      this.cleanupOldTransactions(allTransactions);
    });
  }
  
  /**
   * Check the status of pending transactions
   * @param pendingTransactions The pending transactions to check
   */
  private checkPendingTransactionsStatus(pendingTransactions: AllocationTransaction[]): void {
    // Create an array of observables for checking each transaction
    const statusChecks = pendingTransactions.map(tx => 
      this.transactionInfoService.fetchTransactionStatus(tx.txid).pipe(
        catchError(error => {
          console.error(`Error checking status for transaction ${tx.txid}:`, error);
          return of({ status: tx.status as any });
        })
      )
    );
    
    // Execute all status checks in parallel
    forkJoin(statusChecks).subscribe(results => {
      let hasChanges = false;
      const newNotifications: TransactionNotification[] = [];
      
      // Get current transactions
      const currentTransactions = this.allocationsSignal();
      
      // Update transaction statuses
      const updatedTransactions = currentTransactions.map((tx, index) => {
        // Only check status for transactions that were in our pending array
        const pendingIndex = pendingTransactions.findIndex(p => p.txid === tx.txid);
        
        if (pendingIndex !== -1 && results[pendingIndex]) {
          const newStatus = results[pendingIndex].status;
          
          // If status has changed, create a notification
          if (newStatus !== tx.status) {
            hasChanges = true;
            
            // Create notification for status change
            newNotifications.push({
              txid: tx.txid,
              oldStatus: tx.status,
              newStatus: newStatus,
              amount: tx.amount,
              constellation: tx.constellation,
              timestamp: Date.now()
            });
            
            // Return updated transaction
            return { ...tx, status: newStatus };
          }
        }
        
        // No change for this transaction
        return tx;
      });
      
      // If there were changes
      if (hasChanges) {
        // Update the signal with all transactions (both pending and completed)
        this.allocationsSignal.set(updatedTransactions);
        
        // Save to local storage
        this.saveTransactionsToStorage(updatedTransactions);
        
        // Add new notifications
        if (newNotifications.length > 0) {
          const currentNotifications = this.notificationsSignal();
          const allNotifications = [...currentNotifications, ...newNotifications];
          this.notificationsSignal.set(allNotifications);
          this.saveNotificationsToStorage(allNotifications);
        }
      }
    });
  }
  
  /**
   * Clean up completed transactions that are older than the max age
   * @param transactions All current transactions
   */
  private cleanupOldTransactions(transactions: AllocationTransaction[]): void {
    const now = Date.now();
    const filteredTransactions = transactions.filter(tx => {
      // Keep all pending transactions
      if (tx.status === 'pending') return true;
      
      // Keep completed transactions that are not too old
      return (now - tx.timestamp) < this.COMPLETED_TRANSACTION_MAX_AGE;
    });
    
    // If we filtered out any transactions, update storage
    if (filteredTransactions.length !== transactions.length) {
      this.allocationsSignal.set(filteredTransactions);
      this.saveTransactionsToStorage(filteredTransactions);
    }
  }
  
  /**
   * Get a specific transaction by txid
   * @param txid The transaction ID to find
   * @returns The transaction or undefined if not found
   */
  getTransaction(txid: string): AllocationTransaction | undefined {
    return this.allocationsSignal().find(tx => tx.txid === txid);
  }
  
  /**
   * Get all pending transactions
   * @returns Array of pending transactions
   */
  getPendingTransactions(): AllocationTransaction[] {
    return this.allocationsSignal().filter(tx => tx.status === 'pending');
  }
  
  /**
   * Get transactions by status
   * @param status The status to filter by
   * @returns Array of transactions with the specified status
   */
  getTransactionsByStatus(status: 'pending' | 'success' | 'abort_by_post_condition' | 'abort_by_response'): AllocationTransaction[] {
    return this.allocationsSignal().filter(tx => tx.status === status);
  }
  
  /**
   * Get completed transactions (both successful and failed)
   * @returns Array of completed transactions
   */
  getCompletedTransactions(): AllocationTransaction[] {
    return this.allocationsSignal().filter(tx => tx.status !== 'pending');
  }
  
  /**
   * Get notifications with optional limit
   * @param limit Maximum number of notifications to return
   * @returns Array of notifications, sorted by timestamp (newest first)
   */
  getNotifications(limit?: number): TransactionNotification[] {
    const notifications = this.notificationsSignal();
    // Sort by timestamp, newest first
    const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? sorted.slice(0, limit) : sorted;
  }
  
  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notificationsSignal.set([]);
    this.saveNotificationsToStorage([]);
  }
  
  /**
   * Dismiss a specific notification
   * @param txid The transaction ID of the notification to dismiss
   */
  dismissNotification(txid: string): void {
    const currentNotifications = this.notificationsSignal();
    const updatedNotifications = currentNotifications.filter(n => n.txid !== txid);
    
    if (updatedNotifications.length !== currentNotifications.length) {
      this.notificationsSignal.set(updatedNotifications);
      this.saveNotificationsToStorage(updatedNotifications);
    }
  }
}
