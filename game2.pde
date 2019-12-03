ArrayList<Star> stars = new ArrayList<Star>();
ArrayList<Asteroid> asteroids = new ArrayList<Asteroid>();
ArrayList<Bullet> bullets = new ArrayList<Bullet>();
int asteroidFrequency = 60; 
int frequency = 4; 
int points;
Ship playerShip;
EndScene end;

void setup() {
  // fullScreen(P2D);
  size(800, 700);
  playerShip = new Ship();
  frameRate(60);
}

void draw() {

  if (end != null) {
    end.drawEndScene();
  } else { 
    background(245);
    drawStar();

    drawAsteroid();
    fill(255, 0, 0, 100);
    stroke(255);
    drawBullet();
    playerShip.drawShip();

    checkCollision();
  }
}

void drawBullet() {
  for (int i = 0; i<bullets.size(); i++) {
    bullets.get(i).drawBullet();
  }
}

void checkCollision() {
  for (int i = 0; i < asteroids.size(); i ++) {
    Asteroid a = asteroids.get(i);
    if (a.checkCollision(playerShip) == true) {
      end = new EndScene();
    }
    for (int j = 0; j < bullets.size(); j ++) {
      Bullet b = bullets.get(j);
      if (a.checkCollision(b) == true) {
        points ++;

        asteroids.remove(a);
        bullets.remove(b);
        i --;
        j --;
      }
    }
  }
}


void drawAsteroid() {
  if (frameCount % asteroidFrequency == 0) {
    asteroids.add(new Asteroid(random(150, 250)));
  }
  for (int i = 0; i<asteroids.size(); i++) {
    Asteroid currentAsteroid = asteroids.get(i);
    currentAsteroid.drawAsteroid();
    if (currentAsteroid.y > height + currentAsteroid.size) {
      asteroids.remove(currentAsteroid);
      i --;
    }
  }
}

void drawStar() {
  strokeWeight(8);
  stroke(255);
  if (frameCount % frequency == 0) {
    Star myStar = new Star();
    stars.add(myStar);
  }
  for (int i = 0; i<stars.size(); i++) {
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
  } else if (key == ' ') {
    Bullet b = new Bullet(playerShip);
    bullets.add(b);
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
  playerShip = new Ship();
  end = null;
  points = 0;
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
    if (y-20>=50 && y<height) {
      y += vy;
    }
    if (x+10 < 0)
      x = width + 9;
    
    if (x-10 > width) x = -9;
    
		fill(#4DD2EB);
		stroke(230);
    triangle(x, y - 17.32, x - 10, y, x + 10, y);
		ellipse(x, y - 5, 20, 20)
  }
}

class Asteroid {
  float size, x, y;
  int vy = 5; 

  Asteroid(float size) {
    this.size = size;
    this.x = random(width);
    this.y = -size;
  }

  void drawAsteroid() {
    fill(170, 60);
    stroke(150);
    ellipse(x, y, size, size);
    y += vy;
  }

  boolean checkCollision(Object other) {
    if (other instanceof Ship) {
      Ship playerShip = (Ship) other;
      float apothem = 10 * tan(60);
      float distance = dist(x, y, playerShip.x, playerShip.y-apothem);
      if (distance < size/2 + apothem + 10) {
        fill(255, 0, 0, 100);
        fill(255);
        
        return true;
      }
    } else if (other instanceof Bullet) {
      Bullet bullet = (Bullet) other;
      float distance = dist(x, y, bullet.x, bullet.y); 
      if (distance <= size/2 + bullet.size/2 ) {
        fill(0, 255, 0, 100);
        //rect(playerShip.x-10, playerShip.y-10, 20, 20);
        fill(255);
        
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
  int vy;
  
  Star() { 
    this.x = random(width);
    this.y = 0;
    this.vy = 8; 
  }
  
  void drawStar() {
    y += vy;
    point(x,y);
  }
}

class EndScene {
  String gameOverText, buttonText, pointsText;
  int buttonX, buttonY, buttonW, buttonH;
	
  EndScene() {
    this.gameOverText = "!";
    this.buttonText = "Retry";
    this.buttonW = 200;
    this.buttonH = 100;
    this.buttonX = width/2 - this.buttonW/2;
    this.buttonY = height/2 - this.buttonH/2;
  }

  void drawEndScene() {
    fill(#5AE8BC);
    rect(0, 0, width, height);
    rect(buttonX, buttonY, buttonW, buttonH);

    stroke(255);
    fill(255);
    textSize(60);
    text(this.gameOverText, width/3, height/4);


    fill(#FF6A63);
    noStroke();
    rect(buttonX, buttonY, buttonW, buttonH);
    fill(200);
    text(buttonText, buttonX+25, buttonY+70);
    

  }

  boolean mouseOverButton() {
    return (mouseX > buttonX 
      && mouseX < buttonX + buttonW
      && mouseY > buttonY
      && mouseY < buttonY + buttonH);
  }
}