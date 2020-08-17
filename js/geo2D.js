/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

import {utils} from "./utils.js";

const geo2D = {};


// Create geo2D objects
geo2D.createRange = (min, max) =>
{
  return {min, max};
}

geo2D.createSpan = (index, length) =>
{
  return {index, length};
}

geo2D.createPoint = (x, y) =>
{
  return {x, y};
}

geo2D.createPointFromArray = (a) =>
{
  const x = a[0] || 0;
  const y = a[1] || 0;
  return {x, y};
}

geo2D.createSize = (w, h) =>
{
  return {w, h};
}

geo2D.createRect = (x, y, w, h) =>
{
  return {x, y, w, h};
}

// Pass in lower-left and upper-right points
geo2D.createBounds = (min, max) =>
{
  if (min === undefined) min = geo2D.createPoint();
  if (max === undefined) max = geo2D.createPoint();
  return {min:{x:min.x, y:min.y}, max:{x:max.x, y:max.y}};
}

geo2D.createPolyLine = (vertices, count, closed) =>
{
  const result = {};
  result.vertices = [];
  result.segmentBounds = [];
  result.segmentThetas = [];
  result.count = count;
  result.closed = closed;
  result.bounds = geo2D.createBounds();

  let start = {};
  let end = {};
  let next;
  let dX, dY;
  let last = count-1;
  for (let i=0; i<count; i++)
  {
    result.vertices[i] = vertices[i];

    // Cache segment angle
    start = geo2D.createPointFromArray(vertices[i]);
    next = (i<last) ? i+1 : 0;
    end = geo2D.createPointFromArray(vertices[next]);
    dY = end.y - start.y;
    dX = end.x - start.x;
    result.segmentThetas[i] = Math.atan2(dY, dX);

    // Cache segment bounds
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);
    const bounds = [minX, minY, maxX, maxY];
    result.segmentBounds[i] = [...bounds];

    // Update PolyLine bounds
    const objBounds = {min:{x:minX, y:minY}, max:{x:maxX, y:maxY}};
    if (!i)
    {
      result.bounds = {...objBounds};
    }
    else
    {
      geo2D.boundsAdd(result.bounds, objBounds);
    }
  }

  return result;
}

geo2D.createPolyRect = (bounds) =>
{
  const vertices =
  [
    [bounds.min.x, bounds.min.y],
    [bounds.max.x, bounds.min.y],
    [bounds.max.x, bounds.max.y],
    [bounds.min.x, bounds.max.y]
  ];
  return geo2D.createPolyLine(vertices, 4, true);
}

geo2D.duplicatePolyLine = (polyLine) =>
{
  const result = {};
  const count = result.count = polyLine.count;
  result.vertices = [...polyLine.vertices];
  result.segmentBounds = [...polyLine.segmentBounds];
  result.segmentThetas = [...polyLine.segmentThetas];
  result.closed = polyLine.closed;
  return result;
}



// Update objects
geo2D.boundsAdd = (dst, src) =>
{
  if (src.min.x < dst.min.x)
  {
    dst.min.x = src.min.x;
  }
  if (src.max.x > dst.max.x)
  {
    dst.max.x = src.max.x;
  }
  if (src.min.y < dst.min.y)
  {
    dst.min.y = src.min.y;
  }
  if (src.max.y > dst.max.y)
  {
    dst.max.y = src.max.y;
  }
}



// Fetch lines from vertex array
geo2D.lineByIndex = (polyLine, index) =>
{
  const result = {};
  const end = index+2;
  result.vertices = polyLine.vertices.slice(index, end);
  result.bounds = polyLine.segmentBounds[index];
  result.theta = polyLine.segmentThetas[index];
  return result;
}



// Intersections
geo2D.lineInterseptY = (line) =>
{
  // Check if horizontal
  //console.log(line);
  if (!line.theta) return line.vertices[0].x;

  // Check if vertical; note: should return Inf
  if (line.bounds[0] === line.bounds[2]) return 0;

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
      if (lineA.bounds[2] < lineB.bounds[0] ||
          lineB.bounds[2] < lineA.bounds[0])
      {
        return {status:0}; // No intersect
      }
      return {status:-1}; // Co-linear intersect
    }

    // Check if vertical
    if (lineA.bounds[0] === lineA.bounds[2])
    {
      if (lineA.bounds[3] < lineB.bounds[1] ||
          lineB.bounds[3] < lineA.bounds[1])
      {
        return {status:0}; // No intersect
      }
      return {status:-1}; // Co-linear intersect
    }

    isParallel = true;
  }

  const yA = geo2D.lineInterseptY(lineA);
  const yB = geo2D.lineInterseptY(lineB);
  //console.log("y-intercepts:", yA, yB);

  if (isParallel)
  {
    // Check if co-linear
    if (yA !== yB) {status:0}; // No intersect

    if (lineA.bounds[2] < lineB.bounds[0] ||
        lineB.bounds[2] < lineA.bounds[0])
    {
      return {status:0}; // No intersect
    }
    return {status:-1}; // Co-linear intersect
  }

  // Calc general intersect
  const slopeA = Math.tan(lineA.theta);
  const slopeB = Math.tan(lineB.theta);
  //console.log("slopes:", slopeA, slopeB);

  result.x = (yB - yA) / (slopeA - slopeB);
  //console.log("result x:", result.x);

  if (result.x < lineA.bounds[0] ||
      result.x > lineA.bounds[2]) return 0; // No intersection

  if (result.x < lineB.bounds[0] ||
      result.x > lineB.bounds[2]) return 0; // No intersection

  result.y = slopeA*result.x + yA;
  //console.log("intersection:", result.x, result.y);

  result.status = 1;
  return result; // Found an intersection
}



