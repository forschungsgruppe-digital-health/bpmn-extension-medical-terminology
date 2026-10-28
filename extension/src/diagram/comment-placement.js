import { selfAndAllChildren } from 'diagram-js/lib/util/Elements.js';

const COMMENT_GAP = 24;
const MAX_SEARCH_RINGS = 6;

const MAX_SPACE_ATTEMPTS = 4;

export function getGeneratedCommentAssociationWaypoints(target, comment) {
  return [
    { x: target.x + target.width, y: target.y + target.height / 2 },
    { x: comment.x, y: comment.y + comment.height / 2 }
  ];
}

export function placeGeneratedComment(target, comment, elementRegistry, canvas, spaceTool, modeling) {
  let position = findFreePosition(target, comment, elementRegistry);
  if (position) {
    return position;
  }

  if (!spaceTool || !modeling) {
    throw new Error('No collision-free position found for generated terminology comment.');
  }

  const root = getSpaceRoot(target, canvas.getRootElement());
  const elements = selfAndAllChildren(root, true);

  for (let attempt = 0; attempt < MAX_SPACE_ATTEMPTS; attempt++) {
    const delta = { x: comment.width + COMMENT_GAP, y: 0 };
    const start = target.x + target.width;
    const { movingShapes, resizingShapes } =
      spaceTool.calculateAdjustments(elements, 'x', delta.x, start);

    if (!movingShapes.length && !resizingShapes.length) {
      break;
    }

    modeling.createSpace(movingShapes, resizingShapes, delta, 'e', start);
    position = findFreePosition(target, comment, elementRegistry);
    if (position) {
      return position;
    }
  }

  throw new Error('Unable to create a collision-free position for generated terminology comment.');
}

function findFreePosition(target, comment, elementRegistry) {
  const obstacles = elementRegistry.getAll().filter(element =>
    element !== target
      && (element.waypoints || (element.width > 0 && element.height > 0))
      && !isAncestor(element, target)
  );
  const pathObstacles = obstacles.filter(element => !element.labelTarget);
  const containerBounds = getContainerBounds(target);
  const stepX = comment.width + COMMENT_GAP;
  const stepY = comment.height + COMMENT_GAP;
  const preferredPosition = {
    x: target.x + target.width + COMMENT_GAP + comment.width / 2,
    y: target.y + target.height / 2
  };
  const candidates = [];

  for (let horizontalRing = 0; horizontalRing <= MAX_SEARCH_RINGS; horizontalRing++) {
    for (let verticalRing = 0; verticalRing <= MAX_SEARCH_RINGS; verticalRing++) {
      const verticalOffsets = verticalRing === 0
        ? [ 0 ]
        : [ -verticalRing * stepY, verticalRing * stepY ];
      for (const verticalOffset of verticalOffsets) {
        const candidate = {
          x: preferredPosition.x + horizontalRing * stepX,
          y: preferredPosition.y + verticalOffset
        };

        candidates.push(candidate);
      }
    }
  }

  candidates.sort((first, second) =>
    distanceSquared(first, preferredPosition) - distanceSquared(second, preferredPosition)
  );

  return candidates.find(candidate =>
    fitsInContainer(candidate, comment, containerBounds)
      && !obstacles.some(obstacle => overlaps(candidate, comment, obstacle))
      && hasClearAssociationPath(target, candidate, comment, pathObstacles)
  );
}

function distanceSquared(first, second) {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}

function getSpaceRoot(target, canvasRoot) {
  for (let parent = target.parent; parent && parent !== canvasRoot; parent = parent.parent) {
    if (hasBounds(parent)) {
      return parent;
    }
  }

  return canvasRoot;
}

function getContainerBounds(target) {
  for (let parent = target.parent; parent; parent = parent.parent) {
    if (hasBounds(parent)) {
      return {
        left: parent.x,
        top: parent.y,
        right: parent.x + parent.width,
        bottom: parent.y + parent.height
      };
    }
  }
}

function hasBounds(element) {
  return Number.isFinite(element.x)
    && Number.isFinite(element.y)
    && Number.isFinite(element.width)
    && Number.isFinite(element.height)
    && element.width > 0
    && element.height > 0;
}

function isAncestor(candidate, element) {
  for (let parent = element.parent; parent; parent = parent.parent) {
    if (parent === candidate) {
      return true;
    }
  }

  return false;
}

