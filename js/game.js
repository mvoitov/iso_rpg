var game = new Phaser.Game(600, 400, Phaser.AUTO, 'game', {preload: preload, create: create, update: update});
var upKey;
var downKey;
var leftKey;
var rightKey;
//level array
var levelData =
    [[1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1]];

//x & y values of the direction vector for character movement
var dX = 0;
var dY = 0;
var tileWidth = 50;// the width of a tile
var borderOffset = new Phaser.Point(250, 50);//to centralise the isometric level display
var wallGraphicHeight = 98;
var floorGraphicWidth = 103;
var floorGraphicHeight = 53;
var heroGraphicWidth = 70;
var heroGraphicHeight = 180;
var wallHeight = wallGraphicHeight - floorGraphicHeight;
var heroHeight = (floorGraphicHeight / 2) + (heroGraphicHeight - floorGraphicHeight) + 6;//adjustments to make the legs hit the middle of the tile for initial load
var heroWidth = (floorGraphicWidth / 2) - (heroGraphicWidth / 2);//for placing hero at the middle of the tile
var facing = 'south';//direction the character faces
var sorcerer;//hero
var sorcererShadow;//duh
var shadowOffset = new Phaser.Point(heroWidth + 7, 11);
var bmpText;//title text
var normText;//text to display hero coordinates
var gameScene;//this is the render texture onto which we draw depth sorted scene
var floorSprite;
var wallSprite;
var pickupSprite;
var heroMapTile = new Phaser.Point(1, 1);//hero tile values in array explicitly defined out of levelData
var heroMapPos;//2D coordinates of hero map marker sprite in minimap, assume this is mid point of graphic
var heroSpeed = 1.2;//well, speed of our hero
var pickupCount = 0;
var hero2DVolume = new Phaser.Point(30, 30);//now that we dont have a minimap & hero map sprite, we need this
var pickupOffset = new Phaser.Point(30, 8);


function preload() {
    game.load.crossOrigin = 'Anonymous';
    //load all necessary assets
    game.load.bitmapFont('font', 'assets/font.png', 'assets/font.xml');
    game.load.image('greenTile', 'https://dl.dropboxusercontent.com/s/nxs4ptbuhrgzptx/green_tile.png?dl=0');
    game.load.image('redTile', 'https://dl.dropboxusercontent.com/s/zhk68fq5z0c70db/red_tile.png?dl=0');
    game.load.image('heroTile', 'https://dl.dropboxusercontent.com/s/8b5zkz9nhhx3a2i/hero_tile.png?dl=0');
    game.load.image('heroShadow', 'https://dl.dropboxusercontent.com/s/sq6deec9ddm2635/ball_shadow.png?dl=0');
    game.load.image('floor', 'https://dl.dropboxusercontent.com/s/h5n5usz8ejjlcxk/floor.png?dl=0');
    game.load.image('wall', 'https://dl.dropboxusercontent.com/s/uhugfdq1xcwbm91/block.png?dl=0');
    game.load.image('ball', 'https://dl.dropboxusercontent.com/s/pf574jtx7tlmkj6/ball.png?dl=0');
    game.load.image('pickup', 'https://dl.dropbox.com/s/1ixu9826hwqtrcq/pickup.png?dl=0');
    game.load.atlasJSONArray('hero', 'assets/hero.png', 'assets/hero.json');
}

function create() {
    bmpText = game.add.bitmapText(10, 10, 'font', 'Pickup Tutorial', 18);
    normText = game.add.text(10, 360, "hi");
    upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
    game.stage.backgroundColor = '#cccccc';
    //we draw the depth sorted scene into this render texture
    gameScene = game.add.renderTexture(game.width, game.height);
    game.add.sprite(0, 0, gameScene);
    floorSprite = game.make.sprite(0, 0, 'floor');
    wallSprite = game.make.sprite(0, 0, 'wall');
    sorcererShadow = game.make.sprite(0, 0, 'heroShadow');
    pickupSprite = game.make.sprite(0, 0, 'pickup');
    sorcererShadow.scale = new Phaser.Point(0.5, 0.6);
    sorcererShadow.alpha = 0.4;
    createLevel();
}

