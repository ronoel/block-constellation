import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/services/wallet.service';

// Interfaces
interface Constellation {
  id: number;
  name: string;
  meaning: string;
  totalStaked: number;
  yourStake: number;
  yourShare: number;
}

interface UserAllocation {
  totalStaked: number;
  constellationCount: number;
  allocations: { constellation: string; amount: number }[];
}

@Component({
  selector: 'app-game-current',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './game-current.component.html',
  styleUrl: './game-current.component.scss'
})
export class GameCurrentComponent implements OnInit, OnDestroy {
  // Wallet state
  walletConnected = false;
  feeBalance = 15000;
  
  // Epoch data
  currentEpoch = 42;
  blocksRemaining = 97;
  totalBlocks = 144;
  estimatedTimeRemaining = '≈ 16h 10m';
  totalStakedPool = 2.31875;
  
  // UI states
  isDrawerOpen = false;
  selectedConstellation: Constellation | null = null;
  stakeAmount = 1000;
  showAllocationSummary = false;
  loadingPage = false;
  showNetworkMismatch = false;
  
  // Mock constellation data
  constellations: Constellation[] = [
    { id: 1, name: 'Aries', meaning: 'Courage, initiative, beginnings', totalStaked: 0.12345, yourStake: 0, yourShare: 0 },
    { id: 2, name: 'Taurus', meaning: 'Stability, sensuality, material grounding', totalStaked: 0.07865, yourStake: 5000, yourShare: 0.635 },
    { id: 3, name: 'Gemini', meaning: 'Curiosity, communication, adaptability', totalStaked: 0.10524, yourStake: 0, yourShare: 0 },
    { id: 4, name: 'Cancer', meaning: 'Intuition, emotional depth, home', totalStaked: 0.05632, yourStake: 0, yourShare: 0 },
    { id: 5, name: 'Leo', meaning: 'Confidence, leadership, creative power', totalStaked: 0.13751, yourStake: 0, yourShare: 0 },
    { id: 6, name: 'Virgo', meaning: 'Precision, service, analysis', totalStaked: 0.04321, yourStake: 0, yourShare: 0 },
    { id: 7, name: 'Libra', meaning: 'Harmony, balance, relationships', totalStaked: 0.09876, yourStake: 0, yourShare: 0 },
    { id: 8, name: 'Scorpio', meaning: 'Transformation, intensity, mystery', totalStaked: 0.17654, yourStake: 8000, yourShare: 0.453 },
    { id: 9, name: 'Sagittarius', meaning: 'Freedom, truth, expansion', totalStaked: 0.06789, yourStake: 0, yourShare: 0 },
    { id: 10, name: 'Capricorn', meaning: 'Ambition, discipline, mastery', totalStaked: 0.08765, yourStake: 0, yourShare: 0 },
    { id: 11, name: 'Aquarius', meaning: 'Innovation, rebellion, community', totalStaked: 0.12398, yourStake: 0, yourShare: 0 },
    { id: 12, name: 'Pisces', meaning: 'Compassion, dreams, spirituality', totalStaked: 0.11357, yourStake: 0, yourShare: 0 },
    { id: 13, name: 'Ophiuchus', meaning: 'Healing, knowledge, the mystical 13th sign', totalStaked: 0.09854, yourStake: 0, yourShare: 0 },
    { id: 14, name: 'Orion', meaning: 'The hunter, purpose, power of pursuit', totalStaked: 0.21987, yourStake: 0, yourShare: 0 },
    { id: 15, name: 'Andromeda', meaning: 'Grace, sacrifice, destiny', totalStaked: 0.08743, yourStake: 0, yourShare: 0 },
    { id: 16, name: 'Pegasus', meaning: 'Spiritual freedom, transcendence', totalStaked: 0.07651, yourStake: 0, yourShare: 0 },
    { id: 17, name: 'Cassiopeia', meaning: 'Beauty, pride, divine consequence', totalStaked: 0.10298, yourStake: 0, yourShare: 0 },
    { id: 18, name: 'Phoenix', meaning: 'Rebirth, transformation, rising from ashes', totalStaked: 0.16543, yourStake: 0, yourShare: 0 },
    { id: 19, name: 'Cygnus', meaning: 'Peace, purity, inner awakening', totalStaked: 0.06549, yourStake: 0, yourShare: 0 },
    { id: 20, name: 'Lyra', meaning: 'Harmony, resonance, cosmic music', totalStaked: 0.08761, yourStake: 0, yourShare: 0 },
    { id: 21, name: 'Draco', meaning: 'Shadow work, ancient wisdom', totalStaked: 0.11879, yourStake: 0, yourShare: 0 },
    { id: 22, name: 'Hydra', meaning: 'Challenges, perseverance, growth through struggle', totalStaked: 0.09871, yourStake: 0, yourShare: 0 },
    { id: 23, name: 'Crux', meaning: 'Faith, sacrifice, divine guidance', totalStaked: 0.07654, yourStake: 2000, yourShare: 0.261 },
    { id: 24, name: 'Corona Borealis', meaning: 'Royal power, sovereignty, sacred feminine', totalStaked: 0.09912, yourStake: 0, yourShare: 0 },
    { id: 25, name: 'Delphinus', meaning: 'Joy, intuition, spiritual guidance', totalStaked: 0.05643, yourStake: 0, yourShare: 0 }
  ];
  
  // User allocation summary
  userAllocation: UserAllocation = {
    totalStaked: 15000,
    constellationCount: 3,
    allocations: [
      { constellation: 'Taurus', amount: 5000 },
      { constellation: 'Scorpio', amount: 8000 },
      { constellation: 'Crux', amount: 2000 }
    ]
  };
  
  public walletService = inject(WalletService);

  ngOnInit(): void {
    // Initialize component data
    this.loadingPage = true;
    
    // Simulate loading time
    setTimeout(() => {
      this.loadingPage = false;
      this.walletConnected = this.walletService.isLoggedIn();
    }, 1000);
  }

  ngOnDestroy(): void {
    // Cleanup if necessary
  }

  toggleAllocationSummary(): void {
    this.showAllocationSummary = !this.showAllocationSummary;
  }

  closeStakeDrawer(): void {
    this.isDrawerOpen = false;
    setTimeout(() => {
      this.selectedConstellation = null;
    }, 300);
  }

  selectConstellation(constellation: Constellation): void {
    this.selectedConstellation = constellation;
    this.isDrawerOpen = true;
  }

  confirmStake(): void {
    if (this.selectedConstellation && this.stakeAmount >= 1000 && this.stakeAmount <= this.feeBalance) {
      // Logic to stake on the selected constellation would go here
      console.log(`Staking ${this.stakeAmount} sats on ${this.selectedConstellation.name}`);
      this.closeStakeDrawer();
    }
  }

  increaseStakeAmount(factor: number): void {
    // Multiply the current stake amount by the factor
    const newAmount = this.stakeAmount * factor;
    
    // Ensure the amount doesn't exceed the user's balance
    if (newAmount <= this.feeBalance) {
      this.stakeAmount = newAmount;
    } else {
      this.stakeAmount = this.feeBalance;
    }
  }

  setMaxStake(): void {
    this.stakeAmount = this.feeBalance;
  }

  formatSats(sats: number): string {
    return sats.toLocaleString();
  }

  formatBTC(btc: number): string {
    return btc.toFixed(8);
  }
}
