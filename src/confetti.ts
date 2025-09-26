interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

const COLORS = ['#f48fb1', '#9575cd', '#ce93d8', '#4fc3f7', '#ffcc80'];
const PARTICLE_COUNT = 180;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: ConfettiParticle[] = [];
let animationId: number | null = null;
let lastTimestamp = 0;
let containerElement: HTMLElement | null = null;
let pixelRatio = 1;
let viewportWidth = 0;
let viewportHeight = 0;

function ensureCanvas(container: HTMLElement): void {
  if (canvas) return;

  canvas = document.createElement('canvas');
  canvas.className = 'confetti-layer';
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '5';
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 0.3s ease';
  container.appendChild(canvas);

  ctx = canvas.getContext('2d');
  containerElement = container;
  resize();

  window.addEventListener('resize', resize);
}

function resize(): void {
  if (!canvas || !containerElement) return;
  pixelRatio = window.devicePixelRatio || 1;
  viewportWidth = containerElement.clientWidth;
  viewportHeight = containerElement.clientHeight;
  canvas.width = viewportWidth * pixelRatio;
  canvas.height = viewportHeight * pixelRatio;
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  if (ctx) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }
}

function createParticle(width: number): ConfettiParticle {
  const speed = 60 + Math.random() * 60;
  return {
    x: Math.random() * width,
    y: -Math.random() * 50,
    vx: (Math.random() - 0.5) * 30,
    vy: speed,
    size: 6 + Math.random() * 6,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

function step(timestamp: number): void {
  if (!canvas || !ctx) return;

  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.033);
  lastTimestamp = timestamp;

  const width = viewportWidth;
  const height = viewportHeight;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rotation += particle.rotationSpeed * dt;

    if (particle.y > height + 20) {
      Object.assign(particle, createParticle(width));
      particle.y = -20;
    }
  }

  for (const particle of particles) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx.restore();
  }

  if (animationId !== null) {
    animationId = requestAnimationFrame(step);
  }
}

export function setupConfetti(container: HTMLElement): void {
  ensureCanvas(container);
}

export function startConfetti(): void {
  if (!canvas || !ctx) return;
  const width = viewportWidth || canvas.clientWidth;
  particles = new Array(PARTICLE_COUNT).fill(null).map(() => createParticle(width));
  lastTimestamp = 0;
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
  animationId = requestAnimationFrame(step);
  canvas.style.opacity = '1';
}

export function stopConfetti(): void {
  if (!canvas || !ctx) return;
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  particles = [];
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  canvas.style.opacity = '0';
}
