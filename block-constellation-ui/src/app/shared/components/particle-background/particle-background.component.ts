import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-particle-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './particle-background.component.html',
  styleUrl: './particle-background.component.scss'
})
export class ParticleBackgroundComponent implements AfterViewInit, OnDestroy {
  private readonly particleCount: number = 50;
  private readonly containerId: string = 'particle-container';
  private readonly colorScheme: string[] = [
    '#F7931A', // Primary Bitcoin orange
    '#F2C84B', // Secondary gold/star color
    '#FFFFFF', // White stars
    '#B0B8C1'  // Dim stars
  ];
  private readonly colorDistribution: number[] = [0.1, 0.15, 0.5, 0.25];

  private animationFrameId: number | null = null;
  private particles: Particle[] = [];
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private elementRef: ElementRef
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize starfield particle animation
      this.initializeParticles();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    // Remove event listeners to prevent memory leaks
    window.removeEventListener('resize', this.resizeCanvas);
  }

  private resizeCanvas = () => {
    const canvas = this.elementRef.nativeElement.querySelector('canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  };

  private initializeParticles(): void {
    const canvas = document.createElement('canvas');
    const container = document.getElementById(this.containerId);
    
    if (!container) return;
    
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    
    // Create particles
    this.createParticles(this.particleCount);
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, 
        canvas.height / 2, 
        0, 
        canvas.width / 2, 
        canvas.height / 2, 
        canvas.width / 2
      );
      gradient.addColorStop(0, '#111823');
      gradient.addColorStop(1, '#0D1117');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      this.updateAndDrawParticles(ctx, canvas.width, canvas.height);
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  private createParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: this.getRandomColor(),
        twinkleSpeed: Math.random() * 0.03 + 0.005,
        twinkleDirection: Math.random() > 0.5 ? 1 : -1,
        opacity: Math.random()
      });
    }
  }
  
  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    for (const particle of this.particles) {
      // Update position
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Update twinkling
      particle.opacity += particle.twinkleSpeed * particle.twinkleDirection;
      
      if (particle.opacity >= 1 || particle.opacity <= 0.2) {
        particle.twinkleDirection *= -1;
      }
      
      // Wrap around edges
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.fill();
      
      // Reset global alpha
      ctx.globalAlpha = 1;
    }
  }
  
  private getRandomColor(): string {
    // Make white and dim stars more common for background
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < this.colorDistribution.length; i++) {
      cumulativeProbability += this.colorDistribution[i];
      if (randomValue <= cumulativeProbability) {
        return this.colorScheme[i];
      }
    }
    
    return this.colorScheme[0]; // Fallback
  }
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  opacity: number;
  twinkleSpeed: number;
  twinkleDirection: number;
}
