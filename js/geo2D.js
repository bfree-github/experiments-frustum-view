/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

import {utils} from "./utils.js";


const geo2D = {};

geo2D.lineByIndex = (polyLine, index) =>
{
  const result = {};
  result.vertices = polyLine.vertices[index];
  result.bounds = polyLine.segmentBounds[index];
  result.theta = polyLine.segmentThetas[index];
  return result;
}

geo2D.lineInterseptY = (line) =>
{
  // Check if horizontal
  if (!line.theta) return line.vertices[0].x;

  // Check if vertical; note: should return Inf
  if (line.bounds.min.x == line.bounds.max.x) return 0;

  return line.vertices[0].y - line.vertices[0].x * Math.tan(line.theta);
}

geo2D.linesIntersect = (lineA, lineB) =>
{
  const result = {status:0};

  // Check if lines are parallel
  const isParallel = false;
  if (lineA.theta === lineB.theta)
  {
    //console.log("lines are parallel");
    // Check if horizontal
    if (!lineA.theta)
    {
      if (lineA.bounds.max.x < lineB.bounds.min.x ||
          lineB.bounds.max.x < lineA.bounds.min.x)
      {
        return result; // No intersect
      }

      result.status = -1;
      return result; // Co-linear intersect
    }

    // Check if vertical
    if (lineA.bounds.min.x === lineA.bounds.max.x)
    {
      if (lineA.bounds.max.y < lineB.bounds.min.y ||
          lineB.bounds.max.y < lineA.bounds.min.y)
      {
        return result; // No intersect
      }

      result.status = -1;
      return result; // Co-linear intersect
    }

    isParallel = true;
  }

  const yA = geo2D.lineInterseptY(lineA);
  const yB = geo2D.lineInterseptY(lineB);
  //console.log("y-intercepts:", yA, yB);

  if (isParallel)
  {
    // Check if co-linear
    if (yA !== yB) return 0; // No intersect

    if (lineA.bounds.max.x < lineB.bounds.min.x ||
        lineB.bounds.max.x < lineA.bounds.min.x)
    {
      return result; // No intersect
    }
    result.status = -1;
    return result; // Co-linear intersect
  }

  // Calc general intersect
  const slopeA = Math.tan(lineA.theta);
  const slopeB = Math.tan(lineB.theta);
  //console.log("slopes:", slopeA, slopeB);

  result.x = (yB - yA) / (slopeA - slopeB);
  //console.log("result x:", result.x);

  if (result.x < lineA.bounds.min.x ||
      result.x > lineA.bounds.max.x) return 0; // No intersection

  if (result.x < lineB.bounds.min.x ||
      result.x > lineB.bounds.max.x) return 0; // No intersection

  result.y = slopeA*result.x + yA;
  //console.log("intersection:", result.x, result.y);

  result.status = 1;
  return result; // Found an intersection
}

geo2D.boundsAdd = (dst, src) =>
{
  if (src.min < dst.min)
  {
    dst.min = src.min;
  }
  else if (src.max > dst.max)
  {
    dst.max = src.max;
  }
}

geo2D.createPolyLine = (vertices, count, closed) =>
{
  const result = {};
  result.vertices = [];
  result.segmentBounds = [];
  result.segmentThetas = [];
  result.count = count;
  result.closed = closed;

  const bounds = {};
  const start = {};
  const end = {};

  let next;
  let dX, dY;
  let last = count-1;
  for (let i=0; i<count; i++)
  {
    result.vertices[i] = vertices[i];

    // Cache segment angle
    start = vertices[i];
    next = (i<last) ? i+1 : 0;
    end = vertices[next];
    dY = end.y - start.y;
    dX = end.x - start.x;
    result.segmentThetas[i] = Math.atan2(dY, dX);

    // Cache segment bounds
    bounds.min.x = Math.min(start.x, end.x);
    bounds.max.x = Math.max(start.x, end.x);
    bounds.min.y = Math.min(start.y, end.y);
    bounds.max.y = Math.max(start.y, end.y);
    result.segmentBounds[i] = bounds;

    // Update PolyLine bounds
    if (!i)
    {
      result.bounds = bounds;
    }
    else
    {
      geo2D.boundsAdd(result.bounds, bounds);
    }
  }

  return result;
}

geo2D.duplicatePolyLine = (polyLine) =>
{
  const result = {};
  const count = result.count = polyLine.count;
  result.vertices = [];
  result.segmentBounds = [];
  result.segmentThetas = [];
  result.closed = polyLine.closed;
  return result;
}

geo2D.createRect = (bounds) =>
{
  const vertices = [];
  vertices[0] =
  [
    bounds.min,
    {
      x: bounds.max.x,
      y: bounds.min.y
    },
    bounds.max,
    {
      x: bounds.min.x,
      y: bounds.max.y
    }
  ];
  return geo2D.createPolyLine(vertices, 4, true);
}



const geo2D.boundsContainsPoint2D = (bounds, point) =>
{
  return point.x >= bounds.min.x && point.x <= bounds.max.x &&
    point.y >= bounds.min.y && point.y <= bounds.max.y;
}

const geo2D.boundsContainsBounds2D = (boundsA, boundsB) =>
{
  return (boundsA.max.x < boundsB.min.x || boundsB.max.x < boundsA.min.x ||
    boundsA.max.y < boundsB.min.y || boundsB.max.y < boundsA.min.y) ? 0 :
  ((boundsB.min.x >= boundsA.min.x && boundsB.max.x < boundsA.max.x &&
    boundsB.min.y >= boundsA.min.y && boundsB.max.y < boundsA.max.y) ? 1 : -1);
}