// Test for containment
geo2D.boundsContainsPoint = (bounds, point) =>
{
  return point.x >= bounds.min.x && point.x <= bounds.max.x &&
    point.y >= bounds.min.y && point.y <= bounds.max.y;
}

geo2D.boundsContainsBounds = (boundsA, boundsB) =>
{
  return (boundsA.max.x < boundsB.min.x || boundsB.max.x < boundsA.min.x ||
    boundsA.max.y < boundsB.min.y || boundsB.max.y < boundsA.min.y) ? 0 :
  ((boundsB.min.x >= boundsA.min.x && boundsB.max.x < boundsA.max.x &&
    boundsB.min.y >= boundsA.min.y && boundsB.max.y < boundsA.max.y) ? 1 : -1);
}

geo2D.polygonContainsPoint = (polygon, point) =>
{
  if (!polygon.closed) return false;
  if (!geo2D.boundsContainsPoint(polygon.bounds, point)) return false;

  let x;
  let winds = 0;
  let theta;
  const start = {};
  const bounds = polygon.segmentBounds;
  const thetas = polygon.segmentThetas;
  const vertices = polygon.vertices;

  // Iterate through lines
  //console.log("point:", point);
  for (let i=0; i<polygon.count; i++)
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
      if (point.y !== start.y) continue;
      // point is on line
      return true;
    }

    // Special handling if line slope is vertical
    if (bounds[i].min.x === bounds[i].max.x)
    {
      // Skip if not co-linear
      if (point.x > start.x) continue;
      // point is on line
      return true;
    }

    // Get intersept x
    x = start.x + (point.y-start.y) / Math.tan(theta);
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
  const inside = geo2D.boundsContainsBounds(box, polyLine.bounds);
  if (inside >= 0) return inside;

  let rectVertex = {};
  let count = polyLine.count;
  let lineRect = {};
  let linePoly = {};
  if (!polyLine.closed) count--;

  // If polyLine closed (is a polygon)
  //   If any box vertices are in polygon Then overlap
  // Else If intersections Then overlap
  // Else outside

  // Iterate bounds rect edges
  const polyRect = geo2D.createPolyRect(box);
  for (let j=0; j<4; j++)
  {
    if (polyLine.closed)
    {
      // If any box vertices are in the polygon then there's an overlap
      rectVertex = rect.vertices[j];
      if (geo2D.polygonContainsPoint(polyLine, rectVertex)) return -1;
    }

    // If there are segment intersections then there's an overlap
    lineRect = geo2D.lineByIndex(polyRect, j);
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
  if (!geo2D.boundsContainsBounds(polygon.bounds, box)) return 0;

  let rectVertex = {};
  let lineRect = {};
  let linePoly = {};

  // If intersections Then overlap
  // If all box vertices are outside polygon Then outside
  // If all box vertices are in polygon Then inside
  // Else overlap

  // Iterate bounds rect edges
  let inside = 0;
  const count = polygon.count;
  const polyRect = geo2D.createPolyRect(box);
  //console.log("__________\npolygonContainsBounds polyRect:", polyRect);
  for (let j=0; j<4; j++)
  {
    // If there are segment intersections then there's an overlap
    lineRect = geo2D.lineByIndex(polyRect, j);
    //console.log("lineRect:", lineRect);
    for (let i=0; i<count; i++)
    {
      linePoly = geo2D.lineByIndex(polygon, i);
      //console.log("linePoly:", linePoly);
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
  const inside = geo2D.boundsContainsBounds(polygon.bounds, polyLine.bounds);
  if (inside >= 0) return inside;

  let vertex = {};
  let linePolygon = {};
  let linePolyLine = {};
  let count = polyLine.count;
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
    for (let i=0; i<count; i++)
    {
      linePolyLine = geo2D.lineByIndex(polyLine, count);
      if (geo2D.linesIntersect(linePolygon, linePolyLine, NULL)) return -1;
    }
  }

  // Otherwise polyLine is outside
  return 0;
}


export {geo2D};