function update() {
    //check key press
    detectKeyInput();
    //if no key is pressed then stop else play walking animation
    if (dY == 0 && dX == 0) {
        sorcerer.animations.stop();
        sorcerer.animations.currentAnim.frame = 0;
    } else {
        if (sorcerer.animations.currentAnim != facing) {
            sorcerer.animations.play(facing);
        }
    }
    //check if we are walking into a wall else move hero in 2D
    if (isWalkable()) {
        heroMapPos.x += heroSpeed * dX;
        heroMapPos.y += heroSpeed * dY;
        //get the new hero map tile
        heroMapTile = getTileCoordinates(heroMapPos, tileWidth);
        //check for pickup & collect
        if (onPickupTile()) {
            pickupItem();
        }
        //depthsort & draw new scene
        renderScene();
    }
}

function createLevel() {//create minimap
    addHero();
    heroMapPos = new Phaser.Point(heroMapTile.y * tileWidth, heroMapTile.x * tileWidth);
    heroMapPos.x += (tileWidth / 2);
    heroMapPos.y += (tileWidth / 2);
    heroMapTile = getTileCoordinates(heroMapPos, tileWidth);
    spawnNewPickup();
    renderScene();//draw once the initial state
}

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

function addHero() {
    // sprite
    sorcerer = game.add.sprite(-50, 0, 'hero', 'Tuscan_Walk_10000.png');// keep him out side screen area

    // animation
    var tuscanWalkSouthEast = new Array();
    var tuscanWalkSouth = new Array();
    var tuscanWalkSouthWest = new Array();
    var tuscanWalkWest = new Array();
    var tuscanWalkNorthWest = new Array();
    var tuscanWalkNorth = new Array();
    var tuscanWalkNorthEast = new Array();
    var tuscanWalkEast = new Array();
    for (var i = 0; i < 14; i++) {
        tuscanWalkSouth[i] = "Tuscan_Walk_" + zeroPad(i, 5) + ".png";
        tuscanWalkSouthEast[i] = "Tuscan_Walk_1" + zeroPad(i, 4) + ".png";
        tuscanWalkEast[i] = "Tuscan_Walk_2" + zeroPad(i, 4) + ".png";
        tuscanWalkNorthEast[i] = "Tuscan_Walk_3" + zeroPad(i, 4) + ".png";
        tuscanWalkNorth[i] = "Tuscan_Walk_4" + zeroPad(i, 4) + ".png";
        tuscanWalkNorthWest[i] = "Tuscan_Walk_5" + zeroPad(i, 4) + ".png";
        tuscanWalkWest[i] = "Tuscan_Walk_6" + zeroPad(i, 4) + ".png";
        tuscanWalkSouthWest[i] = "Tuscan_Walk_7" + zeroPad(i, 4) + ".png";
    }
    sorcerer.animations.add('southeast', tuscanWalkSouthEast, tuscanWalkSouthEast.length, true);
    sorcerer.animations.add('south', tuscanWalkSouth, tuscanWalkSouth.length, true);
    sorcerer.animations.add('southwest', tuscanWalkSouthWest, tuscanWalkSouthWest.length, true);
    sorcerer.animations.add('west', tuscanWalkWest, tuscanWalkWest.length, true);
    sorcerer.animations.add('northwest', tuscanWalkNorthWest, tuscanWalkNorthWest.length, true);
    sorcerer.animations.add('north', tuscanWalkNorth, tuscanWalkNorth.length, true);
    sorcerer.animations.add('northeast', tuscanWalkNorthEast, tuscanWalkNorthEast.length, true);
    sorcerer.animations.add('east', tuscanWalkEast, tuscanWalkEast.length, true);
}

function renderScene() {
    gameScene.clear();//clear the previous frame then draw again
    var tileType = 0;
    for (var i = 0; i < levelData.length; i++) {
        for (var j = 0; j < levelData[0].length; j++) {
            tileType = levelData[i][j];
            drawTileIso(tileType, i, j);
            if (i == heroMapTile.y && j == heroMapTile.x) {
                drawHeroIso();
            }
            if (tileType == 8) {
                drawPickupIso(i, j);
            }
        }
    }
    normText.text = 'Collected : ' + pickupCount + ' coins.';
}

