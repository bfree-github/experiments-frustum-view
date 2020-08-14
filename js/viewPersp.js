/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

// !!! Need to modularize this code

const viewPersp = {};
var _parent;
var _canvasID;
var _canvas;
var _ctx;
var _gl;
var _width;
var _height;

const _fov = 45;
var _zRot = 0;
var _xPos = 0;
var _yPos = 0;
var _zPos = -5;

const _distMax = vec3.length([1, 1, 0]);
const _zPosMax = -0.1; //-_distMax;
const _zPosMin = -4.8;
const _zPosDiff = _zPosMax - _zPosMin;

const _maxLevels = 20;
var _level = 0;

var _eyePos = [_xPos, _yPos, _zPos];
var _lookAt = [0, 0, 0];
var _upAxis = [0, 0, -1];
var _elevation = 0.5;
var _elevationMax = 1.0;
var _elevationMin = 0.0;


viewPersp.init = (parent, canvasID, level) => {
  //console.log("viewPersp init:", canvasID);

  _parent = parent;
  //console.log("parent ctx:", _parent);

  if (level !== undefined) _level = level;

  _canvasID = canvasID;
  _canvas = $("#"+canvasID)[0];

  // Get canvas dim from style
  _width = _canvas.getBoundingClientRect().width;
  _height = _canvas.getBoundingClientRect().height;

  // Set canvas dim
  _canvas.width = _width;
  _canvas.height = _height;
  //console.log(_canvasID, _width+"x"+_height);

  _gl = initGL(_canvas);
  initScene(_gl, _fov);
  _lookAt = elevateLookAt(_eyePos, _lookAt, _zRot, _fov, _elevation);
  drawScene(_gl);


  _canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = -event.deltaY / ((_parent.isFirefox) ? 12.0 : 400.0);
    //console.log("persp wheel:", delta);

    /*
    _zPos += delta;
    if (_zPos > _zPosMax)
    {
      _zPos = _zPosMax;
    }
    else if (_zPos < _zPosMin)
    {
      _zPos = _zPosMin;
    }
    _eyePos[2] = _zPos;
    */

    ///*
    const elev = _elevation - delta / 10.0;
    if (elev > _elevationMax)
    {
      // !!! Bug - need to fix before allowing elev == _elevationMax;
      _elevation = _elevationMax;
    }
    else if (elev < _elevationMin)
    {
      _elevation = _elevationMin;
    }
    else
    {
      _elevation = elev;
    }
    //console.log("elevation:", _elevation);
    _lookAt = elevateLookAt(_eyePos, _lookAt, _zRot, _fov, _elevation);
    //*/

    drawScene(_gl);
  }, {passive: false});
}

/*
viewPersp.setLevel = (level) => {
  _level = level;
  viewPersp.draw();
}

viewPersp.getLevel = () => {
  return _level;
}

viewPersp.draw = () => {
}
*/

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

  let xRotMax = 60;
  let xRot = 0;
  let yRot = 0;
  let zRot = 0;

  let xSpeed = 6 / 1000.0;
  let ySpeed = 6 / 1000.0;
  let zSpeed = 1 / 1000.0;

  // Mouse drag
  const moveFactor = 100 / canvas.width;
  let mouseDown = false;
  let duration;
  let lastTime;
  let startX;
  let startY;
  let lastX;
  let lastY;
  let lastRotZ;
  //var posX = 0;
  //var posY = 0;

  // Needed for Android
  canvas.style.touchAction = 'none';

  canvas.onpointerdown = (e) => {
    //console.log('pointer down');
    lastTime = new Date().getTime();
    startX = e.pageX;
    startY = e.pageY;
    lastX = 0;
    lastY = 0;
    lastRotZ = _zRot;
    duration = 0;
    mouseDown = true;
  }

  canvas.onpointerover = (e) => {
    //console.log('pointer over');
    if (mouseDown) return;
    canvas.style.cursor = 'move';
    //console.log(e);
    let buttons = e.buttons;
    if (!buttons) return;
    canvas.onpointerdown(e);
  }

  canvas.onpointermove = (e) => {
    //console.log('pointer move');
    if (!mouseDown) return;
    let now = new Date().getTime();
    duration = now - lastTime;
    lastTime = now;

    // Determine movement from pointer down
    const x = e.pageX - startX;
    const y = e.pageY - startY;
    const dX = x - lastX;
    const dY = y - lastY;

    if (Math.abs(dX) > Math.abs(dY))
    {
      // Horizontal drag
      //_xPos = lastX + x; // use if translating x
      _zRot = lastRotZ - x * moveFactor; // turn camera about vertical axis // !!!
    }

    //_yPos -= dY/100.0;
    //console.log("yPos:", _yPos);
    //_eyePos[1] = _yPos;
    //_lookAt[1] = _yPos;
    _lookAt[1] -= dY/100.0;

    /*
    // Vertical drag
    //_yPos = lastY + y; // use if translating y
    const forwardDist = -dY/100.0;
    //console.log("forward dist:", forwardDist);

    const zRot = degToRad(_zRot-90);
    const xDist = forwardDist * Math.cos(zRot);
    const yDist = forwardDist * Math.sin(zRot);
    _xPos += xDist;
    _yPos += yDist;
    _eyePos[0] = _xPos;
    _eyePos[1] = _yPos;
    _lookAt[0] += xDist;
    _lookAt[1] += yDist;
    //console.log("persp pos:", _xPos+"/"+_yPos);
    */

    lastX = x;
    lastY = y
    drawScene(_gl);
  }

  canvas.onpointerup = (e) => {
    //console.log('pointer up');
    mouseDown = false;
    // Stop animation for a single click
    // Otherwise calc rotation speed
    ySpeed = (!duration) ? 0 : -0.1 * lastX / duration;
  }

  canvas.onpointerout = (e) => {
    //console.log('pointer out');
    if (!mouseDown) return;
    mouseDown = false;
    ySpeed = 0.0;
    duration = 0;
  }

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

