/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

// !!! Needs to be further refactored and modularized


import {utils}    from "./utils.js";
import {shaders}  from "./shaders.js";
import {nav3D}    from "./nav3D.js";
import {tiling}    from "./tiling.js";

const webGL = {};


// Internal values
var _main;
var _canvasID;
var _canvas;
var _ctx;
var _gl;
var _width;
var _height;

var _model = {};
var _view = {};
var _tileVertices = [];

var _shaderProgram;
var _dirty = true;

const _matrices =
{
  xformMatrix:null,
  pMatrix:null,
  mvMatrix:null,
  mvMatrixStack:null
}



// Initialize webGL environment
webGL.init = (main, canvasID, model, view) => {
  //console.log("webGL init");

  // Cache parameters
  _main = main;
  webGL.main = _main;
  webGL.methods = {};
  webGL.methods.draw = draw;
  webGL.methods.elevateLookAt = elevateLookAt;

  _canvasID = canvasID;
  _canvas = $("#"+canvasID)[0];

  // Get canvas dim from style
  _width = _canvas.getBoundingClientRect().width;
  _height = _canvas.getBoundingClientRect().height;

  // Set canvas dim
  _canvas.width = _width;
  _canvas.height = _height;
  //console.log(_canvasID, _width+"x"+_height);

  // Cache model data
  _model = model;
  //console.log("model:", model);

  // Populate derivative view data
  _view = view;
  _view.maxLevel = _view.maxLevels-1;
  _view.zPosDiff = _view.zPosMax - _view.zPosMin;
  //console.log("zPosDiff:", _view.zPosMin, _view.zPosMax, _view.zPosDiff);
  _view.distMax = vec3.length([_view.groundScale, _view.groundScale, 0]);
  _view.eyePos = [_view.xPos, _view.yPos, _view.zPos];
  _view.elevationMax = 1.0;
  _view.elevationMin = 0.0;
  _view.elevationMid = (_view.elevationMax + _view.elevationMin) / 2.0;
  _view.elevation = getElevation(_view.zPos);
  _view.level = getLevel(_view.elevation);
  //console.log("initial elevation:", _view.elevation, _view.zPos);

  // Initialize tiling engine
  const tilingCtx = {w:_model.vertices[3]*2.0, h:_model.vertices[6]*2};
  //console.log("tiling ctx:", tilingCtx);
  tilingCtx.methods = {drawTile};
  tiling.init(tilingCtx);

  // Initialize webGL
  _gl = initGL(_canvas);
  //console.log(_gl);
  initScene(_gl, _view.fov);

  // Initialize lookAt point
  _view.lookAt = elevateLookAt(_view.eyePos, _view.lookAt,
    _view.zRot, _view.fov, _view.elevation);
  //console.log(_view.lookAt);

  // Initialize navigation
  nav3D.init(webGL, _canvas, _view);
  //initNavigation();

  //console.log("webGL init draw");
  draw();
}

// zPos <-> elevation covertion
const getElevation = (zPos) =>
{
  return zPos / _view.zPosMin;
}

const getZPos = (elevation) =>
{
  return elevation * _view.zPosMin;
}

const getLevel = (elevation) =>
{
  const unitLevel = utils.clamp(0, 1, 2.0 * elevation);
  const scaledLevel = (unitLevel <= 0) ? 0 : parseInt(utils.log_2(1.0 / unitLevel));
  const level = utils.clamp(0, _view.maxLevel, scaledLevel);
  //console.log("frustum level:", _view.elevation, _view.zPos, unitLevel, level);
  return level;
}

// Initialize WebGL context
const initGL = (canvas) => {
  //console.log("Initializing WebGL");

  // Handle lost context
  canvas.addEventListener("webglcontextlost", (evt) => {
    evt.preventDefault();
    console.log('webgl lost context');
  }, {passive: false});

  const restoreContext = () => {
    console.log('need to restore context');
  };

  canvas.addEventListener("webglcontextrestored",
    restoreContext, {passive: false});

  // Instantiate WebGL
  const gl = WebGLUtils.setupWebGL(canvas);
  if (gl)
  {
    gl.viewportWidth = _width;
    gl.viewportHeight = _height;
    //console.log('WebGL initialized');
  }
  else
  {
    alert("Unable to initialize WebGL");
  }
  return gl;
}