function drawHeroIso() {
    var isoPt = new Phaser.Point();//It is not advisable to create points in update loop
    var heroCornerPt = new Phaser.Point(heroMapPos.x - hero2DVolume.x / 2, heroMapPos.y - hero2DVolume.y / 2);
    isoPt = cartesianToIsometric(heroCornerPt);//find new isometric position for hero from 2D map position
    gameScene.renderXY(sorcererShadow, isoPt.x + borderOffset.x + shadowOffset.x, isoPt.y + borderOffset.y + shadowOffset.y, false);//draw shadow to render texture
    gameScene.renderXY(sorcerer, isoPt.x + borderOffset.x + heroWidth, isoPt.y + borderOffset.y - heroHeight, false);//draw hero to render texture
}

function drawPickupIso(i, j) {
    var isoPt = new Phaser.Point();//It is not advisable to create point in update loop
    var cartPt = new Phaser.Point();//This is here for better code readability.
    cartPt.x = j * tileWidth;
    cartPt.y = i * tileWidth;
    isoPt = cartesianToIsometric(cartPt);
    gameScene.renderXY(pickupSprite, isoPt.x + borderOffset.x + pickupOffset.x, isoPt.y + borderOffset.y - pickupOffset.y, false);//draw hero to render texture
}

function drawTileIso(tileType, i, j) {//place isometric level tiles
    var isoPt = new Phaser.Point();//It is not advisable to create point in update loop
    var cartPt = new Phaser.Point();//This is here for better code readability.
    cartPt.x = j * tileWidth;
    cartPt.y = i * tileWidth;
    isoPt = cartesianToIsometric(cartPt);
    if (tileType == 1) {
        gameScene.renderXY(wallSprite, isoPt.x + borderOffset.x, isoPt.y + borderOffset.y - wallHeight, false);
    } else {
        gameScene.renderXY(floorSprite, isoPt.x + borderOffset.x, isoPt.y + borderOffset.y, false);
    }
}

function spawnNewPickup() {//spawn new pickup at an empty spot
    var tileType = 0;
    var tempArray = [];
    var newPt = new Phaser.Point();
    for (var i = 0; i < levelData.length; i++) {
        for (var j = 0; j < levelData[0].length; j++) {
            tileType = levelData[i][j];
            if (tileType == 0 && heroMapTile.y != i && heroMapTile.x != j) {
                newPt = new Phaser.Point();
                newPt.x = i;
                newPt.y = j;
                tempArray.push(newPt);
            }
        }
    }
    newPt = Phaser.ArrayUtils.getRandomItem(tempArray);
    levelData[newPt.x][newPt.y] = 8;
}

function pickupItem() {
    pickupCount++;
    levelData[heroMapTile.y][heroMapTile.x] = 0;
    //spawn next pickup
    spawnNewPickup();
}

function onPickupTile() {//check if there is a pickup on hero tile
    return (levelData[heroMapTile.y][heroMapTile.x] == 8);
}

