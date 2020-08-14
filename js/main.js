/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

console.log("main");

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
  console.log("main init");

  ctx.viewOrtho = viewOrtho;

  // Viewer callbacks
  ctx.viewOrthoLevel = (level) => {
    domStats.orthoLevel.innerHTML = level;
  }

  ctx.viewPerspTrapezoid = (trapezoid) => {
    console.log("viewPerspTrapezoid");
    viewOrtho.setFrustum(trapezoid);
    /*
    domStats.perspFrustum.innerHTML =
      "<br />"+trapezoid[0][0]+", "+trapezoid[0][1]+
      "<br />"+trapezoid[1][0]+", "+trapezoid[1][1]+
      "<br />"+trapezoid[2][0]+", "+trapezoid[2][1]+
      "<br />"+trapezoid[3][0]+", "+trapezoid[3][1];
    */
  }

  viewOrtho.init(ctx, "canvasOrtho", 15);
  viewPersp.init(ctx, "canvasPersp", 15);
  viewOrtho.draw();
}
