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