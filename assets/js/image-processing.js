/**
 * Enhanced image upload handler that:
 * 1. Saves the original high-res image for print orders
 * 2. Creates an optimized version for the mockup display
 */
 
 // Make the image processing functions available globally
window.initializeFrameImageUpload = initializeImageUpload;
window.addToCartFrame = addToCart;
 
function initializeImageUpload() {
  const uploadInput = document.getElementById("imageUpload");
  if (!uploadInput) return;
  
  uploadInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) {
      console.error("No file selected");
      return;
    }
    
    console.log("Processing image:", file.name, file.type, file.size, "bytes");
    
    // Show a loading indicator if you have one
    // showLoadingIndicator();
    
    // 1. First, upload the original high-resolution image to the server
    uploadOriginalImage(file).then(function(response) {
      // Store the server response data (file paths, IDs, etc.)
      const originalImageData = response;
      
      // 2. Create a display version for the mockup
      createDisplayImage(file).then(function(displayImageObj) {
        // Store both the display image and reference to the original
        uploadedImageObj = displayImageObj;
        uploadedImageObj.originalImageData = originalImageData;
        
        // Update dimensions based on the display image
        originalWidth = uploadedImageObj.width;
        originalHeight = uploadedImageObj.height;
        aspectRatio = originalWidth / originalHeight;
        
        console.log("Image processed with dimensions:", originalWidth, "x", originalHeight);
        
        // Update print dimensions based on aspect ratio
        const startWidth = 8;
        const startHeight = (startWidth / aspectRatio).toFixed(2);
        
        // Update current options
        currentOptions.printWidth = startWidth;
        currentOptions.printHeight = parseFloat(startHeight);
        
        // Update UI controls
        const printWidthInput = document.getElementById("printWidth");
        const printHeightInput = document.getElementById("printHeight");
        
        if (printWidthInput) printWidthInput.value = startWidth;
        if (printHeightInput) printHeightInput.value = startHeight;
        
        // Show options container and hide upload form
        const uploadForm = document.getElementById("uploadFormContainer");
        const optionsContainer = document.getElementById("optionsContainer");
        
        if (uploadForm) uploadForm.style.display = "none";
        if (optionsContainer) optionsContainer.style.display = "block";
        
        // Generate initial mockup
        updateMockup();
        
        // Hide loading indicator if you have one
        // hideLoadingIndicator();
      }).catch(function(error) {
        console.error("Error creating display image:", error);
        alert("Error processing image. Please try again.");
        // hideLoadingIndicator();
      });
    }).catch(function(error) {
      console.error("Error uploading original image:", error);
      alert("Error uploading image. Please try again.");
      // hideLoadingIndicator();
    });
  });
}

/**
 * Uploads the original high-resolution image to the server
 * @param {File} file - The image file from the file input
 * @returns {Promise} Promise resolving to server response with file details
 */
function uploadOriginalImage(file) {
  return new Promise(function(resolve, reject) {
    // Create form data to send to the server
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'upload_original_image');
	formData.append("nonce", cfdData.nonce);
	
    // Use AJAX to upload the file
    jQuery.ajax({
      url: ajaxurl, // WordPress AJAX handler URL
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          console.log("Original image uploaded successfully:", response.data.file_url);
          resolve({
            id: response.data.file_id,
            url: response.data.file_url,
            path: response.data.file_path,
            filename: file.name,
            size: file.size,
            type: file.type
          });
        } else {
          reject(new Error(response.data.message || "Error uploading original image"));
        }
      },
      error: function(xhr, status, error) {
        reject(new Error("AJAX error: " + error));
      }
    });
  });
}

/**
 * Creates an optimized display version of the image for the mockup
 * @param {File} file - The image file from the file input
 * @returns {Promise} Promise resolving to an Image object with the optimized version
 */
