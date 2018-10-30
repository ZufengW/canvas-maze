"use strict";

// image element that will hold the cross origin image
var img = document.getElementById('source');
var textInput = document.getElementById('input-image-src');
var buttonSubmit = document.getElementById('btn-submit');
var errorMessage = document.getElementById('alert-error');
var form = document.getElementById('form');
errorMessage.style.display = 'none';

// error messages for the errorMessage to display
var ERR_LOADING = "There was a problem with loading the image";
var ERR_NO_INPUT = "Provide an image source";

// Check for support for the various File APIs.
var fileSupport = false;
if (window.File && window.FileReader && window.FileList && window.Blob) {
  console.log('Great success! All the File APIs are supported.');
  fileSupport = true;
} else {
  alert('The File APIs are not fully supported in this browser.');
}


// When form submits, try to load the image.
form.onsubmit = function(event) {
  event.preventDefault();

  if (fileSupport) {
    // get the FileList from the file input of the form
    var fileList = event.target.file.files

    if (fileList.length > 0) {
      var file = fileList[0];
      // only process image files
      if (!file.type.match('image.*')) {
        console.log('File is not an image:', file.name);
      } else {
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
          return function(e) {
            var src = e.target.result;
            attemptLoadImage(src);
          };
        })(file);

        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
        return false;
      }
    }
  }

  // if there is no file, try using the URL from the text input
  var src = textInput.value;
  if (src.length === 0) {
    errorMessage.textContent = ERR_NO_INPUT;
    errorMessage.style.display = 'inline-block';
  } else {
    attemptLoadImage(src);
  }
  return false;
};

// Given an image source, try to load the image
var attemptLoadImage = function(src) {
  img.crossOrigin = "Anonymous";
  // event handlers
  img.onload = imageReceived;
  img.onerror = imageError;

  // Finally, set the src to attempt to load the image.
  img.src = src;
};

// When image loads properly, initialise the maze.
var imageReceived = function() {
  console.log("Image received: " + img.src);
  canvas.width = img.width;
  canvas.height = img.height;

  // disable the form to prevent submitting again
  textInput.setAttribute("disabled", "");
  buttonSubmit.setAttribute("disabled", "");
  document.getElementById('input-file').setAttribute("disabled", "");
  errorMessage.style.display = 'none';

  // Start the maze. For now, the start location is in the top left.
  initMaze(2, 2, "canvas", "source");
};

// When image doesn't load properly, display an error.
var imageError = function() {
  console.log("Image error: " + img.src);
  // console.log(event);  // doesn't provide any useful info
  errorMessage.textContent = ERR_LOADING;
  errorMessage.style.display = 'inline-block';
};
