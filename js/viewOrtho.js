/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

var viewOrtho = {};

// Private values
var _main;
var _canvasID;
var _canvas;
var _ctx;
var _width;
var _height;
var _maxSize = 1048576;
var _maxLevels = 20;
var _maxLevel = _maxLevels - 1;
var _lastLevel = _maxLevel;
var _level = 0;
var _xPos = 0;
var _yPos = 0;
var _frustum = null;

// Initialize ortho view
viewOrtho.init = (main, canvasID) =>
{
  //console.log("viewOrtho init:", canvasID);

  // Cache parameters
  _main = main;
  _canvasID = canvasID;
  _canvas = $("#"+canvasID)[0];

  // Get canvas dim from style
  _width = _canvas.getBoundingClientRect().width;
  _height = _canvas.getBoundingClientRect().height;

  // Set canvas dim
  _canvas.width = _width;
  _canvas.height = _height;
  //console.log(_canvasID, _width+"x"+_height);

  // Get canvas drawing context
  _ctx = _canvas.getContext("2d");

  /* // No navigation
  _canvas.addEventListener("wheel", (event) =>
  {
    event.preventDefault();
    const wheel = event.deltaY / ((_main.isFirefox) ? 12.0 : 400.0);
    //console.log("ortho wheel:", wheel);
    viewOrtho.draw();
  }, {passive: false});

  var xRotMax = 60;
  var xRot = 0;
  var yRot = 0; //180;
  var zRot = 0;

  var xSpeed = 6 / 1000.0;
  var ySpeed = 6 / 1000.0;
  var zSpeed = 1 / 1000.0;

  // Mouse drag
  const moveFactor = 100 / _canvas.width;
  var mouseDown = false;
  var duration;
  var lastTime;
  var startX;
  var startY;
  var lastX;
  var lastY;
  //var posX = 0;
  //var posY = 0;

  // Needed for Android
  _canvas.style.touchAction = 'none';

  _canvas.onpointerdown = (e) =>
  {
    //console.log('pointer down');
    lastTime = new Date().getTime();
    startX = e.pageX;
    startY = e.pageY;
    lastX = _xPos;
    lastY = _yPos;
    duration = 0;
    mouseDown = true;
  }

  _canvas.onpointerover = (e) =>
  {
    //console.log('pointer over');
    if (mouseDown) return;
    _canvas.style.cursor = 'move';
    //console.log(e);
    var buttons = e.buttons;
    if (!buttons) return;
    _canvas.onpointerdown(e);
  }

  _canvas.onpointermove = (e) =>
  {
    //console.log('pointer move');
    if (!mouseDown) return;
    var now = new Date().getTime();
    duration = now - lastTime;
    lastTime = now;

    var x = e.pageX - startX;
    //_xPos = lastX + x;
    //yRot -= x * moveFactor;

    var y = e.pageY - startY;
    //_yPos = lastY + y;
    //xRot -= y * moveFactor;
    //xRot %= 360.0;
    //if (Math.abs(xRot) > xRotMax)
    //{
    //  xRot = Math.sign(xRot) * xRotMax;
    //}
    //console.log("ortho pos:", _xPos+"/"+_yPos);
    //viewOrtho.draw();
  }

  _canvas.onpointerup = (e) =>
  {
    //console.log('pointer up');
    mouseDown = false;
    // Stop animation for a single click
    // Otherwise calc rotation speed
    ySpeed = (!duration) ? 0 : -0.1 * lastX / duration;
  }

  _canvas.onpointerout = (e) =>
  {
    //console.log('pointer out');
    if (!mouseDown) return;
    mouseDown = false;
    ySpeed = 0.0;
    duration = 0;
  }
  */
}

// Set map level
viewOrtho.setLevel = (level) =>
{
  _level = level;
  viewOrtho.draw();
}

// Get map level
viewOrtho.getLevel = () =>
{
  return _level;
}

// Set 3D frustum ground projection
viewOrtho.setFrustum = (frustum) =>
{
  _level = frustum[4];
  _frustum = frustum;
  viewOrtho.draw();
}

// Draw the view
viewOrtho.draw = () =>
{
  // Report level back to main
  const level = _level;
  //console.log("draw level:", level);
  _main.viewOrthoLevel(parseInt(level));

  // Calc grid size
  const gridSize = Math.pow(2, level);
  //console.log("grid size:", gridSize);

  // Draw grid
  if (gridSize > _width || gridSize > _height)
  {
    // If the grid resolution is higher than canvas size, just fill
    _ctx.fillStyle = "#888";
    _ctx.fillRect(0, 0, _width, _height);
    _ctx.fillStyle = "#000";
    // Compensate for centered border
    _ctx.fillRect(_xPos-0.5, _yPos-0.5, _width+1, _height+1);
  }
  else
  {
    _ctx.fillStyle = "#888";
    _ctx.fillRect(0, 0, _width, _height);

    const xInc = _width/gridSize;
    const yInc = _height/gridSize;
    _ctx.beginPath();
    _ctx.strokeStyle = "#000";
    for (let i=0; i<gridSize; i++) {
      _ctx.moveTo(_xPos, _yPos+i*yInc);
      _ctx.lineTo(_xPos+_width, _yPos+i*yInc);
      _ctx.moveTo(_xPos+i*xInc, _yPos);
      _ctx.lineTo(_xPos+i*xInc, _yPos+_height);
    }
    _ctx.stroke();
  }

  // Draw frustum projection
  if (!_frustum) return;
  const w_2 = _width/2.0;
  const h_2 = _height/2.0;
  _ctx.beginPath();
  _ctx.strokeStyle = "#0F0";
  _ctx.moveTo(w_2 + _frustum[0][0]*w_2, h_2 + _frustum[0][1]*h_2);
  for (let i=1; i<4; i++) {
    _ctx.lineTo(w_2 + _frustum[i][0]*w_2, h_2 + _frustum[i][1]*h_2);
  }
  _ctx.lineTo(w_2 + _frustum[0][0]*w_2, h_2 + _frustum[0][1]*h_2);
  _ctx.stroke();
}

export {viewOrtho};