// Initialize webGL scene
const initScene = (gl, fov) => {
  // Setup viewport
  initMatrices(_matrices);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight,
   _view.near, _view.far, _matrices.pMatrix);

  _shaderProgram = initShaders(gl);
  initBuffers(_shaderProgram);

  // Set background to orange - just cause
  gl.clearColor(1.0, 0.5, 0.0, 1.0);

  // Set ground plane color
  gl.uniform3f(_shaderProgram.colorUniform,1.0,0.0,0.0);

  // Draw on demand, rather than animate
  //tick();
}

// Load shaders
const loadShader = (gl, shaderScript) =>
{
  let shader;
  if (shaderScript.type == "x-shader/x-fragment")
  {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  }
  else if (shaderScript.type == "x-shader/x-vertex")
  {
    shader = gl.createShader(gl.VERTEX_SHADER);
  }
  else
  {
      return null;
  }

  gl.shaderSource(shader, shaderScript.code);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
  {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

// Initialize shaders
const initShaders = (gl) =>
{
  let fragmentShader = loadShader(gl, shaders.fragment);
  let vertexShader = loadShader(gl, shaders.vertex);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
  {
    alert("Unable to initialize shader");
  }

  shaderProgram.gl = gl;
  initShaderParameters(shaderProgram);

  return shaderProgram;
}

// Init OpenGL uniforms, attributes, varyings
const initShaderParameters = (shaderProgram) =>
{
  const gl = shaderProgram.gl;
  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram,
    "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

// Matrix utilities
const initMatrices = (matrices) =>
{
  matrices.xformMatrix = mat4.create();
  matrices.pMatrix = mat4.create();
  matrices.mvMatrix = mat4.create();
  matrices.mvMatrixStack = [];
}

const mvPushMatrix = (matrices) =>
{
  let copy = mat4.create();
  mat4.set(matrices.mvMatrix, copy);
  matrices.mvMatrixStack.push(copy);
}

const mvPopMatrix = (matrices) =>
{
  if (matrices.mvMatrixStack.length == 0)
  {
    throw "Attempting to pop an empty mvMatrix stack!";
  }
  matrices.mvMatrix = matrices.mvMatrixStack.pop();
}

const setMatrixUniforms = (shaderProgram, matrices) =>
{
  const gl = shaderProgram.gl;

  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, matrices.pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, matrices.mvMatrix);
}

// Initialize VBOs
const initBuffers = (shaderProgram) =>
{
  const gl = shaderProgram.gl;

  const vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_model.vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
    _model.vertexElements, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_model.indices), gl.STATIC_DRAW);
}

// Determine view vector
const viewVector = (eyePos, lookAt) =>
{
  //console.log("viewVector:", eyePos[0], eyePos[1], lookAt[0], lookAt[1]);
  const xDiff = lookAt[0] - eyePos[0];
  const yDiff = lookAt[1] - eyePos[1];

  // Looking straight down (or up)
  if (!xDiff && !yDiff) return undefined;

  const zDiff = eyePos[2] - lookAt[2];
  const groundDist = vec3.length([xDiff, yDiff, 0]);
  const attitude = Math.atan2(zDiff, groundDist);
  const orientation = Math.atan2(yDiff, xDiff);

  //console.log("viewVector results:", groundDist, utils.radToDeg(attitude),
  //  utils.radToDeg(orientation));
  return [groundDist, attitude, orientation, xDiff, yDiff, zDiff];
}

// Set lookAt point
const elevateLookAt = (eyePos, lookAt, zRot, yFov, elev) =>
{
  const zPos = getZPos(elev);
  //console.log("elevateLookAt:", eyePos[2], _view.zPos, zPos, elev);
  _view.zPos = zPos;
  _view.eyePos[2] = _view.zPos;
  return _view.lookAt;

  // Decided to only change eye elevation
  /*
  const viewVec = viewVector(eyePos, _view.lookAt);
  let dist, attitude, theta;

  // View is straight down; use _view.zRot for orientation
  if (!viewVec)
  {
    dist = 0;
    attitude = utils.degToRad(-90);
    theta = zRot;
  }
  else
  {
    [dist, attitude, theta] = viewVec;
  }

  // attitude must not go higher than yFov/2 below horizon
  // Ground dist should not go farther than half the diagonal of the map area (1.4)

  // Adjust _view.zPos acceleration curve: fast to slow
  //console.log("zDiff:", _view.zPosMin, _view.zPosMax, _view.zPosDiff);
  zPos = _view.zPosMin + _view.zPosDiff*(1.0-Math.pow(elev, 2.0));
  //console.log("zPos:", _view.zPos, zPos);
  _view.eyePos[2] = zPos;
  _view.zPos = zPos;

  // Adjust ground dist acceleration curve: slow to fast
  const previousDist = dist;
  dist = Math.pow(_view.distMax*(1.0-elev), 2.0);
  //console.log("elevation:", elev);
  //console.log("dist:", previousDist, dist);

  // Get new attitude
  const previousAttitude = attitude;
  attitude = Math.atan2(_view.zPos, dist);
  //console.log("attitude:", utils.radToDeg(previousAttitude), utils.radToDeg(attitude));
  //console.log("orientation:", theta);

  const result = [];
  result[0] = (eyePos[0] + dist * Math.sin(-theta));
  result[1] = (eyePos[1] + dist * Math.cos(-theta));
  result[2] = lookAt[2];
  //console.log("previous elevateLookAt:", _view.lookAt[0], _view.lookAt[1],
  //  _view.lookAt[2]);
  //console.log("elevateLookAt:", result[0], result[1], result[2]);

  return result;
  */
}