function createDisplayImage(file) {
  return new Promise(function(resolve, reject) {
    // Create a FileReader to read the image file
    const reader = new FileReader();
    
    reader.onload = function(e) {
      // Create a new image element
      const img = new Image();
      
      img.onload = function() {
        // Check if we need to resize the image for display
        const MAX_DISPLAY_WIDTH = 1200; // Set your desired max width
        const MAX_DISPLAY_HEIGHT = 1200; // Set your desired max height
        
        let displayWidth = this.width;
        let displayHeight = this.height;
        
        // Resize if needed while maintaining aspect ratio
        if (displayWidth > MAX_DISPLAY_WIDTH || displayHeight > MAX_DISPLAY_HEIGHT) {
          if (displayWidth / displayHeight > MAX_DISPLAY_WIDTH / MAX_DISPLAY_HEIGHT) {
            // Width is the limiting factor
            displayWidth = MAX_DISPLAY_WIDTH;
            displayHeight = Math.round(MAX_DISPLAY_WIDTH * (this.height / this.width));
          } else {
            // Height is the limiting factor
            displayHeight = MAX_DISPLAY_HEIGHT;
            displayWidth = Math.round(MAX_DISPLAY_HEIGHT * (this.width / this.height));
          }
          
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          
          // Draw the resized image on the canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(this, 0, 0, displayWidth, displayHeight);
          
          // Create a new image from the canvas
          const resizedImg = new Image();
          resizedImg.onload = function() {
            resolve(resizedImg);
          };
          resizedImg.onerror = function() {
            reject(new Error("Error creating resized image"));
          };
          
          // Get the data URL from the canvas (can adjust quality for JPEG)
          const dataURL = canvas.toDataURL(file.type, 0.85);
          resizedImg.src = dataURL;
        } else {
          // No resizing needed, use the original image
          resolve(this);
        }
      };
      
      img.onerror = function() {
        reject(new Error("Error loading image for processing"));
      };
      
      // Set the source to the data URL from the FileReader
      img.src = e.target.result;
    };
    
    reader.onerror = function() {
      reject(new Error("Error reading file"));
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
  });
}

/**
 * Adds hidden fields to the cart form with reference to the original image
 * Call this when adding to cart
 */
function addImageInfoToCart() {
  if (!uploadedImageObj || !uploadedImageObj.originalImageData) {
    console.error("No image data available for cart");
    return false;
  }
  
  // Create hidden form fields with the original image data
  const form = document.getElementById("addToCartForm") || document.createElement("form");
  
  // Clear any existing image fields
  const existingFields = form.querySelectorAll(".frame-image-field");
  existingFields.forEach(field => field.remove());
  
  // Add fields with image data
  const imageData = uploadedImageObj.originalImageData;
  
  // Create and append hidden fields
  appendHiddenField(form, "frame_image_id", imageData.id, "frame-image-field");
  appendHiddenField(form, "frame_image_url", imageData.url, "frame-image-field");
  appendHiddenField(form, "frame_image_name", imageData.filename, "frame-image-field");
  appendHiddenField(form, "frame_image_size", imageData.size, "frame-image-field");
  appendHiddenField(form, "frame_image_type", imageData.type, "frame-image-field");
  
  // Add current frame/mat configuration
  appendHiddenField(form, "frame_width", currentOptions.printWidth, "frame-image-field");
  appendHiddenField(form, "frame_height", currentOptions.printHeight, "frame-image-field");
  appendHiddenField(form, "frame_style", currentOptions.mouldingProfile, "frame-image-field");
  appendHiddenField(form, "mat_width", currentOptions.matWidth, "frame-image-field");
  appendHiddenField(form, "mat_color", currentOptions.matColor, "frame-image-field");
  appendHiddenField(form, "second_mat", currentOptions.secondMat ? "yes" : "no", "frame-image-field");
  
  if (currentOptions.secondMat) {
    appendHiddenField(form, "second_mat_color", currentOptions.secondMatColor, "frame-image-field");
    appendHiddenField(form, "reveal_size", currentOptions.revealSize, "frame-image-field");
  }
  
  console.log("Image data added to cart form");
  return true;
}

/**
 * Helper function to append a hidden field to a form
 */
function appendHiddenField(form, name, value, className) {
  const field = document.createElement("input");
  field.type = "hidden";
  field.name = name;
  field.value = value;
  field.className = className || "";
  form.appendChild(field);
}

/**
 * Enhanced addToCart function that integrates with WooCommerce
 * Call this when the "Add to Cart" button is clicked
 */
function addToCart() {
  // First, add image info to the form
  if (!addImageInfoToCart()) {
    alert("Please upload an image before adding to cart.");
    return;
  }
  
  // Get the form data
  const form = document.getElementById("addToCartForm");
  const formData = new FormData(form);
  
  // Add additional data for WooCommerce
  formData.append('action', 'custom_frame_add_to_cart');
  formData.append('product_id', productId); // Set this variable elsewhere
  formData.append('quantity', 1);
  
  // Use AJAX to add to cart
  jQuery.ajax({
    url: ajaxurl,
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function(response) {
      if (response.success) {
        // Success - show confirmation and redirect to cart
        alert("Your custom frame has been added to the cart!");
        
        // Optionally redirect to cart page
        if (response.data.cart_url) {
          window.location.href = response.data.cart_url;
        }
      } else {
        // Error - show message
        alert(response.data.message || "Error adding to cart. Please try again.");
      }
    },
    error: function(xhr, status, error) {
      console.error("AJAX error:", error);
      alert("Error adding to cart. Please try again.");
    }
  });
}

// Export functions for external use
window.uploadOriginalImage = uploadOriginalImage;
window.createDisplayImage = createDisplayImage;
