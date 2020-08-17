/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

import {utils} from "./utils.js";
import {geo2D} from "./geo2D.js";

const tiling = {};


// Internal values
var _ctx;
var _width;
var _height;
var _tilingType;
var _trapezoid;
var _polygon;
var _level;
var _gridSize;
var _event;

tiling.init = (ctx) =>
{
  _ctx = ctx;
  _width = ctx.w;
  _height = ctx.h;
}

tiling.stop = () =>
{
  if (_event) clearInterval(_event);
}

tiling.fillTrapezoid = (trapezoid, type) =>
{
  //console.log("trapezoid:", type);
  tiling.stop();
  _tilingType = type || "least";
  _trapezoid = trapezoid;
  //console.log("trapezoid:", trapezoid);
  _level = trapezoid[4];
  //_event = setInterval(enumerateTiles, 0);
  enumerateTiles();
}

const enumerateTiles = () =>
{
  const [pt1, pt2, pt3, pt4] = _trapezoid;
  const bounds = geo2D.createBounds(pt1, pt3);
  _polygon = geo2D.createPolyLine(_trapezoid, 4, true);
  const trapBounds = _polygon.bounds;
  const segBounds = _polygon.segmentBounds[0];

  // !!! Assuming square map!
  const level = _level;
  _gridSize = Math.pow(2, level);
  const xInc = _width/_gridSize;
  const yInc = _height/_gridSize;
  //console.log("grid size:", _gridSize, xInc, yInc);

  let startY = 0;
  let endY = 1;
  let startX = 0;
  let endX = 1;

  // First pass tile culling by bounding box
  const tileList = [];
  if (!_level)
  {
    const xMin = tileToModelSize(0);
    const yMin = tileToModelSize(0);
    const xMax = tileToModelSize(1);
    const yMax = tileToModelSize(1);

    const min = geo2D.createPoint(xMin, yMin);
    const max = geo2D.createPoint(xMax, yMax);

    tileList.push({tile:{level, x:0, y:0}, coords:{min,max}});
    sendTiles(tileList);
    return;
  }
  else
  {
    // Calculate trapezoid bounding box for this level and translation
    startX = modelToTilelSize(trapBounds.min.x);
    endX = modelToTilelSize(trapBounds.max.x) + 1;
    startY = modelToTilelSize(trapBounds.min.y);
    endY = modelToTilelSize(trapBounds.max.y) + 1;
    if (startX < 0) startX = 0;
    if (startY < 0) startY = 0;
    if (endX > _gridSize) endX = _gridSize;
    if (endY > _gridSize) endY = _gridSize;
    //console.log("tile bounds:", startX, startY, endX, endY);

    // Collect tiles within trapezoid bounding box
    for (let y=startY; y<endY; y++)
    {
      for (let x=startX; x<endX; x++)
      {
        const xMin = tileToModelSize(x);
        const yMin = tileToModelSize(y);
        const xMax = tileToModelSize(x+1);
        const yMax = tileToModelSize(y+1);

        const min = geo2D.createPoint(xMin, yMin);
        const max = geo2D.createPoint(xMax, yMax);

        tileList.push({tile:{level, x, y}, coords:{min,max}});
      }
    }
  }

  processTiles(tileList);
}

const modelToTilelSize = (value) =>
{
  return parseInt(_gridSize * (1.0 + value) / 2.0);
}

const tileToModelSize = (value) =>
{
  return (2.0 * value / _gridSize) - 1.0;
}

const processTiles = (tileList) =>
{
  // Cull tiles outside of trapezoid polygon
  const result = [];
  for (let i=0; i<tileList.length; i++)
  {
    const tile = tileList[i];
    const bounds = tile.coords;
    const status = geo2D.polygonContainsBounds(_polygon, bounds);
    if (status)
    {
      const state = (status === 1) ? "inside" : "overlap";
      //console.log("tile", i, state);
      result.push(tile);
      continue;
    }
    //console.log("tile", i, "outside");
  }
  if (result.length) sendTiles(result);
}

const sendTiles = (tileList) =>
{
  //console.log("tiles:", tileList.length, tileList);
  console.log("tiles:", tileList.length);
  for (let i=0; i<tileList.length; i++)
  {
    const tile = tileList[i].tile;
    console.log(" ", tile.level, tile.x, tile.y);
  }
}

export {tiling};
