/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

import {utils} from "./utils.js";
import {webGL} from "./webGL.js";

const viewPersp = {};

// Private values
var _main;
var _canvasID;


// Define view constrains
const view = {};
view.groundScale = 1.0;
view.near = 0.000001;
view.far = 10.0;
view.fov = 45;

view.maxLevels = 20;
view.level = 0;

view.zPosMax = -view.near;
view.zPosMin = -2.0 * view.groundScale / Math.tan(utils.degToRad(view.fov/2.0));
view.xPos = 0;
view.yPos = 0;
view.zPos = 0.5 * view.zPosMin / view.groundScale;
//console.log("initial zPos:", view.zPos, view.zPosMin, view.zPosMax);

view.zRot = 0;
view.lookAt = [0, 0, 0];
view.upAxis = [0, 0, -1];


// Define model
const model = {};
model.vertices = [
  -view.groundScale, -view.groundScale,  0.0,
   view.groundScale, -view.groundScale,  0.0,
   view.groundScale,  view.groundScale,  0.0,
  -view.groundScale,  view.groundScale,  0.0,
];
model.vertexElements = 3;
model.vertexCount = 4;

model.indices = [
  0,  1,  2,
  0,  2,  3,
];
model.indexCount = 6;


// Initialize scene
viewPersp.init = (main, canvasID) => {
  //console.log("viewPersp init:", canvasID);

  _main = main;
  _canvasID = canvasID;

  webGL.init(main, canvasID, model, view);
}

export {viewPersp};