// Change the lookAt point via rotation about vertical axis
const yawLookAt = (eyePos, lookAt, zRot) =>
{
  const viewVec = viewVector(eyePos, lookAt);
  if (!viewVec) return undefined;
  const [dist, attitude, orientation] = viewVec;
  //console.log("yawLookAt viewVector:", dist, utils.radToDeg(orientation),
  //  utils.radToDeg(zRot));

  const result = [];
  result[0] = (eyePos[0] + dist * Math.sin(-zRot));
  result[1] = (eyePos[1] + dist * Math.cos(-zRot));
  result[2] = lookAt[2];
  //console.log("yawLookAt:", result);

  return result;
}

// Determine the view frustum as projected on the ground
const projectFrustum = (eyePos, lookAt, zRot, xFov, yFov) =>
{
  // Could do this with an inverse of the view matrix
  // I'm doing it with trig instead to demonstrate how it works
  // Also faster with trig if you are only doing a few points
  ///
  // eyePoint and lookAt are vec3 x,y,z
  // zRot is the orientation around vertical axis
  // xFov and yFov are field of view for each dimension in degrees

  // Calc level
  _view.level = getLevel(_view.elevation);

  // Calc the frustum
  const topLeft = [];
  const topRight = [];
  const bottomLeft = [];
  const bottomRight = [];

  const xFovRad_2 = utils.degToRad(xFov) / 2.0;
  const yFovRad_2 = utils.degToRad(yFov) / 2.0;

  // Handle when camera facing straight down
  const viewVec = viewVector(eyePos, lookAt);
  if (!viewVec)
  {
    const height = -eyePos[2];
    const x0 = height * Math.tan(xFovRad_2);
    const y0 = height * Math.tan(yFovRad_2);
    const d = vec3.length([x0, y0, 0]);
    const a = Math.atan2(y0, x0) + zRot;
    const x = _view.eyePos[0] + d * Math.cos(a);
    const y = _view.eyePos[1] + d * Math.sin(a);
    //console.log("trap width:", x, unitLevel);

    topRight[0] = lookAt[0] + x;
    topRight[1] = lookAt[1] + y;
    topLeft[0] = lookAt[0] - x;
    topLeft[1] = lookAt[1] + y;
    bottomLeft[0] = lookAt[0] - x;
    bottomLeft[1] = lookAt[1] - y;
    bottomRight[0] = lookAt[0] + x;
    bottomRight[1] = lookAt[1] - y;

    //console.log("projectFrustum down:", bottomLeft, bottomRight, topRight, topLeft, _view.level);
    return [bottomLeft, bottomRight, topRight, topLeft, _view.level];
  }
  const [dist, attitude, orientation, xDiff, yDiff, zDiff] = viewVec;
  //console.log("projectFrustum viewVector:", dist,
  //  utils.radToDeg(attitude), utils.radToDeg(orientation));

  var attitudeTop = attitude + yFovRad_2;
  var attitudeBottom = attitude - yFovRad_2;
  if (attitudeTop >= 0)
  {
    // Need special handling when above horizon
    console.log("Looking above horizon; attitude too hight");
    attitudeTop = utils.degToRad(_view.zPosMax);
    attitudeBottom = attitudeTop - utils.degToRad(yFov);
  }
  //console.log("attitudes:", utils.radToDeg(attitudeTop), utils.radToDeg(attitudeBottom));

  const height = eyePos[2];
  var topY = height / Math.tan(attitudeTop);
  var bottomY = height / Math.tan(attitudeBottom);
  //console.log("top/bot Y:", topY, bottomY);

  const topDist = vec3.length([height, topY, 0]);
  const bottomDist = vec3.length([height, bottomY, 0]);
  //console.log("top/bot dist:", topDist, bottomDist);

  const m = Math.tan(xFovRad_2);
  const topX = topDist * m;
  const bottomX = bottomDist * m;

  const zCos = Math.cos(zRot);
  const zSin = Math.sin(zRot);

  topRight[0] = -_view.eyePos[0] + topX * zCos + topY * zSin;
  topRight[1] = -_view.eyePos[1] + topX * zSin - topY * zCos;

  topLeft[0] = -_view.eyePos[0] + -topX * zCos + topY * zSin;
  topLeft[1] = -_view.eyePos[1] + -topX * zSin - topY * zCos;

  bottomLeft[0] = -_view.eyePos[0] + -bottomX * zCos + bottomY * zSin;
  bottomLeft[1] = -_view.eyePos[1] + -bottomX * zSin - bottomY * zCos;

  bottomRight[0] = -_view.eyePos[0] + bottomX * zCos + bottomY * zSin;
  bottomRight[1] = -_view.eyePos[1] + bottomX * zSin - bottomY * zCos;

  //console.log("projectFrustum:", bottomLeft, bottomRight, topRight, topLeft, level);
  return [bottomLeft, bottomRight, topRight, topLeft, _view.level];
}

