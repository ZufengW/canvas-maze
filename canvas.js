"use strict";

const MOVEMENT_KEY_NAMES = ["w", "a", "s", "d", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
/** Default width and height of the goal area. */
const GOAL_SIZE_DEFAULT = 15;

/**
 * @typedef {{
 *            startX?: string,
 *            startY?: number,
 *            goalX?: number,
 *            goalY?: number,
 *            goalWidth?: number,
 *            goalHeight?: number,
 *            wallLuminosityThreshold? number,
 *          }} MazeOptions
 *
 * Options for configuring a maze.
 * The goal options form a box. This is the victory condition.
 * Wall luminosity threshold is the max luminosity for a pixel to be a wall. Must be 0 to 255.
 */

/**
 * Get the option values, or default values for unspecified fields.
 *
 * @param {HTMLImageElement} image
 * @param {MazeOptions|undefined} options
 */
function getValuesFromOptions(image, options) {
  if (!options) options = {};
  // Use the options, or default values.
  const startX = options.startX === undefined ? 2 : options.startX;
  const startY = options.startY === undefined ? 2 : options.startY;
  // 190 is the minimum that doesn't glitch through Ape's right side.
  const wallLuminosityThreshold = options.wallLuminosityThreshold === undefined ? 190 : options.wallLuminosityThreshold;
  // The default goal position is the bottom right corner.
  const goalX = options.goalX === undefined ? image.naturalWidth - GOAL_SIZE_DEFAULT : options.goalX;
  const goalY = options.goalY === undefined ? image.naturalHeight - GOAL_SIZE_DEFAULT : options.goalY;
  const goalWidth = options.goalWidth === undefined ? GOAL_SIZE_DEFAULT : options.goalWidth;
  const goalHeight = options.goalHeight === undefined ? GOAL_SIZE_DEFAULT : options.goalHeight;
  return {startX, startY, wallLuminosityThreshold, goalX, goalY, goalWidth, goalHeight};
}

/** Check if a pixel in an imageData object is a wall.
 * Dark pixels are walls.
 *
 * @param {ImageData} imageData
 * @param {number} i index in imageData.data (representing which pixel)
 * @param {number} brightness threshold. Pixels with RGB below this are all considered walls. Range is luminosity: 0 to 255.
 * @returns {boolean} whether or not wall
 */
function isWall(imageData, i, brightness) {
  // check the RGBA values
  // true if all RGB below brightness threshold. Otherwise false
  // Luminosity formula from https://stackoverflow.com/a/596243/7320095.
  const luminosity = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
  // console.log(luminosity);
  return (luminosity <= brightness && imageData.data[i + 3] !== 0);
}

/** Calculates an array of walls for an image
 *
 * @param {HTMLImageElement} image image element to get walls for
 * @param {CanvasRenderingContext2D} ctx canvas context 2D
 * @param {number} wallLuminosityThreshold Max luminosity for a pixel to be a wall. 0 to 255
 * @returns {Array} whether or not the canvas pixel has a wall (Boolean array)
 */
function buildWalls(image, ctx, wallLuminosityThreshold) {
  // Initially, draw the maze image one time at normal opacity
  ctx.drawImage(image, 0, 0);

  const hasWall = [];
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // fill the array
  for (let row = 0; row < imageData.height; row++) {
    const rowHasWall = [];
    for (let col = 0; col < imageData.width; col++) {
      const dataIndex = (row * imageData.width + col) * 4;  // index of current pixel
      rowHasWall.push(isWall(imageData, dataIndex, wallLuminosityThreshold));
    }
    hasWall.push(rowHasWall);
  }
  // then clear the canvas to reset
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return hasWall;
}

/** Starts a maze.
 * Should call this after everything (including the image) has loaded.
 *
 * @param {string} canvasId id of canvas element. The canvas should overlap the image.
 * @param {string} imageId id of maze image element. It should have a specified height, width
 * @param {MazeOptions|undefined} options
 */
const initMaze = function(canvasId, imageId, options) {

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById(canvasId);
  /** @type {HTMLImageElement} */
  const image = document.getElementById(imageId);  // maze image

  // Set size of canvas to match image dimensions.
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const {startX, startY, wallLuminosityThreshold, goalX, goalY, goalWidth,
    goalHeight} = getValuesFromOptions(image, options);

  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);

  // Stores for each canvas pixel whether or not it has a wall.
  const hasWall = buildWalls(image, c, wallLuminosityThreshold);

  const REPEL_FACTOR = 0.5;  // of walls
  const MOVER_MOVE_SPEED = 1.1;      // of Mover
  const TRAIL_LENGTH = 200;  // number of elements in trail
  const TRAIL_START_LIFE = 200;    // TrailBlob life gets reset to this number
  const MAX_TRAIL_BRIGHTNESS = 200;  // how light the trails should go. Up to 255 (white)

  let hasWon = false;

  // records the mouse position
  const mouse = {
    pos: new Vector2(startX, startY),
    following: false
  };

  // Gets current direction represented by held keys
  const getKeyboardDirection = function () {
    // Records whether or not each key is currently held down
    const keyHeld = {};
    for (let i = 0; i < MOVEMENT_KEY_NAMES.length; i++) {
      keyHeld[MOVEMENT_KEY_NAMES[i]] = false;
    }

    // listen for key down and up
    document.addEventListener('keydown', function(event){
      const keyName = event.key;
      if (keyHeld.hasOwnProperty(keyName)) {
        keyHeld[keyName] = true;
      }
    });

    document.addEventListener('keyup', function(event) {
      const keyName = event.key;
      if (keyHeld.hasOwnProperty(keyName)) {
        keyHeld[keyName] = false;
      }
    });

    /** Gets current direction represented by held keys (WASD, Arrow keys)
     * @returns {Vector2} resultant vector representing directional key input.
     */
    return function() {
      const resultant = new Vector2(0, 0);
      if (keyHeld["a"] || keyHeld["ArrowLeft"]) {
        resultant.x -= 1;
      }
      if (keyHeld["w"] || keyHeld["ArrowUp"]) {
        resultant.y -= 1;
      }
      if (keyHeld["d"] || keyHeld["ArrowRight"]) {
        resultant.x += 1;
      }
      if (keyHeld["s"] || keyHeld["ArrowDown"]) {
        resultant.y += 1;
      }
      return resultant;
    };
  }();


  function Mover(startX, startY) {
    this.pos = new Vector2(startX, startY);
  }

  /** draw itself on canvas */
  Mover.prototype.draw = function () {
    c.beginPath();
    c.fillStyle = "crimson";
    c.arc(this.pos.x, this.pos.y, 2, 0, Math.PI * 2, false);
    c.fill();  // fill inside
  };

  /** update position, then draw */
  Mover.prototype.update = function () {
    let target = this.pos.copy();  // placeholder destination is current position
    if (mouse.following) {
      // aim to move towards mouse position
      target = mouse.pos.copy();
    }
    const keyboardDirection = getKeyboardDirection();
    // keyboard directional keys have precedence over mouse
    if (keyboardDirection.x !== 0 ||keyboardDirection.y !== 0) {
      mouse.following = false;  // stop following mouse
      target = keyboardDirection.add(this.pos);
    }

    // move towards target position
    // direction of vector is final - initial
    target.subtract(this.pos);
    this.pos.add(target.normalise().multiply(MOVER_MOVE_SPEED));

    // apply repulsion from dark walls
    const repulsion = getRepulsionFromDark(this.pos, 7).trim(1.5);
    if (repulsion.distanceSquared() > 5) {
      console.log(repulsion);
    }
    this.pos.add(repulsion);

    this.draw();
  };


  function TrailBlob(startX, startY) {
    this.pos = new Vector2(startX, startY);
    this.life = 0;
  }

  TrailBlob.prototype.draw = function () {
    const brightness = MAX_TRAIL_BRIGHTNESS - this.life;
    c.beginPath();
    c.fillStyle = "rgba(255," + brightness + "," + brightness + ",1)";
    c.arc(this.pos.x, this.pos.y, 2, 0, Math.PI * 2, false);
    c.fill();  // fill inside
  };

  TrailBlob.prototype.update = function () {
    // draw itself while still alive
    if (this.life > 0) {
      this.life--;
      this.draw();
    }
  };


  /** Represents a pair of coordinates
   *
   * @param {number} x coordinate
   * @param {number} y coordinate
   * @constructor
   */
  function Vector2(x, y) {
    this.x = x;
    this.y = y;
  }

  /** Return a deep-copy of this vector */
  Vector2.prototype.copy = function () {
    return new Vector2(this.x, this.y);
  };

  /** Add another vector in-place
   * @param {Vector2} otherVector vector to add to this one
   */
  Vector2.prototype.add = function (otherVector) {
    this.x += otherVector.x;
    this.y += otherVector.y;
    return this;
  };

  /** subtract another vector in-place
   * @param {Vector2} otherVector vector to subtract from this one
   */
  Vector2.prototype.subtract = function (otherVector) {
    this.x -= otherVector.x;
    this.y -= otherVector.y;
    return this;
  };

  /** returns the magnitude of this vector squared */
  Vector2.prototype.distanceSquared = function () {
    return (this.x * this.x) + (this.y * this.y);
  };

  /** multiplies this vector by a scalar in-place */
  Vector2.prototype.multiply = function (scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  };

  /** Make magnitude 1 and preserve direction. In-place. */
  Vector2.prototype.normalise = function () {
    const magnitude = Math.pow(this.distanceSquared(), 0.5);
    if (magnitude === 0) {  // don't change anything if 0 vector
      return this;
    }
    this.multiply(1.0/magnitude);
    return this;
  };

  /** Cuts each dimension down to a certain value. In-place. */
  Vector2.prototype.trim = function (maxValue) {
    if (this.x > maxValue) {
      this.x = maxValue;
    } else if (this.x < -maxValue) {
      this.x = -maxValue;
    }
    if (this.y > maxValue) {
      this.y = maxValue;
    } else if (this.y < -maxValue) {
      this.y = -maxValue;
    }
    return this;
  };


  // Tapping or clicking sets the mover's destination
  // listen for touch screen touch
  window.addEventListener("touchstart", function (event) {
    if (event.touches.length > 0) {
      mouse.pos = getMousePos(canvas, event.touches.item(0));
      mouse.following = true;
    }
  });

  // listen for mouse click
  window.addEventListener("mousedown", function (event) {
    mouse.pos = getMousePos(canvas, event);
    mouse.following = true;
  });

  /** Get mouse position on a canvas
   * Takes into account both changing coordinates to canvas space and
   * scaling when canvas logical size differs from its style size.
   * @param {HTMLCanvasElement} canvas
   * @param {{clientX: number, clientY: number}} evt
   * @returns {Vector2} mouse position in canvas coordinates
   */
  function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return new Vector2(
      (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
      (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
    );
  }


  /** returns a Vector2 pointing away from nearby dark pixels
   *
   * @param midPos {Vector2} middle
   * @param diameter {number} width of square to sample pixels
   * @returns {Vector2} resultant repulsion vector
   */
  function getRepulsionFromDark(midPos, diameter) {
    const halfDiameter = Math.floor(diameter / 2);
    const midPosXRounded = Math.round(midPos.x);
    const midPosYRounded = Math.round(midPos.y);
    const xTopLeft = midPosXRounded - halfDiameter;
    const yTopLeft = midPosYRounded - halfDiameter;

    // combine the vectors from every pixel to midPos
    const resultant = new Vector2(0, 0);
    for (let y = yTopLeft; y < yTopLeft + diameter; y++) {
      for (let x = xTopLeft; x < xTopLeft + diameter; x++) {
        if (!inBounds(x, canvas.width) || !inBounds(y, canvas.height) || hasWall[y][x]) {
          // out of bounds or wall pixel
          // vector from pixel pointing to middle position
          const pixelToMid = new Vector2(midPosXRounded - x, midPosYRounded - y);
          const distanceSquared = pixelToMid.distanceSquared();
          if (distanceSquared !== 0) {
            pixelToMid.multiply(REPEL_FACTOR / distanceSquared);
            resultant.add(pixelToMid);
          }
        }
      }
    }
    // c.fillStyle = "rgba(0,0,200,0.6)";
    // c.fillRect(xTopLeft, yTopLeft, diameter, diameter);  // if need to draw checked-pixel region
    // console.log(resultant);
    return resultant;
  }


  /** For check if index is in bounds of array
   *
   * @param {number} x index
   * @param {number} length size of array
   * @returns {boolean} whether or not in bounds
   */
  function inBounds(x, length) {
    return (0 <= x && x < length);
  }

  // initialise canvas objects
  const mover = new Mover(startX, startY);
  const trail = [];
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    trail.push(new TrailBlob(0, 0));
  }
  let nextTrailIndexToReset = 0;  // next index of element in trail to add life to

  console.log("Started a maze with canvas of  w: " + canvas.width + ", h: " + canvas.height);
  // Start animating
  animate();


// animation loop
  function animate() {
    requestAnimationFrame(animate);
    // Clear the canvas
    // c.clearRect(0, 0, window.innerWidth, window.innerHeight);
    // Fill the canvas with low-alpha black for trail effect
    // c.fillStyle = "rgba(0,0,0,0.1)";
    // c.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // draw the maze image at lower opacity for fade effect
    // c.globalAlpha = 0.01;
    // c.drawImage(image, 0, 0);
    // c.globalAlpha = 1;

    // draw trail, starting from the oldest TrailBlob
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const updateIndex = (nextTrailIndexToReset + i) % TRAIL_LENGTH;
      trail[updateIndex].update();
    }

    // draw mover on top of trail
    mover.update();

    // move the next trail item to the start of the trail
    trail[nextTrailIndexToReset].life = TRAIL_START_LIFE;
    trail[nextTrailIndexToReset].pos = mover.pos.copy();
    nextTrailIndexToReset = (nextTrailIndexToReset + 1) % TRAIL_LENGTH;

    // Check for win condition.
    if (!hasWon && mover.pos.x >= goalX && mover.pos.x <= goalX + goalWidth
        && mover.pos.y >= goalY && mover.pos.y <= goalY + goalHeight) {
      hasWon = true;
      canvas.dispatchEvent(new CustomEvent('maze-win', {bubbles: true, composed: true}));
      console.log('Win: Reached goal.');
    }
  }
};

