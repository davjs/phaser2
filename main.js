import './style.css';
import 'phaser';
import Vector2 from 'phaser/src/math/Vector2';
import { Grid, BlockTypes } from './Grid';

class Elementris extends Phaser.Scene {
  constructor() {
    super({ key: 'Elementris' });
  }

  preload() {
    this.load.image('dirt', 'https://i.ibb.co/F61HrCv/dirt.png');
    this.load.image('shrub', 'https://i.ibb.co/hm9f245/Shrub.png');
    this.load.image('fire', 'https://i.ibb.co/mhsTGBw/fire.png');
    this.load.image(
      'burning_shrub',
      'https://i.ibb.co/VjHDqFt/Burning-Shrub.png'
    );
  }

  create() {
    this.cameras.main.setBackgroundColor('#f0f0f0');
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight;

    this.game.scale.resize(gameWidth, gameHeight);
    let playAreaHeight = gameHeight * 0.8;
    const playAreaWidth = playAreaHeight / 1.6;
    const columnCount = 8;
    this.blockSize = playAreaWidth / columnCount;
    playAreaHeight =
      Math.ceil(playAreaHeight / this.blockSize) * this.blockSize;

    this.playArea = this.add.rectangle(
      gameWidth / 2,
      gameHeight / 2,
      playAreaWidth,
      playAreaHeight,
      0xffffff
    );
    this.playArea.setOrigin(0.5);

    const border = this.add.rectangle(
      gameWidth / 2,
      gameHeight / 2,
      playAreaWidth + 10,
      playAreaHeight + 10
    );
    border.setOrigin(0.5);
    border.setStrokeStyle(5, 0x808080);

    this.blocks = this.add.group();
    this.grid = new Grid(
      this.playArea,
      this.blockSize,
      columnCount,
      Math.floor(playAreaHeight / this.blockSize)
    );

    this.spawnBlock();
    this.keyDownHandler = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.keyDownHandler);
  }

  update(time, delta) {
    this.moveBlocksDown();
    if (this.currentBlock && !this.currentBlock.falling) {
      this.spawnBlock();
    }
  }

  spriteNameForBlockType(blockType) {
    switch (blockType) {
      case BlockTypes.Dirt:
        return 'dirt';
      case BlockTypes.Shrub:
        return 'shrub';
      case BlockTypes.BurningShrub:
        return 'burning_shrub';
      case BlockTypes.Fire:
        return 'fire';
    }
  }

  handleBlockPlacementEffects(block, position) {
    switch (block.blockType) {
      case BlockTypes.Fire:
        this.applyBurningEffects(position);
        break;
      case BlockTypes.Shrub:
        break;
      case BlockTypes.Dirt:
        break;
      default:
        console.log(
          `No placement effects defined for block type ${block.blockType}`
        );
    }
  }

  applyBurningEffects(gridPosition) {
    const neighborPositions = [
      new Vector2(gridPosition.x - 1, gridPosition.y),
      new Vector2(gridPosition.x + 1, gridPosition.y),
      new Vector2(gridPosition.x, gridPosition.y - 1),
      new Vector2(gridPosition.x, gridPosition.y + 1),
    ];

    for (const neighborPosition of neighborPositions) {
      if (this.grid.withinGrid(neighborPosition)) {
        const neighborBlock = this.grid.getCell(neighborPosition);
        // Destroy the neighboring shrub block and replace it with a burning shrub block
        if (neighborBlock && neighborBlock.blockType === BlockTypes.Shrub) {
          this.replaceBlock(neighborPosition, BlockTypes.BurningShrub);
          this.applyBurningEffects(neighborPosition);
        }
      }
    }
  }

  replaceBlock(gridPosition, newBlockType) {
    const blockToDestroy = this.grid.getCell(gridPosition);
    this.grid.markCellOccupied(gridPosition, null);
    this.blocks.remove(blockToDestroy);
    blockToDestroy.destroy();
    const newBlock = this.addBlock(gridPosition, newBlockType);
    this.grid.markCellOccupied(gridPosition, newBlock);
    return newBlock;
  }

  destroyBlock(block) {
    console.log('Destroying block:', block);
    const gridPosition = this.grid.getGridCoordinates(
      new Vector2(block.x, block.y)
    );
    this.blocks.remove(block);
    block.destroy();

    // Make blocks above the destroyed block fall down
    for (let y = gridPosition.y - 1; y >= 0; y--) {
      const cellPosition = new Vector2(gridPosition.x, y);
      const cell = this.grid.getCell(cellPosition);
      if (cell) {
        cell.falling = true;
        this.grid.markCellOccupied(cellPosition, null);
      }
    }
  }

  addBlock(gridPosition, blockType) {
    const worldPosition = this.grid.getWorldCoordinates(gridPosition);
    const spriteName = this.spriteNameForBlockType(blockType);
    const block = this.add.sprite(worldPosition.x, worldPosition.y, spriteName);
    let spriteSize = 16;
    block.setScale(this.blockSize / spriteSize);
    block.blockType = blockType;
    block.falling = false;
    this.blocks.add(block);
    return block;
  }

  spawnBlock() {
    const randomColumn = Phaser.Math.Between(0, 7);
    const blockType = Phaser.Math.Between(1, 3);

    const block = this.addBlock(new Vector2(randomColumn, 0), blockType);
    block.falling = true;

    if (blockType == BlockTypes.Shrub) {
      block.depth = 1;
    }
    if (blockType == BlockTypes.Fire) {
      const particles2 = this.add.particles(0, 0, 'fire', {
        speed: 30,
        scale: { start: 4, end: 0 },
        lifespan: 250,
        alpha: { start: 0.2, end: 0 },
        maxAliveParticles: 20,
      });
      const particles1 = this.add.particles(0, 0, 'fire', {
        speed: 50,
        scale: { start: 4, end: 0 },
        lifespan: 250,
        blendMode: 'ADD',
        alpha: { start: 0.1, end: 0 },
        maxAliveParticles: 20,
      });
      particles1.startFollow(block);
      particles2.startFollow(block);
    }

    this.currentBlock = block; // Update the current block
  }

  moveBlock(direction) {
    const newX = this.currentBlock.x + direction * this.blockSize;

    if (this.grid.isPositionValid(new Vector2(newX, this.currentBlock.y))) {
      this.currentBlock.x = newX;
    }
  }

  moveBlocksDown() {
    this.blocks.getChildren().forEach((block) => {
      if (block.falling) {
        if (this.hasSolidBelow(block)) {
          block.falling = false;
          this.snapBlockToGrid(block);
        } else {
          block.y += 4;
        }
      }
    });
  }

  hasSolidBelow(block) {
    const gridPosition = this.grid.getGridCoordinates(
      new Vector2(block.x, block.y)
    );
    const gridPositionBelow = new Vector2(gridPosition.x, gridPosition.y + 1);
    const worldPositionBelow = this.grid.getWorldCoordinates(gridPositionBelow);

    const outOfGridBounds = gridPositionBelow.y >= this.grid.rowCount;
    const collisionBelow =
      gridPositionBelow.y < this.grid.rowCount &&
      this.grid.getCell(gridPositionBelow) &&
      !this.grid.getCell(gridPositionBelow).falling;

    if (outOfGridBounds || collisionBelow) {
      const atCellBoundary =
        Math.abs(worldPositionBelow.y - block.y) <= this.blockSize + 4;
      return atCellBoundary;
    }
    return false;
  }

  snapBlockToGrid(block) {
    const gridPosition = this.grid.getGridCoordinates(
      new Vector2(block.x, block.y)
    );
    const worldPosition = this.grid.getWorldCoordinates(gridPosition);
    block.x = worldPosition.x;
    block.y = worldPosition.y;

    this.grid.markCellOccupied(gridPosition, block);

    // Remove any burning shrub blocks from the grid
    for (let y = 0; y < this.grid.rowCount; y++) {
      for (let x = 0; x < this.grid.columnCount; x++) {
        const cellPosition = new Vector2(x, y);
        const cell = this.grid.getCell(cellPosition);
        if (cell && cell.blockType === BlockTypes.BurningShrub) {
          this.destroyBlock(cell);
          this.grid.markCellOccupied(cellPosition, null);
        }
      }
    }

    this.propagateFires();
  }

  propagateFires() {
    const firePositions = [];

    for (let y = 0; y < this.grid.rowCount; y++) {
      for (let x = 0; x < this.grid.columnCount; x++) {
        const cell = this.grid.getCell(new Vector2(x, y));
        if (cell && cell.blockType === BlockTypes.Fire) {
          firePositions.push(new Vector2(x, y));
        }
      }
    }

    for (const firePosition of firePositions) {
      this.applyBurningEffects(firePosition);
    }
  }

  handleKeyDown(event) {
    event.preventDefault();

    switch (event.key) {
      case 'ArrowLeft':
        this.moveBlock(-1);
        break;
      case 'ArrowRight':
        this.moveBlock(1);
        break;
      case 'ArrowDown':
        this.moveBlocksDown();
        break;
    }
  }

  shutdown() {
    document.removeEventListener('keydown', this.keyDownHandler);
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  backgroundColor: '#0072bc',
  scene: Elementris,
  antialias: false,
};

const game = new Phaser.Game(config);
