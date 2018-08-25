"use strict";

/** Starts a maze
 *
 * @param startX {number} start x pixel position
 * @param startY {number} start y pixel position
 * @param canvasId {string} id of canvas element. The canvas should overlap the image.
 * @param imageId {string} id of maze image element. It should have a specified height, width
 */
var initMaze = function(startX, startY, canvasId, imageId) {

  var canvas = document.getElementById(canvasId);
  var image = document.getElementById(imageId);  // maze image

  var c = canvas.getContext('2d');

  var REPEL_FACTOR = 0.5;  // of walls
  var MOVER_MOVE_SPEED = 1.1;      // of Mover
  var BRIGHTNESS_THRESHOLD = 200;  // pixels with RGB all below this are considered walls
  var TRAIL_LENGTH = 200;  // number of elements in trail
  var TRAIL_START_LIFE = 200;    // TrailBlob life gets reset to this number
  var MAX_TRAIL_BRIGHTNESS = 200;  // how light the trails should go. Up to 255 (white)

// records the mouse position
  var mouse = {
    pos: new Vector2(startX, startY),
    following: false
  };


  // Gets current direction represented by held keys
  var getKeyboardDirection = function () {
    var notableKeyNames = ["w", "a", "s", "d", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    // Records whether or not each key is currently held down
    var keyHeld = {};
    for (var i = 0; i < notableKeyNames.length; i++) {
      keyHeld[notableKeyNames[i]] = false;
    }

    // listen for key down and up
    document.addEventListener('keydown', function(event){
      var keyName = event.key;
      if (keyHeld.hasOwnProperty(keyName)) {
        keyHeld[keyName] = true;
      }
    });

    document.addEventListener('keyup', function(event) {
      var keyName = event.key;
      if (keyHeld.hasOwnProperty(keyName)) {
        keyHeld[keyName] = false;
      }
    });

    /** Gets current direction represented by held keys (WASD, Arrow keys)
     * @returns {Vector2} resultant vector representing directional key input.
     */
    return function() {
      var resultant = new Vector2(0, 0);
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
    var target = this.pos.copy();  // placeholder destination is current position
    if (mouse.following) {
      // aim to move towards mouse position
      target = mouse.pos.copy();
    }
    var keyboardDirection = getKeyboardDirection();
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
    var repulsion = getRepulsionFromDark(this.pos, 7).trim(1.5);
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
    var brightness = (MAX_TRAIL_BRIGHTNESS - this.life);
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
   * @param x {number} coordinate
   * @param y {number} coordinate
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
   * @param otherVector {Vector2} vector to add to this one
   */
  Vector2.prototype.add = function (otherVector) {
    this.x += otherVector.x;
    this.y += otherVector.y;
    return this;
  };

  /** subtract another vector in-place
   * @param otherVector {Vector2} vector to subtract from this one
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
    var magnitude = Math.pow(this.distanceSquared(), 0.5);
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
   * @param canvas element
   * @param evt {Object} with "clientX" and "clientY" attributes
   * @returns {Vector2} mouse position in canvas coordinates
   */
  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
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
    var halfDiameter = Math.floor(diameter / 2);
    var midPosXRounded = Math.round(midPos.x);
    var midPosYRounded = Math.round(midPos.y);
    var xTopLeft = midPosXRounded - halfDiameter;
    var yTopLeft = midPosYRounded - halfDiameter;
    // var halfDiameter = diameter / 2;
    // var xTopLeft = midPos.x - halfDiameter;
    // var yTopLeft = midPos.y - halfDiameter;
    // var imageData = c.getImageData(xTopLeft, yTopLeft, diameter, diameter);

    // combine the vectors from every pixel to midPos
    var resultant = new Vector2(0, 0);
    for (var y = yTopLeft; y < yTopLeft + diameter; y++) {
      for (var x = xTopLeft; x < xTopLeft + diameter; x++) {
        if (!inBounds(x, canvas.width) || !inBounds(y, canvas.height) || hasWall[y][x]) {
          // out of bounds or wall pixel
          // vector from pixel pointing to middle position
          var pixelToMid = new Vector2(midPosXRounded - x, midPosYRounded - y);
          var distanceSquared = pixelToMid.distanceSquared();
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
   * @param x {int} index
   * @param length {int} size of array
   * @returns {boolean} whether or not in bounds
   */
  function inBounds(x, length) {
    return (0 <= x && x < length);
  }

  /** Check if a pixel in an imageData object is a wall.
   * Dark pixels are walls.
   *
   * @param imageData {object} imageData object
   * @param i {int} index in imageData.data (representing which pixel)
   * @param brightness {number} threshold. Pixels with RGB below this are all considered walls.
   * @returns {boolean} whether or not wall
   */
  function isWall(imageData, i, brightness) {
    // check the RGBA values
    // true if all RGB below brightness threshold. Otherwise false
    return ((imageData.data[i] < brightness && imageData.data[i + 1] < brightness && imageData.data[i + 2] < brightness) && imageData.data[i + 3] !== 0);
  }


  /** for testing purposes */
  function printImageData(imageData) {
    // print as a square
    var output = "";
    for (var i = 0; i < imageData.height; i++) {
      var list = [];
      for (var j = 0; j < imageData.width; j++) {
        var index = (i * imageData.width + j) * 4;
        list.push(imageData.data[index]);  // R
      }
      output += list.join(" ") + "\n";
    }
    console.log(output);
  }


  /**
   *
   * @param image image element
   * @param ctx canvas context 2D
   * @returns {Array} whether or not the canvas pixel has a wall (Boolean array)
   */
  function buildWalls(image, ctx) {
    var hasWall = [];
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var row;
    // fill the array
    for (var r = 0; r < imageData.height; r++) {
      row = [];
      for (var c = 0; c < imageData.width; c++) {
        var dataIndex = (r * imageData.width + c) * 4;  // index of current pixel
        row.push(isWall(imageData, dataIndex, BRIGHTNESS_THRESHOLD));
      }
      hasWall.push(row);
    }
    return hasWall;
  }


// initialise canvas objects
  var hasWall;  // stores for each canvas pixel whether or not has a wall
  var mover = new Mover(startX, startY);
  var trail = [];
  for (var i = 0; i < TRAIL_LENGTH; i++) {
    trail.push(new TrailBlob(0, 0));
  }
  var nextTrailIndexToReset = 0;  // next index of element in trail to add life to


  // only start animating after everything (including the image) has loaded
  window.addEventListener('load', function () {
    // set size of canvas to match image dimensions
    canvas.width = image.width;
    canvas.height = image.height;

    // Initially, draw the maze image one time at normal opacity
    c.drawImage(image, 0, 0);
    // build the array of walls
    hasWall = buildWalls(image, c);
    // then clear the canvas
    c.clearRect(0, 0, canvas.width, canvas.height);
    console.log("Started a maze with canvas of  w: " + canvas.width + ", h: " + canvas.height);
    animate();
  }, false);


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
    var updateIndex;
    for (var i = 0; i < TRAIL_LENGTH; i++) {
      updateIndex = (nextTrailIndexToReset + i) % TRAIL_LENGTH;
      trail[updateIndex].update();
    }

    // draw mover on top of trail
    mover.update();

    // move the next trail item to the start of the trail
    trail[nextTrailIndexToReset].life = TRAIL_START_LIFE;
    trail[nextTrailIndexToReset].pos = mover.pos.copy();
    nextTrailIndexToReset = (nextTrailIndexToReset + 1) % TRAIL_LENGTH;

  }
};
