import './style.css';
import 'phaser';
import Vector2 from 'phaser/src/math/Vector2';

const BlockTypes = {
  Empty: 0,
  Dirt: 1,
  Shrub: 2,
  Fire: 3,
  BurningShrub: 4,
};

class Grid {
  constructor(playArea, blockSize, columnCount, rowCount) {
    this.playArea = playArea;
    this.blockSize = blockSize;
    this.columnCount = columnCount;
    this.rowCount = rowCount;
    this.cells = new Array(rowCount)
      .fill(null)
      .map(() => new Array(columnCount).fill(null));
  }

  getGridCoordinates(worldPosition) {
    return new Vector2(
      Math.floor(
        (worldPosition.x - this.playArea.getLeftCenter().x) / this.blockSize
      ),
      Math.round(
        (worldPosition.y - this.playArea.getTopCenter().y) / this.blockSize
      )
    );
  }

  getWorldCoordinates(gridPosition) {
    return new Vector2(
      gridPosition.x * this.blockSize +
        this.playArea.getLeftCenter().x +
        this.blockSize / 2,
      gridPosition.y * this.blockSize +
        this.playArea.getTopCenter().y +
        this.blockSize / 2
    );
  }

  withinGrid(gridPosition) {
    return (
      gridPosition.x >= 0 &&
      gridPosition.x < this.columnCount &&
      gridPosition.y >= 0 &&
      gridPosition.y < this.rowCount
    );
  }

  isPositionValid(worldPosition) {
    const gridPosition = this.getGridCoordinates(worldPosition);
    return (
      this.withinGrid(gridPosition) &&
      this.cells[gridPosition.y][gridPosition.x] === null
    );
  }

  markCellOccupied(gridPosition, block) {
    this.cells[gridPosition.y][gridPosition.x] = block;
  }

  getCell(gridPosition) {
    return this.cells[gridPosition.y][gridPosition.x];
  }
}

export { Grid, BlockTypes };
