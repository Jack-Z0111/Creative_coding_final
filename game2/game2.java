/*
Final Project: shooter game
Inspired by: 
  FAL - Duel (https://www.openprocessing.org/sketch/453716)
  FAL - Collapsing Ideas (https://www.openprocessing.org/sketch/470603)

Things I failed to do:
I was trying to add a background music. But the console shows a weird bug with the filename. 
The boolean checkCollision can not find the object when too many bullets collide with stars. 
*/


ArrayList<Star> stars = new ArrayList<Star>();
ArrayList<Asteroid> asteroids = new ArrayList<Asteroid>();
ArrayList<Bullet> bullets = new ArrayList<Bullet>();
ArrayList<Attack> attacks = new ArrayList<Attack>(); 

Ship playerShip;
Enemy enemyShip;
EndScene end;

int score = 0;

boolean space = true;
boolean soundEnabled;
//var audio;

void setup() {
  size(800, 700);
  playerShip = new Ship();
  enemyShip = new Enemy(score);
  score = 0;
  frameRate(60);
  soundEnabled = true;
  /*
  audio = new Audio("luna_dial.mp3");
  audio.play();
  audio.loop = true;
  audio.volume = 0.3; 
  */
  
}

void draw() {

  if (end != null) {
    end.drawEndScene();
  } else { 
    background(225);
    drawStar();

    drawAsteroid();
    fill(255, 0, 0, 100);
    stroke(12);
    strokeWeight(5);
    drawBullet();
    drawAttack();
    playerShip.drawShip();
    enemyShip.drawEnemy();

    checkCollision();
    checkAttack();
    textSize(18);
    text("Score: " +score, 380, 30);
  }
}


void drawBullet() {
  for (int i = 0; i < bullets.size(); i++) {
    bullets.get(i).drawBullet();
  }
}

void drawAttack() {
  if (score <= 15) {
    if (frameCount % 50 == 0) {
      Attack a = new Attack(playerShip, enemyShip);
      attacks.add(a);
    }
  } else if (score > 15) {
    if (frameCount % 30 == 0) {
      Attack a = new Attack(playerShip, enemyShip);
      attacks.add(a);
    }
  }
  for (int i = 0; i < attacks.size(); i++) {
    Attack currentAttack = attacks.get(i);
    currentAttack.drawAttack();
  }
}

void checkCollision() {
  for (int i = 0; i < asteroids.size(); i ++) {
    Asteroid a = asteroids.get(i);
    if (a.checkCollision(playerShip) == true) {
      end = new EndScene(score);
    }
    for (int j = 0; j < bullets.size(); j ++) {
      Bullet b = bullets.get(j);
      if (a.checkCollision(b) == true) {
        score ++;
        asteroids.remove(a);
        bullets.remove(b);
        i --;
        j --;
      }
    }
  }
}

void checkAttack() {
  for (int k = 0; k < attacks.size(); k ++) {
    Attack ac = attacks.get(k);
    if (ac.checkCollision(playerShip) == true) {
      end = new EndScene(score);
    }
  }
}

void drawAsteroid() {
  if (frameCount % 50 == 0) {
    asteroids.add(new Asteroid(random(120, 230)));
  }
  for (int i = 0; i < asteroids.size(); i++) {
    Asteroid currentAsteroid = asteroids.get(i);
    currentAsteroid.drawAsteroid();
    if (currentAsteroid.y > height + currentAsteroid.size) {
      asteroids.remove(currentAsteroid);
      i --;
    }
  }
}

void drawStar() {
  strokeWeight(5);
  stroke(255);
  if (frameCount % 4 == 0) {
    Star myStar = new Star();
    stars.add(myStar);
  }
  for (int i = 0; i < stars.size(); i++) {
    Star currentStar = stars.get(i);
    currentStar.drawStar();
  }
}

void keyPressed() {
  if (key == CODED) {
    if (keyCode == UP) {
      playerShip.upPressed = true;
    } else if (keyCode == DOWN) {
      playerShip.downPressed = true;
    } else if (keyCode == LEFT) {
      playerShip.leftPressed = true;
    } else if (keyCode == RIGHT) {
      playerShip.rightPressed = true;
    }
  } else if (space == true && key == ' ') {
    Bullet b = new Bullet(playerShip);
    bullets.add(b);
    space = false;
  }
}

void keyReleased() {
  if (keyCode == UP) {
    playerShip.upPressed = false;
  } else if (keyCode == DOWN) {
    playerShip.downPressed = false;
  } else if (keyCode == LEFT) {
    playerShip.leftPressed = false;
  } else if (keyCode == RIGHT) {
    playerShip.rightPressed = false;
  }
  space = true;
}

void mousePressed() {
  if (end != null && end.mouseOverButton() == true) {
    resetGame();
  }
}

void resetGame() {
  stars.clear();
  bullets.clear();
  asteroids.clear();
  attacks.clear();
  playerShip = new Ship();
  //audio.volume = 0.3;
  end = null;
  score = 0;
}

class Ship {
  float x, y, vx, vy;
  boolean upPressed, downPressed, leftPressed, rightPressed;
  
  int speed = 6; 
  
  Ship() {
    this.x = width/2;
    this.y = height - height/4;
    this.vy = 0;
    this.vx = 0;
  }
  
