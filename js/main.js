/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

//console.log("main");

import {viewPersp} from "./viewPersp.js";
import {viewOrtho} from "./viewOrtho.js";


const ctx = {};
ctx.userAgent = navigator.userAgent.toLowerCase();
ctx.isFirefox = ctx.userAgent.indexOf('firefox') > -1;

const domStats = {};
domStats.orthoLevel = $("#orthoLevel")[0];
domStats.perspFrustum = $("#perspFrustum")[0];


$(document).ready(() => {
  init();
});

var init = () => {
  //console.log("main init");

  ctx.viewOrtho = viewOrtho;

  // Viewer callbacks
  ctx.viewOrthoLevel = (level) => {
    domStats.orthoLevel.innerHTML = level;
  }

  ctx.viewPerspTrapezoid = (trapezoid, level) => {
    //console.log("viewPerspTrapezoid");
    viewOrtho.setFrustum(trapezoid);
  }

  viewOrtho.init(ctx, "canvasOrtho");
  viewPersp.init(ctx, "canvasPersp");
  viewOrtho.draw();
}
