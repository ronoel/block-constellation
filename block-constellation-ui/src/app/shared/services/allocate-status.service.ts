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
  
  // Signal to control notification visibility when drawer is open
  public readonly showNotifications = signal<boolean>(true);
  
  // Interval to check transaction status (in milliseconds)
  private readonly TRANSACTION_CHECK_INTERVAL = 5000;
  
  // Local storage keys
  private readonly STORAGE_KEY = 'block-constellation-allocations';
  private readonly NOTIFICATION_KEY = 'block-constellation-notifications';
  
  // Inject the transaction info service
  private transactionInfoService = inject(TransactionInfoService);
  
  constructor() {
    // Load transactions from local storage when the service is initialized
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
  }
  
  /**
   * Save transactions to local storage
   * @param transactions The transactions to save
   */
  private saveTransactionsToStorage(transactions: AllocationTransaction[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
  }
  
  /**
   * Load transactions from local storage
   */
  private loadFromStorage(): void {
    try {
      // Load transactions
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const transactions = JSON.parse(storedData) as AllocationTransaction[];
        this.allocationsSignal.set(transactions);
      }
    } catch (error) {
      console.error('Error loading data from local storage:', error);
      // If there's an error, clear the storage to prevent future errors
      localStorage.removeItem(this.STORAGE_KEY);
      this.allocationsSignal.set([]);
    }
  }
  
  /**
   * Set up a timer to check transaction statuses at regular intervals
   */
  private setupStatusCheckTimer(): void {
    // Check for pending transactions every TRANSACTION_CHECK_INTERVAL milliseconds
    timer(0, this.TRANSACTION_CHECK_INTERVAL).subscribe(() => {
      const allTransactions = this.allocationsSignal();
      const pendingTransactions = this.getPendingTransactions();
      
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
      // Get current transactions
      const currentTransactions = this.allocationsSignal();
      let updatedTransactions = [...currentTransactions];
      const notCompletedTransactions: AllocationTransaction[] = [];
      const newNotifications: TransactionNotification[] = [];
      
      // Process each transaction
      pendingTransactions.forEach((tx, index) => {
        if (results[index]) {
          const newStatus = results[index].status;
          
          // If status has changed from pending to something else
          if (newStatus !== 'pending' && tx.status === 'pending') {
            // Create notification for status change
            newNotifications.push({
              txid: tx.txid,
              oldStatus: tx.status,
              newStatus: newStatus,
              amount: tx.amount,
              constellation: tx.constellation,
              timestamp: Date.now()
            });
            
            // Update transaction status
            const transactionIndex = updatedTransactions.findIndex(t => t.txid === tx.txid);
            if (transactionIndex !== -1) {
              updatedTransactions[transactionIndex] = { 
                ...updatedTransactions[transactionIndex], 
                status: newStatus 
              };
            }
          } else if (newStatus === 'pending') {
            // Keep track of transactions that are still pending
            notCompletedTransactions.push(tx);
          }
        }
      });
      
      // Update notifications signal if we have new notifications
      if (newNotifications.length > 0) {
        const currentNotifications = this.notificationsSignal();
        this.notificationsSignal.set([...currentNotifications, ...newNotifications]);
      }
      
      // Update the allocations signal and storage - only keep pending transactions
      updatedTransactions = updatedTransactions.filter(tx => tx.status === 'pending');
      this.allocationsSignal.set(updatedTransactions);
      this.saveTransactionsToStorage(updatedTransactions);
    });
  }
  
  /**
   * Get all pending transactions
   * @returns Array of pending transactions
   */
  getPendingTransactions(): AllocationTransaction[] {
    return this.allocationsSignal().filter(tx => tx.status === 'pending');
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
   * Sets notification visibility
   * Used to hide notifications when drawer is open on mobile
   */
  public setNotificationsVisibility(show: boolean): void {
    this.showNotifications.set(show);
  }
  
  /**
   * Clear all notifications
   */
  // clearNotifications(): void {
  //   this.notificationsSignal.set([]);
  // }
}
