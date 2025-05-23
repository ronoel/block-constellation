import { Injectable, inject, signal } from '@angular/core';
import { TransactionInfoService } from '../../libs/components/transaction-info/transaction-info.service';
import { BehaviorSubject, Observable, catchError, forkJoin, of, timer } from 'rxjs';

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
  // Signal for the pending transactions only
  private readonly pendingTransactionsSignal = signal<AllocationTransaction[]>([]);
  
  // Signal for all transaction notifications (pending and finished)
  private readonly notificationsSignal = signal<TransactionNotification[]>([]);
  
  // Signal to control notification visibility when drawer is open on mobile
  public readonly showNotifications = signal<boolean>(true);
  
  // Subject for transaction status changes
  private transactionStatusChanged = new BehaviorSubject<TransactionNotification[]>([]);
  
  // Interval to check transaction status (in milliseconds)
  private readonly TRANSACTION_CHECK_INTERVAL = 5000;
  
  // Local storage key for pending transactions
  private readonly STORAGE_KEY = 'block-constellation-pending';
  
  // Inject the transaction info service
  private transactionInfoService = inject(TransactionInfoService);
  
  constructor() {
    // Load transactions from local storage
    this.loadFromStorage();
    
    // Set up the timer to check transaction statuses every 5 seconds
    this.setupStatusCheckTimer();
  }

  /**
   * Add a new allocation transaction to track
   * @param txid The transaction ID
   * @param amount The amount allocated (in sats)
   * @param constellation The constellation ID (0-23)
   */
  addAllocationTransaction(txid: string, amount: number, constellation: number): void {
    const timestamp = Date.now();
    
    // Create new pending transaction
    const newTransaction: AllocationTransaction = {
      txid,
      amount,
      constellation,
      status: 'pending',
      timestamp
    };
    
    // Create notification for the new transaction
    const notification: TransactionNotification = {
      txid,
      oldStatus: '',
      newStatus: 'pending',
      amount,
      constellation,
      timestamp
    };
    
    // Add to pending transactions
    const currentTransactions = this.pendingTransactionsSignal();
    this.pendingTransactionsSignal.set([...currentTransactions, newTransaction]);
    
    // Add to notifications - ensuring there's only one notification per txid
    const currentNotifications = this.notificationsSignal();
    // Filter out any existing notification with the same txid
    const filteredNotifications = currentNotifications.filter(n => n.txid !== txid);
    this.notificationsSignal.set([...filteredNotifications, notification]);
    
    // Save to local storage
    this.savePendingToStorage();
  }
  
  /**
   * Returns an Observable that emits when transactions change status from pending
   * @returns Observable of TransactionNotification arrays
   */
  getTransactionStatusChanges(): Observable<TransactionNotification[]> {
    return this.transactionStatusChanged.asObservable();
  }
  
  /**
   * Sets notification visibility
   * Used to hide notifications when drawer is open on mobile
   */
  setNotificationsVisibility(show: boolean): void {
    this.showNotifications.set(show);
  }
  
  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notificationsSignal.set([]);
  }
  
  /**
   * Dismiss a specific notification by txid
   * @param txid The transaction ID to dismiss
   */
  dismissNotification(txid: string): void {
    const currentNotifications = this.notificationsSignal();
    const updatedNotifications = currentNotifications.filter(n => n.txid !== txid);
    this.notificationsSignal.set(updatedNotifications);
  }
  
  /**
   * Get all notifications (pending and finished transactions)
   * @returns Array of TransactionNotification
   */
  getNotificationsSignal(): TransactionNotification[] {
    return this.notificationsSignal();
  }

  getPendingTransactionsSignal(): AllocationTransaction[] {
    return this.pendingTransactionsSignal();
  }
  
  /**
   * Save pending transactions to local storage
   */
  private savePendingToStorage(): void {
    const pendingTransactions = this.pendingTransactionsSignal();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pendingTransactions));
  }
  
  /**
   * Load pending transactions from local storage
   */
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const transactions = JSON.parse(storedData) as AllocationTransaction[];
        this.pendingTransactionsSignal.set(transactions);
        
        // Create notifications for pending transactions loaded from storage
        const notifications: TransactionNotification[] = transactions.map(tx => ({
          txid: tx.txid,
          oldStatus: '',
          newStatus: tx.status,
          amount: tx.amount,
          constellation: tx.constellation,
          timestamp: tx.timestamp
        }));
        
        this.notificationsSignal.set(notifications);
      }
    } catch (error) {
      console.error('Error loading data from local storage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      this.pendingTransactionsSignal.set([]);
      this.notificationsSignal.set([]);
    }
  }
  
  /**
   * Set up a timer to check transaction statuses at regular intervals
   */
  private setupStatusCheckTimer(): void {
    timer(5000, this.TRANSACTION_CHECK_INTERVAL).subscribe(() => {
      const pendingTransactions = this.pendingTransactionsSignal();
      if (pendingTransactions.length > 0) {
        this.checkPendingTransactionsStatus(pendingTransactions);
      }
    });
  }
  
  /**
   * Check the status of pending transactions
   * @param pendingTransactions The pending transactions to check
   */
  private checkPendingTransactionsStatus(pendingTransactions: AllocationTransaction[]): void {
    const statusChecks = pendingTransactions.map(tx => 
      this.transactionInfoService.fetchTransactionStatus(tx.txid).pipe(
        catchError(error => {
          console.error(`Error checking status for transaction ${tx.txid}:`, error);
          return of({ status: tx.status as any });
        })
      )
    );
    
    forkJoin(statusChecks).subscribe(results => {
      let stillPendingTransactions: AllocationTransaction[] = [];
      const newNotifications: TransactionNotification[] = [];
      const txidsToUpdate: string[] = [];
      
      pendingTransactions.forEach((tx, index) => {
        if (results[index]) {
          const newStatus = results[index].status;
          
          // If status has changed from pending to something else
          if (newStatus !== 'pending' && tx.status === 'pending') {
            newNotifications.push({
              txid: tx.txid,
              oldStatus: tx.status,
              newStatus: newStatus,
              amount: tx.amount,
              constellation: tx.constellation,
              timestamp: Date.now()
            });
            // Keep track of which txids are getting updated
            txidsToUpdate.push(tx.txid);
          } else if (newStatus === 'pending') {
            // Keep in pending transactions list
            stillPendingTransactions.push(tx);
          }
        } else {
          // If status check failed, keep in pending
          stillPendingTransactions.push(tx);
        }
      });
      
      // Update pending transactions signal
      this.pendingTransactionsSignal.set(stillPendingTransactions);
      
      // Update notifications and emit changes
      if (newNotifications.length > 0) {
        const currentNotifications = this.notificationsSignal();
        
        // Remove old notifications for the transactions that are being updated
        const filteredNotifications = currentNotifications.filter(n => !txidsToUpdate.includes(n.txid));
        
        // Add the new notifications
        const updatedNotifications = [...filteredNotifications, ...newNotifications];
        this.notificationsSignal.set(updatedNotifications);
        this.transactionStatusChanged.next(newNotifications);
      }
      
      // Save pending transactions to storage
      this.savePendingToStorage();
    });
  }
}
