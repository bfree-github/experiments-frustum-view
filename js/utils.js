/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

const utils = {};
const _log2 = Math.log(2);

utils.radToDeg = (radians) =>
{
  return radians * 180.0 / Math.PI;
}

utils.degToRad = (degrees) =>
{
  return degrees * Math.PI / 180.0;
}

utils.signum = (value) =>
{
  return (value === 0) ? 0 : (value < 0) ? -1 : 1;
}

utils.clamp = (min,max,a) =>
{
  return (a<min) ? min : ((a>max) ? max : a);
}

utils.log_2 = (value) =>
{
  return Math.log(value) / _log2;
}

export {utils};
