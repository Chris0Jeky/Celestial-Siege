// Particle system for visual effects
class Particle {
    constructor(x, y, vx, vy, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.opacity = 1;
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.lifetime -= deltaTime;
        this.opacity = Math.max(0, this.lifetime / this.maxLifetime);
        this.size *= 0.98; // Shrink over time
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    // Explosion effect
    createExplosion(x, y, color = '#ff4444', count = 30, speed = 150, size = 4) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const velocity = speed * (0.5 + Math.random() * 0.5);
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            const particleSize = size * (0.5 + Math.random() * 0.5);
            this.particles.push(new Particle(x, y, vx, vy, color, particleSize, 1.0));
        }
    }
    
    // Hit sparks effect
    createHitSpark(x, y, color = '#ffff00', count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.particles.push(new Particle(x, y, vx, vy, color, 2, 0.3));
        }
    }
    
    // Engine trail effect
    createEngineTrail(x, y, direction, color = '#4488ff') {
        const vx = -Math.cos(direction) * 30 + (Math.random() - 0.5) * 20;
        const vy = -Math.sin(direction) * 30 + (Math.random() - 0.5) * 20;
        this.particles.push(new Particle(x, y, vx, vy, color, 3, 0.5));
    }
    
    // Tower firing effect
    createMuzzleFlash(x, y, direction, color = '#44ff44') {
        for (let i = 0; i < 3; i++) {
            const spread = 0.2;
            const angle = direction + (Math.random() - 0.5) * spread;
            const speed = 100 + Math.random() * 50;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.particles.push(new Particle(x, y, vx, vy, color, 3, 0.2));
        }
    }
    
    update(deltaTime) {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            if (this.particles[i].lifetime <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        // Draw all particles
        this.particles.forEach(particle => particle.draw(ctx));
    }
    
    clear() {
        this.particles = [];
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Particle, ParticleSystem };
}