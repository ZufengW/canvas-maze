"use strict";

// image element that will hold the cross origin image
var img = document.getElementById('source');
var textInput = document.getElementById('input-image-src');
var buttonSubmit = document.getElementById('btn-submit');
var errorMessage = document.getElementById('alert-error');
var form = document.getElementById('form');
errorMessage.style.display = 'none';


// When form submits, try to load the image.
form.onsubmit = function(event) {
  event.preventDefault();

  // get image source from the form
  var src = textInput.value;

  img.crossOrigin = "Anonymous";
  // event handlers
  img.onload = imageReceived;
  img.onerror = imageError;

  // finally set the src to attempt to load the image
  img.src = src;
  return false;
};

// When image loads properly, initialise the maze.
var imageReceived = function() {
  console.log("Image received: " + img.src);
  canvas.width = img.width;
  canvas.height = img.height;

  // disable the form to prevent submitting again
  textInput.setAttribute("disabled", "");
  buttonSubmit.setAttribute("disabled", "");
  errorMessage.style.display = 'none';

  initMaze(2, 2, "canvas", "source");
};

// When image doesn't load properly, display an error.
var imageError = function() {
  console.log("Image error: " + img.src);
  // console.log(event);
  errorMessage.style.display = 'inline-block';
};