geo2D.polygonContainsPoint = (polygon, point) =>
{
  if (!polygon.closed) return false;
  if (!geo2D.boundsContainsPoint2D(polygon.bounds, point)) return false;

  let x;
  let winds = 0;
  let theta;
  const start = {};
  const bounds = polygon.segmentBounds;
  const thetas = polygon.segmentThetas;
  const vertices = polygon.vertices;

  // Iterate through lines
  //console.log("point:", point);
  for (let i=0; i<polygon->count; i++)
  {
    // Skip if outside y bounds
    if (point.y < bounds[i].min.y || point.y > bounds[i].max.y) continue;

    // Skip if outside x bounds
    theta = thetas[i];
    start = vertices[i];

    // Special handling if line slope is 0
    if (!theta)
    {
      // Skip if not co-linear
      if (point.y != start.y) continue;
      // point is on line
      return true;
    }

    // Special handling if line slope is vertical
    if (bounds[i].min.x == bounds[i].max.x)
    {
      // Skip if not co-linear
      if (point.x > start.x) continue;
      // point is on line
      return true;
    }

    // Get intersept x
    x = start.x + (point.y-start.y) / tan(theta);
    //console.log("intersect x:", i, x);

    // Skip if intersept is left of point
    if (x < point.x) continue;

    // Add to winding depending on up/down theta
    winds += utils.signum(theta);
  }

  //console.log("winds:", winds);
  return !!winds;
}

geo2D.boundsContainsPolyLine = (box, polyLine) =>
{
  // PolyLine either completely inside or outside of bounds
  const inside = geo2D.boundsContainsBounds2D(box, polyLine.bounds);
  if (inside >= 0) return inside;

  const rectVertex = {};
  let count = polyLine.count;
  const lineRect = {};
  const linePoly = {};
  if (!polyLine.closed) count--;

  // If polyLine closed (is a polygon)
  //   If any box vertices are in polygon Then overlap
  // Else If intersections Then overlap
  // Else outside

  // Iterate bounds rect edges
  const rect = geo2D.createRect(box);
  for (let j=0; j<4; j++)
  {
    if (polyLine.closed)
    {
      // If any box vertices are in the polygon then there's an overlap
      rectVertex = rect.vertices[j];
      if (geo2D.polygonContainsPoint(polyLine, rectVertex)) return -1;
    }

    // If there are segment intersections then there's an overlap
    lineRect = geo2D.lineByIndex(rect, j);
    for (let i=0; i<count; i++)
    {
      linePoly = geo2D.lineByIndex(polyLine, count);
      const intersect = geo2D.linesIntersect(lineRect, linePoly);
      if (intersect.status) return -1;
    }
  }

  // Otherwise polyLine is outside
  return 0;
}

geo2D.polygonContainsBounds = (polygon, box) =>
{
  if (!polygon.closed) return false;

  // Check if polygon is completely outside of bounds
  if (!geo2D.boundsContainsBounds2D(polygonbounds, box)) return 0;

  const rectVertex = {};
  const count = polygon.count;
  const lineRect = {};
  const linePoly = {};

  // If intersections Then overlap
  // If all box vertices are outside polygon Then outside
  // If all box vertices are in polygon Then inside
  // Else overlap

  // Iterate bounds rect edges
  let inside = 0;
  const rect = geo2D.createRect(box);
  for (let j=0; j<4; j++)
  {
    // If there are segment intersections then there's an overlap
    geo2D.lineByIndex(lineRect, rect, j);
    for (let i=0; i<count; i++)
    {
      geo2D.lineByIndex(linePoly, polygon, count);
      const intersect = geo2D.linesIntersect(lineRect, linePoly);
      if (intersect.status) return -1;
    }

    // If all box vertices are in the polygon then inside
    rectVertex = rect.vertices[j];
    if (geo2D.polygonContainsPoint(polygon, rectVertex)) inside++;
  }

  // If no rect vertices are in the polygon then outside
  if (!inside) return 0;

  // If all rect vertices are in the polygon then inside
  if (inside == 4) return 1;

  // Otherwise ovelap
  return -1;
}

geo2D.polygonContainsPolyLine = (polygon, polyLine) =>
{
  // PolyLine either completely inside or outside of bounds
  const inside = geo2D.boundsContainsBounds2D(polygon.bounds, polyLine.bounds);
  if (inside >= 0) return inside;

  const vertex = {};
  let count = polyLine.count;
  const linePolygon = {};
  const linePolyLine = {};
  if (!polyLine.closed) count--;

  // If polyLine closed (is a polygon)
  //   If any polygon vertices are in polyLine Then overlap
  // Else If intersections Then overlap
  // Else outside

  // Iterate bounds rect edges
  for (let j=0; j<polygon.count; j++)
  {
    if (polyLine.closed)
    {
      // If any polygon vertices are in the polygon then there's an overlap
      vertex = polygon.vertices[j];
      if (geo2D.polygonContainsPoint(polyLine, vertex)) return -1;
    }

    // If there are segment intersections then there's an overlap
    linePolygon = geo2D.lineByIndex(polygon, j);
    for (int i=0; i<count; i++)
    {
      linePolyLine = geo2D.lineByIndex(polyLine, count);
      if (geo2DlinesIntersect(linePolygon, linePolyLine, NULL)) return -1;
    }
  }

  // Otherwise polyLine is outside
  return 0;
}


export {geo2D};
