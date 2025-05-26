import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-game-onboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './game-onboard.component.html',
  styleUrl: './game-onboard.component.scss'
})
export class GameOnboardComponent {
  @Output() closeOnboarding = new EventEmitter<void>();
  
  // Method to close the onboarding overlay
  startPlaying(): void {
    this.closeOnboarding.emit();
  }
}