  void drawShip() {
    if (upPressed == true) {
      vy = -speed;
    } else if (downPressed == true) {
      vy = speed;
    } else {
      y -= vy;
      vy = 0;
    }
    
    if (leftPressed == true) {
      vx = -speed;
    } else if (rightPressed == true) {
      vx = speed;
    } else {
      vx = 0;
    }   
    x += vx;   
    if (y - 20 >= 50 && y < height) {
      y += vy;
    }
    if (x + 10 < 0) {
      x = width + 9;
    }
    if (x - 10 > width) { 
      x = -9;
    }
    fill(#4DD2EB);
    stroke(23);
    triangle(x, y - 17.32, x - 10, y, x + 10, y);
    ellipse(x, y - 5, 20, 20);
  }
}

class Asteroid {
  float size, x, y;
  int vy = 5;
  float ay = random(0.05, 0.2);

  Asteroid(float size) {
    this.size = size;
    this.x = random(width);
    this.y = -size;
  }

  void drawAsteroid() {
    fill(#EB8288, 40);
    stroke(120);
    strokeWeight(4);
    ellipse(x, y, size, size);
    y += vy;
    vy += ay;
  }

  boolean checkCollision(Object other) {
    if (other instanceof Ship) {
      Ship playerShip = (Ship) other;
      float apothem = 10 * tan(60);
      float distance = dist(x, y, playerShip.x, playerShip.y-apothem);
      if (distance < size/2 + apothem + 10) {
        fill(255, 50);
        
        return true;
      }
    } else if (other instanceof Bullet) {
      Bullet bullet = (Bullet) other;
      float distance = dist(x, y, bullet.x, bullet.y); 
      if (distance <= size/2 + bullet.size/2 ) { 
        return true;
      }
    }
    return false;
  }
}


class Bullet {
  float x, y, vy;
  float size;
  
  Bullet(Ship playerShip) {
    this.x = playerShip.x;
    this.y = playerShip.y - 15;
    this.vy = -10;
    this.size = 20;
  }
  
  void drawBullet() {
    fill(0);
    noStroke();
    quad(x, y, x + size / 2, y + size / 2, x, y + size, x - size / 2, y + size / 2);
    y += vy;
  }    
}

class Star {
  float x, y;
  float vy;
  
  Star() { 
    this.x = random(width);
    this.y = 0;
    this.vy = 6.5; 
  }
  
  void drawStar() {
    y += vy;
    triangle(x, y, x - 2, y - 3.5, x + 2, y - 3.5);
  }
}

class EndScene {
  String gameOverText, scoreText;
  int buttonX, buttonY, buttonW, buttonH;
  
  EndScene(int score) {
    this.gameOverText = "Game Over";
    this.scoreText = "Score: " + score;
    this.buttonW = 200;
    this.buttonH = 180;
    this.buttonX = width/2 - this.buttonW/2;
    this.buttonY = height/2 - this.buttonH/2;
  }

  void drawEndScene() {
    fill(225);
    rect(0, 0, width, height);
    rect(buttonX, buttonY, buttonW, buttonH);

    stroke(255);
    fill(255);
    textSize(60);
    text(this.gameOverText, width/3.26, height/4);
    text(this.scoreText, width/2.8, 3.2 * height / 4);


    fill(#FF6A63);
    noStroke();
    rect(buttonX, buttonY, buttonW, buttonH);
    fill(215);
    triangle(buttonX + 65, buttonY + 40, buttonX + 65, buttonY + 140, buttonX + 150, buttonY + 90);
    
    //audio.volume = 0.1;
  }

  boolean mouseOverButton() {
    return (mouseX > buttonX && mouseX < buttonX + buttonW && mouseY > buttonY && mouseY < buttonY + buttonH);
  }
}

class Enemy {
  float x, y, vx;
  int s;
  
  Enemy(int score) {
    this.x = width/2;
    this.y = 50;
    this.vx = 3;
    this.s = score;
  }
  
  void drawEnemy() {    
    if (x + 60 > width) {
      vx = -vx;
    }
    else if (x - 60 < 0) { 
      vx = -vx;
    }
    x += vx;
    
    fill(100);
    noStroke();
    rect(this.x - 20, this.y - 10, 40, 10);
    triangle(this.x - 8, this.y, this.x + 8, this.y, this.x, this.y + 10);
    triangle(this.x - 30, this.y - 10, this.x - 20, this.y - 10, this.x - 20, this.y + 8);
    triangle(this.x + 30, this.y - 10, this.x + 20, this.y - 10, this.x + 20, this.y + 8);
    
    textSize(12);
    text(s, x - 4, y - 12);
  
  }
}



class Attack {
  PVector p, v, a;
  float size;
  
  Attack(Ship playerShip, Enemy enemyShip) {
    this.p = new PVector(enemyShip.x, enemyShip.y + 5);
    this.a = new PVector(playerShip.x - enemyShip.x, playerShip.y - enemyShip.y);
    this.v = new PVector();
    this.size = 20;
  }
  
  void drawAttack() {
    a.limit(0.5);
    v.add(this.a);
    v.limit(7);
    p.add(this.v);
    fill(#EB3F1A);
    noStroke();
    ellipse(p.x, p.y, size, size);
  }
  boolean checkCollision(Object other) {
    if (other instanceof Ship) {
      Ship playerShip = (Ship) other;
      float apothem = 10 * tan(60);
      float distance = dist(p.x, p.y, playerShip.x, playerShip.y-apothem);
      if (distance < size / 3) {
        return true;
      }
    } return false;
  } 
}
