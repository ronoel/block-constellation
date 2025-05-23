import { Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AllocateStatusService, TransactionNotification } from '../../services/allocate-status.service';

@Component({
  selector: 'app-transaction-notifications',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './transaction-notifications.component.html',
  styleUrls: ['./transaction-notifications.component.scss']
})
export class TransactionNotificationsComponent implements OnInit {
  // Inject the allocation status service
  private allocateStatusService = inject(AllocateStatusService);
  
  // Get the constellations map for displaying names
  private constellationsMap: Map<number, string> = new Map();
  
  // Maximum number of notifications to display
  private readonly maxNotifications = 5;

  private notificationsSignal: TransactionNotification[] = [];
  
  // Flag to determine if notification panel is expanded
  expanded = false;

  constructor() {
    // Initialize constellation map - this would ideally come from a service
    // but for now we'll hardcode the names
    const constellationNames = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Ophiuchus', 'Orion',
      'Andromeda', 'Pegasus', 'Cassiopeia', 'Phoenix', 'Cygnus', 'Lyra',
      'Draco', 'Hydra', 'Crux', 'Corona Borealis'
    ];
    
    for (let i = 0; i < constellationNames.length; i++) {
      this.constellationsMap.set(i, constellationNames[i]);
    }

    effect(() => {
      // Subscribe to notifications signal from the service
      this.notificationsSignal = this.allocateStatusService.notificationsSignal();
    });
  }
  
  // Getter for notifications
  get notifications(): TransactionNotification[] {
    // return this.allocateStatusService.getNotifications(this.expanded ? undefined : this.maxNotifications);
    return this.notificationsSignal.slice(0, this.expanded ? undefined : this.maxNotifications);
  }
  
  // Getter for notification count
  get notificationCount(): number {
    return this.notificationsSignal.length;
  }
  
  ngOnInit(): void {
    
  }
  
  // Get constellation name by ID
  getConstellationName(id: number): string {
    return this.constellationsMap.get(id) || `Constellation ${id}`;
  }
  
  // Format transaction status for display
  formatStatus(status: string): string {
    switch (status) {
      case 'success': return 'Successful';
      case 'pending': return 'Pending';
      case 'abort_by_post_condition': return 'Failed (Post Condition)';
      case 'abort_by_response': return 'Failed (Response)';
      default: return status;
    }
  }
  
  // Format the amount in sats
  formatSats(amount: number): string {
    return amount.toLocaleString();
  }
  
  // Get status class for styling
  getStatusClass(status: string): string {
    switch (status) {
      case 'success': return 'success';
      case 'pending': return 'pending';
      case 'abort_by_post_condition':
      case 'abort_by_response': return 'error';
      default: return '';
    }
  }
  
  // Get icon for notification based on status
  getStatusIcon(status: string): string {
    switch (status) {
      case 'success': return 'check_circle';
      case 'pending': return 'hourglass_empty';
      case 'abort_by_post_condition':
      case 'abort_by_response': return 'error';
      default: return 'info';
    }
  }
  
  // Toggle expanded state
  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }
  
  // Dismiss a specific notification
  dismissNotification(event: Event, txid: string): void {
    // event.stopPropagation();
    // this.allocateStatusService.dismissNotification(txid);
    event.stopPropagation();
    // Filter out the notification with the provided txid
    this.notificationsSignal = this.notificationsSignal.filter(notification => notification.txid !== txid);
  }
  
  // Clear all notifications
  clearAllNotifications(event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent the click from triggering toggleExpanded()
    }
    this.notificationsSignal = [];
    this.expanded = false;
  }
  
  // Get relative time for display
  getRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  // Method to check if notifications should be shown
  // Uses the signal from AllocateStatusService
  showNotifications(): boolean {
    return this.allocateStatusService.showNotifications();
  }
}
