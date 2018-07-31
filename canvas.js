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

// records the mouse position
var mouse = {
  x: canvas.width / 2,
  y: canvas.width / 2
};


function Drawer(startX, startY) {
  this.x = startX;
  this.y = startY;

  this.draw = function() {
    c.beginPath();
    c.fillStyle = "red";
    c.strokeStyle = "blue";
    c.lineWidth = 10;
    c.arc(this.x, this.y, 2, 0, Math.PI * 2, false);
    c.fill();  // fill inside
  };

  this.getTargetPos = function() {
    var xTarget = this.x;
    var yTarget = this.y;
    if (xTarget === mouse.x) {

    } else if (xTarget < mouse.x) {
      xTarget += 1;
    } else {
      xTarget -= 1;
    }
    if (yTarget === mouse.y) {

    } else if (yTarget < mouse.y) {
      yTarget += 1;
    } else {
      yTarget -= 1;
    }
    return {x: xTarget, y: yTarget};
  };

  this.update = function() {
    // attempt to move towards mouse position
    // var target = this.getTargetPos();
    var bright_sides = bright_at_sides_near_pos(this.x, this.y, 100, 3);

    // right / left
    if (this.x < mouse.x && bright_sides.right) {
      this.x += 1;
    } else if (mouse.x < this.x && bright_sides.left) {
      this.x -= 1;
    }
    // down / up
    if (this.y < mouse.y && bright_sides.bottom) {
      this.y += 1;
    } else if (mouse.y < this.y  && bright_sides.top) {
      this.y -= 1;
    }

    this.draw();
  };
}


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
  console.log(sides);
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



var drawer = new Drawer(START_X, START_Y);

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
