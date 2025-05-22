import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ParticleBackgroundComponent } from '../../shared/components/particle-background/particle-background.component';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ParticleBackgroundComponent,
    SiteFooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  // Bitcoin image from environment 
  btcImage = environment.supportedAsset.sBTC.image;
}
