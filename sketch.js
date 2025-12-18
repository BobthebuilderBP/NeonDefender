/*
  Neon Defender: Survival Arena
  Original p5.js single-player game
  Author: Ijaz Rahman
*/

let game;

function setup() {
  createCanvas(900, 600);
  game = new Game();
}

function draw() {
  background(5, 5, 15);
  game.update();
  game.render();
}

function keyPressed() {
  game.handleKey(keyCode);
}

function mousePressed() {
  game.handleMouse();
}

/* ================= GAME CONTROLLER ================= */

class Game {
  constructor() {
    this.state = "menu"; // menu | play | gameover
    this.reset();
  }

  reset() {
    this.player = new Player();
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.score = 0;
    this.level = 1;
    this.spawnTimer = 0;
  }

  start() {
    this.reset();
    this.state = "play";
  }

  update() {
    if (this.state !== "play") return;

    this.player.update();

    // Enemy spawning with difficulty scaling
    this.spawnTimer++;
    if (this.spawnTimer > max(25, 120 - this.level * 10)) {
      this.enemies.push(new Enemy());
      this.spawnTimer = 0;
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].update();
      if (this.bullets[i].offscreen()) this.bullets.splice(i, 1);
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(this.player);

      if (this.enemies[i].hits(this.player)) {
        this.state = "gameover";
      }
    }

    // Bullet–enemy collisions
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        if (this.enemies[i].hits(this.bullets[j])) {
          this.score += 10;
          this.level = floor(this.score / 100) + 1;
          this.createExplosion(this.enemies[i].pos.x, this.enemies[i].pos.y);
          this.enemies.splice(i, 1);
          this.bullets.splice(j, 1);
          break;
        }
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    if (this.state === "menu") return this.drawMenu();
    if (this.state === "gameover") return this.drawGameOver();

    this.player.draw();
    this.enemies.forEach(e => e.draw());
    this.bullets.forEach(b => b.draw());
    this.particles.forEach(p => p.draw());

    this.drawHUD();
  }

  handleKey(code) {
    if (this.state !== "play" && code === ENTER) this.start();

    if (this.state === "play" && code === 32) {
      const b = this.player.shoot();
      if (b) this.bullets.push(b);
    }
  }

  handleMouse() {
    if (this.state !== "play") {
      this.start();
      return;
    }
    const b = this.player.shoot();
    if (b) this.bullets.push(b);
  }

  createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(x, y));
    }
  }

  drawHUD() {
    fill(255);
    textSize(14);
    textAlign(LEFT);
    text("Score: " + this.score, 20, 25);
    text("Level: " + this.level, 20, 45);
    text("Move: WASD / Arrows | Aim: Mouse | Shoot: Space / Click", 20, 65);
  }

  drawMenu() {
    fill(255);
    textAlign(CENTER);
    textSize(40);
    text("NEON DEFENDER", width / 2, height / 2 - 50);
    textSize(18);
    text("Click or Press ENTER to Start", width / 2, height / 2 + 10);
  }

  drawGameOver() {
    fill(255, 80, 80);
    textAlign(CENTER);
    textSize(40);
    text("GAME OVER", width / 2, height / 2 - 40);
    fill(255);
    textSize(18);
    text("Final Score: " + this.score, width / 2, height / 2);
    text("Click or Press ENTER to Restart", width / 2, height / 2 + 40);
  }
}

/* ================= PLAYER (SHIP) ================= */

class Player {
  constructor() {
    this.pos = createVector(width / 2, height / 2);
    this.radius = 18;
    this.speed = 4;
    this.angle = 0;
    this.cooldown = 0;
  }

  update() {
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) this.pos.x -= this.speed;
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) this.pos.x += this.speed;
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) this.pos.y -= this.speed;
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) this.pos.y += this.speed;

    this.pos.x = constrain(this.pos.x, this.radius, width - this.radius);
    this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);

    // Aim toward mouse
    this.angle = atan2(mouseY - this.pos.y, mouseX - this.pos.x);

    if (this.cooldown > 0) this.cooldown--;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    noStroke();

    // Engine glow
    fill(255, 0, 255, 140);
    ellipse(-18, 0, 10, 10);

    // Ship body
    fill(0, 255, 200);
    triangle(22, 0, -14, -12, -14, 12);

    // Cockpit
    fill(255, 255, 255, 180);
    ellipse(2, 0, 6, 6);

    pop();
  }

  shoot() {
    if (this.cooldown > 0) return null;
    this.cooldown = 8;

    const dir = p5.Vector.fromAngle(this.angle).setMag(7);
    const muzzle = p5.Vector.add(
      this.pos,
      p5.Vector.fromAngle(this.angle).setMag(22)
    );

    return new Bullet(muzzle.x, muzzle.y, dir.x, dir.y);
  }
}

/* ================= ENEMY ================= */

class Enemy {
  constructor() {
    let side = floor(random(4));
    if (side === 0) this.pos = createVector(random(width), -20);
    if (side === 1) this.pos = createVector(width + 20, random(height));
    if (side === 2) this.pos = createVector(random(width), height + 20);
    if (side === 3) this.pos = createVector(-20, random(height));

    this.radius = 14;
    this.speed = random(1.2, 2.5);
  }

  update(player) {
    let dir = p5.Vector.sub(player.pos, this.pos);
    dir.setMag(this.speed);
    this.pos.add(dir);
  }

  draw() {
    fill(255, 60, 60);
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }

  hits(obj) {
    return dist(this.pos.x, this.pos.y, obj.pos.x, obj.pos.y) <
           this.radius + obj.radius;
  }
}

/* ================= BULLET ================= */

class Bullet {
  constructor(x, y, vx, vy) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.radius = 5;
  }

  update() {
    this.pos.add(this.vel);
  }

  draw() {
    fill(255, 255, 0);
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }

  offscreen() {
    return (
      this.pos.x < -20 || this.pos.x > width + 20 ||
      this.pos.y < -20 || this.pos.y > height + 20
    );
  }
}

/* ================= PARTICLES ================= */

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 3));
    this.life = 60;
  }

  update() {
    this.pos.add(this.vel);
    this.life--;
  }

  draw() {
    noStroke();
    fill(255, this.life * 4);
    ellipse(this.pos.x, this.pos.y, 4);
  }
}