function isWalkable() {//It is not advisable to create points in update loop, but for code readability.
    var able = true;
    var heroCornerPt = new Phaser.Point(heroMapPos.x - hero2DVolume.x / 2, heroMapPos.y - hero2DVolume.y / 2);
    var cornerTL = new Phaser.Point();
    cornerTL.x = heroCornerPt.x + (heroSpeed * dX);
    cornerTL.y = heroCornerPt.y + (heroSpeed * dY);
    // now we have the top left corner point. we need to find all 4 corners based on the map marker graphics width & height
    //ideally we should just provide the hero a volume instead of using the graphics' width & height
    var cornerTR = new Phaser.Point();
    cornerTR.x = cornerTL.x + hero2DVolume.x;
    cornerTR.y = cornerTL.y;
    var cornerBR = new Phaser.Point();
    cornerBR.x = cornerTR.x;
    cornerBR.y = cornerTL.y + hero2DVolume.y;
    var cornerBL = new Phaser.Point();
    cornerBL.x = cornerTL.x;
    cornerBL.y = cornerBR.y;
    var newTileCorner1;
    var newTileCorner2;
    var newTileCorner3 = heroMapPos;
    //let us get which 2 corners to check based on current facing, may be 3
    switch (facing) {
        case "north":
            newTileCorner1 = cornerTL;
            newTileCorner2 = cornerTR;
            break;
        case "south":
            newTileCorner1 = cornerBL;
            newTileCorner2 = cornerBR;
            break;
        case "east":
            newTileCorner1 = cornerBR;
            newTileCorner2 = cornerTR;
            break;
        case "west":
            newTileCorner1 = cornerTL;
            newTileCorner2 = cornerBL;
            break;
        case "northeast":
            newTileCorner1 = cornerTR;
            newTileCorner2 = cornerBR;
            newTileCorner3 = cornerTL;
            break;
        case "southeast":
            newTileCorner1 = cornerTR;
            newTileCorner2 = cornerBR;
            newTileCorner3 = cornerBL;
            break;
        case "northwest":
            newTileCorner1 = cornerTR;
            newTileCorner2 = cornerBL;
            newTileCorner3 = cornerTL;
            break;
        case "southwest":
            newTileCorner1 = cornerTL;
            newTileCorner2 = cornerBR;
            newTileCorner3 = cornerBL;
            break;
    }
    //check if those corners fall inside a wall after moving
    newTileCorner1 = getTileCoordinates(newTileCorner1, tileWidth);
    if (levelData[newTileCorner1.y][newTileCorner1.x] == 1) {
        able = false;
    }
    newTileCorner2 = getTileCoordinates(newTileCorner2, tileWidth);
    if (levelData[newTileCorner2.y][newTileCorner2.x] == 1) {
        able = false;
    }
    newTileCorner3 = getTileCoordinates(newTileCorner3, tileWidth);
    if (levelData[newTileCorner3.y][newTileCorner3.x] == 1) {
        able = false;
    }
    return able;
}

function detectKeyInput() {//assign direction for character & set x,y speed components
    if (upKey.isDown) {
        dY = -1;
    }
    else if (downKey.isDown) {
        dY = 1;
    }
    else {
        dY = 0;
    }
    if (rightKey.isDown) {
        dX = 1;
        if (dY == 0) {
            facing = "east";
        }
        else if (dY == 1) {
            facing = "southeast";
            dX = dY = 0.5;
        }
        else {
            facing = "northeast";
            dX = 0.5;
            dY = -0.5;
        }
    }
    else if (leftKey.isDown) {
        dX = -1;
        if (dY == 0) {
            facing = "west";
        }
        else if (dY == 1) {
            facing = "southwest";
            dY = 0.5;
            dX = -0.5;
        }
        else {
            facing = "northwest";
            dX = dY = -0.5;
        }
    }
    else {
        dX = 0;
        if (dY == 0) {
            //facing="west";
        }
        else if (dY == 1) {
            facing = "south";
        }
        else {
            facing = "north";
        }
    }
}

function cartesianToIsometric(cartPt) {
    var tempPt = new Phaser.Point();
    tempPt.x = cartPt.x - cartPt.y;
    tempPt.y = (cartPt.x + cartPt.y) / 2;
    return (tempPt);
}

function isometricToCartesian(isoPt) {
    var tempPt = new Phaser.Point();
    tempPt.x = (2 * isoPt.y + isoPt.x) / 2;
    tempPt.y = (2 * isoPt.y - isoPt.x) / 2;
    return (tempPt);
}

function getTileCoordinates(cartPt, tileHeight) {
    var tempPt = new Phaser.Point();
    tempPt.x = Math.floor(cartPt.x / tileHeight);
    tempPt.y = Math.floor(cartPt.y / tileHeight);
    return (tempPt);
}

function getCartesianFromTileCoordinates(tilePt, tileHeight) {
    var tempPt = new Phaser.Point();
    tempPt.x = tilePt.x * tileHeight;
    tempPt.y = tilePt.y * tileHeight;
    return (tempPt);
}