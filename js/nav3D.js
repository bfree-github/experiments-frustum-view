/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

import {utils} from "./utils.js";
const nav3D = {};


// Internal values
var _main;
var _parent;
var _canvas;
var _view;
var _browserFactor;
var _scrollMax;

// Import parent methods
var _draw;
var _elevateLookAt;


// Initialize scene
nav3D.init = (parent, canvas, view) => {
  //console.log("nav3D init");

  // Cache parameters
  _parent = parent;
  _main = parent.main;
  _draw = parent.methods.draw;
  _elevateLookAt = parent.methods.elevateLookAt;
  _canvas = canvas;
  _view = view;
  _browserFactor = 1.0 / (_main.isFirefox ? 12.0 : 400.0);

  // Initialize navigation
  initNavigation();
}

const initNavigation = () =>
{
  // Handle wheel events
  _canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    //console.log("elevation:", _view.elevation);

    // Stop zooming once hit max level
    if (event.deltaY > 0 && _view.level >= _view.maxLevel) return;
    const dY = event.deltaY * _browserFactor / 20.0;

    // Accelerate towards max level
    const dScale = (_view.elevation >= _view.elevationMid) ? 1.0 :
      Math.pow(_view.elevation / _view.elevationMid, 0.8);
    const delta = dScale * dY;

    _view.elevation = utils.clamp(_view.elevationMin, _view.elevationMax,
      _view.elevation - delta);
    //console.log("persp wheel:", dY, dScale, delta, _view.elevation);

    _view.lookAt = _elevateLookAt(_view.eyePos, _view.lookAt,
      _view.zRot, _view.fov, _view.elevation);

    //console.log("wheel draw");
    _draw();
  }, {passive: false});

  /*
  // Animation values
  let xRotMax = 60;
  let xRot = 0;
  let yRot = 0;
  let zRot = 0;

  let xSpeed = 6 / 1000.0;
  let ySpeed = 6 / 1000.0;
  let zSpeed = 1 / 1000.0;
  */

  // Mouse drag
  const moveFactor = 100 / _canvas.width;
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
  _canvas.style.touchAction = 'none';

  // Handle pointer drag on canvas
  _canvas.onpointerdown = (e) => {
    //console.log('pointer down');
    lastTime = new Date().getTime();
    startX = e.pageX;
    startY = e.pageY;
    lastX = 0;
    lastY = 0;
    lastRotZ = _view.zRot;
    duration = 0;
    mouseDown = true;
  }

  _canvas.onpointerover = (e) => {
    //console.log('pointer over');
    if (mouseDown) return;
    _canvas.style.cursor = 'move';
    //console.log(e);
    let buttons = e.buttons;
    if (!buttons) return;
    _canvas.onpointerdown(e);
  }

  _canvas.onpointermove = (e) => {
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

    // Ignore horizontal drag if vertical is greater
    if (Math.abs(dX) > Math.abs(dY))
    {
      // Horizontal drag
      //_view.xPos = lastX + x; // use if translating x

      // turn camera about vertical axis
      _view.zRot = lastRotZ - x * moveFactor;
      //console.log("zRot:", _view.zRot);
    }

    // Vertical drag
    //_view.yPos -= dY/100.0;
    //_view.eyePos[1] = _view.yPos;
    //_view.lookAt[1] = _view.yPos;
    _view.lookAt[1] -= dY/100.0; // forward motion
    //console.log("yPos:", _view.yPos);

    /* // Decided not to translate eye position
    //_view.yPos = lastY + y; // use if translating y
    const forwardDist = -dY/100.0;
    //console.log("forward dist:", forwardDist);

    const zRot = utils.degToRad(_view.zRot-90);
    const xDist = forwardDist * Math.cos(zRot);
    const yDist = forwardDist * Math.sin(zRot);
    _view.xPos += xDist;
    _view.yPos += yDist;
    _view.eyePos[0] = _view.xPos;
    _view.eyePos[1] = _view.yPos;
    _view.lookAt[0] += xDist;
    _view.lookAt[1] += yDist;
    //console.log("persp pos:", _view.xPos+"/"+_view.yPos);
    */

    lastX = x;
    lastY = y

    //console.log("nav3D move draw");
    _draw();
  }

  _canvas.onpointerup = (e) => {
    //console.log('pointer up');
    mouseDown = false;
    // Stop animation for a single click
    // Otherwise calc rotation speed
    //ySpeed = (!duration) ? 0 : -0.1 * lastX / duration;
  }

  _canvas.onpointerout = (e) => {
    //console.log('pointer out');
    if (!mouseDown) return;
    mouseDown = false;
    //ySpeed = 0.0;
    duration = 0;
  }
}


export {nav3D};
