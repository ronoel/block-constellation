import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-particle-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './particle-background.component.html',
  styleUrl: './particle-background.component.scss'
})
export class ParticleBackgroundComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() density: 'low' | 'medium' | 'high' = 'medium'; // Controls particle count
  @Input() animate = true; // Whether particles should move or stay static
  @Input() transparent = false; // Whether to use transparent background

  private readonly densityMap = {
    low: 30,
    medium: 50,
    high: 80
  };
  private get particleCount(): number {
    return this.densityMap[this.density];
  }
  
  public readonly containerId: string = `particle-container-${Math.random().toString(36).substring(2, 9)}`;
  private readonly colorScheme: string[] = [
    '#F7931A', // Primary Bitcoin orange
    '#F2C84B', // Secondary gold/star color
    '#FFFFFF', // White stars
    '#B0B8C1'  // Dim stars
  ];
  private readonly colorDistribution: number[] = [0.1, 0.15, 0.5, 0.25];

  private animationFrameId: number | null = null;
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isInitialized = false;
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private elementRef: ElementRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // If already initialized and settings change, reset
    if (this.isInitialized && 
        (changes['density'] || changes['animate'] || changes['transparent'])) {
      this.reset();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize starfield particle animation
      console.log(`Initializing particles for container: ${this.containerId}`);
      
      // Small delay to ensure the DOM is ready
      setTimeout(() => {
        this.initializeParticles();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.animationFrameId) {
      const cancelAnimationFrame = this.getCancelAnimationFrame();
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Remove event listeners to prevent memory leaks
    window.removeEventListener('resize', this.resizeCanvas);
  }

  private reset(): void {
    this.cleanup();
    this.particles = [];
    this.isInitialized = false;
    this.initializeParticles();
  }

  private resizeCanvas = () => {
    if (!this.canvas) return;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  // Detect if we should reduce particle count for performance
  private shouldReduceParticles(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    
    // Check for mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Check for low-end devices based on screen size
    const isSmallScreen = window.innerWidth < 768;
    
    return isMobile || prefersReducedMotion || isSmallScreen;
  }

  // Polyfill not needed in modern browsers, but keeping for compatibility
  private getAnimationFrame(): (callback: FrameRequestCallback) => number {
    return window.requestAnimationFrame ||
           function(callback: FrameRequestCallback): number {
             return window.setTimeout(callback, 1000 / 60);
           };
  }
  
  private getCancelAnimationFrame(): (handle: number) => void {
    return window.cancelAnimationFrame ||
           function(handle: number): void {
             window.clearTimeout(handle);
           };
  }

  private initializeParticles(): void {
    try {
      // Create canvas and get container
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      
      // Find container element
      const container = document.getElementById(this.containerId);
      if (!container) {
        console.warn(`Container with ID "${this.containerId}" not found`);
        const el = this.elementRef.nativeElement;
        if (el) {
          el.appendChild(this.canvas);
          el.classList.add('canvas-active'); // Add class to hide CSS fallback stars
          console.log('Added canvas to element directly');
        } else {
          return;
        }
      } else {
        // Add canvas to container
        container.innerHTML = '';
        container.appendChild(this.canvas);
        container.classList.add('canvas-active'); // Add class to hide CSS fallback stars
      }
      
      // Get canvas context
      this.ctx = this.canvas.getContext('2d', { alpha: this.transparent });
      if (!this.ctx) {
        console.warn('Could not get 2D context');
        return;
      }
      
      // Set up resize handler
      this.resizeCanvas();
      window.addEventListener('resize', this.resizeCanvas);
      
      // Adjust for mobile devices
      let actualParticleCount = this.particleCount;
      if (this.shouldReduceParticles()) {
        actualParticleCount = Math.max(20, Math.floor(this.particleCount * 0.6));
      }
      
      // Create particles
      this.createParticles(actualParticleCount);
      
      // Mark as initialized
      this.isInitialized = true;
      
      // Animation loop
      const animate = () => {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.transparent) {
          // Background gradient
          const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, 
            this.canvas.height / 2, 
            0, 
            this.canvas.width / 2, 
            this.canvas.height / 2, 
            this.canvas.width / 2
          );
          gradient.addColorStop(0, '#111823');
          gradient.addColorStop(1, '#0D1117');
          
          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Update and draw particles
        this.updateAndDrawParticles(this.ctx, this.canvas.width, this.canvas.height);
        
        // Use our helper method for better compatibility
        const requestAnimationFrame = this.getAnimationFrame();
        this.animationFrameId = requestAnimationFrame(animate);
      };
      
      // Start the animation loop
      const requestAnimationFrame = this.getAnimationFrame();
      this.animationFrameId = requestAnimationFrame(animate);
    } catch (error) {
      console.error('Error initializing particles:', error);
    }
  }
  
  private createParticles(count: number): void {
    // Clear any existing particles
    this.particles = [];
    
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
      // Update position (only if animation is enabled)
      if (this.animate) {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;
      }
      
      // Update twinkling
      particle.opacity += particle.twinkleSpeed * particle.twinkleDirection;
      
      if (particle.opacity >= 1 || particle.opacity <= 0.2) {
        particle.twinkleDirection *= -1;
      }
      
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