function fitsInContainer(position, comment, bounds) {
  if (!bounds) {
    return true;
  }

  const left = position.x - comment.width / 2;
  const top = position.y - comment.height / 2;
  return left >= bounds.left
    && top >= bounds.top
    && left + comment.width <= bounds.right
    && top + comment.height <= bounds.bottom;
}

function overlaps(position, comment, obstacle) {
  const bounds = getBounds(position, comment);

  if (obstacle.waypoints) {
    return connectionIntersectsBounds(obstacle.waypoints, bounds);
  }

  return bounds.left < obstacle.x + obstacle.width
    && bounds.right > obstacle.x
    && bounds.top < obstacle.y + obstacle.height
    && bounds.bottom > obstacle.y;
}

function getBounds(position, shape) {
  return {
    left: position.x - shape.width / 2,
    right: position.x + shape.width / 2,
    top: position.y - shape.height / 2,
    bottom: position.y + shape.height / 2
  };
}

function hasClearAssociationPath(target, position, comment, obstacles) {
  const [ start, end ] = getGeneratedCommentAssociationWaypoints(target, {
    x: position.x - comment.width / 2,
    y: position.y - comment.height / 2,
    width: comment.width,
    height: comment.height
  });

  return !obstacles.some(obstacle =>
    obstacle.waypoints
      ? connectionIntersectsSegment(obstacle.waypoints, start, end)
      : segmentIntersectsBounds(start, end, {
        left: obstacle.x,
        right: obstacle.x + obstacle.width,
        top: obstacle.y,
        bottom: obstacle.y + obstacle.height
      })
  );
}

function connectionIntersectsSegment(waypoints, start, end) {
  for (let index = 1; index < waypoints.length; index++) {
    const segmentStart = waypoints[index - 1];
    const segmentEnd = waypoints[index];
    const sharesSourceDockingPoint = samePoint(segmentStart, start)
      || samePoint(segmentEnd, start);

    if (segmentsIntersect(start, end, segmentStart, segmentEnd)
      && !sharesSourceDockingPoint) {
      return true;
    }
  }

  return false;
}

function samePoint(first, second) {
  return first.x === second.x && first.y === second.y;
}

function connectionIntersectsBounds(waypoints, bounds) {
  for (let index = 1; index < waypoints.length; index++) {
    const start = waypoints[index - 1];
    const end = waypoints[index];
    if (segmentIntersectsBounds(start, end, bounds)) {
      return true;
    }
  }

  return false;
}

function segmentIntersectsBounds(start, end, bounds) {
  if (pointInBounds(start, bounds) || pointInBounds(end, bounds)) {
    return true;
  }

  const topLeft = { x: bounds.left, y: bounds.top };
  const topRight = { x: bounds.right, y: bounds.top };
  const bottomLeft = { x: bounds.left, y: bounds.bottom };
  const bottomRight = { x: bounds.right, y: bounds.bottom };

  return segmentsIntersect(start, end, topLeft, topRight)
    || segmentsIntersect(start, end, topRight, bottomRight)
    || segmentsIntersect(start, end, bottomRight, bottomLeft)
    || segmentsIntersect(start, end, bottomLeft, topLeft);
}

function pointInBounds(point, bounds) {
  return point.x >= bounds.left && point.x <= bounds.right
    && point.y >= bounds.top && point.y <= bounds.bottom;
}

function segmentsIntersect(a, b, c, d) {
  const orientationA = orientation(a, b, c);
  const orientationB = orientation(a, b, d);
  const orientationC = orientation(c, d, a);
  const orientationD = orientation(c, d, b);

  if (orientationA !== orientationB && orientationC !== orientationD) {
    return true;
  }

  return orientationA === 0 && onSegment(a, c, b)
    || orientationB === 0 && onSegment(a, d, b)
    || orientationC === 0 && onSegment(c, a, d)
    || orientationD === 0 && onSegment(c, b, d);
}

function orientation(a, b, point) {
  const crossProduct = (b.y - a.y) * (point.x - b.x)
    - (b.x - a.x) * (point.y - b.y);

  return crossProduct === 0 ? 0 : crossProduct > 0 ? 1 : 2;
}

function onSegment(start, point, end) {
  return point.x <= Math.max(start.x, end.x)
    && point.x >= Math.min(start.x, end.x)
    && point.y <= Math.max(start.y, end.y)
    && point.y >= Math.min(start.y, end.y);
}
