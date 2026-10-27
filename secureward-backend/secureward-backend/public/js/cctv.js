// ============================================================================
// SECUREWARD - CINEMATIC CCTV SURVEILLANCE MATRIX
// Procedural Canvas-based Tactical Camera Feeds with Real-Time Motion Tracking
// ============================================================================

class CCTVMatrix {
  constructor() {
    this.cameras = [
      { id: 'cam-yard', name: 'CAM-01 // MAIN EXERCISE YARD', loc: 'Perimeter West Sector', fps: 24, mode: 'optics' },
      { id: 'cam-block-b', name: 'CAM-02 // BLOCK-B MAXIMUM CORRIDOR', loc: 'Level 2 Tier North', fps: 30, mode: 'optics' },
      { id: 'cam-visitation', name: 'CAM-03 // SECURE VISITATION BOOTH 04', loc: 'Visitor Center Wing', fps: 24, mode: 'optics' },
      { id: 'cam-solitary', name: 'CAM-04 // SOLITARY ISOLATION CELL D-01', loc: 'Sub-level B containment', fps: 15, mode: 'infrared' }
    ];
    this.animationFrames = {};
    this.activeFeedModal = null;
  }

  init() {
    this.cameras.forEach(cam => {
      const canvas = document.getElementById(cam.id);
      if (canvas) {
        this.startFeed(canvas, cam);
      }
    });
  }

  startFeed(canvas, cam) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = canvas.parentElement.clientWidth || 320;
    let height = canvas.height = canvas.parentElement.clientHeight || 180;

    let tick = Math.random() * 100;
    let targets = [
      { x: width * 0.3, y: height * 0.5, vx: 0.6, vy: 0.2, label: 'INMATE #1042', alert: false },
      { x: width * 0.7, y: height * 0.45, vx: -0.4, vy: 0.1, label: 'GUARD #08', alert: false }
    ];

    const render = () => {
      tick += 0.05;
      
      // Update canvas resolution if container changed
      if (canvas.parentElement && (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight)) {
        width = canvas.width = canvas.parentElement.clientWidth || 320;
        height = canvas.height = canvas.parentElement.clientHeight || 180;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Background scene based on camera ID
      if (cam.id === 'cam-yard') {
        // Dark twilight sky with exercise yard ground
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#0a1017');
        skyGrad.addColorStop(0.65, '#121d2a');
        skyGrad.addColorStop(1, '#1b2a38');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // Security fence silhouettes
        ctx.strokeStyle = 'rgba(64, 90, 115, 0.4)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, height * 0.65);
          ctx.lineTo(x + 16, height);
          ctx.moveTo(x + 16, height * 0.65);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        // Guard Tower
        ctx.fillStyle = '#0f1722';
        ctx.fillRect(width * 0.8, height * 0.3, 30, height * 0.7);
        ctx.fillRect(width * 0.76, height * 0.22, 38, 20);

        // Watchtower Searchlight Sweep
        const lightAngle = Math.sin(tick * 0.8) * 0.4;
        ctx.save();
        ctx.translate(width * 0.82, height * 0.25);
        ctx.rotate(lightAngle);
        const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 120, 160);
        coneGrad.addColorStop(0, 'rgba(180, 230, 255, 0.35)');
        coneGrad.addColorStop(1, 'rgba(180, 230, 255, 0)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-40, 160);
        ctx.lineTo(40, 160);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

      } else if (cam.id === 'cam-block-b') {
        // High corridor perspective
        ctx.fillStyle = '#0c131d';
        ctx.fillRect(0, 0, width, height);

        // Vanishing point hallway lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.lineWidth = 1.5;
        const cx = width * 0.5, cy = height * 0.45;
        ctx.beginPath();
        // Top-left to center
        ctx.moveTo(0, 0); ctx.lineTo(cx, cy);
        // Top-right to center
        ctx.moveTo(width, 0); ctx.lineTo(cx, cy);
        // Bottom-left to center
        ctx.moveTo(0, height); ctx.lineTo(cx, cy);
        // Bottom-right to center
        ctx.moveTo(width, height); ctx.lineTo(cx, cy);
        ctx.stroke();

        // Cell doors along corridor
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        [0.2, 0.35, 0.65, 0.8].forEach(pos => {
          const x = width * pos;
          ctx.strokeRect(x - 12, height * 0.35, 24, height * 0.5);
        });

      } else if (cam.id === 'cam-visitation') {
        // Visitation room with glass partition
        ctx.fillStyle = '#0d1520';
        ctx.fillRect(0, 0, width, height);

        // Glass divider in center
        ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
        ctx.fillRect(width * 0.48, 0, width * 0.04, height);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.strokeRect(width * 0.48, 0, width * 0.04, height);

        // Counter table
        ctx.fillStyle = '#162232';
        ctx.fillRect(0, height * 0.65, width, height * 0.35);

      } else {
        // Solitary confinement (Infrared / night vision green glow)
        ctx.fillStyle = '#07150c';
        ctx.fillRect(0, 0, width, height);

        // Reinforced steel door frame & bench
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.strokeRect(width * 0.15, height * 0.2, width * 0.7, height * 0.7);
        ctx.strokeRect(width * 0.25, height * 0.75, width * 0.45, height * 0.12);
      }

      // 2. Simulated Moving Targets & Motion Tracking Bounding Boxes
      targets.forEach(t => {
        t.x += t.vx;
        t.y += t.vy;
        if (t.x < width * 0.15 || t.x > width * 0.85) t.vx *= -1;
        if (t.y < height * 0.35 || t.y > height * 0.8) t.vy *= -1;

        // Draw tactical silhouette
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(t.x, t.y - 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(t.x - 4, t.y - 8, 8, 16);

        // Motion Tracking Box
        ctx.strokeStyle = cam.id === 'cam-solitary' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1;
        const boxSize = 24;
        ctx.strokeRect(t.x - boxSize/2, t.y - 18, boxSize, boxSize + 10);

        // Label above tracking box
        ctx.fillStyle = cam.id === 'cam-solitary' ? '#10b981' : '#38bdf8';
        ctx.font = '8px monospace';
        ctx.fillText(t.label, t.x - boxSize/2, t.y - 22);
      });

      // 3. Digital Scanline & Grain Noise
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      // Random noise speckles
      for (let i = 0; i < 40; i++) {
        const nx = Math.random() * width;
        const ny = Math.random() * height;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(nx, ny, 1.5, 1.5);
      }

      // 4. CCTV HUD Overlay: Timecode, REC dot, Camera name
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');

      // REC Indicator (blinking every second)
      const isBlinking = Math.floor(Date.now() / 600) % 2 === 0;
      if (isBlinking) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(14, 14, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '9px "JetBrains Mono", monospace, sans-serif';
      ctx.fillText('REC', 24, 17);
      ctx.fillText(timeStr, width - 85, 17);

      // Camera name at bottom
      ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.fillText(cam.name, 10, height - 10);

      // Request next animation frame
      this.animationFrames[cam.id] = requestAnimationFrame(render);
    };

    render();
  }

  stopAll() {
    Object.values(this.animationFrames).forEach(id => cancelAnimationFrame(id));
    this.animationFrames = {};
  }
}

window.cctvMatrix = new CCTVMatrix();
