import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';


@Component({
  selector: 'app-home',
  imports: [
    // RouterOutlet,
    CommonModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  constructor(
  ) {
  }

}