/**
 * Previews all the options, but doesn't start the maze.
 * Call this after everything (including the image) has loaded.
 *
 * @param {string} canvasId id of canvas element. The canvas should overlap the image.
 * @param {string} imageId id of maze image element. It should have a specified height, width
 * @param {MazeOptions|undefined} options
 */
function previewMaze(canvasId, imageId, options) {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById(canvasId);
  /** @type {HTMLImageElement} */
  const image = document.getElementById(imageId);

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const {startX, startY, wallLuminosityThreshold, goalX, goalY, goalWidth,
    goalHeight} = getValuesFromOptions(image, options);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const wallData = buildWalls(image, ctx, wallLuminosityThreshold);

  // Highlight walls.
  ctx.fillStyle = "rgba(0,0,250,0.6)";
  for (let row = 0; row < wallData.length; row++) {
    for (let col = 0; col < wallData[row].length; col++) {
      if (wallData[row][col]) {
        ctx.fillRect(col, row, 1, 1);

      }
    }
  }

  ctx.strokeStyle = 'green';
  // Highlight the start position. Draw 2 circles to increase visibility.
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,0,0,0.2)";
  ctx.arc(startX, startY, 25, 0, Math.PI * 2, false);
  ctx.fill();
  // Also draw an outline to increase visibility.
  ctx.beginPath();
  ctx.arc(startX, startY, 25, 0, Math.PI * 2, false);
  ctx.stroke();
  // Second circle resembles the Mover.
  ctx.beginPath();
  ctx.fillStyle = "crimson";
  ctx.arc(startX, startY, 2, 0, Math.PI * 2, false);
  ctx.fill();

  // Highlight the goal area in yellow.
  ctx.fillStyle = "rgba(255,255,0,0.6)";
  ctx.fillRect(goalX, goalY, goalWidth, goalHeight);
  // Also draw an outline to increase visibility.
  ctx.strokeStyle = 'magenta';
  ctx.strokeRect(goalX, goalY, goalWidth, goalHeight);
}
