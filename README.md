# experiments-frustum-view
Quick exploratory project for visualizing view-frustum projections

## Overview
Frustums are the conical volume defining what can be seen from a carmera's view point, orientation and direction.  Given the rectangular shape of most viewers, frustums tend to be 4-sided pyramids, often truncated for a backplane and a foreground clipping plane.

This particular exploration is focused on identifying what might be displayed within a frustum volume, and ways to visualize this.

In order to optimize such visualized renderings, various techniques are used to cull out objects that are not within the frustum volume, and to control granularity/resolution of data based on camera distance to those objects, aka Level of Detail (LOD).

Oct-trees are a common method for segmenting 3D data and LOD for a given region of interest.  Quad-trees are similar and often used for 2D terrain/mapping systems.  This project will focus on 2D data solutions for identifying segment tiles within a 3D view-frustum ground projection, and providing a way to visualize this.

## Feature Requirements
1. Limited time; target project to be completed over a weekend.
2. Research various approaches and available existing solutions.
3. Develop an approach for identifying quad-tree (or similar) tiles that encompass a view-frustum ground projection.
4. Develop a prototype viewer to visualize identified tiles for a particular camera zoom, direction, and orientation.

## Engineering Requirements
1. This project will not be retrieving/diplaying actual map data, but rather determine tile identifiers required to to retrieve such information.  As such, data source and retrieval methods are not within the scope of this project.
2. For a given zoom/direction/orientation, the camera's frustum will be projected onto a ground surface.  Assuming an pyramid volume and linear (rather than spherical) projection, the resulting ground projection will be a quadrilateral.
3. The quadrilateral polygon (Region of Interest) will be used to cull outside tiles, identify tiles entirely encompassed by the ROI, as well as those overlapping the ROI.
4. Distance from the camera will be used to identify LOD for the tiles, which will be used for determining resolution/level of the multi-resolution/wavelet data.

This project will not address client-side caching of tiles.

## Research
### Data Architecture
Given that no actual map data will be retrieved/rendered, there is no requirement to build a storage architecture for this project.  A number of architectures, services, and APIs exist for retrieving quad-tree tiled data.

Open Street Map is an early and common service for such data.  Established mapping services include: Web Map Service (WMS), Tiled Map Service (TMS), and Web Map Tile Service (WMTS).

Frameworks and libraries exist for various languages/platforms.  For example with Javascript, there are many available frameworks:
* Leaflet
* OpenLayers
* MapBox
* Google Maps
* Modest Maps
* Data Maps
* jVectorMap
* CesiumJS
* Polymaps
* Zeemaps
Since retrieval is not a requirement of this project, I've not done a comparative study of these services.

While most of these services rely on a quad-tree approach to segmenting/tiling map data, it's worth noting pyramid/wavelet imaging approaches for imaging-only data requirements.  During the 90s, I worked for Live Picture, who with Kodak and HP, developed a multi-resolution tiling image server.  It was originally intended to support editing/rendering very large, high-resolution images - however, we used it for efficient web-based texture maps for photo-realistic 3D rendering.

### Tile Determination
Although this project does not require a quad-tree implementation for retrienving tiles, quad-tree is certainly a possible approach for caching local tile data.

I have identified 3 tiling approaches that I will pursue for this project:
#### Least Tiles
This determines the lowest tile level required to retrieve the fewest tiles required to render the ROI.  This will result in the fastest retrieval of tiles/data and is useful for progressive rendering, as well as quick rendering as the user pan/zooms/tilts their camera.  I will begin with this approach.
#### LOD Tiles
This determies the distance of the camera to a point on the ROI to identify what level/resultion of tile is required to render that portion of the ROI.  This will be the next approach, and will be useful for recursice/progressive rendering.
#### Most Tiles
This determines the largest tiles that are entirely encompassed by the ROI, with recursively smaller tiles required to cover ROI edges.  While a technically interesting approach, which has applications in 3D facial rendering of areas of detail, it's not likely useful in this application and not a priority.

### Rendering
For this project, I've identified two visualizations to pursue:
#### Othogonal Map
This view is an orthogonal, top-down view of the the quadrilateral ROI, and the tiles determined to render it.
#### Perspective View
This is a 3D perspective view from the camera to the ROI, showing the tiles determined to render it.

Simple lines to render the tile edges should be sufficient to visualize the tiles required to render the ROI.  Time permitting, color can be used to reenforce the visualization; likely a randomized hue, with brightness/luminocity indicating tile level, and saturation/chroma indicating distance from camera.

Tile information can be displayed on a console, rather than on rendering, as it will likely be too small to read for small tiles, and I believe not essential to demonstrating the differences in tile determination approach.

### Leveraging Existing Solutions
I've briefly investigated existing tech to facilitate this project - and for production development, I prefer using existing solutions where possible, particularly if it's Open Source with acceptable licensing.

