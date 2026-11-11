import { clamp, distance as pointDistance } from './utils.js';

export class PathModel {
  constructor(points) {
    if (!Array.isArray(points) || points.length < 2) {
      throw new Error('PathModel 至少需要两个点');
    }

    this.points = points.map(point => ({ x: point.x, y: point.y }));
    this.segments = [];
    this.cumulative = [0];

    for (let index = 0; index < this.points.length - 1; index += 1) {
      const start = this.points[index];
      const end = this.points[index + 1];
      const length = pointDistance(start, end);
      this.segments.push({ start, end, length });
      this.cumulative.push(this.cumulative[this.cumulative.length - 1] + length);
    }

    this.length = this.cumulative[this.cumulative.length - 1];
  }

  pointAt(distance) {
    const clampedDistance = clamp(distance, 0, this.length);
    let segmentIndex = this.segments.length - 1;

    for (let index = 0; index < this.segments.length; index += 1) {
      if (clampedDistance <= this.cumulative[index + 1]) {
        segmentIndex = index;
        break;
      }
    }

    const segment = this.segments[segmentIndex];
    const localDistance = clampedDistance - this.cumulative[segmentIndex];
    const progress = segment.length === 0 ? 0 : localDistance / segment.length;
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;

    return {
      x: segment.start.x + dx * progress,
      y: segment.start.y + dy * progress,
      angle: Math.atan2(dy, dx),
      segmentIndex,
    };
  }
}

export function createPathModels(pathCells, tileSize) {
  const groundPoints = pathCells.map(([column, row]) => ({
    x: column * tileSize + tileSize / 2,
    y: row * tileSize + tileSize / 2,
  }));
  const airPoints = [groundPoints[0], groundPoints[groundPoints.length - 1]];

  return {
    ground: new PathModel(groundPoints),
    air: new PathModel(airPoints),
  };
}