const initScene = (gl, fov) => {
  // Setup viewport
  initMatrices();
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  initShaders(gl);
  initBuffers(gl);

  //gl.clearColor(0.0, 0.0, 0.0, 0.0);
  //gl.clearColor(0.25, 0.25, 0.25, 1.0);
  gl.clearColor(1.0, 0.5, 0.0, 1.0);

  //tick();
}


// Compile shaders
const getShader = (gl, id) =>
{
  let shaderScript = document.getElementById(id);
  if (!shaderScript)
  {
    return null;
  }

  let str = "";
  let k = shaderScript.firstChild;
  while (k)
  {
    if (k.nodeType == 3)
    {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

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

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
  {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

var shaderProgram;

// Initialize shaders
const initShaders = (gl) =>
{
  let fragmentShader = getShader(gl, "shader-fs");
  let vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
  {
      alert("Unable to initialize shader");
  }
  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

  shaderProgram.gl = gl;
  gl.useProgram(shaderProgram);
}

var xformMatrix;
var pMatrix;
var mvMatrix;
var mvMatrixStack;

const initMatrices = () =>
{
  xformMatrix = mat4.create();
  pMatrix = mat4.create();
  mvMatrix = mat4.create();
  mvMatrixStack = [];
}

// Matrix utilities
const mvPushMatrix = () =>
{
  let copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

const mvPopMatrix = () =>
{
  if (mvMatrixStack.length == 0)
  {
    throw "Attempting to pop an empty mvMatrix stack!";
  }
  mvMatrix = mvMatrixStack.pop();
}

const setMatrixUniforms = (shaderProgram) =>
{
  const gl = shaderProgram.gl;

  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


const vertices = [
  -1.0, -1.0,  0.0,
   1.0, -1.0,  0.0,
   1.0,  1.0,  0.0,
  -1.0,  1.0,  0.0,
];
const vertexElements = 3;
const vertexCount = 4;

const indices = [
  0,  1,  2,
  0,  2,  3,
];
const indexCount = 6;

var vertexPositionBuffer;
var indexBuffer;

// Initialize VBOs
const initBuffers = (gl) =>
{
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexElements, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}


var z = -5.0;

var xRot = 0;
var yRot = 0;
var zRot = 0;

var xSpeed = 6;
var ySpeed = 3;
var zSpeed = 1;

const radToDeg = (radians) =>
{
  return radians * 180.0 / Math.PI;
}

const degToRad = (degrees) =>
{
  return degrees * Math.PI / 180.0;
}

const signum = (value) =>
{
  return (value === 0) ? 0 : (value < 0) ? -1 : 1;
}

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

  //console.log("viewVector results:", groundDist, radToDeg(attitude), radToDeg(orientation));
  return [groundDist, attitude, orientation, xDiff, yDiff, zDiff];
}

const elevateLookAt = (eyePos, lookAt, zRot, yFov, elev) =>
{
  /*
  _eyePos[2] = _zPos;
  return _lookAt;
  */

  /*
  // Just change _zPos
  _zPos = _zPosMin + elev * _zPosDiff;
  _eyePos[2] = _zPos;
  console.log("persp zPos:", _zPos);
  return _lookAt;
  */

  ///*
  _zPos = _zPosMin + elev * _zPosDiff
  if (_zPos > _zPosMax)
  {
    _zPos = _zPosMax;
  }
  else if (_zPos < _zPosMin)
  {
    _zPos = _zPosMin;
  }
  _eyePos[2] = _zPos;
  return _lookAt;
  //*/


  const viewVec = viewVector(eyePos, _lookAt);
  let dist, attitude, theta;

  // View is straight down; use _zRot for orientation
  if (!viewVec)
  {
    dist = 0;
    attitude = degToRad(-90);
    theta = zRot;
  }
  else
  {
    [dist, attitude, theta] = viewVec;
  }

  // attitude must not go higher than yFov/2 below horizon
  // Ground dist should not go farther than half the diagonal of the map area (1.4)

  // Adjust _zPos acceleration curve: fast to slow
  //console.log("zDiff:", _zPosMin, _zPosMax, _zPosDiff);
  const zPos = _zPosMin + _zPosDiff*(1.0-Math.pow(elev, 2.0));
  //console.log("zPos:", _zPos, zPos);
  _eyePos[2] = zPos;
  _zPos = zPos;

  // Adjust ground dist acceleration curve: slow to fast
  const previousDist = dist;
  dist = Math.pow(_distMax*(1.0-elev), 2.0);
  //console.log("elevation:", elev);
  //console.log("dist:", previousDist, dist);

  // Get new attitude
  const previousAttitude = attitude;
  attitude = Math.atan2(_zPos, dist);
  //console.log("attitude:", radToDeg(previousAttitude), radToDeg(attitude));

  //console.log("orientation:", theta);

  const result = [];
  result[0] = (eyePos[0] + dist * Math.sin(-theta));
  result[1] = (eyePos[1] + dist * Math.cos(-theta));
  result[2] = lookAt[2];
  //console.log("previous elevateLookAt:", _lookAt[0], _lookAt[1], _lookAt[2]);
  //console.log("elevateLookAt:", result[0], result[1], result[2]);

  return result;
}

const yawLookAt = (eyePos, lookAt, zRot) =>
{
  const viewVec = viewVector(eyePos, lookAt);
  if (!viewVec) return undefined;
  const [dist, attitude, orientation] = viewVec;
  //console.log("yawLookAt viewVector:", dist, radToDeg(orientation), radToDeg(zRot));

  const result = [];
  result[0] = (eyePos[0] + dist * Math.sin(-zRot));
  result[1] = (eyePos[1] + dist * Math.cos(-zRot));
  result[2] = lookAt[2];
  //console.log("yawLookAt:", result);

  return result;
}

const projectFrustum = (eyePos, lookAt, zRot, xFov, yFov) =>
{
  // Could do this with an inverse of the view matrix
  // Doing it with trig instead to demonstrate how it works
  // Also faster with trig if you are only doing a few points
  ///
  // eyePoint and lookAt are vec3 x,y,z
  // zRot is the orientation around vertical axis
  // xFov and yFov are field of view for each dimension in degrees

  const topLeft = [];
  const topRight = [];
  const bottomLeft = [];
  const bottomRight = [];

  const xFovRad_2 = degToRad(xFov) / 2.0;
  const yFovRad_2 = degToRad(yFov) / 2.0;

  // Calc level
  const zPosThresh = _zPosMin/2.0 - _zPosMax;
  const zPos = (_zPos < zPosThresh) ? zPosThresh : _zPos;
  //console.log("zPos:", _zPos, zPos, zPosThresh);
  console.log("zPos:", zPos);
  var unitLevel = (1.0 - zPos / _zPosMin) * 2.0 - 1.0;
  if (unitLevel <= 0)
  {
    unitLevel = 0.0;
  }
  else if (unitLevel > 1.0)
  {
    unitLevel = 1.0;
  }
  /*
  const level = parseInt(_maxLevels * unitLevel);
  console.log("frustum level:", unitLevel, level);
  */
  /*
  const level = parseInt(_maxLevels * (1.0 - unitLevel));
  console.log("frustum level:", unitLevel, level);
  */
  ///*
  const logLevel = Math.pow(unitLevel, 4.0);
  const level = parseInt(_maxLevels * logLevel);
  console.log("frustum level:", unitLevel, logLevel, level);
  //*/

  // Handle when camera facing straight down
  const viewVec = viewVector(eyePos, lookAt);
  if (!viewVec)
  {
    const height = -eyePos[2];
    const x0 = height * Math.tan(xFovRad_2);
    const y0 = height * Math.tan(yFovRad_2);
    const d = vec3.length([x0, y0, 0]);
    const a = Math.atan2(y0, x0) + zRot;
    const x = _eyePos[0] + d * Math.cos(a); // !!!
    const y = _eyePos[1] + d * Math.sin(a); // !!!

    topRight[0] = lookAt[0] + x;
    topRight[1] = lookAt[1] + y;
    topLeft[0] = lookAt[0] + y;
    topLeft[1] = lookAt[1] - x;
    bottomLeft[0] = lookAt[0] - x;
    bottomLeft[1] = lookAt[1] - y;
    bottomRight[0] = lookAt[0] - y;
    bottomRight[1] = lookAt[1] + x;

    //console.log("projectFrustum down:", bottomLeft, bottomRight, topRight, topLeft, level);
    return [bottomLeft, bottomRight, topRight, topLeft, level];
  }
  const [dist, attitude, orientation, xDiff, yDiff, zDiff] = viewVec;
  //console.log("projectFrustum viewVector:", dist, radToDeg(attitude), radToDeg(orientation));

  const attitudeTop = attitude + yFovRad_2;
  //console.log("top attitude:", radToDeg(attitudeTop));
  if (attitudeTop >= 0)
  {
    // Need special handling when above horizon
    // For now, just fail or throw
    return undefined;
  }
  const attitudeBottom = attitude - yFovRad_2;
  //console.log("attitudes:", radToDeg(attitudeTop), radToDeg(attitudeBottom));

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

  topRight[0] = -_eyePos[0] + topX * zCos + topY * zSin;
  topRight[1] = -_eyePos[1] + topX * zSin - topY * zCos;

  topLeft[0] = -_eyePos[0] + -topX * zCos + topY * zSin;
  topLeft[1] = -_eyePos[1] + -topX * zSin - topY * zCos;

  bottomLeft[0] = -_eyePos[0] + -bottomX * zCos + bottomY * zSin;
  bottomLeft[1] = -_eyePos[1] + -bottomX * zSin - bottomY * zCos;

  bottomRight[0] = -_eyePos[0] + bottomX * zCos + bottomY * zSin;
  bottomRight[1] = -_eyePos[1] + bottomX * zSin - bottomY * zCos;

  //console.log("projectFrustum:", bottomLeft, bottomRight, topRight, topLeft, level);
  return [bottomLeft, bottomRight, topRight, topLeft, level];
}

// Render the scene
const drawScene = (gl) =>
{
  // No need to save modelview matrix as we're only drawing when it changes
  //mvPushMatrix();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const zRot = degToRad(-_zRot);
  const viewVec = viewVector(_eyePos, _lookAt);
  if (!viewVec)
  {
    // Camera looking straight down
    //console.log("drawScene look down");
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, zRot, [0, 0, 1]);
    mat4.translate(mvMatrix, _eyePos);
  }
  else
  {
    //const attitude = Math.atan2(_eyePos[2], )
    const yDist = _lookAt[1] - _eyePos[1];  // !!!
    //console.log("yDist:", yDist);

    // General camera view handling
    //console.log("drawScene look out");
    _lookAt = yawLookAt(_eyePos, _lookAt, zRot); // !!!
    mat4.lookAt(_eyePos, _lookAt, _upAxis, mvMatrix);
  }

  //console.log("lookAt", _lookAt[0], _lookAt[1], _lookAt[2]);
  //console.log("eyePos", _eyePos[0], _eyePos[1], _eyePos[2]);

  setMatrixUniforms(shaderProgram);
  gl.uniform3f(shaderProgram.colorUniform,1.0,0.0,0.0);

  // Pass frustum prohection to ortho view
  let trapezoid = projectFrustum(_eyePos, _lookAt, zRot, _fov, _fov);
  console.log("trapezoid:", trapezoid[4]);
  _parent.viewPerspTrapezoid(trapezoid);
  //console.log("drawScene trapezoid:", trapezoid);

  //gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);

  //mvPopMatrix();
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


export {viewPersp};
 {viewPersp};