That said, I didn't find anything that would easily allow me to get into the guts of the tile determination process - so for this exercise, I've decided to build everything myself.  This will also demonstrate how I technically solve problems.

### Platform / Language / Frameworks
Given the brevity of this project, I'm inclined to go with the platforms/languages that I most often work with. For product development, I would consider target audience, availability of skilled developers, and speed/cost of development/performance/maintenance.

While I can work on multiple OS platforms, my preferences for this project are:
#### Cross-platform WebGL/JavaScript
It's cross-platform, ubiquitous, and the OpenGL-ES can be reused on Mobile.
Of the WebGL-based frameworks, I like three.js: it's mature/stable, reasonable footprint, has a built-in scene-graph with oct-tree handling, and allows quick prototyping.  However, the downsides to Three is that it's not portably supported on Mobile, and is fairly painful if you need to do custom shaders.  Furthermore, there's no easy access to it's internal oct-tree tiles, so is of limited benefit for this project.  As such, I'm inclined to go with straight WebGL.
#### Mobile C/C++
The primary advantage to this approach for me is that I have decades of libraries that I've built over the years that I can leverage to speed development. This approach would allow me to share non-UI code between iOS (natively) and Android (via JNI).
#### Desktop C/C++
My libraries are cross-platform/portable to Linux, MacOS, Windows, and Mobile - however, I'm currently doing most of my desktop prototyping on a Mac and server-based prototyping on Linux via nodeJS.

Of the three, I've decided to go with native WebGL, likely porting some of my C/C++ libs to JavaScript.

## Project Management
I normally use JIRA for project/task management.  For such a small/brief single-developer project, I'll likely just keep it in my head:

1. Calculate a frustum ground projection polygon for a specified 3D camera view.
2. Build an orthogonal viewer with elevational zoom to display frustum polygon and ground grid.
3. Implement a Least Tiles enumerator for the ROI; cull/display tiles in place of grid.
4. Build a quick 3D viewer to rotate about vertical axis, pan laterally, and zoom (elevation) that displays determined tiles.
5. Implement LOD Tiles enumerator for the ROI; display tiles progressively.

Time permitting:

6. Add tilt (tied to elevation) to the perspective viewer.  Not difficult, but will need to tune the elevation/tilt coupling.
7. Add interface to toggle or display side-by-side the orthogonal and perspective views.
8. Implement Most Tiles enumerator; display progressively. Will likely do this for grins at a later date.

## Implementation
### Documentation & Testing
I value documentation and unit tests in production environments - however for research/prototyping, I tend to use minimal in-code documentation.  I usually test via a prototype app that demonstrates intended use-case scenarios.

### Discovery
While prototyping or in production, I encounter implementation cases that either involve lengthly research/development, involve performance, or raise marketing use-case issues.  I mark them for discussion, so that marketing can evaluate cost/value performance and priority before proceeding.  The following are some issue that I've encountered while working on this project.

* Camera freedom of motion.  For many applications, it's useful to have complete freedom of camera motion: translation, tilt, yaw, and roll.  However, in the use case of maps, camera roll is unlikely to be used, as well as any tilt/attitude above the horizon.  As such, I'm limiting camera motion, excluding roll (always "upright"), and not permitting attitude above horizon.

* Frustum projection at or above horizon.  When camera attitude angle is higher than 1/2 the vertical field of view, that part of the frustrum projects above the horizon, and does not intersect with the ground. This can be addressed by projecting the side planes of the frustum to identify ground vectors, and terminate at some arbitrary distance (frustum back plane or end extent of map data).  For the purposes of this exercise, I'm limiting attitude to 1/2 vertical FOV below horizon.

* In perspective view, looking straight down results in gimbal lock, when using tilt/yaw/roll.  This is typically resolved by using quaternions.  It can also be resolved by excluding a 90 degree camera attitude.  For now, I'll limit looking straight down, as "near down" is visually indistinguishable.  In any case, it's irrelevant to this project's objective to determine appropriate mapping tiles.  Time permitting, I may swith to using quaternions later.

### Status
* I've implemented a test/demo web app that displays a 3D view, an Overhead ortho view, and a Stats display.  The 3D view has controls to translate, rotate about the vertical axis, and tilt downward.  The Overhead view has controls to translate (pan/zoom) over the map, visualizing tiles for a given leve (0-20).  Currently working on the frustum projection; I could use the inverse of the view matrix, but doing it in trig to demonstrate what it's doing.

* Implemented in static HTML5/JavaScript (no node) and straight WebGL (no frameworks).  I'm using jQuery, and ancient WebGL utility lib, and an old matrix lib (time permitting, I may replace this with my own matrix lib).  I'm using 2D canvas for the Overhead view; WebGL for the 3D view.  The two views and Stats are coupled via the parent app.
