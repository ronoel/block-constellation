import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/wallet.service';
import { BlockConstellationContractService, ReferralReward } from '../../../libs/block-constellation-contract.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game-refer-friend',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './game-refer-friend.component.html',
  styleUrl: './game-refer-friend.component.scss'
})
export class GameReferFriendComponent implements OnInit, OnDestroy {
  // Service injections
  private walletService = inject(WalletService);
  private blockConstellationContractService = inject(BlockConstellationContractService);
  
  // Component state
  walletConnected = false;
  walletAddress = '';
  referralLink = '';
  isCopied = false;
  isLoading = true;
  hasReferralReward = false;
  referralReward: ReferralReward | null = null;
  isClaimingReward = false;
  statusMessage = '';
  statusType = ''; // 'success', 'error', 'info'
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  ngOnInit(): void {
    // Check if wallet is connected
    this.walletConnected = this.walletService.isLoggedIn();
    
    if (this.walletConnected) {
      this.walletAddress = this.walletService.getSTXAddress();
      this.generateReferralLink();
      this.checkReferralReward();
    } else {
      this.isLoading = false;
      this.statusMessage = 'Please connect your wallet to generate a referral link';
      this.statusType = 'info';
    }
  }
  
  /**
   * Generate a referral link with the user's wallet address
   */
  generateReferralLink(): void {
    // Get the current URL without parameters
    const baseUrl = window.location.origin + '/play';
    this.referralLink = `${baseUrl}?ref=${this.walletAddress}`;
  }
  
  /**
   * Copy the referral link to clipboard
   */
  copyToClipboard(): void {
    navigator.clipboard.writeText(this.referralLink).then(() => {
      this.isCopied = true;
      setTimeout(() => this.isCopied = false, 3000);
    });
  }
  
  /**
   * Check if the user has any referral rewards to claim
   */
  checkReferralReward(): void {
    this.isLoading = true;
    
    const subscription = this.blockConstellationContractService
      .getReferralReward(this.walletAddress)
      .subscribe({
        next: (reward) => {
          this.referralReward = reward;
          this.hasReferralReward = reward && reward.amount > 0;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error checking referral reward:', error);
          this.statusMessage = 'Failed to check referral rewards';
          this.statusType = 'error';
          this.isLoading = false;
        }
      });
    
    this.subscriptions.push(subscription);
  }
  
  /**
   * Claim the referral reward
   */
  claimReferralReward(): void {
    if (!this.hasReferralReward || this.isClaimingReward) return;
    
    this.isClaimingReward = true;
    this.statusMessage = 'Claiming your referral reward...';
    this.statusType = 'info';
    
    const subscription = this.blockConstellationContractService
      .claimReferralReward()
      .subscribe({
        next: (response) => {
          if (response.txid) {
            this.statusMessage = 'Referral reward claimed successfully!';
            this.statusType = 'success';
            this.referralReward = { amount: 0, blockUpdate: 0 };
            this.hasReferralReward = false;
          } else if (response.error) {
            this.statusMessage = `Failed to claim reward: ${response.error}`;
            this.statusType = 'error';
          }
          this.isClaimingReward = false;
        },
        error: (error) => {
          console.error('Error claiming referral reward:', error);
          this.statusMessage = 'Failed to claim referral reward';
          this.statusType = 'error';
          this.isClaimingReward = false;
        }
      });
    
    this.subscriptions.push(subscription);
  }
  
  /**
   * Format BTC amount for display
   * @param sats Satoshi amount
   * @returns Formatted BTC amount
   */
  formatBTC(sats: number): string {
    const btc = sats / 100000000;
    return btc.toFixed(8);
  }
  
  /**
   * Format sats amount for display
   * @param sats Sats amount
   * @returns Formatted sats amount
   */
  formatSats(sats: number): string {
    return sats.toLocaleString();
  }
  
  /**
   * Clear status message after delay
   * @param delay Delay in milliseconds
   */
  clearStatusMessageAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.statusMessage = '';
      this.statusType = '';
    }, delay);
  }
  
  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