const draw = () =>
{
  // Stop progressive tiling
  tiling.stop();

  // No need to save modelview matrix as we're only drawing frames when it changes
  //mvPushMatrix(_matrices);

  // Set up view matrices
  const zRot = utils.degToRad(-_view.zRot);
  const viewVec = viewVector(_view.eyePos, _view.lookAt);
  if (!viewVec)
  {
    // Camera looking straight down
    //console.log("draw look down");
    mat4.identity(_matrices.mvMatrix);
    mat4.rotate(_matrices.mvMatrix, zRot, [0, 0, 1]);
    mat4.translate(_matrices.mvMatrix, _view.eyePos);
  }
  else
  {
    //const attitude = Math.atan2(_view.eyePos[2], )
    const yDist = _view.lookAt[1] - _view.eyePos[1];
    //console.log("yDist:", yDist);

    // General camera view handling
    //console.log("draw look out");
    _view.lookAt = yawLookAt(_view.eyePos, _view.lookAt, zRot);
    mat4.lookAt(_view.eyePos, _view.lookAt, _view.upAxis, _matrices.mvMatrix);
  }
  //console.log("lookAt", _view.lookAt[0], _view.lookAt[1], _view.lookAt[2]);
  //console.log("eyePos", _view.eyePos[0], _view.eyePos[1], _view.eyePos[2]);

  // Update GPU matrices
  setMatrixUniforms(_shaderProgram, _matrices);

  // Pass frustum projection to ortho view
  let trapezoid = projectFrustum(_view.eyePos, _view.lookAt, zRot,
    _view.fov, _view.fov);
  //console.log("trapezoid level:", trapezoid[4]);
  _main.viewPerspTrapezoid(trapezoid);
  //console.log("drawScene trapezoid:", trapezoid);

  // Render the ground plane
  drawScene(_gl);
  //mvPopMatrix(_matrices);

  // Fill trapezoid with tiles
  //console.log("fillTrapezoid");
  tiling.fillTrapezoid(trapezoid, "least");
}

// Render the scene
const drawScene = (gl) =>
{
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (_dirty)
  {
    _dirty = false;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_model.vertices), gl.STATIC_DRAW);
  }
  gl.drawArrays(gl.TRIANGLE_FAN, 0, _model.vertexCount);
}

// Draw tile
const drawTile = (gl, tile, color) =>
{
  console.log("tile:", rect, color);
}
const drawRect = (gl, rect, color) =>
{
  console.log("rect:", rect, color);
  _dirty = true;
  const vertices =
  [
    -_view.groundScale, -_view.groundScale,  0.0,
     _view.groundScale, -_view.groundScale,  0.0,
     _view.groundScale,  _view.groundScale,  0.0,
    -_view.groundScale,  _view.groundScale,  0.0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, _model.vertexCount);
}

/*
// Not currently animating in this app
var lastTime = 0;
var initialDisplay = 1;
var currentFrame = 0;

// Increment animation
const animate = () =>
{
}

// Display sync
const tick = () =>
{
    // Draw
    drawScene(_gl);
    //animate();
    //setTimeout(tick, 1000/60)
}
*/


export {webGL};
