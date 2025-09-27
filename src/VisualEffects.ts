export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'sparkle' | 'trail' | 'explosion' | 'sleep' | 'collect';
}

export interface ComboEffect {
  x: number;
  y: number;
  combo: number;
  life: number;
}

export class VisualEffects {
  private particles: Particle[] = [];
  private comboEffects: ComboEffect[] = [];
  private screenShake: { intensity: number; duration: number } = { intensity: 0, duration: 0 };

  public addParticles(x: number, y: number, type: Particle['type'], count: number = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.5,
        y: y + (Math.random() - 0.5) * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: type === 'sleep' ? 0.3 + Math.random() * 0.2 : 0.1 + Math.random() * 0.15,
        color: this.getParticleColor(type),
        life: 1.0,
        maxLife: 1.0 + Math.random() * 0.5,
        type: type,
      });
    }
  }

  public addSleepSparkles(x: number, y: number, radius: number): void {
    const count = Math.floor(radius * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;
      
      this.particles.push({
        x: particleX,
        y: particleY,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        size: 0.15 + Math.random() * 0.1,
        color: '#88e0f7',
        life: 1.5,
        maxLife: 1.5,
        type: 'sleep',
      });
    }
  }

  public addTrailParticle(x: number, y: number): void {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.3,
      y: y + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 0.08 + Math.random() * 0.05,
      color: '#f9a4c0',
      life: 0.8,
      maxLife: 0.8,
      type: 'trail',
    });
  }

  public addComboEffect(x: number, y: number, combo: number): void {
    this.comboEffects.push({
      x: x,
      y: y,
      combo: combo,
      life: 2.0,
    });
  }

  public addScreenShake(intensity: number, duration: number): void {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    this.screenShake.duration = Math.max(this.screenShake.duration, duration);
  }

  public update(dt: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      
      // Apply some gravity to certain particle types
      if (particle.type === 'explosion' || particle.type === 'collect') {
        particle.vy -= 5 * dt;
      }
      
      // Fade out particles as they age
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update combo effects
    for (let i = this.comboEffects.length - 1; i >= 0; i--) {
      const effect = this.comboEffects[i];
      effect.life -= dt;
      effect.y -= dt * 2; // Float upward
      
      if (effect.life <= 0) {
        this.comboEffects.splice(i, 1);
      }
    }

    // Update screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= dt;
      if (this.screenShake.duration <= 0) {
        this.screenShake.intensity = 0;
      }
    }
  }

  public getParticles(): readonly Particle[] {
    return this.particles;
  }

  public getComboEffects(): readonly ComboEffect[] {
    return this.comboEffects;
  }

  public getScreenShake(): { x: number; y: number } {
    if (this.screenShake.intensity <= 0) {
      return { x: 0, y: 0 };
    }
    
    return {
      x: (Math.random() - 0.5) * this.screenShake.intensity,
      y: (Math.random() - 0.5) * this.screenShake.intensity,
    };
  }

  public clear(): void {
    this.particles.length = 0;
    this.comboEffects.length = 0;
    this.screenShake.intensity = 0;
    this.screenShake.duration = 0;
  }

  private getParticleColor(type: Particle['type']): string {
    switch (type) {
      case 'sparkle':
        return '#f9a4c0';
      case 'trail':
        return '#ff8ba7';
      case 'explosion':
        return '#ffc3a0';
      case 'sleep':
        return '#88e0f7';
      case 'collect':
        return '#88e0f7';
      default:
        return '#f9a4c0';
    }
  }
}