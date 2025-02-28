document.addEventListener("DOMContentLoaded", function () {
    function getOuterFrameSize() {
        // Get container dimensions for responsive layout
        const container = document.getElementById('framingContainer');
        if (!container) {
            // Fallback if container not found
            if (window.innerWidth < 600) {
                return { width: 400, height: 300 };  // Small screens (phones)
            } else if (window.innerWidth < 1024) {
                return { width: 750, height: 560 };  // Medium screens (tablets)
            } else {
                return { width: 1000, height: 750 }; // Large screens (desktops)
            }
        }
        
        // Use actual container dimensions
        return {
            width: container.clientWidth,
            height: container.clientHeight || 450 // Use 450px default height if not set
        };
    }

    const containerSize = getOuterFrameSize();
    const dpi = 72; // DPI for calculations

    // Define aspectRatio early to avoid ReferenceError
    let aspectRatio = 1;  // Default to square until an image is loaded

    // Set up initial values (temporary placeholders)
    let adjustedImageWidth = 8 * dpi;   // Default 8 inches
    let adjustedImageHeight = (8 / aspectRatio) * dpi; // Maintain aspect ratio
    let adjustedMatWidth = 2 * dpi;     // Default 2-inch mat
    let adjustedFrameBorder = 1 * dpi;  // Default 1-inch frame

    const totalMockupWidth = adjustedImageWidth + 2 * adjustedMatWidth + 2 * adjustedFrameBorder;
    const totalMockupHeight = adjustedImageHeight + 2 * adjustedMatWidth + 2 * adjustedFrameBorder;

    // Create Konva stage with responsive dimensions
    const stage = new Konva.Stage({
        container: 'framingContainer',
        width: containerSize.width,
        height: containerSize.height
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    let uploadedImage = null;
    let uploadedImageObj = null;
    let originalWidth = 0;
    let originalHeight = 0;

    let matRect = null;
    let frameRects = []; // Array to store multiple frame pieces for mitered corners

    let transformer = new Konva.Transformer({
        rotateEnabled: false,
        boundBoxFunc: function (oldBox, newBox) {
            const aspectRatio = oldBox.width / oldBox.height;
            newBox.width = Math.max(50, newBox.width);
            newBox.height = newBox.width / aspectRatio;
            return newBox;
        }
    });

    layer.add(transformer);

    // Define Mat Colors
    const matColors = {
        "cream": "#F5F5DC",
        "tan": "#D2B48C",
        "dark-brown": "#654321",
        "gray": "#808080",
        "black": "#000000",
        "pink": "#FFB6C1",
        "green": "#00AA00"
    };

    // Texture loading and caching system
    const textureCache = {};

    function loadTexture(src) {
        return new Promise((resolve, reject) => {
            // Check if texture is already cached
            if (textureCache[src]) {
                resolve(textureCache[src]);
                return;
            }
            
            // Load new texture
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Handle CORS if needed
            img.onload = () => {
                textureCache[src] = img;
                resolve(img);
            };
            img.onerror = (err) => {
                console.error("Failed to load texture:", src, err);
                reject(new Error(`Failed to load texture: ${src}`));
            };
            img.src = src;
        });
    }



    // Updated frame textures with correct path
    const frameTextures = {
        "walnut": { 
            name: "Walnut Frame", 
            src: "/wp-content/uploads/frame-textures/walnut-frame.jpg", 
            width: 1  // Frame width in inches
        },
        "cherry": { 
            name: "Cherry Frame", 
            src: "/wp-content/uploads/frame-textures/cherry-frame.jpg", 
            width: 1.5
        },
        "black": { 
            name: "Black Frame", 
            src: "/wp-content/uploads/frame-textures/black-frame.jpg", 
            width: 1
        },
        "gold-ornate": { 
            name: "Gold Ornate Frame", 
            src: "/wp-content/uploads/frame-textures/gold-ornate.jpg", 
            width: 2
        }
    };

    // Connect moulding profiles with textures
    const mouldingProfiles = {
        "black-1": { 
            color: "black", 
            width: 1,
            texture: "black" // Reference to frameTextures key 
        },
        "brown-1.5": { 
            color: "brown", 
            width: 1.5,
            texture: "cherry" // Reference to frameTextures key
        },
        "blue-2": { 
            color: "blue", 
            width: 2,
            texture: "gold-ornate" // Reference to frameTextures key
        }
    };

    // Find upload form and options containers
    const uploadContainer = document.getElementById('uploadFormContainer');
    const optionsContainer = document.getElementById('optionsContainer');
    
    // Show only upload form initially
    if (optionsContainer) {
        optionsContainer.style.display = "none";
    }

    // Set up file input and Start Over button
    const fileInput = document.getElementById('imageUpload');
    const startOverButton = document.getElementById('startOver');

    // Handle Start Over button click
    if (startOverButton) {
        startOverButton.addEventListener('click', function() {
            // Reset the stage
            if (frameRects && frameRects.length) {
                frameRects.forEach(rect => rect.destroy());
                frameRects = [];
            }
            
            if (matRect) {
                matRect.destroy();
                matRect = null;
            }
            
            if (uploadedImage) {
                uploadedImage.destroy();
                uploadedImage = null;
            }
            
            layer.draw();
            
            // Reset file input
            if (fileInput) {
                fileInput.value = "";
                fileInput.style.display = "block";
            }
            
            // Show upload form, hide options
            if (uploadContainer) {
                uploadContainer.style.display = "block";
            }
            if (optionsContainer) {
                optionsContainer.style.display = "none";
            }
            
            // Reset uploadedImageObj
            uploadedImageObj = null;
        });
    }

    // Handle file selection
    if (fileInput) {
        fileInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                uploadedImageObj = new Image();
                uploadedImageObj.src = e.target.result;
                uploadedImageObj.onload = function () {
                    originalWidth = uploadedImageObj.width;
                    originalHeight = uploadedImageObj.height;
                    aspectRatio = originalWidth / originalHeight;

                    let initialPrintWidth = 8; // Default to 8 inches
                    let initialPrintHeight = (initialPrintWidth / aspectRatio).toFixed(2);

                    // Show options, hide upload form
                    if (uploadContainer) {
                        uploadContainer.style.display = "none";
                    }
                    if (optionsContainer) {
                        optionsContainer.style.display = "block";
                    }
                    
                    const printWidthInput = document.getElementById('printWidth');
                    const printHeightInput = document.getElementById('printHeight');
                    const matWidthInput = document.getElementById('matWidth');
                    
                    if (printWidthInput) printWidthInput.value = initialPrintWidth;
                    if (printHeightInput) printHeightInput.value = initialPrintHeight;
                    if (matWidthInput) matWidthInput.value = "2";

                    // Create initial mockup
                    updateMockup(initialPrintWidth, initialPrintHeight, 2, "tan", "black-1");

                    // Hide the file input
                    fileInput.style.display = "none";
                };
            };
            reader.readAsDataURL(file);
        });
    }

    // Create mitered frame with textures
    async function createMiteredFrame(textureImg, totalWidth, totalHeight, frameWidth) {
        // Clear any existing frame elements
        if (frameRects && frameRects.length) {
            frameRects.forEach(rect => rect.destroy());
        }
        frameRects = [];
        
        // Calculate the stage center
        const stageCenter = {
            x: stage.width() / 2,
            y: stage.height() / 2
        };
        
        // Calculate the top-left position based on center
        const startX = stageCenter.x - (totalWidth / 2);
        const startY = stageCenter.y - (totalHeight / 2);
        
        // Top frame piece (with mitered corners)
        const topFrame = new Konva.Line({
            points: [
                startX, startY,                         // Top-left outer corner
                startX + totalWidth, startY,            // Top-right outer corner
                startX + totalWidth - frameWidth, startY + frameWidth,  // Top-right inner corner
                startX + frameWidth, startY + frameWidth,  // Top-left inner corner
            ],
            closed: true,
            fillPatternImage: textureImg,
            fillPatternRepeat: 'repeat',
            fillPatternRotation: 0,
            fillPatternScale: { x: 1, y: 1 }
        });
        
        // Right frame piece (with mitered corners)
        const rightFrame = new Konva.Line({
            points: [
                startX + totalWidth, startY,                         // Top-right outer corner
                startX + totalWidth, startY + totalHeight,           // Bottom-right outer corner
                startX + totalWidth - frameWidth, startY + totalHeight - frameWidth,  // Bottom-right inner corner
                startX + totalWidth - frameWidth, startY + frameWidth,  // Top-right inner corner
            ],
            closed: true,
            fillPatternImage: textureImg,
            fillPatternRepeat: 'repeat',
            fillPatternRotation: 90,  // Rotate texture 90 degrees for side pieces
            fillPatternScale: { x: 1, y: 1 }
        });
        
        // Bottom frame piece (with mitered corners)
        const bottomFrame = new Konva.Line({
            points: [
                startX, startY + totalHeight,                        // Bottom-left outer corner
                startX + totalWidth, startY + totalHeight,           // Bottom-right outer corner
                startX + totalWidth - frameWidth, startY + totalHeight - frameWidth,  // Bottom-right inner corner
                startX + frameWidth, startY + totalHeight - frameWidth,  // Bottom-left inner corner
            ],
            closed: true,
            fillPatternImage: textureImg,
            fillPatternRepeat: 'repeat',
            fillPatternRotation: 0,
            fillPatternScale: { x: 1, y: 1 }
        });
        
        // Left frame piece (with mitered corners)
        const leftFrame = new Konva.Line({
            points: [
                startX, startY,                         // Top-left outer corner
                startX, startY + totalHeight,           // Bottom-left outer corner
                startX + frameWidth, startY + totalHeight - frameWidth,  // Bottom-left inner corner
                startX + frameWidth, startY + frameWidth,  // Top-left inner corner
            ],
            closed: true,
            fillPatternImage: textureImg,
            fillPatternRepeat: 'repeat',
            fillPatternRotation: 90,  // Rotate texture 90 degrees for side pieces
            fillPatternScale: { x: 1, y: 1 }
        });
        
        // Add all frame pieces to the layer and store in array for later cleanup
        frameRects = [topFrame, rightFrame, bottomFrame, leftFrame];
        frameRects.forEach(rect => {
            layer.add(rect);
            // Add shadow to enhance 3D effect
            rect.shadowColor('rgba(0,0,0,0.3)');
            rect.shadowBlur(3);
            rect.shadowOffset({ x: 1, y: 1 });
            rect.shadowOpacity(0.3);
            rect.moveToBottom(); // Ensure frame is at the bottom
        });
        
        return {
            startX: startX,
            startY: startY
        };
    }

    // Create a fallback frame if texture loading fails
    function createColorFrame(color, totalWidth, totalHeight, frameWidth) {
        if (frameRects && frameRects.length) {
            frameRects.forEach(rect => rect.destroy());
        }
        frameRects = [];
        
        // Calculate the stage center
        const stageCenter = {
            x: stage.width() / 2,
            y: stage.height() / 2
        };
        
        // Calculate the top-left position based on center
        const startX = stageCenter.x - (totalWidth / 2);
        const startY = stageCenter.y - (totalHeight / 2);
        
        // Create a simpler rectangular frame
        const frame = new Konva.Rect({
            x: startX,
            y: startY,
            width: totalWidth,
            height: totalHeight,
            fill: color,
        });
        
        frameRects = [frame];
        layer.add(frame);
        frame.moveToBottom();
        
        return {
            startX: startX,
            startY: startY
        };
    }

    // Updated updateMockup function that uses textures
    async function updateMockup(printWidth, printHeight, matWidth, matColor, mouldingKey) {
        console.log("Update mockup called with:", {
            printWidth, printHeight, matWidth, matColor, mouldingKey
        });
        
        const mouldingData = mouldingProfiles[mouldingKey];
        if (!mouldingData) {
            console.error("Error: Invalid moulding profile", mouldingKey);
            return;
        }

        const frameWidthInches = mouldingData.width;
        const frameColor = mouldingData.color;
        const textureKey = mouldingData.texture || "walnut"; // Default if not specified
        const frameTextureData = frameTextures[textureKey];
        
        matWidth = parseFloat(matWidth);

        // Get current stage dimensions
        const stageSize = {
            width: stage.width(),
            height: stage.height()
        };
        
        console.log("Stage size:", stageSize);

        // Convert dimensions to pixels
        const imageWidthPx = printWidth * dpi;
        const imageHeightPx = printHeight * dpi;
        const matWidthPx = matWidth * dpi;
        const frameWidthPx = frameWidthInches * dpi;

        // Calculate total mockup dimensions
        const totalWidth = imageWidthPx + (2 * matWidthPx) + (2 * frameWidthPx);
        const totalHeight = imageHeightPx + (2 * matWidthPx) + (2 * frameWidthPx);
        
        console.log("Total mockup size (px):", totalWidth, totalHeight);

        // Calculate scaling needed to fit mockup in stage
        const widthScale = (stageSize.width * 0.9) / totalWidth;
        const heightScale = (stageSize.height * 0.9) / totalHeight;
        const scaleFactor = Math.min(widthScale, heightScale, 1); // Don't scale up
        
        console.log("Scale factor:", scaleFactor);

        // Apply scale to all dimensions
        const scaledImageWidth = imageWidthPx * scaleFactor;
        const scaledImageHeight = imageHeightPx * scaleFactor;
        const scaledMatWidth = matWidthPx * scaleFactor;
        const scaledFrameWidth = frameWidthPx * scaleFactor;
        
        // Calculate final mockup dimensions after scaling
        const scaledTotalWidth = scaledImageWidth + (2 * scaledMatWidth) + (2 * scaledFrameWidth);
        const scaledTotalHeight = scaledImageHeight + (2 * scaledMatWidth) + (2 * scaledFrameWidth);
        
        console.log("Scaled total size:", scaledTotalWidth, scaledTotalHeight);

        let framePosition;

        // Try to load and use texture
        try {
            if (frameTextureData && frameTextureData.src) {
                console.log("Loading texture from:", frameTextureData.src);
                const textureImg = await loadTexture(frameTextureData.src);
                console.log("Texture loaded successfully");
                
                // Create mitered frame with texture
                framePosition = await createMiteredFrame(
                    textureImg,
                    scaledTotalWidth,
                    scaledTotalHeight,
                    scaledFrameWidth
                );
            } else {
                // Fallback to solid color
                console.log("No texture defined, using solid color:", frameColor);
                framePosition = createColorFrame(
                    frameColor,
                    scaledTotalWidth,
                    scaledTotalHeight,
                    scaledFrameWidth
                );
            }
        } catch (error) {
            // Error handling for texture loading
            console.error("Error loading texture:", error);
            console.log("Falling back to solid color:", frameColor);
            
            framePosition = createColorFrame(
                frameColor,
                scaledTotalWidth,
                scaledTotalHeight,
                scaledFrameWidth
            );
        }

        // Create mat based on frame position
        if (matRect) {
            matRect.destroy();
        }
        
        matRect = new Konva.Rect({
            x: framePosition.startX + scaledFrameWidth,
            y: framePosition.startY + scaledFrameWidth,
            width: scaledImageWidth + (2 * scaledMatWidth),
            height: scaledImageHeight + (2 * scaledMatWidth),
            fill: matColors[matColor]
        });
        
        layer.add(matRect);

        // Create image based on mat position
        const imageObj = new Image();
        imageObj.src = uploadedImageObj.src;
        
        imageObj.onload = function() {
            if (uploadedImage) {
                uploadedImage.destroy();
            }
            
            uploadedImage = new Konva.Image({
                image: imageObj,
                x: framePosition.startX + scaledFrameWidth + scaledMatWidth,
                y: framePosition.startY + scaledFrameWidth + scaledMatWidth,
                width: scaledImageWidth,
                height: scaledImageHeight,
                draggable: true
            });
            
            layer.add(uploadedImage);
            
            // Ensure proper layering
            matRect.moveUp();
            uploadedImage.moveToTop();
            
            layer.draw();
        };
    }

    // Set up event listeners for controls
    function attachUpdateListeners() {
        const printWidthInput = document.getElementById('printWidth');
        const printHeightInput = document.getElementById('printHeight');
        const matWidthInput = document.getElementById('matWidth');
        const matColorInput = document.getElementById('matColor');
        const mouldingProfileInput = document.getElementById('mouldingProfile');

        // Skip if any element is missing
        if (!printWidthInput || !printHeightInput || !matWidthInput || 
            !matColorInput || !mouldingProfileInput) {
            console.warn("Some input elements not found. Event listeners not attached.");
            return;
        }

        function triggerUpdate() {
            updateMockup(
                parseFloat(printWidthInput.value),
                parseFloat(printHeightInput.value),
                parseFloat(matWidthInput.value),
                matColorInput.value,
                mouldingProfileInput.value
            );
        }

        // Maintain aspect ratio when changing width
        printWidthInput.addEventListener('input', function () {
            const width = parseFloat(this.value);
            if (!isNaN(width) && width > 0 && aspectRatio > 0) {
                printHeightInput.value = (width / aspectRatio).toFixed(2);
                triggerUpdate();
            }
        });

        // Maintain aspect ratio when changing height
        printHeightInput.addEventListener('input', function () {
            const height = parseFloat(this.value);
            if (!isNaN(height) && height > 0 && aspectRatio > 0) {
                printWidthInput.value = (height * aspectRatio).toFixed(2);
                triggerUpdate();
            }
        });

        // Other controls
        matWidthInput.addEventListener('input', triggerUpdate);
        matColorInput.addEventListener('change', triggerUpdate);
        mouldingProfileInput.addEventListener('change', triggerUpdate);
    }

    // Handle window resize for responsive layout
    window.addEventListener('resize', function() {
        const newSize = getOuterFrameSize();
        stage.width(newSize.width);
        stage.height(newSize.height);
        
        // Redraw if we have an active mockup
        if (uploadedImageObj) {
            const printWidthInput = document.getElementById('printWidth');
            const printHeightInput = document.getElementById('printHeight');
            const matWidthInput = document.getElementById('matWidth');
            const matColorInput = document.getElementById('matColor');
            const mouldingProfileInput = document.getElementById('mouldingProfile');
            
            if (printWidthInput && printHeightInput && matWidthInput && 
                matColorInput && mouldingProfileInput) {
                
                updateMockup(
                    parseFloat(printWidthInput.value),
                    parseFloat(printHeightInput.value),
                    parseFloat(matWidthInput.value),
                    matColorInput.value,
                    mouldingProfileInput.value
                );
            }
        }
    });

    // Initialize event listeners
    attachUpdateListeners();
});