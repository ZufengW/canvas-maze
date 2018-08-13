"use strict";

var canvas = document.getElementById("canvas");
var image = document.getElementById('source');  // maze image
// image dimensions
var imageWidth = 800;
var imageHeight = 1221;

// set size of canvas to match image
canvas.width = imageWidth;
canvas.height = imageHeight;

var c = canvas.getContext('2d');

var START_X = 395;
var START_Y = 444;
var REPEL_FACTOR = 0.5;  // of walls
var MOVE_SPEED = 1;      // of Mover

// records the mouse position
var mouse = {
  x: canvas.width / 2,
  y: canvas.width / 2
};


function Mover(startX, startY) {
  this.x = startX;
  this.y = startY;
}

/** draw itself on canvas */
Mover.prototype.draw = function() {
  c.beginPath();
  c.fillStyle = "red";
  c.strokeStyle = "blue";
  c.lineWidth = 10;
  c.arc(this.x, this.y, 2, 0, Math.PI * 2, false);
  c.fill();  // fill inside
};

/** update position, then draw */
Mover.prototype.update = function() {
  // attempt to move towards mouse position
  // var target = this.getTargetPos();

  // right / left
  var xDiff = mouse.x - this.x;
  if (xDiff > 0) {
    this.x += Math.min(MOVE_SPEED, xDiff);
  } else {
    this.x += Math.max(-MOVE_SPEED, xDiff);
  }
  // down / up
  var yDiff = mouse.y - this.y;
  if (yDiff > 0) {
    this.y += Math.min(MOVE_SPEED, yDiff);
  } else {
    this.y += Math.max(-MOVE_SPEED, yDiff);
  }

  // apply repulsion from dark walls
  var repulsion = getRepulsionFromDark(new Vector2(this.x, this.y), 7).trim(1.5);
  if (repulsion.distanceSquared() > 5) {
    console.log(repulsion);
  }
  this.x += repulsion.x;
  this.y += repulsion.y;

  this.draw();
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

/** add another vector in place */
Vector2.prototype.add = function(otherVector) {
  this.x += otherVector.x;
  this.y += otherVector.y;
  return this;
};

/** subtract another vector in-place */
Vector2.prototype.subtract = function(otherVector) {
  this.x -= otherVector.x;
  this.y -= otherVector.y;
  return this;
};

/** returns the magnitude of this vector squared */
Vector2.prototype.distanceSquared = function() {
  return (this.x * this.x) + (this.y * this.y);
};

/** multiplies this vector by a scalar in-place */
Vector2.prototype.multiply = function(scalar) {
  this.x *= scalar;
  this.y *= scalar;
  return this;
};

/** cuts each dimension down to a certain value */
Vector2.prototype.trim = function(maxValue) {
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


// listen for mouse moves
window.addEventListener("mousedown", function(event) {
  var pos = getMousePos(canvas, event);
  mouse.x = pos.x;
  mouse.y = pos.y;

  // console.log(event);

  // console.log(data = c.getImageData(mouse.x, mouse.y, 10, 10));
  // console.log(all_bright_near_pos(mouse.x, mouse.y, 100, 2));
});

/** get mouse positions on a canvas */
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  // takes into account both changing coordinates to canvas space
  // and scaling when canvas logical size differs from its style size
  return {
    x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
    y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
  };
}


/** returns a Vector2 pointing away from nearby dark pixels
 *
 * @param midPos {Vector2} middle
 * @param diameter {number} width of square to sample pixels
 * @returns {Vector2} resultant repulsion vector
 */
function getRepulsionFromDark(midPos, diameter) {
  // var halfDiameter = Math.floor(diameter / 2);
  // var xTopLeft = Math.round(midPos.x) - halfDiameter;
  // var yTopLeft = Math.round(midPos.y) - halfDiameter;
  var halfDiameter = diameter / 2;
  var xTopLeft = midPos.x - halfDiameter;
  var yTopLeft = midPos.y - halfDiameter;
  var imageData = c.getImageData(xTopLeft, yTopLeft, diameter, diameter);

  // combine the vectors from every pixel to midPos
  var resultant = new Vector2(0, 0);
  for (var yOffset = 0; yOffset < imageData.height; yOffset++) {
    for (var xOffset = 0; xOffset < imageData.width; xOffset++) {
      var dataIndex = (yOffset * imageData.width + xOffset) * 4;  // index of current pixel
      if (!check_image_data_pixel_bright(imageData, dataIndex, 200)) {
        // vector from pixel pointing to middle position
        var pixelToMid = new Vector2(midPos.x - (xTopLeft + xOffset), midPos.y - (yTopLeft + yOffset));
        var distanceSquared = pixelToMid.distanceSquared();
        if (distanceSquared !== 0) {
          pixelToMid.multiply(REPEL_FACTOR / distanceSquared);
          resultant.add(pixelToMid);
        }
      }
    }
  }
  c.fillStyle = "rgba(0,0,200,0.6)";
  c.fillRect(xTopLeft, yTopLeft, diameter, diameter);  // if need to draw imageData region
  // printImageData(imageData);
  // console.log(resultant);
  return resultant;
}


// up/down/left/right
function bright_at_sides_near_pos(x, y, brightness, radius) {
  var sides = {
    top: true,
    bottom: true,
    left: true,
    right: true
  };
  var imageData = c.getImageData(x-radius, y-radius, radius*2, radius*2);
  // draw after getting image data, not before. (before will mess the reading)
  // c.fillRect(x-radius, y-radius, radius*2, radius*2);  // todo just for viewing purposes
  var sideLength = ((radius * 2)+1)*4;  // of box. *2 for radius, *4 for rgba
  // check up
  for (var i = 0; i < sideLength; i+=4) {
    if (check_image_data_pixel_bright(imageData, i, brightness) === false) {
      sides.top = false;  // not bright
    }
  }
  // check bottom
  for (i = imageData.data.length - sideLength; i < imageData.data.length; i+=4) {
    if (check_image_data_pixel_bright(imageData, i, brightness) === false) {
      sides.bottom = false;  // not bright
    }
  }
  // check left side
  for (i = 0; i < imageData.data.length; i+=sideLength) {
    if (check_image_data_pixel_bright(imageData, i, brightness) === false) {
      sides.left = false;  // not bright
    }
  }
  // check right side
  for (i = sideLength - 4; i < imageData.data.length; i += sideLength) {
    if (check_image_data_pixel_bright(imageData, i, brightness) === false) {
      sides.right = false;  // not bright
    }
  }

  return sides;
}

/** returns whether or not all pixels within radius of (x, y) have r/g/b at least brightness
 */
function all_bright_near_pos(x, y, brightness, radius) {
  var imageData = c.getImageData(x-radius, y-radius, radius*2, radius*2);
  c.fillRect(x-radius, y-radius, radius*2, radius*2);  // just for viewing purposes
  for (var i = 0; i < imageData.data.length; i+=4) {
    if (check_image_data_pixel_bright(imageData, i, brightness) === false) {
      return false;
    }
  }
  return true;
}

/** helper function to check if pixel in image data is bright */
function check_image_data_pixel_bright(imageData, i, brightness) {
  // check the RGBA values
  // false if all RGB below brightness threshold, or alpha 0. Otherwise True
  return (!((imageData.data[i] < brightness && imageData.data[i+1] < brightness && imageData.data[i+2] < brightness)
      || imageData.data[i + 3] === 0));
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

var drawer = new Mover(START_X, START_Y);

function animate() {
  requestAnimationFrame(animate);
  // Clear the canvas
  // c.clearRect(0, 0, window.innerWidth, window.innerHeight);
  // Fill the canvas with low-alpha black for trail effect
  // c.fillStyle = "rgba(0,0,0,0.1)";
  // c.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // update
  // todo: only redraw the maze part of the image
  c.drawImage(image, 0, 0);

  drawer.update();

}
animate();
