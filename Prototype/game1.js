let gameStates = {};
let currentGameState;
class GameState {
    constructor(runFunction) {
        this.properFrameCount = 0;
        this.runFunction = runFunction;
    }
    run() {
        this.runFunction(this);
    }
}
function prepareGameStates() {
    gameStates.normal = new GameState((state) => {
        if (myStructure.ideaQueue.length >= 5 || state.properFrameCount > 60 * 60) {
            if (Math.random() < 0.1) {
                currentGameState = gameStates.encounterBoss;
                gameMessageSystem.pushMessage('Large structure incoming.');
                return;
            }
        }
        else if (enemyStructureGroup.structureSet.length < myStructure.ideaQueue.length / 2) {
            if (Math.random() < 0.03)
                createEnemy();
        }
        if (myStructureGroup.structureSet.length === 0) {
            gameMessageSystem.pushMessage('You lost all Ideas.');
            currentGameState = gameStates.gameOver;
            return;
        }
        state.properFrameCount += 1;
    });
    gameStates.encounterBoss = new GameState((state) => {
        if (state.properFrameCount === 240) {
            createNonMovingEffect(0.5 * width, 0.15 * height, color(0), 300 * unitLength, 60, drawBossShadow);
        }
        else if (state.properFrameCount === 300) {
            screenFlash.set(255, 1);
            screenShake.set(10 * unitLength);
            const structureParameter = {
                x: 0.5 * width,
                y: 0.15 * height,
                mainColor: enemyStructureGroup.mainColor,
                initialIdeas: ideaSet.popRandomSet(16, true),
                action: {
                    run(structure) {
                        if (structure.properFrameCount % 420 < 240 && structure.properFrameCount > 30) {
                            structure.isBlocking = false;
                            structure.fire();
                        }
                        else {
                            structure.isBlocking = true;
                        }
                    },
                },
            };
            enemyStructureGroup.addStructure(new Structure(structureParameter));
            currentGameState = gameStates.boss;
            return;
        }
        if (myStructureGroup.structureSet.length === 0) {
            gameMessageSystem.pushMessage('You lost all Ideas.');
            currentGameState = gameStates.gameOver;
            return;
        }
        state.properFrameCount += 1;
    });
    gameStates.boss = new GameState((state) => {
        if (enemyStructureGroup.structureSet.length === 0) {
            gameMessageSystem.pushMessage('The enemy lost all Ideas.');
            currentGameState = gameStates.gameOver;
            return;
        }
        if (myStructureGroup.structureSet.length === 0) {
            gameMessageSystem.pushMessage('You lost all Ideas.');
            currentGameState = gameStates.gameOver;
            return;
        }
    });
    gameStates.gameOver = new GameState((state) => {
        if (state.properFrameCount === 0) {
            gameMessageSystem.pushMessage('Game over. Press X key to reset.');
        }
        if (keyIsDown(KEY_CODE_X)) {
            initialize();
        }
        state.properFrameCount += 1;
    });
    currentGameState = gameStates.normal;
}
//
// -------------------- Sprite --------------------------------------
//
class CrossReferenceArray extends Array {
    constructor() {
        super();
    }
    static create() {
        return Object.create(CrossReferenceArray.prototype);
    }
    add(element) {
        this.push(element);
        element.belongingArray = this;
    }
}
function updateSprites(array) {
    for (let i = array.length - 1; i >= 0; i -= 1) {
        array[i].update();
    }
}
function drawSprites(array) {
    for (let i = array.length - 1; i >= 0; i -= 1) {
        array[i].draw();
    }
}
function distSq(v1, v2) {
    return sq(v2.x - v1.x) + sq(v2.y - v1.y);
}
class Sprite {
    constructor() {
        // Mandatory properties
        this.position = createVector();
        this.velocity = createVector();
        this.displaySize = 10;
        this.displayColor = color(random(255), random(255), random(255));
        this.drawSprite = (sprite) => {
            noStroke();
            fill(sprite.displayColor);
            ellipse(sprite.position.x, sprite.position.y, sprite.displaySize, sprite.displaySize);
        };
        // Optional properties etc.
        this.behaviorList = [];
        this.initialize();
        // Implementation of interface
        this.belongingArray = null;
    }
    initialize() {
        // mandatory properties will not be reset here as they should be reset manually
        this.belongingArray = null;
        this.behaviorList.length = 0; // clear the array
        this.destructionBehavior = null;
        this.friction = 0;
        this.collisionRadius = 10;
        this.isRotatable = false;
        this.rotationAngle = 0;
        this.rotationVelocity = 0;
        this.immovable = false;
        this.lifespanFrameCount = null;
        this.properFrameCount = 0;
    }
    remove() {
        if (this.destructionBehavior)
            this.destructionBehavior.run(this);
        if (this.belongingArray) {
            const index = this.belongingArray.indexOf(this, 0);
            this.belongingArray.splice(index, 1);
        }
        this.initialize();
    }
    setVelocity(speed, directionAngle) {
        this.velocity.x = speed * cos(directionAngle);
        this.velocity.y = speed * sin(directionAngle);
    }
    fitRotationToVelocity() {
        this.rotationAngle = this.velocity.heading();
    }
    update() {
        this.position.add(this.velocity);
        if (this.isRotatable)
            this.rotationAngle += this.rotationVelocity;
        if (this.friction)
            this.velocity.mult(1 - this.friction);
        if (this.behaviorList.length >= 1) {
            for (const eachBehavior of this.behaviorList) {
                eachBehavior.run(this);
                if (this.behaviorList.length === 0)
                    return; // Sprite may be removed within this loop
            }
        }
        this.properFrameCount += 1;
        if (this.lifespanFrameCount && this.properFrameCount >= this.lifespanFrameCount) {
            this.remove();
            return;
        }
    }
    draw() {
        this.drawSprite(this);
    }
    getProgressRatio() {
        if (!this.lifespanFrameCount)
            return 0;
        return this.properFrameCount / this.lifespanFrameCount;
    }
    isInScreen(margin) {
        const marginLength = this.displaySize + (margin || 0);
        if (this.position.x < -marginLength)
            return false;
        if (this.position.x > width + marginLength)
            return false;
        if (this.position.y < -marginLength)
            return false;
        if (this.position.y > height + marginLength)
            return false;
        return true;
    }
    overlap(other, handleCollision) {
        if (distSq(this.position, other.position) > sq(this.collisionRadius + other.collisionRadius)) {
            return false;
        }
        if (handleCollision)
            handleCollision(this, other);
        return true;
    }
    collide(other, handleCollision) {
        const distanceSquared = distSq(this.position, other.position);
        const collisionDistance = this.collisionRadius + other.collisionRadius;
        if (distanceSquared > sq(collisionDistance)) {
            return false;
        }
        const displacement = useNewVector(other.position.x - this.position.x, other.position.y - this.position.y).normalize().mult(-0.5 * (collisionDistance - sqrt(distanceSquared)));
        if (this.immovable) {
            if (!other.immovable) {
                other.position.sub(displacement);
                other.position.sub(displacement);
            }
        }
        else if (other.immovable) {
            this.position.add(displacement);
            this.position.add(displacement);
        }
        else {
            this.position.add(displacement);
            other.position.sub(displacement);
        }
        vectorPool.recycle(displacement);
        if (handleCollision)
            handleCollision(this, other);
        return true;
    }
    bounce(other, handleCollision) {
        if (!this.collide(other))
            return false;
        const direction = useNewVector(other.position.x - this.position.x, other.position.y - this.position.y).normalize().mult(-1);
        const relativeVelocity = useNewVector(other.velocity.x - this.velocity.x, other.velocity.y - this.velocity.y);
        const velocityChangeMagnitude = p5.Vector.dot(relativeVelocity, direction);
        const velocityChange = direction.mult(velocityChangeMagnitude);
        if (!this.immovable)
            this.velocity.add(velocityChange);
        if (!other.immovable)
            other.velocity.sub(velocityChange);
        vectorPool.recycle(direction);
        vectorPool.recycle(relativeVelocity);
        if (handleCollision)
            handleCollision(this, other);
        return true;
    }
    attract(other, factor) {
        const relativePosition = useNewVector(other.position.x - this.position.x, other.position.y - this.position.y);
        const magnitude = factor / Math.min(1, relativePosition.magSq());
        const direction = relativePosition.normalize();
        const acceleration = direction.mult(magnitude);
        if (!this.immovable)
            this.velocity.add(acceleration);
        if (!other.immovable)
            other.velocity.sub(acceleration);
    }
    attractToPoint(x, y, factor) {
        const relativePosition = useNewVector(x - this.position.x, y - this.position.y);
        const magnitude = factor / Math.min(1, relativePosition.magSq());
        const direction = relativePosition.normalize();
        const acceleration = direction.mult(magnitude);
        if (!this.immovable)
            this.velocity.add(acceleration);
    }
}
//
// -------------------- Idea ----------------------------------------
//
class Idea {
    constructor(name) {
        this.name = name;
        this.fireDirectionType = 0 /* DEFAULT */;
        this.fireSpeed = 800 * unitSpeed;
        this.bulletBehavior = null;
        this.createBullets = Idea.defaultBulletPattern;
        this.fireIntervalFrameCount = 6;
        this.belongingStructure = Structure.nullObject;
        const dummySprite = new Sprite();
        this.node1 = dummySprite;
        this.node2 = dummySprite;
        this.node3 = dummySprite;
        this.isPersistent = false;
        this.removingAction = (idea) => { };
        this.structureLevelEffect = {
            viewInfo: false,
            continuousHealing: false,
            continuousDamage: false,
            protection: false,
        };
        this.fireCount = 0;
    }
    static initializeStatic() {
        this.defaultBulletPattern = (idea, directionAngle) => {
            const strong = idea.fireCount % 8 === 0;
            idea.createBullet(strong, directionAngle);
        };
    }
    clone() {
        const newIdea = new Idea('');
        const properties = Object.keys(this);
        for (let i = 0, len = properties.length; i < len; i += 1) {
            newIdea[properties[i]] = this[properties[i]];
        }
        return newIdea;
    }
    setFireDirectionType(type) {
        this.fireDirectionType = type;
        return this;
    }
    setFireSpeed(speed) {
        this.fireSpeed = speed;
        return this;
    }
    setBulletBehavior(behavior) {
        this.bulletBehavior = behavior;
        return this;
    }
    setBulletPattern(pattern) {
        this.createBullets = pattern;
        return this;
    }
    setFireInterval(frames) {
        this.fireIntervalFrameCount = Math.max(1, Math.floor(frames));
        return this;
    }
    setPersistent() {
        this.isPersistent = true;
        return this;
    }
    setStructureLevelEffect(name) {
        this.structureLevelEffect[name] = true;
        return this;
    }
    setRare() {
        this.isRare = true;
        return this;
    }
    setRemovingAction(action) {
        this.removingAction = action;
        return this;
    }
    // public setStrongShotIndicatorArray(bitString: string): Idea {
    //   const binaryNumber = Number.parseInt(bitString, 2);
    //   for (let i = 0, len = bitString.length; i < len; i += 1) {
    //     this.strongShotIndicatorArray.unshift(Boolean((binaryNumber >> i) & 1));
    //   }
    //   return this;
    // }
    fire(directionAngle) {
        if (this.belongingStructure.properFrameCount % this.fireIntervalFrameCount === 0) {
            this.createBullets(this, directionAngle);
            this.fireCount += 1;
        }
    }
    createBullet(strong, directionAngle, speedFactor = 1, offsetX = 0, offsetY = 0) {
        const newBullet = useNewBullet();
        newBullet.position.set(this.belongingStructure.position.x + offsetX, this.belongingStructure.position.y + offsetY);
        newBullet.setVelocity(speedFactor * this.fireSpeed, directionAngle);
        newBullet.fitRotationToVelocity();
        newBullet.drawSprite = drawBullet;
        const group = this.belongingStructure.parentGroup;
        if (strong) {
            newBullet.damagePoint = 50;
            newBullet.graphics = group.strongShotBulletGraphics;
        }
        else {
            newBullet.damagePoint = 5;
            newBullet.graphics = group.weakShotBulletGraphics;
        }
        if (this.bulletBehavior)
            newBullet.behaviorList.push(this.bulletBehavior);
        this.belongingStructure.parentGroup.addBullet(newBullet);
    }
    getFireDirectionAngle() {
        if (!this.belongingStructure)
            return 0;
        const structure = this.belongingStructure;
        switch (this.fireDirectionType) {
            case 1 /* FIXED */:
                return structure.parentGroup.facingDirectionAngle;
            case 2 /* RANDOM */:
                return Math.random() * TWO_PI;
            case 3 /* NOISE */:
                return noise(0.01 * frameCount) * TWO_PI + HALF_PI;
            case 4 /* AIM_NEAREST */:
                if (structure.nearestEnemy) {
                    return getDirectionAngle(structure.position, structure.nearestEnemy.position);
                }
                return structure.parentGroup.facingDirectionAngle;
            case 5 /* AIM_FAREST */:
                if (structure.farestEnemy) {
                    return getDirectionAngle(structure.position, structure.farestEnemy.position);
                }
                return structure.parentGroup.facingDirectionAngle;
            default:
                return 0;
        }
    }
    refers(node) {
        return (node === this.node1 || node === this.node2 || node === this.node3);
    }
    setBelongingStructure(structure) {
        this.belongingStructure = structure;
        // set nodes
        const nodeCount = structure.nodeSprites.length;
        this.node1 = structure.nodeSprites[Math.floor(Math.random() * (nodeCount - 2))];
        this.node2 = structure.nodeSprites[nodeCount - 2];
        this.node3 = structure.nodeSprites[nodeCount - 1];
        this.updateDefaultAimDirectionAngle();
    }
    updateDefaultAimDirectionAngle() {
        if (this.bulletBehavior instanceof BulletGoForwardBehavior &&
            this.belongingStructure &&
            this.belongingStructure.parentGroup) {
            this.bulletBehavior = new BulletGoForwardBehavior(this.belongingStructure.parentGroup.facingDirectionAngle);
        }
    }
    update() {
        this.node1.bounce(this.node2);
        this.node2.bounce(this.node3);
        this.node3.bounce(this.node1);
    }
    drawShape() {
        triangle(this.node1.position.x, this.node1.position.y, this.node2.position.x, this.node2.position.y, this.node3.position.x, this.node3.position.y);
    }
}
class IdeaQueue {
    constructor() {
        this.array = [];
        this.defaultFireDirectionSubsetArray = [];
        this.nonDefaultFireDirectionSubsetArray = [];
        this.structureLevelEffect = {
            viewInfo: false,
            continuousHealing: false,
            continuousDamage: false,
            protection: false,
        };
    }
    static initializeStatic() {
        this.defaultFireDirectionOffsetAngleArray = [
            [],
            [0],
            [radians(-10), radians(10)],
            [radians(-120), 0, radians(120)],
            [radians(-110), radians(-15), radians(15), radians(110)],
        ];
    }
    enqueue(idea) {
        this.array.push(idea);
        this.updateStructureLevelEffect();
        this.updateSubsetArrays();
    }
    dequeue() {
        const len = this.array.length;
        if (len === 0)
            return null;
        let removedIdea = undefined;
        // remove the first non-persistent Idea
        for (let i = 0; i < len; i += 1) {
            if (!this.array[i].isPersistent) {
                removedIdea = this.array.splice(i, 1)[0];
                break;
            }
        }
        if (!removedIdea)
            removedIdea = this.array.splice(0, 1)[0]; // remove the first persistent Idea
        this.updateStructureLevelEffect();
        this.updateSubsetArrays();
        return removedIdea;
    }
    updateSubsetArrays() {
        this.defaultFireDirectionSubsetArray.length = 0;
        this.nonDefaultFireDirectionSubsetArray.length = 0;
        for (const eachIdea of this.array) {
            if (eachIdea.fireDirectionType === 0 /* DEFAULT */) {
                this.defaultFireDirectionSubsetArray.push(eachIdea);
            }
            else {
                this.nonDefaultFireDirectionSubsetArray.push(eachIdea);
            }
        }
    }
    updateStructureLevelEffect() {
        for (const eachIdea of this.array) {
            const properties = Object.keys(this.structureLevelEffect);
            for (const property of properties) {
                this.structureLevelEffect[property]
                    = this.structureLevelEffect[property] | eachIdea.structureLevelEffect[property];
            }
        }
    }
    contains(name) {
        for (const eachIdea of this.array) {
            if (eachIdea.name === name)
                return true;
        }
        return false;
    }
    refers(node) {
        for (const eachIdea of this.array) {
            if (eachIdea.refers(node))
                return true;
        }
        return false;
    }
    get length() {
        return this.array.length;
    }
    update() {
        for (const eachIdea of this.array) {
            eachIdea.update();
        }
    }
    drawShapes() {
        for (const eachIdea of this.array) {
            eachIdea.drawShape();
        }
    }
    fire(directionAngle) {
        this.fireDefaultFireDirectionIdeas(directionAngle);
        this.fireNonDefaultFireDirectionIdeas();
    }
    fireDefaultFireDirectionIdeas(directionAngle) {
        const len = this.defaultFireDirectionSubsetArray.length;
        if (len === 0)
            return;
        if (len <= 4) {
            for (let i = len - 1; i >= 0; i -= 1) {
                this.defaultFireDirectionSubsetArray[i].fire(directionAngle + IdeaQueue.defaultFireDirectionOffsetAngleArray[len][i]);
            }
        }
        else {
            const fireDirectionAngleInterval = TWO_PI / len;
            let fireDirectionAngle = directionAngle;
            for (let i = len - 1; i >= 0; i -= 1) {
                this.defaultFireDirectionSubsetArray[i].fire(fireDirectionAngle);
                fireDirectionAngle += fireDirectionAngleInterval;
            }
        }
    }
    fireNonDefaultFireDirectionIdeas() {
        const len = this.nonDefaultFireDirectionSubsetArray.length;
        for (let i = len - 1; i >= 0; i -= 1) {
            this.nonDefaultFireDirectionSubsetArray[i].fire(this.nonDefaultFireDirectionSubsetArray[i].getFireDirectionAngle());
        }
    }
    setDefaultAimDirectionAngle() {
        for (let i = this.array.length - 1; i >= 0; i -= 1) {
            this.array[i].updateDefaultAimDirectionAngle();
        }
    }
    recycleAllIdeas() {
        for (let i = this.array.length - 1; i >= 0; i -= 1) {
            ideaSet.push(this.array[i]);
        }
        this.array.length = 0;
    }
}
class IdeaSet {
    constructor(initialIdeas) {
        this.array = [];
        arrayCopy(initialIdeas, this.array);
        this.updateSubsetArray();
    }
    push(idea) {
        this.array.push(idea);
        this.updateSubsetArray();
    }
    pop(index) {
        const selectedIdea = this.array.splice(index, 1)[0];
        this.updateSubsetArray();
        return selectedIdea;
    }
    popRandomSet(ideaCount, rare) {
        const newArray = [];
        for (let i = 0; i < ideaCount; i += 1) {
            const newIdea = this.popRandom(rare);
            if (!newIdea)
                break;
            newArray.push(newIdea);
        }
        return newArray;
    }
    updateSubsetArray() {
        this.rareSubsetArray = this.array.filter((idea) => { return idea.isRare; });
        this.nonRareSubsetArray = this.array.filter((idea) => { return !idea.isRare; });
    }
    popRandom(rare) {
        if (rare === undefined) {
            if (this.array.length === 0)
                return null;
            return this.pop(Math.floor(Math.random() * this.array.length));
        }
        const subsetArray = rare ? this.rareSubsetArray : this.nonRareSubsetArray;
        if (subsetArray.length === 0)
            return null;
        const selectedIdea = subsetArray[Math.floor(Math.random() * subsetArray.length)];
        return this.pop(this.array.indexOf(selectedIdea));
    }
}
class FloatingIdea extends Sprite {
    constructor(idea, previousStructure) {
        super();
        this.idea = idea;
        this.acceleration = createVector();
        this.position.set(previousStructure.position.x, previousStructure.position.y);
        const directionAngle = previousStructure.parentGroup.facingDirectionAngle + random(-HALF_PI, HALF_PI);
        const speed = 400 * unitSpeed;
        this.setVelocity(speed, directionAngle);
        this.displaySize = 30 * unitLength;
        this.drawSprite = FloatingIdea.staticDraw;
        this.behaviorList.push(FloatingIdea.staticBehavior);
        this.collisionRadius = 20 * unitLength;
        this.isRotatable = true;
        this.rotationVelocity = 0.5 * UNIT_ANGLE_VELOCITY;
        this.friction = 0.05;
    }
    static initializeStatic() {
        this.staticDraw = (sprite) => {
            translate(sprite.position.x, sprite.position.y);
            rotate(sprite.rotationAngle);
            stroke(sprite.displayColor);
            fill(colorAlpha(sprite.displayColor, 32));
            drawRegularTriangle(sprite.displaySize);
            rotate(-sprite.rotationAngle);
            translate(-sprite.position.x, -sprite.position.y);
        };
        this.staticBehavior = {
            run(floatingIdea) {
                // Move
                floatingIdea.velocity.add(floatingIdea.acceleration);
                // Attract to nearest structure
                let nearestDistanceSquared = 0;
                let nearestStructure = null;
                for (const eachStructure of floatingIdea.belongingGroup.structureSet) {
                    const distanceSquared = distSq(floatingIdea.position, eachStructure.position);
                    if (!nearestStructure || distanceSquared < nearestDistanceSquared) {
                        nearestDistanceSquared = distanceSquared;
                        nearestStructure = eachStructure;
                    }
                }
                if (nearestStructure &&
                    distSq(floatingIdea.position, nearestStructure.position) < sq(160 * unitLength)) {
                    floatingIdea.attract(nearestStructure.coreSprite, 0.2);
                }
                // Recycle if out of screen
                if (!floatingIdea.isInScreen()) {
                    ideaSet.push(floatingIdea.idea);
                    floatingIdea.remove();
                }
            },
        };
    }
    setBelongingGroup(group) {
        this.belongingGroup = group;
        this.acceleration.set(3 * cos(group.facingDirectionAngle + PI) * unitSpeed, 3 * sin(group.facingDirectionAngle + PI) * unitSpeed);
        this.displayColor = group.mainColor;
    }
}
class Bullet extends Sprite {
    constructor() {
        super();
        this.damagePoint = 1;
        this.initialize();
    }
    static initializeStatic() {
        this.staticBehaviorList = [];
        this.staticBehaviorList.push(new DieIfOutOfScreenBehavior(0));
        this.staticDestructionBehavior = new BulletDestructionBehavior();
    }
    initialize() {
        super.initialize();
        arrayCopy(Bullet.staticBehaviorList, this.behaviorList);
        this.collisionRadius = this.displaySize * 0.5;
        this.isRotatable = true;
        this.destructionBehavior = Bullet.staticDestructionBehavior;
    }
}
//
// -------------------- Object Pool -----------------------------------
//
let vectorPool;
let spritePool;
let bulletPool;
function initializeObjectPools() {
    spritePool = deePool.create(() => { return new Sprite(); });
    spritePool.grow(1024);
    vectorPool = deePool.create(() => { return createVector(); });
    vectorPool.grow(1024);
    bulletPool = deePool.create(() => { return new Bullet(); });
    bulletPool.grow(1024);
}
function useNewVector(x, y) {
    const newVector = vectorPool.use();
    newVector.x = x;
    newVector.y = y;
    return newVector;
}
function cloneVector(v) {
    const newVector = vectorPool.use();
    newVector.x = v.x;
    newVector.y = v.y;
    return newVector;
}
function useNewSprite(x, y) {
    const newSprite = spritePool.use();
    if (x)
        newSprite.position.x = x;
    if (y)
        newSprite.position.y = y;
    return newSprite;
}
function removeSprite(sprite) {
    sprite.remove();
    spritePool.recycle(sprite);
}
function useNewBullet(x, y) {
    const newBullet = bulletPool.use();
    if (x)
        newBullet.position.x = x;
    if (y)
        newBullet.position.y = y;
    return newBullet;
}
function removeBullet(bullet) {
    bullet.remove();
    bulletPool.recycle(bullet);
}
function copySprite(from, to) {
    // Mandatory properties
    to.position.set(from.position);
    to.velocity.set(from.velocity);
    to.displaySize = from.displaySize;
    to.displayColor = from.displayColor;
    to.drawSprite = from.drawSprite;
    // Optional properties
    arrayCopy(from.behaviorList, to.behaviorList);
    to.destructionBehavior = from.destructionBehavior;
    to.friction = from.friction;
    to.collisionRadius = from.collisionRadius;
    to.isRotatable = from.isRotatable;
    to.rotationAngle = from.rotationAngle;
    to.rotationVelocity = from.rotationVelocity;
    to.immovable = from.immovable;
    to.lifespanFrameCount = from.lifespanFrameCount;
}
function prepareIdeas() {
    const ideaList = [];
    const createIdea = (name) => {
        const newIdea = new Idea(name);
        ideaList.push(newIdea);
        return newIdea;
    };
    const copyIdea = (baseIdea, name) => {
        const newIdea = baseIdea.clone();
        newIdea.name = name;
        ideaList.push(newIdea);
        return newIdea;
    };
    const nullBehavior = {
        run(sprite) { },
    };
    const createRadialBulletPattern = (wayCount) => {
        return (idea, directionAngle) => {
            const strong = idea.fireCount % 5 === 0;
            const angleInterval = TWO_PI / wayCount;
            for (let i = 0; i < wayCount; i += 1) {
                idea.createBullet(strong, directionAngle + i * angleInterval);
            }
        };
    };
    // const createSimpleBulletPattern = (strongShotInterval: number): BulletPattern => {
    //   return (idea: Idea, directionAngle: number) => {
    //     const strong = idea.fireCount % strongShotInterval === 0;
    //     idea.createBullet(strong, directionAngle);
    //   };
    // };
    const createLinearBulletPattern = (bulletCount, minSpeedFactor) => {
        const speedFactorChange = (1 - minSpeedFactor) / bulletCount;
        return (idea, directionAngle) => {
            let speedFactor = 1;
            const angle = idea.belongingStructure.parentGroup.facingDirectionAngle + random(-HALF_PI, HALF_PI);
            const distance = 0.7 * idea.belongingStructure.shellRadius;
            for (let i = 0; i < bulletCount; i += 1) {
                idea.createBullet(i === 0, directionAngle, speedFactor, distance * cos(angle), distance * sin(angle));
                speedFactor -= speedFactorChange;
            }
        };
    };
    createIdea('emptiness')
        .setPersistent()
        .setFireDirectionType(1 /* FIXED */)
        .setRare()
        .setBulletPattern((idea, directionAngle) => { })
        .setRemovingAction((idea) => {
        gameMessageSystem.pushMessage('Effect of the Idea of emptiness was triggered.');
        for (let i = 0; i < 12; i += 1) {
            const newIdea = ideaSet.popRandom();
            if (!newIdea)
                break;
            idea.belongingStructure.addIdea(newIdea);
        }
        screenFlash.set(128, 1);
    });
    const defaultIdea = new Idea('dummy')
        .setFireSpeed(400 * unitSpeed)
        .setBulletBehavior(new BulletGoForwardBehavior(HALF_PI));
    copyIdea(defaultIdea, 'beauty');
    copyIdea(defaultIdea, 'justice');
    copyIdea(defaultIdea, 'victory');
    copyIdea(defaultIdea, 'truth')
        .setStructureLevelEffect('viewInfo');
    copyIdea(defaultIdea, 'knowledge')
        .setStructureLevelEffect('viewInfo');
    copyIdea(defaultIdea, 'civilization');
    copyIdea(defaultIdea, 'harmony');
    copyIdea(defaultIdea, 'freedom');
    copyIdea(defaultIdea, 'life')
        .setStructureLevelEffect('continuousHealing');
    copyIdea(defaultIdea, 'wealth');
    copyIdea(defaultIdea, 'purity');
    copyIdea(defaultIdea, 'hope');
    copyIdea(defaultIdea, 'order');
    createIdea('destiny')
        .setFireDirectionType(5 /* AIM_FAREST */)
        .setFireInterval(120)
        .setBulletBehavior(new BrakeAccelBehavior(15, 0.15, 30 * unitSpeed))
        .setRare()
        .setBulletPattern((idea, directionAngle) => {
        for (let i = 0; i < 64; i += 1) {
            const angle = Math.random() * TWO_PI;
            const distance = (Math.random() * 80) * unitLength;
            idea.createBullet(true, directionAngle + random(radians(-5), radians(5)), 1, distance * cos(angle), distance * sin(angle));
        }
    });
    const deceleration = new DecelerateBehavior(0.02, 200 * unitSpeed);
    createIdea('faith')
        .setStructureLevelEffect('continuousHealing')
        .setFireDirectionType(5 /* AIM_FAREST */)
        .setFireSpeed(600 * unitSpeed)
        .setBulletBehavior(deceleration);
    createIdea('wisdom')
        .setStructureLevelEffect('viewInfo')
        .setFireDirectionType(5 /* AIM_FAREST */)
        .setFireSpeed(800 * unitSpeed)
        .setBulletBehavior(deceleration);
    const hatred = createIdea('hatred')
        .setStructureLevelEffect('continuousDamage')
        .setFireDirectionType(4 /* AIM_NEAREST */)
        .setFireSpeed(400 * unitSpeed)
        .setBulletBehavior(deceleration);
    copyIdea(hatred, 'sacrifice');
    const revolution = createIdea('revolution')
        .setRare()
        .setFireDirectionType(5 /* AIM_FAREST */)
        .setFireSpeed(600 * unitSpeed)
        .setBulletBehavior(deceleration)
        .setFireInterval(60)
        .setBulletPattern(createLinearBulletPattern(7, 0.2));
    copyIdea(revolution, 'rebellion')
        .setFireDirectionType(4 /* AIM_NEAREST */);
    const randomWalk = {
        run(sprite) {
            sprite.velocity.rotate((noise(0.1 * sprite.properFrameCount) - 0.5) * 0.01 * TWO_PI);
            sprite.fitRotationToVelocity();
        },
    };
    const insanity = createIdea('insanity')
        .setFireDirectionType(3 /* NOISE */)
        .setBulletBehavior(randomWalk)
        .setFireSpeed(100 * unitSpeed)
        .setFireInterval(10)
        .setRare()
        .setBulletPattern(createRadialBulletPattern(3));
    copyIdea(insanity, 'chaos');
    const peace = createIdea('peace')
        .setFireDirectionType(5 /* AIM_FAREST */)
        .setBulletBehavior(new BrakeAccelBehavior(15, 0.1, 20 * unitSpeed));
    copyIdea(peace, 'silence')
        .setBulletBehavior(new BrakeAccelBehavior(20, 0.1, 20 * unitSpeed));
    copyIdea(peace, 'oblivion')
        .setBulletBehavior(new BrakeAccelBehavior(25, 0.1, 20 * unitSpeed));
    peace
        .setStructureLevelEffect('continuousHealing');
    const solitude = createIdea('solitude')
        .setFireDirectionType(4 /* AIM_NEAREST */)
        .setBulletBehavior(new BrakeAccelBehavior(30, 0.1, 20 * unitSpeed));
    copyIdea(solitude, 'sorrow')
        .setBulletBehavior(new BrakeAccelBehavior(35, 0.1, 20 * unitSpeed));
    copyIdea(solitude, 'sin')
        .setBulletBehavior(new BrakeAccelBehavior(40, 0.1, 20 * unitSpeed));
    const complexFire = (idea, directionAngle) => {
        if (!idea.belongingStructure)
            return;
        const strong = idea.fireCount % 14 === 0;
        const angle = ((0.3 * frameCount) / IDEAL_FRAME_RATE) * TWO_PI;
        const angle2 = -((1.1 * frameCount) / IDEAL_FRAME_RATE) * TWO_PI;
        const distance2 = 30 * unitLength;
        const distance = (idea.belongingStructure) ? idea.belongingStructure.shellRadius : 1
            + 2 * distance2;
        idea.createBullet(strong, directionAngle, 1, distance * cos(angle) + distance2 * cos(angle2), distance * sin(angle) + distance2 * sin(angle2));
    };
    createIdea('ephemerality')
        .setFireDirectionType(1 /* FIXED */)
        .setBulletBehavior(new BrakeAccelBehavior(60, 0.1, 9 * unitSpeed))
        .setFireSpeed(200 * unitSpeed)
        .setFireInterval(2)
        .setRare()
        .setBulletPattern(complexFire);
    createIdea('phantasm')
        .setFireDirectionType(5 /* AIM_FAREST */)
        .setBulletBehavior(new BrakeAccelBehavior(15, 0.1, 6 * unitSpeed))
        .setFireSpeed(100 * unitSpeed)
        .setFireInterval(2)
        .setRare()
        .setBulletPattern(complexFire);
    createIdea('spirit')
        .setFireDirectionType(4 /* AIM_NEAREST */)
        .setBulletBehavior(new AccelerateBehavior(3 * unitSpeed))
        .setFireSpeed(1 * unitSpeed)
        .setFireInterval(2)
        .setRare()
        .setBulletPattern(complexFire);
    createIdea('sun')
        .setFireDirectionType(3 /* NOISE */)
        .setBulletBehavior(nullBehavior)
        .setFireSpeed(160 * unitSpeed)
        .setRare()
        .setBulletPattern(createRadialBulletPattern(7));
    createIdea('moon')
        .setFireDirectionType(5 /* AIM_FAREST */)
        .setBulletBehavior(nullBehavior)
        .setFireSpeed(400 * unitSpeed)
        .setRare()
        .setBulletPattern((idea, directionAngle) => {
        const strong = idea.fireCount % 10 === 0;
        const angleInterval = radians(2);
        for (let i = -1; i < 2; i += 1) {
            idea.createBullet(strong, directionAngle + i * angleInterval);
        }
    });
    createIdea('star')
        .setFireDirectionType(2 /* RANDOM */)
        .setBulletBehavior(new BrakeAccelBehavior(15, 0.15, 3 * unitSpeed))
        .setFireSpeed(160 * unitSpeed)
        .setRare()
        .setFireInterval(6)
        .setBulletPattern(createRadialBulletPattern(5));
    const createSideGunsPattern = (distance) => {
        return (idea, directionAngle) => {
            const strong = idea.fireCount % 8 === 0;
            idea.createBullet(strong, directionAngle, 1, -distance);
            idea.createBullet(strong, directionAngle, 1, +distance);
        };
    };
    createIdea('absolute')
        .setStructureLevelEffect('protection')
        .setFireDirectionType(1 /* FIXED */)
        .setBulletBehavior(deceleration)
        .setBulletPattern(createSideGunsPattern(15 * unitLength));
    createIdea('eternity')
        .setStructureLevelEffect('protection')
        .setFireDirectionType(1 /* FIXED */)
        .setBulletBehavior(deceleration)
        .setBulletPattern(createSideGunsPattern(30 * unitLength));
    createIdea('infinity')
        .setStructureLevelEffect('continuousHealing')
        .setFireDirectionType(1 /* FIXED */)
        .setBulletBehavior(deceleration)
        .setBulletPattern(createSideGunsPattern(45 * unitLength));
    return ideaList;
}
//
// -------------------- Main --------------------------------------
//
/// <reference path="..\..\my_types\deePool\deePool.d.ts" />
/// <reference path="..\..\my_types\p5\p5.global-mode.d.ts" />
p5.disableFriendlyErrors = true;
const SKETCH_NAME = 'CollapsingIdeas';
const USE_WEB_FONT = false;
const IDEAL_FRAME_RATE = 60;
const UNIT_ANGLE_VELOCITY = (2 * Math.PI) / IDEAL_FRAME_RATE;
const ONE_AND_HALF_PI = 1.5 * Math.PI;
const ROOT_THREE = 1.73205080757;
const KEY_CODE_Z = 90;
const KEY_CODE_X = 88;
const KEY_CODE_C = 67;
const KEY_CODE_P = 80;
const KEY_CODE_SPACE = 32;
let canvasSize;
let unitLength;
let unitSpeed;
let myStructure;
let myStructureGroup;
let enemyStructureGroup;
const effectSpriteSet = CrossReferenceArray.create();
let ideaSet;
let gameMessageSystem;
const fontPath = 'Ubuntu-Regular.ttf';
const fontName = 'Ubuntu';
let currentFont;
let currentFontSize;
const keyDown = Array(100).fill(false);
let node;
let canvas;
const screenShake = {
    value: 0,
    offsetX: 0,
    offsetY: 0,
    apply() {
        if (this.value === 0)
            return;
        this.offsetX = Math.random() * this.value;
        this.offsetY = Math.random() * this.value;
        translate(this.offsetX, this.offsetY);
        this.value = this.value * 0.95;
        if (this.value < 1)
            this.value = 0;
    },
    set(value) {
        this.value = Math.max(this.value, value);
    },
    cancel() {
        translate(-this.offsetX, -this.offsetY);
    },
};
const screenFlash = {
    value: 0,
    valueChange: 0,
    apply() {
        if (this.value === 0)
            return;
        noStroke();
        fill(255, this.value);
        rect(0, 0, width, height);
        this.value -= this.valueChange;
        if (this.value < 1)
            this.value = 0;
    },
    set(value, durationSeconds) {
        this.value = value;
        this.valueChange = value / (durationSeconds * IDEAL_FRAME_RATE);
    },
};
// ---------- Utility --------------- //
function colorAlpha(c, alphaValue) {
    return color(red(c), green(c), blue(c), alpha(c) * alphaValue / 255);
}
function getDirectionAngle(from, to) {
    return atan2(to.y - from.y, to.x - from.x);
}
function drawRegularTriangle(shapeSize) {
    triangle(0, (-2 / 3) * shapeSize, -(1 / ROOT_THREE) * shapeSize, (1 / 3) * shapeSize, +(1 / ROOT_THREE) * shapeSize, (1 / 3) * shapeSize);
}
// ---------- Drawing implementations for Sprite --------------- //
function drawNode(sprite) {
    noStroke();
    fill(sprite.displayColor);
    ellipse(sprite.position.x, sprite.position.y, sprite.displaySize, sprite.displaySize);
}
function drawCore(sprite) {
    stroke(sprite.displayColor);
    fill(colorAlpha(sprite.displayColor, 32));
    ellipse(sprite.position.x, sprite.position.y, sprite.displaySize, sprite.displaySize);
}
function drawBullet(sprite) {
    const position = sprite.position;
    translate(position.x, position.y);
    rotate(sprite.rotationAngle + HALF_PI);
    image(sprite.graphics, 0, 0);
    rotate(-(sprite.rotationAngle + HALF_PI));
    translate(-position.x, -position.y);
}
function drawParticle(sprite) {
    const position = sprite.position;
    stroke(colorAlpha(sprite.displayColor, 255 * (1 - sprite.getProgressRatio())));
    noFill();
    translate(position.x, position.y);
    rotate(sprite.rotationAngle);
    drawRegularTriangle(sprite.displaySize);
    rotate(-sprite.rotationAngle);
    translate(-position.x, -position.y);
}
function drawBossShadow(sprite) {
    const progressRatio = sprite.getProgressRatio();
    noStroke();
    fill(colorAlpha(sprite.displayColor, progressRatio * 64));
    const angleInterval = TWO_PI / 5;
    const angleOffset = (frameCount / 60) * TWO_PI;
    const distance = (1 - progressRatio) * sprite.displaySize;
    const diameter = progressRatio * sprite.displaySize;
    for (let i = 0; i < 5; i += 1) {
        const offsetX = distance * cos(i * angleInterval + angleOffset);
        const offsetY = distance * sin(i * angleInterval + angleOffset);
        ellipse(sprite.position.x + offsetX, sprite.position.y + offsetY, 0.7 * diameter, 0.7 * diameter);
        ellipse(sprite.position.x + offsetX, sprite.position.y + offsetY, diameter, diameter);
    }
}
function createDrawRiplleFunction(startSizeFactor, endSizeFactor, startStrokeWeight, startFillAlpha) {
    const sizeFactorChange = endSizeFactor - startSizeFactor;
    return (sprite) => {
        const progressRatio = sprite.getProgressRatio();
        const fadeRatio = 1 - progressRatio;
        const diameter = (startSizeFactor + sizeFactorChange * (pow(progressRatio - 1, 5) + 1)) * sprite.displaySize;
        stroke(colorAlpha(sprite.displayColor, fadeRatio * 255));
        strokeWeight(fadeRatio * startStrokeWeight * unitLength);
        fill(colorAlpha(sprite.displayColor, fadeRatio * startFillAlpha));
        ellipse(sprite.position.x, sprite.position.y, diameter, diameter);
        strokeWeight(1 * unitLength);
    };
}
const drawExpandingRipple = createDrawRiplleFunction(0, 1, 2, 16);
const drawShrinkingRipple = createDrawRiplleFunction(1, 0, 1, 16);
// ---------- Behavior implementations for Sprite --------------- //
class DieIfOutOfScreenBehavior {
    constructor(margin) {
        this.margin = margin;
    }
    run(sprite) {
        if (!sprite.isInScreen(this.margin)) {
            if (sprite instanceof Bullet) {
                removeBullet(sprite);
            }
            else {
                removeSprite(sprite);
            }
        }
    }
}
class BulletGoForwardBehavior {
    constructor(directionAngle) {
        this.directionAngle = directionAngle;
        this.acceleration = 10 * unitSpeed;
        this.triggerFrameCount = 4;
    }
    run(sprite) {
        if (sprite.properFrameCount === this.triggerFrameCount) {
            sprite.setVelocity(sprite.velocity.mag(), this.directionAngle);
            sprite.rotationAngle = this.directionAngle;
            return;
        }
        if (sprite.properFrameCount > this.triggerFrameCount) {
            sprite.velocity.setMag(sprite.velocity.mag() + this.acceleration);
        }
        // if (sprite.properFrameCount < 4) return;
        // let targetAngleDisplacement = (THREE_QUARTER_PI - sprite.velocity.heading());
        // if (targetAngleDisplacement > PI) targetAngleDisplacement -= TWO_PI;
        // if (targetAngleDisplacement === 0) return;
        // if (abs(targetAngleDisplacement) < radians(1))
        //   sprite.velocity.rotate(targetAngleDisplacement);
        // else sprite.velocity.rotate(0.6 * targetAngleDisplacement);
        // sprite.fitRotationToVelocity();
    }
}
class AccelerateBehavior {
    constructor(acceleration) {
        this.acceleration = acceleration;
    }
    run(sprite) {
        sprite.velocity.setMag(sprite.velocity.mag() + this.acceleration);
    }
}
class DecelerateBehavior {
    constructor(friction, terminalSpeed) {
        this.decelerationFactor = 1 - friction;
        this.terminalSpeed = terminalSpeed;
        this.terminalSpeedSquared = sq(terminalSpeed);
    }
    run(sprite) {
        const speedSquared = sprite.velocity.magSq();
        if (speedSquared > this.terminalSpeedSquared)
            sprite.velocity.mult(this.decelerationFactor);
        if (speedSquared < this.terminalSpeedSquared)
            sprite.velocity.setMag(this.terminalSpeed);
    }
}
class BrakeAccelBehavior {
    constructor(frameCountThreshold, friction, acceleration) {
        this.frameCountThreshold = frameCountThreshold;
        this.acceleration = acceleration;
        this.decelerationFactor = 1 - friction;
    }
    run(sprite) {
        if (sprite.properFrameCount < this.frameCountThreshold) {
            sprite.velocity.mult(this.decelerationFactor);
        }
        else {
            sprite.velocity.setMag(sprite.velocity.mag() + this.acceleration);
        }
    }
}
class BulletDestructionBehavior {
    run(sprite) {
        if (!sprite.isInScreen())
            return;
        createParticles(sprite.position.x, sprite.position.y, 360 * unitSpeed, 10, 0.5 * IDEAL_FRAME_RATE, 3);
    }
}
// ---------- Sprite creating functions --------------- //
const dieIfOutOfScreen = new DieIfOutOfScreenBehavior(0);
function createParticles(x, y, maxSpeed, particleSize, lifespan, particleCount) {
    const particleColor = color(128);
    for (let i = 0; i < particleCount; i += 1) {
        const newParticle = useNewSprite(x, y);
        const speed = (0.2 + 0.8 * Math.random()) * maxSpeed;
        const directionAngle = Math.random() * TWO_PI;
        newParticle.setVelocity(speed, directionAngle);
        newParticle.displaySize = particleSize;
        newParticle.displayColor = particleColor;
        newParticle.drawSprite = drawParticle;
        newParticle.behaviorList.push(dieIfOutOfScreen);
        newParticle.friction = 0.05;
        newParticle.isRotatable = true;
        newParticle.rotationAngle = 0;
        newParticle.rotationVelocity = 1 * UNIT_ANGLE_VELOCITY;
        newParticle.lifespanFrameCount = lifespan;
        effectSpriteSet.add(newParticle);
    }
}
function createNonMovingEffect(x, y, effectColor, effectSize, lifespan, effectDrawFunction) {
    const newEffect = useNewSprite(x, y);
    newEffect.velocity.set(0, 0);
    newEffect.displayColor = effectColor;
    newEffect.displaySize = effectSize;
    newEffect.drawSprite = effectDrawFunction;
    newEffect.lifespanFrameCount = lifespan;
    effectSpriteSet.add(newEffect);
}
// ---------- Enemy creating function ------------------------------//
const defaultEnemyAction = {
    run: (structure) => {
        const frame = structure.properFrameCount;
        structure.coreSprite.velocity.y += 5 * unitSpeed;
        if (frame === 0)
            structure.coreSprite.velocity.y = 400 * unitSpeed;
        if (frame < 60)
            return;
        if (frame < 600) {
            if (frame % 90 < 30)
                structure.fire();
        }
        else {
            structure.coreSprite.velocity.y += 50 * unitSpeed;
            if (structure.position.y >= 1.5 * height)
                structure.remove();
        }
    },
};
function createEnemy() {
    if (ideaSet.nonRareSubsetArray.length < 2)
        return;
    const enemy = new Structure({
        x: random(0.2, 0.8) * width,
        y: -30 * unitLength,
        mainColor: enemyStructureGroup.mainColor,
        initialIdeas: ideaSet.popRandomSet(2, false),
        action: defaultEnemyAction,
    });
    enemyStructureGroup.addStructure(enemy);
}
// ---------- Setup & Draw ----------------------------- //
function preload() {
    if (!USE_WEB_FONT)
        currentFont = loadFont(fontPath);
}
function setup() {
    node = window.document.getElementById(SKETCH_NAME);
    const canvasSize = getCanvasSize();
    canvas = createCanvas(canvasSize.x, canvasSize.y);
    if (node)
        canvas.parent(node);
    frameRate(IDEAL_FRAME_RATE);
    pixelDensity(1);
    Idea.initializeStatic();
    IdeaQueue.initializeStatic();
    Structure.initializeStatic();
    FloatingIdea.initializeStatic();
    Bullet.initializeStatic();
    initialize();
}
function draw() {
    background(248);
    imageMode(CENTER);
    push();
    screenShake.apply();
    updateSprites(effectSpriteSet);
    drawSprites(effectSpriteSet);
    myStructureGroup.act();
    enemyStructureGroup.act();
    myStructureGroup.update();
    enemyStructureGroup.update();
    myStructureGroup.draw();
    enemyStructureGroup.draw();
    myStructureGroup.collide(enemyStructureGroup);
    enemyStructureGroup.collide(myStructureGroup);
    currentGameState.run();
    screenFlash.apply();
    pop();
    imageMode(CORNER);
    gameMessageSystem.update();
    gameMessageSystem.draw();
}
function initialize() {
    unitLength = getCanvasSize().x / 640;
    unitSpeed = unitLength / IDEAL_FRAME_RATE;
    strokeWeight(1 * unitLength);
    currentFontSize = 14 * unitLength;
    textFont(USE_WEB_FONT ? fontName : currentFont, currentFontSize);
    textLeading(currentFontSize * 1.7);
    initializeObjectPools();
    gameMessageSystem = new GameMessageSystem(); // Should be called after setting textFont() etc.
    ideaSet = new IdeaSet(prepareIdeas());
    myStructureGroup = new StructureGroup(color(32, 32, 128), ONE_AND_HALF_PI, 1);
    const actManually = {
        highSpeed: 120 * unitSpeed,
        lowSpeed: 30 * unitSpeed,
        run(structure) {
            let speed;
            if (keyDown[SHIFT]) {
                speed = this.lowSpeed;
                structure.isBlocking = true;
            }
            else {
                speed = this.highSpeed;
                structure.isBlocking = false;
            }
            if (keyDown[LEFT_ARROW]) {
                structure.coreSprite.velocity.x -= speed;
            }
            if (keyDown[RIGHT_ARROW]) {
                structure.coreSprite.velocity.x += speed;
            }
            if (keyDown[UP_ARROW]) {
                structure.coreSprite.velocity.y -= speed;
            }
            if (keyDown[DOWN_ARROW]) {
                structure.coreSprite.velocity.y += speed;
            }
            if (keyDown[KEY_CODE_Z]) {
                structure.fire();
            }
        },
    };
    myStructure = new Structure({
        x: 0.5 * width,
        y: 0.8 * height,
        mainColor: myStructureGroup.mainColor,
        initialIdeas: ideaSet.popRandomSet(3, false),
        action: actManually,
        player: true,
    });
    const constrainPlayerMove = {
        run(sprite) {
            const radius = myStructure.coreRadius;
            sprite.position.x = constrain(sprite.position.x, radius, width - radius);
            sprite.position.y = constrain(sprite.position.y, radius, height - gameMessageSystem.messageWindow.windowHeight - radius);
        },
    };
    myStructure.coreSprite.behaviorList.push(constrainPlayerMove);
    myStructureGroup.addStructure(myStructure);
    enemyStructureGroup = new StructureGroup(color(160, 32, 32), HALF_PI, 0.1);
    myStructureGroup.enemyGroup = enemyStructureGroup;
    enemyStructureGroup.enemyGroup = myStructureGroup;
    const instruction = useNewSprite(0.25 * width, 0.5 * height);
    instruction.velocity.set(0, 0);
    instruction.displayColor = color(0);
    instruction.drawSprite = (sprite) => {
        noStroke();
        fill(sprite.displayColor);
        text('Z key: Shoot\nSHIFT key: Block\nARROW keys: Move', sprite.position.x, sprite.position.y);
    };
    instruction.lifespanFrameCount = 300;
    effectSpriteSet.length = 0;
    effectSpriteSet.add(instruction);
    prepareGameStates();
}
function windowResized() {
    const canvasSize = getCanvasSize();
    resizeCanvas(canvasSize.x, canvasSize.y);
    initialize();
}
function getSketchHolderSize() {
    if (node) {
        const containerRect = node.getBoundingClientRect();
        return { x: containerRect.width, y: containerRect.height };
    }
    return { x: windowWidth, y: windowHeight };
}
// function getFullCanvasSize() {
//   const sketchHolderSize = getSketchHolderSize();
//   return {
//     x: sketchHolderSize.x,
//     y: sketchHolderSize.y,
//   };
// }
function getSquareCanvasSize() {
    const sketchHolderSize = getSketchHolderSize();
    const sideLength = Math.min(sketchHolderSize.x, sketchHolderSize.y);
    return {
        x: sideLength,
        y: sideLength,
    };
}
function getCanvasSize() {
    return getSquareCanvasSize();
}
// ---- Key events
window.document.onkeydown = function (event) {
    const code = event.which;
    keyDown[code] = true;
    if (code === UP_ARROW || code === DOWN_ARROW)
        return false;
};
window.document.onkeyup = function (event) {
    const code = event.which;
    keyDown[code] = false;
    if (code === UP_ARROW || code === DOWN_ARROW)
        return false;
};
//
// -------------------- Structure --------------------------------------
//
class Structure {
    constructor(params) {
        this.mainColor = params.mainColor;
        this.nodeColor = color(0, 192);
        this.nodeSprites = CrossReferenceArray.create();
        this.coreSprite = new Sprite();
        this.coreSprite.position.set(params.x, params.y);
        this.coreSprite.velocity.set(0, 0);
        this.coreSprite.displayColor = this.mainColor;
        this.coreSprite.friction = 0.2;
        this.coreSprite.drawSprite = drawCore;
        this.coreSprite.immovable = true;
        this.setCoreSize(10 * unitLength);
        // prepare two nodes as the first Idea (added later) needs three nodes
        if (!params.nullObject) {
            this.addNode();
            this.addNode();
        }
        if (params.action)
            this.action = params.action;
        else
            this.action = { run: (s) => { } };
        this.isPlayer = params.player || false;
        this.ideaQueue = new IdeaQueue();
        for (const idea of params.initialIdeas) {
            this.addIdea(idea);
        }
        this.damagePoint = 0;
        this.nearestEnemy = null;
        this.farestEnemy = null;
        this.isRemoved = false;
        this.properFrameCount = 0;
        this.breakdownRamainingFrameCount = 0;
        this.isBlocking = false;
    }
    static initializeStatic() {
        this.drawProtectionEffect = createDrawRiplleFunction(1, 2, 1, 0);
        this.nullObject = new Structure({ x: 0, y: 0, mainColor: color(0), initialIdeas: [], nullObject: true });
    }
    setParentGroup(group) {
        this.parentGroup = group;
        this.ideaQueue.setDefaultAimDirectionAngle();
    }
    get position() {
        return this.coreSprite.position;
    }
    remove() {
        if (this.belongingArray) {
            const index = this.belongingArray.indexOf(this, 0);
            this.belongingArray.splice(index, 1);
        }
        if (this.coreSprite.isInScreen()) {
            createNonMovingEffect(this.position.x, this.position.y, this.mainColor, 10 * this.shellSize, 45, drawExpandingRipple);
            screenShake.set(this.parentGroup.screenShakeSensitivity * 120 * unitLength);
        }
        this.ideaQueue.recycleAllIdeas();
        this.isRemoved = true;
    }
    addIdea(idea) {
        this.addNode();
        idea.setBelongingStructure(this);
        this.ideaQueue.enqueue(idea);
        // Create effect
        createNonMovingEffect(this.position.x, this.position.y, this.mainColor, 0.1 * (canvasSize - this.shellSize), 120, drawShrinkingRipple);
        if (this.isPlayer) {
            gameMessageSystem.pushMessage(`You got the Idea of ${idea.name}.`);
        }
    }
    removeIdea() {
        const removingIdea = this.ideaQueue.dequeue();
        if (!removingIdea)
            return;
        removingIdea.removingAction(removingIdea);
        if (Math.random() < 0.5 && this.parentGroup.enemyGroup) {
            this.parentGroup.enemyGroup.addFloatingIdea(new FloatingIdea(removingIdea, this));
        }
        else {
            ideaSet.push(removingIdea);
        }
        for (let i = this.nodeSprites.length - 1; i >= 0; i -= 1) {
            const eachNode = this.nodeSprites[i];
            if (!this.ideaQueue.refers(eachNode)) {
                removeSprite(eachNode);
                this.shrinkCoreSize();
            }
        }
        // Create effect
        if (this.coreSprite.isInScreen()) {
            createNonMovingEffect(this.position.x, this.position.y, this.mainColor, 1.1 * this.shellSize, 30, drawExpandingRipple);
            createParticles(this.coreSprite.position.x, this.coreSprite.position.y, 600 * unitSpeed, 20, 1 * IDEAL_FRAME_RATE, 30);
            screenShake.set(this.parentGroup.screenShakeSensitivity * 30 * unitLength);
        }
        if (this.isPlayer) {
            gameMessageSystem.pushMessage(`You lost the Idea of ${removingIdea.name}.`);
        }
    }
    fire() {
        if (this.isBlocking)
            return;
        this.ideaQueue.fire(this.parentGroup.facingDirectionAngle);
    }
    draw() {
        if (this.breakdownRamainingFrameCount === 0) {
            this.coreSprite.draw();
        }
        else if (this.properFrameCount % 4 <= 1) {
            const properShakeValue = 0.25 * this.breakdownRamainingFrameCount;
            const offsetX = random(-properShakeValue, properShakeValue);
            const offsetY = random(-properShakeValue, properShakeValue);
            translate(offsetX, offsetY);
            this.coreSprite.draw();
            translate(-offsetX, -offsetY);
        }
        this.drawShell();
        translate(this.coreSprite.position.x, this.coreSprite.position.y);
        this.drawIdeas();
        drawSprites(this.nodeSprites);
        translate(-this.coreSprite.position.x, -this.coreSprite.position.y);
        if (this.isBlocking)
            this.drawBlockingEffect();
    }
    act() {
        this.action.run(this);
    }
    update() {
        if (this.breakdownRamainingFrameCount >= 1)
            this.breakdownRamainingFrameCount -= 1;
        if (this.damagePoint >= 100) {
            this.removeIdea();
            if (this.ideaQueue.length <= 0) {
                this.remove();
                return;
            }
            this.damagePoint = 0;
            this.breakdownRamainingFrameCount = 100;
        }
        this.coreSprite.update();
        updateSprites(this.nodeSprites);
        this.ideaQueue.update();
        // constrain nodes position
        for (const eachNode of this.nodeSprites) {
            const distanceFromOriginSquared = eachNode.position.magSq();
            if (distanceFromOriginSquared >= sq(this.shellRadius) ||
                distanceFromOriginSquared <= sq(this.coreRadius)) {
                eachNode.position.setMag(constrain(sqrt(distanceFromOriginSquared), this.coreRadius, this.shellRadius));
                reflectOffCircularBoundary(eachNode);
            }
        }
        if (this.ideaQueue.structureLevelEffect.continuousDamage) {
            this.damagePoint += 0.05;
        }
        if (this.ideaQueue.structureLevelEffect.continuousHealing) {
            this.damagePoint = Math.max(0, this.damagePoint - 0.05);
        }
        this.updateNearestFarestEnemies();
        this.properFrameCount += 1;
    }
    handleBulletCollision(bullet) {
        if (this.ideaQueue.structureLevelEffect.protection) {
            if (Math.random() < 0.2) {
                // create protection effect & return without damage
                createNonMovingEffect(this.position.x, this.position.y, this.mainColor, this.coreSize, 15, Structure.drawProtectionEffect);
                return;
            }
        }
        const damageFactor = this.isBlocking ? 0.01 : 1;
        this.damagePoint += damageFactor * bullet.damagePoint;
    }
    isInScreen(margin) {
        return this.coreSprite.isInScreen(this.shellRadius + (margin || 0));
    }
    updateNearestFarestEnemies() {
        if (this.properFrameCount % IDEAL_FRAME_RATE !== 0) {
            if (this.nearestEnemy && this.nearestEnemy.isRemoved)
                this.nearestEnemy = null;
            if (this.farestEnemy && this.farestEnemy.isRemoved)
                this.farestEnemy = null;
            return;
        }
        if (!this.parentGroup.enemyGroup)
            return;
        // let nearestDistSq;
        let farestDistSq;
        let nearest = null;
        let farest = null;
        let foundAnyEnemy = false;
        for (const enemy of this.parentGroup.enemyGroup.structureSet) {
            const distantceSquared = distSq(this.position, enemy.position);
            if (!foundAnyEnemy) {
                nearest = enemy;
                // nearestDistSq = distantceSquared;
                farest = enemy;
                farestDistSq = distantceSquared;
                foundAnyEnemy = true;
                continue;
            }
            else {
                if (distantceSquared > farestDistSq) {
                    farest = enemy;
                    farestDistSq = distantceSquared;
                }
                else {
                    nearest = enemy;
                    // nearestDistSq = distantceSquared;
                }
            }
        }
        this.nearestEnemy = nearest;
        this.farestEnemy = farest;
    }
    setCoreSize(coreSize) {
        this.coreSize = this.coreSprite.displaySize = coreSize;
        this.coreRadius = this.coreSprite.collisionRadius = 0.5 * coreSize;
        this.shellSize = 2 * coreSize;
        this.shellRadius = 0.5 * this.shellSize;
        for (const eachSprite of this.nodeSprites) {
            const magnitudeSquared = eachSprite.position.magSq();
            if (magnitudeSquared < sq(this.coreRadius)) {
                eachSprite.position.mult(1.1 * this.coreRadius / sqrt(magnitudeSquared));
                continue;
            }
            if (magnitudeSquared > sq(this.shellRadius)) {
                eachSprite.position.mult(0.9 * this.shellRadius / sqrt(magnitudeSquared));
                continue;
            }
        }
    }
    expandCoreSize() {
        this.setCoreSize(this.coreSize * 1.2);
    }
    shrinkCoreSize() {
        this.setCoreSize(this.coreSize / 1.2);
    }
    addNode() {
        this.expandCoreSize();
        // Add new node
        const angle = Math.random() * TWO_PI;
        const distance = random(this.coreRadius, this.shellRadius);
        const newSprite = useNewSprite(distance * cos(angle), distance * sin(angle));
        newSprite.setVelocity(30 * unitSpeed, Math.random() * 360);
        newSprite.displayColor = this.nodeColor;
        newSprite.displaySize = 7 * unitLength;
        newSprite.collisionRadius = 0.5 * newSprite.displaySize;
        newSprite.drawSprite = drawNode;
        this.nodeSprites.add(newSprite);
    }
    drawShell() {
        noFill();
        // const alphaFactor = sq(1 - ((frameCount % IDEAL_FRAME_RATE) / IDEAL_FRAME_RATE));
        stroke(192, 255 * (0.5 + 0.5 * sin((0.5 * frameCount / IDEAL_FRAME_RATE) * TWO_PI)));
        ellipse(this.coreSprite.position.x, this.coreSprite.position.y, this.shellSize, this.shellSize);
        if (myStructure.ideaQueue.structureLevelEffect.viewInfo) {
            strokeWeight(3 * unitLength);
            stroke(160);
            translate(this.position.x, this.position.y);
            rotate(-HALF_PI);
            arc(0, 0, this.shellSize, this.shellSize, 0, (1 - (this.damagePoint % 100) / 100) * TWO_PI);
            rotate(+HALF_PI);
            translate(-this.position.x, -this.position.y);
            strokeWeight(1 * unitLength);
        }
    }
    drawIdeas() {
        stroke(0, 128);
        fill(0, 32);
        this.ideaQueue.drawShapes();
    }
    drawBlockingEffect() {
        const alphaFactor = Math.sin(2 * (this.properFrameCount / IDEAL_FRAME_RATE) * TWO_PI);
        stroke(colorAlpha(this.mainColor, 192 + 63 * alphaFactor));
        fill(colorAlpha(this.mainColor, 8 + 8 * alphaFactor));
        const diameter = this.shellSize + 10 * unitLength;
        ellipse(this.position.x, this.position.y, diameter, diameter);
    }
}
function reflectOffCircularBoundary(sprite) {
    const directionFromOrigin = cloneVector(sprite.position).normalize();
    sprite.velocity.add(directionFromOrigin.mult(-2 * p5.Vector.dot(sprite.velocity, directionFromOrigin)));
    vectorPool.recycle(directionFromOrigin);
}
class StructureGroup {
    constructor(mainColor, facingDirectionAngle, screenShakeSensitivity) {
        this.structureSet = CrossReferenceArray.create();
        this.bulletSet = CrossReferenceArray.create();
        this.floatingIdeaSet = CrossReferenceArray.create();
        this.enemyGroup = undefined;
        this.mainColor = mainColor;
        this.facingDirectionAngle = facingDirectionAngle;
        this.screenShakeSensitivity = screenShakeSensitivity;
        const bulletSize = 14;
        const graphicsSize = Math.floor(bulletSize * 1.3);
        this.weakShotBulletGraphics = createGraphics(graphicsSize, graphicsSize);
        const weakGr = this.weakShotBulletGraphics;
        weakGr.translate(0.5 * weakGr.width, 0.5 * weakGr.height);
        weakGr.stroke(colorAlpha(this.mainColor, 128));
        weakGr.noFill();
        weakGr.triangle(0, -0.7 * bulletSize, -0.3 * bulletSize, 0.3 * bulletSize, +0.3 * bulletSize, 0.3 * bulletSize);
        this.strongShotBulletGraphics = createGraphics(graphicsSize, graphicsSize);
        const strongGr = this.strongShotBulletGraphics;
        strongGr.translate(0.5 * strongGr.width, 0.5 * strongGr.height);
        strongGr.noStroke();
        strongGr.fill(this.mainColor);
        strongGr.triangle(0, -0.7 * bulletSize, -0.3 * bulletSize, 0.3 * bulletSize, +0.3 * bulletSize, 0.3 * bulletSize);
    }
    addStructure(structure) {
        this.structureSet.add(structure);
        structure.setParentGroup(this);
    }
    addBullet(bulletSprite) {
        this.bulletSet.add(bulletSprite);
    }
    addFloatingIdea(floatingIdea) {
        this.floatingIdeaSet.add(floatingIdea);
        floatingIdea.setBelongingGroup(this);
    }
    act() {
        for (let i = this.structureSet.length - 1; i >= 0; i -= 1) {
            this.structureSet[i].act();
        }
    }
    update() {
        for (let i = this.structureSet.length - 1; i >= 0; i -= 1) {
            this.structureSet[i].update();
        }
        updateSprites(this.floatingIdeaSet);
        updateSprites(this.bulletSet);
    }
    draw() {
        for (let i = this.structureSet.length - 1; i >= 0; i -= 1) {
            this.structureSet[i].draw();
        }
        drawSprites(this.bulletSet);
        drawSprites(this.floatingIdeaSet);
    }
    collide(other) {
        this.collideSprites(this.floatingIdeaSet, handleFloatingIdeaCollision);
        this.collideSprites(other.bulletSet, handleBulletCollision);
    }
    collideSprites(sprites, callBack) {
        for (const thisStructure of this.structureSet) {
            for (const sprite of sprites) {
                if (thisStructure.coreSprite.overlap(sprite)) {
                    callBack(thisStructure, sprite);
                }
            }
        }
    }
}
function handleBulletCollision(structure, bullet) {
    if (structure.breakdownRamainingFrameCount >= 1)
        return;
    structure.handleBulletCollision(bullet);
    removeBullet(bullet);
}
function handleFloatingIdeaCollision(structure, floatingIdea) {
    structure.addIdea(floatingIdea.idea);
    floatingIdea.remove(); // Do not use removeSprite() as FloatingIdea is not pooled
}