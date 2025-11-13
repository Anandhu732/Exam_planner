/**
 * Forest Animation Module - Pine forest with growing trees
 */

interface Tree {
  x: number;
  y: number;
  height: number;
  width: number;
  growing: boolean;
  growthProgress: number;
}

const MOTIVATIONAL_QUOTES = [
  "🌟 Great job! You completed a focus session!",
  "💪 Keep going! Your forest is growing!",
  "🎯 Focused mind, growing forest!",
  "🌲 Another tree planted! Stay focused!",
  "✨ Consistency is key! Well done!",
  "🚀 You're on fire! Keep it up!",
  "🎨 Your dedication is blooming!",
  "🌱 Small steps, big growth!",
  "🏆 Champion mindset! Continue!",
  "💚 Your forest thanks you!"
];

class ForestManager {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private trees: Tree[] = [];
  private quoteElement!: HTMLElement;
  private animationId: number | null = null;
  private completedSessions: number = 0;
  private currentGrowingTree: Tree | null = null;

  init(): void {
    try {
      this.canvas = document.getElementById('forestCanvas') as HTMLCanvasElement;
      this.ctx = this.canvas.getContext('2d')!;
      this.quoteElement = document.getElementById('motivationalQuote')!;

      // Load saved progress
      const saved = localStorage.getItem('forest-progress');
      if (saved) {
        const data = JSON.parse(saved);
        this.completedSessions = data.sessions || 0;
        this.trees = data.trees || [];
      }

      // Set canvas size
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      // Start animation loop
      this.animate();
    } catch (error) {
      console.error('Forest initialization failed:', error);
    }
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.render();
  }

  /**
   * Update current growing tree based on timer progress (0-1)
   */
  updateCurrentTreeGrowth(progress: number): void {
    // Create tree if it doesn't exist yet
    if (!this.currentGrowingTree) {
      const x = (this.canvas.width / 10) * (this.trees.length % 9 + 0.5);
      const baseY = this.canvas.height - 30;

      this.currentGrowingTree = {
        x,
        y: baseY,
        height: 0,
        width: 20 + Math.random() * 10,
        growing: true,
        growthProgress: 0,
      };
    }

    // Update growth smoothly
    this.currentGrowingTree.growthProgress = progress;
    this.currentGrowingTree.height = (40 + Math.random() * 20) * progress;
    this.render();
  }

  /**
   * Complete the current tree and add it to the forest
   */
  completeCurrentTree(): void {
    if (this.currentGrowingTree) {
      this.currentGrowingTree.growthProgress = 1;
      this.currentGrowingTree.growing = false;
      this.trees.push(this.currentGrowingTree);
      this.currentGrowingTree = null;

      this.completedSessions++;
      this.saveProgress();
      this.showMotivationalQuote();
    }
  }

  /**
   * Cancel the current growing tree (on reset)
   */
  cancelCurrentTree(): void {
    this.currentGrowingTree = null;
    this.render();
  }

  /**
   * Add a new tree when Pomodoro completes (legacy method)
   */
  onPomodoroComplete(): void {
    this.completedSessions++;

    // Calculate position for new tree
    const x = (this.canvas.width / 10) * (this.trees.length % 9 + 0.5);
    const baseY = this.canvas.height - 30;

    const newTree: Tree = {
      x,
      y: baseY,
      height: 0,
      width: 20 + Math.random() * 10,
      growing: true,
      growthProgress: 0,
    };

    this.trees.push(newTree);
    this.saveProgress();
    this.showMotivationalQuote();
  }

  /**
   * Show a random motivational quote
   */
  private showMotivationalQuote(): void {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    this.quoteElement.textContent = quote;
    this.quoteElement.classList.remove('hidden');

    setTimeout(() => {
      this.quoteElement.classList.add('hidden');
    }, 3000);
  }

  /**
   * Save progress to localStorage
   */
  private saveProgress(): void {
    const data = {
      sessions: this.completedSessions,
      trees: this.trees,
    };
    localStorage.setItem('forest-progress', JSON.stringify(data));
  }

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update growing trees
    let needsUpdate = false;
    this.trees.forEach((tree) => {
      if (tree.growing && tree.growthProgress < 1) {
        tree.growthProgress += 0.01;
        tree.height = (40 + Math.random() * 20) * tree.growthProgress;
        needsUpdate = true;

        if (tree.growthProgress >= 1) {
          tree.growing = false;
        }
      }
    });

    if (needsUpdate || this.trees.some(t => t.growing)) {
      this.render();
    }
  }

  /**
   * Render the forest
   */
  private render(): void {
    const { width, height } = this.canvas;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw sky gradient
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.6, '#90EE90');
    skyGradient.addColorStop(1, '#228B22');
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw ground
    this.ctx.fillStyle = '#2F4F2F';
    this.ctx.fillRect(0, height - 30, width, 30);

    // Draw completed trees
    this.trees.forEach((tree) => {
      this.drawPineTree(tree);
    });

    // Draw currently growing tree
    if (this.currentGrowingTree && this.currentGrowingTree.height > 0) {
      this.drawPineTree(this.currentGrowingTree);
    }

    // Draw session counter
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.fillText(`🌲 Trees: ${this.trees.length}${this.currentGrowingTree ? ' (+1 growing)' : ''}`, 10, 20);
  }

  /**
   * Draw a pine tree
   */
  private drawPineTree(tree: Tree): void {
    const { x, y, height, width } = tree;

    // Trunk
    this.ctx.fillStyle = '#8B4513';
    const trunkWidth = width / 4;
    const trunkHeight = height / 3;
    this.ctx.fillRect(
      x - trunkWidth / 2,
      y - trunkHeight,
      trunkWidth,
      trunkHeight
    );

    // Pine layers (3 triangles)
    const layerHeight = (height * 2) / 3 / 3;
    this.ctx.fillStyle = '#228B22';

    for (let i = 0; i < 3; i++) {
      const layerY = y - trunkHeight - (i * layerHeight * 0.7);
      const layerWidth = width * (1 - i * 0.2);

      this.ctx.beginPath();
      this.ctx.moveTo(x, layerY - layerHeight);
      this.ctx.lineTo(x - layerWidth / 2, layerY);
      this.ctx.lineTo(x + layerWidth / 2, layerY);
      this.ctx.closePath();
      this.ctx.fill();

      // Add some darker green for depth
      this.ctx.strokeStyle = '#1a6b1a';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  /**
   * Get statistics
   */
  getStats(): { sessions: number; trees: number } {
    return {
      sessions: this.completedSessions,
      trees: this.trees.length,
    };
  }

  /**
   * Reset forest
   */
  reset(): void {
    this.trees = [];
    this.completedSessions = 0;
    this.currentGrowingTree = null;
    this.saveProgress();
    this.render();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

export const forest = new ForestManager();
