document.addEventListener("DOMContentLoaded", function () {
			// prevent recursive calls that hang the  browser
	function debounce(func, wait) {
		let timeout;
		return function(...args) {
			const context = this;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				func.apply(context, args);
			}, wait);
		};
	}
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
        "white": "#FFFFFF",
        "pink": "#FFB6C1",
        "green": "#00AA00"
    };

    // Define mat core and bevel settings
    const matCoreSettings = {
        "bevelWidth": 1/16 * dpi,  // 1/16 inch bevel
        "coreColor": "#FFFFFF"     // White core
    };

    // Second mat options for reveals
    let secondMatEnabled = false;
    let secondMatColor = "black";
    let revealSize = 0.125;  // Default 1/8" reveal

    // Whitespace settings
    let whitespaceEnabled = false;
    let whitespaceSize = 0.25;  // Default 1/4" whitespace

    // V-groove settings
    let vGrooveEnabled = false;
    let vGrooveDistance = 0.5;  // Default 0.5" from opening

    // Multiple opening settings (plaque)
    let multipleOpeningsEnabled = false;
    let plaqueWidth = 5; // Default 5 inches
    let plaqueHeight = 1; // Default 1 inch
    let plaquePosition = 'below'; // Default below
    let plaqueSpacing = 1; // Default 1 inch spacing

    // Opening shape (default rectangle)
    let openingShape = 'rectangle';
    let scaleFactor = 1; // Global scale factor for responsive sizing

    // Function to draw mat with beveled edges
    function drawBeveledMat(startX, startY, width, height, openingWidth, openingHeight, 
                            matColor, coreColor, bevelWidth) {
        
        // Remove old mat if it exists
        if (matRect) {
            matRect.destroy();
            matRect = null;
        }
        
        // Base mat (background)
        matRect = new Konva.Rect({
            x: startX,
            y: startY,
            width: width,
            height: height,
            fill: matColors[matColor]
        });
        
        // Calculate opening position
        const openingX = startX + (width - openingWidth) / 2;
        const openingY = startY + (height - openingHeight) / 2;
        
        // Create mat opening with beveled edge
        const matOpening = new Konva.Group();
        
        // Main opening (transparent)
        const opening = new Konva.Rect({
            x: openingX,
            y: openingY,
            width: openingWidth,
            height: openingHeight,
            fill: 'transparent'
        });
        
        // Top bevel edge
        const topBevel = new Konva.Line({
            points: [
                openingX, openingY,
                openingX + openingWidth, openingY,
                openingX + openingWidth - bevelWidth, openingY + bevelWidth,
                openingX + bevelWidth, openingY + bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Right bevel edge
        const rightBevel = new Konva.Line({
            points: [
                openingX + openingWidth, openingY,
                openingX + openingWidth, openingY + openingHeight,
                openingX + openingWidth - bevelWidth, openingY + openingHeight - bevelWidth,
                openingX + openingWidth - bevelWidth, openingY + bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Bottom bevel edge
        const bottomBevel = new Konva.Line({
            points: [
                openingX, openingY + openingHeight,
                openingX + openingWidth, openingY + openingHeight,
                openingX + openingWidth - bevelWidth, openingY + openingHeight - bevelWidth,
                openingX + bevelWidth, openingY + openingHeight - bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Left bevel edge
        const leftBevel = new Konva.Line({
            points: [
                openingX, openingY,
                openingX, openingY + openingHeight,
                openingX + bevelWidth, openingY + openingHeight - bevelWidth,
                openingX + bevelWidth, openingY + bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Add v-groove if enabled
        if (vGrooveEnabled) {
            const grooveDistance = vGrooveDistance * dpi * scaleFactor;
            
            // V-groove rectangle (slightly larger than opening)
            const vGrooveOuterWidth = openingWidth + (2 * grooveDistance);
            const vGrooveOuterHeight = openingHeight + (2 * grooveDistance);
            const vGrooveOuterX = openingX - grooveDistance;
            const vGrooveOuterY = openingY - grooveDistance;
            
            // Create v-groove visual (thin line)
            const vGroove = new Konva.Line({
                points: [
                    vGrooveOuterX, vGrooveOuterY,
                    vGrooveOuterX + vGrooveOuterWidth, vGrooveOuterY,
                    vGrooveOuterX + vGrooveOuterWidth, vGrooveOuterY + vGrooveOuterHeight,
                    vGrooveOuterX, vGrooveOuterY + vGrooveOuterHeight
                ],
                closed: true,
                stroke: matColor === 'white' ? '#CCCCCC' : '#FFFFFF',
                strokeWidth: 1.5,
            //  dash: [2, 2], switch to solid line
                fill: null
            });
            
            matOpening.add(vGroove);
        }
        
        // Add all elements to mat group
        matOpening.add(opening);
        matOpening.add(topBevel, rightBevel, bottomBevel, leftBevel);
        
        // Add second mat if enabled
        if (secondMatEnabled) {
            const revealSizePx = revealSize * dpi * scaleFactor;
            const secondMatOpeningWidth = openingWidth + (2 * revealSizePx);
            const secondMatOpeningHeight = openingHeight + (2 * revealSizePx);
            const secondMatOpeningX = openingX - revealSizePx;
            const secondMatOpeningY = openingY - revealSizePx;
            
            // Create second mat opening
            const secondMatOpening = new Konva.Rect({
                x: secondMatOpeningX,
                y: secondMatOpeningY,
                width: secondMatOpeningWidth,
                height: secondMatOpeningHeight,
                fill: matColors[secondMatColor]
            });
            
            // Add to group (below main opening)
            matOpening.add(secondMatOpening);
            secondMatOpening.moveToBottom();
        }
        
        // Add whitespace if enabled
        if (whitespaceEnabled) {
            const whitespaceWidthPx = whitespaceSize * dpi * scaleFactor;
            
            // Calculate image visible area
            const imageVisibleWidth = openingWidth - (2 * whitespaceWidthPx);
            const imageVisibleHeight = openingHeight - (2 * whitespaceWidthPx);
            
            // Create whitespace rectangle
            const whitespaceRect = new Konva.Rect({
                x: openingX + whitespaceWidthPx,
                y: openingY + whitespaceWidthPx,
                width: imageVisibleWidth,
                height: imageVisibleHeight,
                fill: 'white',
                stroke: '#EEEEEE',
                strokeWidth: 1
            });
            
            matOpening.add(whitespaceRect);
        }
        
        // Add to layer
        layer.add(matRect);
        layer.add(matOpening);
        
        // Return opening dimensions for image positioning
        return {
            openingX: openingX,
            openingY: openingY,
            openingWidth: openingWidth,
            openingHeight: openingHeight,
            centerX: openingX + openingWidth / 2,
            centerY: openingY + openingHeight / 2
        };
    }
	// end of pt1



	function drawSpecialShapedMat(startX, startY, width, height, openingWidth, openingHeight, 
							 matColor, coreColor, bevelWidth) {
		
		// Create main mat group
		const matGroup = new Konva.Group();
		
		// Base mat (background)
		matRect = new Konva.Rect({
			x: startX,
			y: startY,
			width: width,
			height: height,
			fill: matColors[matColor]
		});
		
		matGroup.add(matRect);
		
		// Calculate opening position
		const openingX = startX + (width - openingWidth) / 2;
		const openingY = startY + (height - openingHeight) / 2;
		
		// Now we only have two possible shapes: rectangle or oval
		let openingInfo;
		if (openingShape === 'oval') {
			openingInfo = drawSpecialShapeOpening(
				'oval', 
				matGroup, 
				openingX, 
				openingY, 
				openingWidth, 
				openingHeight, 
				coreColor, 
				bevelWidth
			);
		} else {
			// For rectangle, create a rectangular hole
			const rectHole = new Konva.Rect({
				x: openingX,
				y: openingY,
				width: openingWidth,
				height: openingHeight,
				fill: 'black',
				globalCompositeOperation: 'destination-out'
			});
			
			matGroup.add(rectHole);
			
			// Add beveled edges
			openingInfo = drawRectangularOpening(
				matGroup, 
				openingX, 
				openingY, 
				openingWidth, 
				openingHeight, 
				coreColor, 
				bevelWidth
			);
		}
		
		// Add second mat if enabled
		if (secondMatEnabled) {
			const revealSizePx = revealSize * dpi * scaleFactor;
			
			// Create a group for the second mat
			const secondMatGroup = new Konva.Group();
			
			if (openingShape === 'oval') {
				// For oval, add a second mat with hole
				const secondMatRadiusX = openingInfo.radiusX + revealSizePx;
				const secondMatRadiusY = openingInfo.radiusY + revealSizePx;
				
				// Create the second mat as an ellipse
				const secondMatEllipse = new Konva.Ellipse({
					x: openingInfo.centerX,
					y: openingInfo.centerY,
					radiusX: secondMatRadiusX,
					radiusY: secondMatRadiusY,
					fill: matColors[secondMatColor]
				});
				
				// Add hole in second mat
				const secondMatHole = new Konva.Ellipse({
					x: openingInfo.centerX,
					y: openingInfo.centerY,
					radiusX: openingInfo.radiusX,
					radiusY: openingInfo.radiusY,
					fill: 'black',
					globalCompositeOperation: 'destination-out'
				});
				
				secondMatGroup.add(secondMatEllipse);
				secondMatGroup.add(secondMatHole);
			} else {
				// For rectangle opening, create a second mat with hole
				const secondMatOpeningWidth = openingWidth + (2 * revealSizePx);
				const secondMatOpeningHeight = openingHeight + (2 * revealSizePx);
				const secondMatOpeningX = openingX - revealSizePx;
				const secondMatOpeningY = openingY - revealSizePx;
				
				// Create second mat
				const secondMatRect = new Konva.Rect({
					x: secondMatOpeningX,
					y: secondMatOpeningY,
					width: secondMatOpeningWidth,
					height: secondMatOpeningHeight,
					fill: matColors[secondMatColor]
				});
				
				// Create hole
				const secondMatHole = new Konva.Rect({
					x: openingX,
					y: openingY,
					width: openingWidth,
					height: openingHeight,
					fill: 'black',
					globalCompositeOperation: 'destination-out'
				});
				
				secondMatGroup.add(secondMatRect);
				secondMatGroup.add(secondMatHole);
			}
			
			// Add second mat to main group
			matGroup.add(secondMatGroup);
		}
		
		// Handle whitespace similarly with globalCompositeOperation
		if (whitespaceEnabled) {
			const whitespaceWidthPx = whitespaceSize * dpi * scaleFactor;
			const whitespaceGroup = new Konva.Group();
			
			if (openingShape === 'oval') {
				// Create whitespace ellipse
				const whitespaceEllipse = new Konva.Ellipse({
					x: openingInfo.centerX,
					y: openingInfo.centerY,
					radiusX: openingInfo.radiusX,
					radiusY: openingInfo.radiusY,
					fill: 'white'
				});
				
				// Create inner hole
				const whitespaceHole = new Konva.Ellipse({
					x: openingInfo.centerX,
					y: openingInfo.centerY,
					radiusX: openingInfo.radiusX - whitespaceWidthPx,
					radiusY: openingInfo.radiusY - whitespaceWidthPx,
					fill: 'black',
					globalCompositeOperation: 'destination-out'
				});
				
				whitespaceGroup.add(whitespaceEllipse);
				whitespaceGroup.add(whitespaceHole);
			} else {
				// Create whitespace rectangle
				const whitespaceRect = new Konva.Rect({
					x: openingX,
					y: openingY,
					width: openingWidth,
					height: openingHeight,
					fill: 'white'
				});
				
				// Create inner hole
				const whitespaceHole = new Konva.Rect({
					x: openingX + whitespaceWidthPx,
					y: openingY + whitespaceWidthPx,
					width: openingWidth - (2 * whitespaceWidthPx),
					height: openingHeight - (2 * whitespaceWidthPx),
					fill: 'black',
					globalCompositeOperation: 'destination-out'
				});
				
				whitespaceGroup.add(whitespaceRect);
				whitespaceGroup.add(whitespaceHole);
			}
			
			matGroup.add(whitespaceGroup);
		}
		
		// V-groove remains the same
		if (vGrooveEnabled) {
			const grooveDistance = vGrooveDistance * dpi * scaleFactor;
			
			if (openingShape === 'oval') {
				// Add oval v-groove
				const vGrooveRadiusX = openingInfo.radiusX + grooveDistance;
				const vGrooveRadiusY = openingInfo.radiusY + grooveDistance;
				
				const vGroove = new Konva.Ellipse({
					x: openingInfo.centerX,
					y: openingInfo.centerY,
					radiusX: vGrooveRadiusX,
					radiusY: vGrooveRadiusY,
					stroke: matColor === 'white' ? '#CCCCCC' : '#FFFFFF',
					strokeWidth: 1.5,
					fill: null
				});
				
				matGroup.add(vGroove);
			} else {
				// Rectangle v-groove
				const vGrooveOuterWidth = openingWidth + (2 * grooveDistance);
				const vGrooveOuterHeight = openingHeight + (2 * grooveDistance);
				const vGrooveOuterX = openingX - grooveDistance;
				const vGrooveOuterY = openingY - grooveDistance;
				
				const vGroove = new Konva.Rect({
					x: vGrooveOuterX,
					y: vGrooveOuterY,
					width: vGrooveOuterWidth,
					height: vGrooveOuterHeight,
					stroke: matColor === 'white' ? '#CCCCCC' : '#FFFFFF',
					strokeWidth: 1.5,
					fill: null
				});
				
				matGroup.add(vGroove);
			}
		}
		
		// Multiple openings code remains similar
		// (code for plaque would go here, but not modified for brevity)
		
		// Add the mat group to the layer
		layer.add(matGroup);
		
		// Put mat on top of everything else
		matGroup.moveToTop();
		
		return {
			openingX: openingX,
			openingY: openingY,
			openingWidth: openingWidth,
			openingHeight: openingHeight,
			centerX: openingInfo.centerX,
			centerY: openingInfo.centerY,
			shape: openingShape,
			radius: openingInfo.radius,
			radiusX: openingInfo.radiusX,
			radiusY: openingInfo.radiusY
		};
	}
    // Function to draw a rectangular opening with beveled edges
    function drawRectangularOpening(matGroup, x, y, width, height, coreColor, bevelWidth) {
        // Main opening (transparent)
        const opening = new Konva.Rect({
            x: x,
            y: y,
            width: width,
            height: height,
            fill: 'transparent'
        });
        
        // Top bevel edge
        const topBevel = new Konva.Line({
            points: [
                x, y,
                x + width, y,
                x + width - bevelWidth, y + bevelWidth,
                x + bevelWidth, y + bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Right bevel edge
        const rightBevel = new Konva.Line({
            points: [
                x + width, y,
                x + width, y + height,
                x + width - bevelWidth, y + height - bevelWidth,
                x + width - bevelWidth, y + bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Bottom bevel edge
        const bottomBevel = new Konva.Line({
            points: [
                x, y + height,
                x + width, y + height,
                x + width - bevelWidth, y + height - bevelWidth,
                x + bevelWidth, y + height - bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Left bevel edge
        const leftBevel = new Konva.Line({
            points: [
                x, y,
                x, y + height,
                x + bevelWidth, y + height - bevelWidth,
                x + bevelWidth, y + bevelWidth
            ],
            closed: true,
            fill: coreColor
        });
        
        // Add all elements to mat group
        matGroup.add(opening);
        matGroup.add(topBevel, rightBevel, bottomBevel, leftBevel);
        
        // Return opening info for positioning the image
        return {
            centerX: x + width / 2,
            centerY: y + height / 2,
            radius: Math.min(width, height) / 2,
            radiusX: width / 2,
            radiusY: height / 2
        };
    }


function drawSpecialShapeOpening(shape, matGroup, x, y, width, height, coreColor, bevelWidth) {
    // We only support 'oval' shape for non-rectangular openings
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Determine if this should be a perfect circle (square image)
    const isSquare = Math.abs(width - height) < 0.001; // Allow tiny differences
    
    // Set radiusX and radiusY
    let radiusX = width / 2;
    let radiusY = height / 2;
    
    // If it's approximately square, make it a perfect circle
    if (isSquare) {
        radiusX = radiusY = Math.min(radiusX, radiusY);
    }
    
    // First create a transparent ellipse that will be the opening
    const ovalOpening = new Konva.Ellipse({
        x: centerX,
        y: centerY,
        radiusX: radiusX,
        radiusY: radiusY,
        fill: 'black',
        globalCompositeOperation: 'destination-out'
    });
    
    // Add to mat group to create the opening
    matGroup.add(ovalOpening);
    
    // Add bevel effect with stroke
    const bevelEllipse = new Konva.Ellipse({
        x: centerX,
        y: centerY,
        radiusX: radiusX,
        radiusY: radiusY,
        stroke: coreColor,
        strokeWidth: bevelWidth,
        fill: null
    });
    
    // Add to group
    matGroup.add(bevelEllipse);
    
    return {
        centerX: centerX,
        centerY: centerY,
        radius: Math.min(radiusX, radiusY), // For backward compatibility
        radiusX: radiusX,
        radiusY: radiusY,
        isCircle: isSquare // Flag to indicate if this is a perfect circle
    };
}



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
            name: "Silver Lavo", 
            src: "/wp-content/uploads/frame-textures/lavo-frame.jpg", 
            width: 2.375
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
            width: 2.375,
            texture: "cherry" // Reference to frameTextures key
        },
        "blue-2": { 
            color: "blue", 
            width: 2,
            texture: "gold-ornate" // Reference to frameTextures key
        }
    };

// end of pt 2

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

// end of pt 3

// Updated updateMockup function that uses textures and special shaped mats
	
let isUpdating = false;

async function updateMockup(printWidth, printHeight, matWidth, matColor, mouldingKey) {
    if (isUpdating) return; // Prevent re-entry
    isUpdating = true;

    console.log("Update mockup called with:", { printWidth, printHeight, matWidth, matColor, mouldingKey });

    setTimeout(() => { isUpdating = false; }, 500); // Allow updates after 500ms


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
		scaleFactor = Math.min(widthScale, heightScale, 1); // Don't scale up, set global scaleFactor
		
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

        // Use the special shaped mat function
        const matOpeningInfo = drawSpecialShapedMat(
            framePosition.startX + scaledFrameWidth,
            framePosition.startY + scaledFrameWidth,
            scaledImageWidth + (2 * scaledMatWidth),
            scaledImageHeight + (2 * scaledMatWidth),
            scaledImageWidth,
            scaledImageHeight,
            matColor,
            matCoreSettings.coreColor,
            matCoreSettings.bevelWidth * scaleFactor
        );
        
        // Create image based on mat position and opening shape
        const imageObj = new Image();
        imageObj.src = uploadedImageObj.src;

// Replace this section in your updateMockup function:
// The error is likely in this section of code where we're trying to reassign matOpeningInfo
// Let's fix the imageObj.onload function in updateMockup to avoid reassigning the constant

imageObj.onload = function() {
    console.log("Image loaded, fixing display issues");
    
    // Clear any existing image
    if (uploadedImage) {
        uploadedImage.destroy();
    }
    
    // Position image based on opening shape and whitespace option
    let displayWidth, displayHeight, imageX, imageY;
    
    // Get original image aspect ratio
    const imgAspectRatio = imageObj.width / imageObj.height;
    
    // Calculate the proper dimensions for the image
    if (whitespaceEnabled) {
        const whitespaceWidthPx = whitespaceSize * dpi * scaleFactor;
        
        if (openingShape === 'oval') {
            // For oval opening with whitespace
            const radiusX = matOpeningInfo.radiusX - whitespaceWidthPx;
            const radiusY = matOpeningInfo.radiusY - whitespaceWidthPx;
            
            // Scale the image to fit inside the oval while maintaining aspect ratio
            const ovalAspectRatio = radiusX / radiusY;
            
            if (imgAspectRatio > ovalAspectRatio) {
                // Image is wider relative to the oval
                displayWidth = radiusX * 2;
                displayHeight = displayWidth / imgAspectRatio;
            } else {
                // Image is taller relative to the oval
                displayHeight = radiusY * 2;
                displayWidth = displayHeight * imgAspectRatio;
            }
            
            // Center the image in the oval
            imageX = matOpeningInfo.centerX - (displayWidth / 2);
            imageY = matOpeningInfo.centerY - (displayHeight / 2);
        } else {
            // For rectangular opening with whitespace
            displayWidth = scaledImageWidth - (2 * whitespaceWidthPx);
            displayHeight = scaledImageHeight - (2 * whitespaceWidthPx);
            imageX = matOpeningInfo.openingX + whitespaceWidthPx;
            imageY = matOpeningInfo.openingY + whitespaceWidthPx;
        }
    } else {
        // No whitespace
        if (openingShape === 'oval') {
            // For oval opening
            const radiusX = matOpeningInfo.radiusX;
            const radiusY = matOpeningInfo.radiusY;
            
            // Scale the image to fit inside the oval while maintaining aspect ratio
            const ovalAspectRatio = radiusX / radiusY;
            
            if (imgAspectRatio > ovalAspectRatio) {
                // Image is wider relative to the oval
                displayWidth = radiusX * 2;
                displayHeight = displayWidth / imgAspectRatio;
            } else {
                // Image is taller relative to the oval
                displayHeight = radiusY * 2;
                displayWidth = displayHeight * imgAspectRatio;
            }
            
            // Center the image in the oval
            imageX = matOpeningInfo.centerX - (displayWidth / 2);
            imageY = matOpeningInfo.centerY - (displayHeight / 2);
        } else {
            // For rectangular opening
            displayWidth = scaledImageWidth;
            displayHeight = scaledImageHeight;
            imageX = matOpeningInfo.openingX;
            imageY = matOpeningInfo.openingY;
        }
    }
    
    console.log("Creating image with dimensions:", {
        x: imageX,
        y: imageY,
        width: displayWidth,
        height: displayHeight
    });
    
    // Create the image
    uploadedImage = new Konva.Image({
        image: imageObj,
        x: imageX,
        y: imageY,
        width: displayWidth,
        height: displayHeight,
        draggable: true
    });
    
    // Add to layer
    layer.add(uploadedImage);
    
    // CRITICAL: Ensure proper z-index
    // The image must be behind the mat but above the frame
    uploadedImage.moveToBottom();
    
    // Ensure frame is at the very bottom
    if (frameRects && frameRects.length) {
        frameRects.forEach(rect => {
            rect.moveToBottom();
        });
    }
    
    // Now position the image above the frame but below the mat
    uploadedImage.moveUp();
    
    // Draw the layer to ensure everything is rendered correctly
    layer.draw();
    
    console.log("Image positioned correctly below mat with proper z-index");
};

    // Pricing calculation system
    let pricingData = {
        // Base prices for different print types (per square inch)
        basePrices: {
            framed: 0.35,    // Base price for framed prints
            canvas: 0.30,    // Base price for canvas gallery wraps
            acrylic: 0.45,   // Base price for acrylic face mounts
            paper: 0.20      // Base price for paper prints only
        },
        
        // Mat pricing (per linear inch of perimeter)
        matPricing: {
            standard: 0.20,          // Standard single mat
            secondMat: 0.25,         // Additional for second mat
            vgroove: 0.30            // Additional for v-groove
        },
        
        // Frame moulding pricing (per linear inch)
        framePricing: {
            "black-1": 0.80,         // Black 1" frame
            "brown-1.5": 1.20,       // Cherry 1.5" frame
            "blue-2": 1.80           // Gold ornate 2" frame
        },
        
        // Glass pricing (flat fee based on total square inches)
        glassPricing: {
            regular: 0.08,           // Regular glass per square inch
            "reflection-control": 0.12  // Reflection control glass per square inch
        },
        
        // Paper type pricing (per square inch)
        paperPricing: {
            matte: 0.05,             // Matte photo paper
            glossy: 0.06,            // Glossy photo paper
            cotton: 0.10,            // 100% cotton rag paper
            baryta: 0.12             // Baryta fiber paper
        },
        
        // Additional fees
        additionalFees: {
            multipleOpenings: 15.00, // Additional fee for multiple openings
            circularOpening: 10.00,  // Additional fee for circular/oval opening
            handling: 5.00           // Base handling fee
        }
    };

    // Function to calculate total price
    function calculatePrice() {
        const printWidthInput = document.getElementById('printWidth');
        const printHeightInput = document.getElementById('printHeight');
        const matWidthInput = document.getElementById('matWidth');
        const printTypeSelect = document.getElementById('printType');
        const matColorSelect = document.getElementById('matColor');
        const mouldingProfileSelect = document.getElementById('mouldingProfile');
        const glassTypeSelect = document.getElementById('glassType');
        const openingShapeSelect = document.getElementById('openingShape');
        const paperTypeSelect = document.getElementById('paperType');
        
        // Ensure we have the required elements
        if (!printWidthInput || !printHeightInput) {
            return 0;
        }
        
        // Get base dimensions
        const printWidth = parseFloat(printWidthInput.value);
        const printHeight = parseFloat(printHeightInput.value);
        const printSqInches = printWidth * printHeight;
        
        // Get print type
        const printType = printTypeSelect ? printTypeSelect.value : 'framed';
        
        // Start with base price calculation
        let totalPrice = printSqInches * pricingData.basePrices[printType];
        
        // For framed prints, add frame, mat, and glass costs
        if (printType === 'framed') {
            // Get mat dimensions
            const matWidth = matWidthInput ? parseFloat(matWidthInput.value) : 0;
            
            // Calculate outside mat dimensions
            const matOutsideWidth = printWidth + (2 * matWidth);
            const matOutsideHeight = printHeight + (2 * matWidth);
            
            // Calculate mat perimeter (linear inches)
            const matPerimeter = 2 * (matOutsideWidth + matOutsideHeight);
            
            // Add mat price
            totalPrice += matPerimeter * pricingData.matPricing.standard;
            
            // Add price for second mat if enabled
            if (secondMatEnabled) {
                totalPrice += matPerimeter * pricingData.matPricing.secondMat;
            }
            
            // Add price for v-groove if enabled
            if (vGrooveEnabled) {
                // Estimate v-groove perimeter (typically slightly smaller than mat perimeter)
                const vGrooveDistanceValue = parseFloat(document.getElementById('vGrooveDistance').value);
                const vGroovePerimeter = 2 * ((printWidth + (2 * (matWidth - vGrooveDistanceValue))) + 
                                           (printHeight + (2 * (matWidth - vGrooveDistanceValue))));
                
                totalPrice += vGroovePerimeter * pricingData.matPricing.vgroove;
            }
            
            // Get frame moulding
            const mouldingKey = mouldingProfileSelect ? mouldingProfileSelect.value : 'black-1';
            const mouldingData = mouldingProfiles[mouldingKey];
            
            if (mouldingData) {
                // Calculate frame dimensions
                const frameOutsideWidth = matOutsideWidth + (2 * mouldingData.width);
                const frameOutsideHeight = matOutsideHeight + (2 * mouldingData.width);
                
                // Calculate frame perimeter (linear inches)
                const framePerimeter = 2 * (frameOutsideWidth + frameOutsideHeight);
                
                // Add frame price
                totalPrice += framePerimeter * pricingData.framePricing[mouldingKey];
                
                // Calculate glass size
                const glassSqInches = matOutsideWidth * matOutsideHeight;
                
                // Add glass price
                const glassType = glassTypeSelect ? glassTypeSelect.value : 'regular';
                totalPrice += glassSqInches * pricingData.glassPricing[glassType];
            }
            
            // Additional fee for circular/oval opening
            const openingShape = openingShapeSelect ? openingShapeSelect.value : 'rectangle';
            if (openingShape === 'circle' || openingShape === 'oval') {
                totalPrice += pricingData.additionalFees.circularOpening;
            }
            
            // Additional fee for multiple openings
            if (multipleOpeningsEnabled) {
                totalPrice += pricingData.additionalFees.multipleOpenings;
            }
        } 
        // For paper prints, add paper type cost
        else if (printType === 'paper' && paperTypeSelect) {
            const paperType = paperTypeSelect.value;
            totalPrice += printSqInches * pricingData.paperPricing[paperType];
        }
        
        // Add handling fee
        totalPrice += pricingData.additionalFees.handling;
        
        // Return rounded price with 2 decimal places
        return Math.round(totalPrice * 100) / 100;
    }

    // Update price display
    function updatePriceDisplay() {
        const totalPriceElement = document.getElementById('totalPrice');
        
        if (totalPriceElement) {
            const price = calculatePrice();
            totalPriceElement.textContent = `$${price.toFixed(2)}`;
        }
    }
	
// end of pt 4

// Function to initialize UI toggle handlers
    function initializeUIToggles() {
        // Handle secondary mat toggle
        const enableSecondMatCheckbox = document.getElementById('enableSecondMat');
        const secondaryMatOptions = document.querySelector('.secondary-mat-options');
        
        if (enableSecondMatCheckbox && secondaryMatOptions) {
            enableSecondMatCheckbox.addEventListener('change', function() {
                secondaryMatOptions.style.display = this.checked ? 'block' : 'none';
                secondMatEnabled = this.checked;
                triggerUpdate();
            });
        }
        
        // Handle whitespace toggle
        const enableWhitespaceCheckbox = document.getElementById('enableWhitespace');
        const whitespaceOptions = document.querySelector('.whitespace-options');
        
        if (enableWhitespaceCheckbox && whitespaceOptions) {
            enableWhitespaceCheckbox.addEventListener('change', function() {
                whitespaceOptions.style.display = this.checked ? 'block' : 'none';
                whitespaceEnabled = this.checked;
                triggerUpdate();
            });
        }
        
        // Handle v-groove toggle
        const enableVGrooveCheckbox = document.getElementById('enableVGroove');
        const vgrooveOptions = document.querySelector('.vgroove-options');
        
        if (enableVGrooveCheckbox && vgrooveOptions) {
            enableVGrooveCheckbox.addEventListener('change', function() {
                vgrooveOptions.style.display = this.checked ? 'block' : 'none';
                vGrooveEnabled = this.checked;
                triggerUpdate();
            });
        }
        
        // Handle multiple openings toggle
        const enableMultipleOpeningsCheckbox = document.getElementById('enableMultipleOpenings');
        const multipleOpeningsOptions = document.querySelector('.multiple-openings-options');
        
        if (enableMultipleOpeningsCheckbox && multipleOpeningsOptions) {
            enableMultipleOpeningsCheckbox.addEventListener('change', function() {
                multipleOpeningsOptions.style.display = this.checked ? 'block' : 'none';
                multipleOpeningsEnabled = this.checked;
                triggerUpdate();
            });
        }
        
        // Handle print type selection
        const printTypeSelect = document.getElementById('printType');
        const paperOptions = document.querySelector('.paper-options');
        const frameOptions = document.getElementById('frameOptionsSection');
        const matOptions = document.getElementById('matOptionsSection');
        const glassOptions = document.getElementById('glassOptionsSection');
        
        if (printTypeSelect && paperOptions && frameOptions && matOptions && glassOptions) {
            printTypeSelect.addEventListener('change', function() {
                const selectedType = this.value;
                
                // Show/hide options based on print type
                if (selectedType === 'paper') {
                    paperOptions.style.display = 'block';
                    frameOptions.style.display = 'none';
                    matOptions.style.display = 'none';
                    glassOptions.style.display = 'none';
                } else if (selectedType === 'framed') {
                    paperOptions.style.display = 'none';
                    frameOptions.style.display = 'block';
                    matOptions.style.display = 'block';
                    glassOptions.style.display = 'block';
                } else {
                    // Canvas or acrylic
                    paperOptions.style.display = 'none';
                    frameOptions.style.display = 'none';
                    matOptions.style.display = 'none';
                    glassOptions.style.display = 'none';
                }
                
                updatePriceDisplay();
            });
        }
        
        // Handle opening shape changes
        const openingShapeSelect = document.getElementById('openingShape');
        
        if (openingShapeSelect) {
            openingShapeSelect.addEventListener('change', function() {
                openingShape = this.value;
                triggerUpdate();
            });
        }
    }

    // Function to update secondary mat options
    function updateSecondaryMatOptions() {
        const secondMatColorSelect = document.getElementById('secondMatColor');
        const revealSizeSelect = document.getElementById('revealSize');
        
        if (secondMatColorSelect) {
            secondMatColorSelect.addEventListener('change', function() {
                secondMatColor = this.value;
                triggerUpdate();
            });
        }
        
        if (revealSizeSelect) {
            revealSizeSelect.addEventListener('change', function() {
                revealSize = parseFloat(this.value);
                triggerUpdate();
            });
        }
    }

    // Function to update whitespace options
    function updateWhitespaceOptions() {
        const whitespaceSizeSelect = document.getElementById('whitespaceSize');
        
        if (whitespaceSizeSelect) {
            whitespaceSizeSelect.addEventListener('change', function() {
                whitespaceSize = parseFloat(this.value);
                triggerUpdate();
            });
        }
    }

    // Function to update v-groove options
    function updateVGrooveOptions() {
        const vGrooveDistanceSelect = document.getElementById('vGrooveDistance');
        
        if (vGrooveDistanceSelect) {
            vGrooveDistanceSelect.addEventListener('change', function() {
                vGrooveDistance = parseFloat(this.value);
                triggerUpdate();
            });
        }
    }

    // Function to update multiple openings options
    function updateMultipleOpeningsOptions() {
        const plaqueWidthInput = document.getElementById('plaqueWidth');
        const plaqueHeightInput = document.getElementById('plaqueHeight');
        const plaquePositionSelect = document.getElementById('plaquePosition');
        const plaqueSpacingInput = document.getElementById('plaqueSpacing');
        
        if (plaqueWidthInput) {
            plaqueWidthInput.addEventListener('input', function() {
                plaqueWidth = parseFloat(this.value);
                triggerUpdate();
            });
        }
        
        if (plaqueHeightInput) {
            plaqueHeightInput.addEventListener('input', function() {
                plaqueHeight = parseFloat(this.value);
                triggerUpdate();
            });
        }
        
        if (plaquePositionSelect) {
            plaquePositionSelect.addEventListener('change', function() {
                plaquePosition = this.value;
                triggerUpdate();
            });
        }
        
        if (plaqueSpacingInput) {
            plaqueSpacingInput.addEventListener('input', function() {
                plaqueSpacing = parseFloat(this.value);
                triggerUpdate();
            });
        }
    }

    // Download mockup functionality
    function setupDownloadButton() {
        const downloadButton = document.getElementById('downloadMockup');
        
        if (downloadButton) {
            downloadButton.addEventListener('click', function() {
                // Create a temporary link element
                const link = document.createElement('a');
                
                // Convert stage to data URL
                const dataURL = stage.toDataURL({ pixelRatio: 2 });
                
                // Set download attributes
                link.href = dataURL;
                link.download = 'custom-frame-mockup.png';
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    }

// end of pt 5a

// Wall preview functionality
    function setupWallViewButton() {
        const wallViewButton = document.getElementById('shareWall');
        
        if (wallViewButton) {
            wallViewButton.addEventListener('click', function() {
                // Create wall view modal
                const modal = document.createElement('div');
                modal.className = 'wall-view-modal';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
                modal.style.zIndex = '1000';
                modal.style.display = 'flex';
                modal.style.flexDirection = 'column';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                
                // Add close button
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '20px';
                closeButton.style.right = '20px';
                closeButton.style.padding = '8px 16px';
                closeButton.style.cursor = 'pointer';
                closeButton.style.zIndex = '1001';
                closeButton.addEventListener('click', function() {
                    document.body.removeChild(modal);
                });
                
                // Add wall selection
                const wallSelector = document.createElement('div');
                wallSelector.style.display = 'flex';
                wallSelector.style.gap = '10px';
                wallSelector.style.marginBottom = '10px';
                
                // Wall options (placeholders for now)
                const wallOptions = [
                    { name: 'Living Room', src: '/wp-content/uploads/walls/living-room.jpg' },
                    { name: 'Office', src: '/wp-content/uploads/walls/office.jpg' },
                    { name: 'Dining Room', src: '/wp-content/uploads/walls/dining-room.jpg' }
                ];
                
                // Add wall option buttons
                wallOptions.forEach(wall => {
                    const wallButton = document.createElement('button');
                    wallButton.textContent = wall.name;
                    wallButton.style.padding = '8px 16px';
                    wallButton.style.cursor = 'pointer';
                    wallButton.addEventListener('click', function() {
                        wallDisplay.style.backgroundImage = `url(${wall.src})`;
                    });
                    wallSelector.appendChild(wallButton);
                });
                
                // Create wall display area
                const wallDisplay = document.createElement('div');
                wallDisplay.style.width = '80%';
                wallDisplay.style.height = '70%';
                wallDisplay.style.backgroundColor = '#f5f5f5';
                wallDisplay.style.backgroundImage = `url(${wallOptions[0].src})`;
                wallDisplay.style.backgroundSize = 'cover';
                wallDisplay.style.backgroundPosition = 'center';
                wallDisplay.style.position = 'relative';
                
                // Create frame display (clone of our stage)
                const frameDisplay = document.createElement('div');
                frameDisplay.style.position = 'absolute';
                frameDisplay.style.left = '50%';
                frameDisplay.style.top = '50%';
                frameDisplay.style.transform = 'translate(-50%, -50%)';
                frameDisplay.style.cursor = 'move';
                frameDisplay.style.userSelect = 'none';
                
                // Convert stage to image
                const frameImage = new Image();
                frameImage.src = stage.toDataURL({ pixelRatio: 1 });
                frameImage.style.width = '200px'; // Default size
                frameImage.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                
                // Add resize controls
                const sizeControl = document.createElement('div');
                sizeControl.style.marginTop = '20px';
                sizeControl.style.display = 'flex';
                sizeControl.style.alignItems = 'center';
                sizeControl.style.gap = '10px';
                
                const sizeLabel = document.createElement('label');
                sizeLabel.textContent = 'Size on Wall:';
                sizeLabel.style.color = 'white';
                
                const sizeSlider = document.createElement('input');
                sizeSlider.type = 'range';
                sizeSlider.min = '100';
                sizeSlider.max = '600';
                sizeSlider.value = '200';
                sizeSlider.addEventListener('input', function() {
                    frameImage.style.width = `${this.value}px`;
                });
                
                sizeControl.appendChild(sizeLabel);
                sizeControl.appendChild(sizeSlider);
                
                // Make frame draggable
                let isDragging = false;
                let dragOffsetX = 0;
                let dragOffsetY = 0;
                
                frameDisplay.addEventListener('mousedown', function(e) {
                    isDragging = true;
                    const frameRect = frameDisplay.getBoundingClientRect();
                    dragOffsetX = e.clientX - frameRect.left;
                    dragOffsetY = e.clientY - frameRect.top;
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (isDragging) {
                        const x = e.clientX - dragOffsetX;
                        const y = e.clientY - dragOffsetY;
                        frameDisplay.style.left = `${x}px`;
                        frameDisplay.style.top = `${y}px`;
                        frameDisplay.style.transform = 'none';
                    }
                });
                
                document.addEventListener('mouseup', function() {
                    isDragging = false;
                });
                
                // Assemble elements
                frameDisplay.appendChild(frameImage);
                wallDisplay.appendChild(frameDisplay);
                
                modal.appendChild(closeButton);
                modal.appendChild(wallSelector);
                modal.appendChild(wallDisplay);
                modal.appendChild(sizeControl);
                
                // Add to document body
                document.body.appendChild(modal);
            });
        }
    }

// end of pt 5b	

// Function to set up share buttons
    function setupShareButtons() {
        const shareButton = document.getElementById('shareButtons');
        
        if (shareButton) {
            shareButton.addEventListener('click', function() {
                // Generate image to share
                const shareImage = stage.toDataURL({ pixelRatio: 2 });
                
                // Create share modal
                const modal = document.createElement('div');
                modal.className = 'share-modal';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
                modal.style.zIndex = '1000';
                modal.style.display = 'flex';
                modal.style.flexDirection = 'column';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                
                // Add close button
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '20px';
                closeButton.style.right = '20px';
                closeButton.style.padding = '8px 16px';
                closeButton.style.cursor = 'pointer';
                closeButton.addEventListener('click', function() {
                    document.body.removeChild(modal);
                });
                
                // Create share container
                const shareContainer = document.createElement('div');
                shareContainer.style.backgroundColor = 'white';
                shareContainer.style.padding = '30px';
                shareContainer.style.borderRadius = '8px';
                shareContainer.style.maxWidth = '500px';
                shareContainer.style.width = '90%';
                shareContainer.style.textAlign = 'center';
                
                // Display image
                const imagePreview = document.createElement('img');
                imagePreview.src = shareImage;
                imagePreview.style.maxWidth = '100%';
                imagePreview.style.marginBottom = '20px';
                imagePreview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                
                // Share options
                const shareOptions = document.createElement('div');
                shareOptions.style.display = 'flex';
                shareOptions.style.justifyContent = 'center';
                shareOptions.style.gap = '15px';
                shareOptions.style.flexWrap = 'wrap';
                
                // Share button creator
                function createShareButton(name, icon, action) {
                    const button = document.createElement('button');
                    button.textContent = name;
                    button.style.padding = '10px 15px';
                    button.style.cursor = 'pointer';
                    button.style.display = 'flex';
                    button.style.alignItems = 'center';
                    button.style.gap = '5px';
                    button.style.borderRadius = '4px';
                    button.style.backgroundColor = '#f5f5f5';
                    button.style.border = '1px solid #ddd';
                    
                    // Add icon if provided
                    if (icon) {
                        const iconElement = document.createElement('span');
                        iconElement.textContent = icon;
                        button.prepend(iconElement);
                    }
                    
                    button.addEventListener('click', action);
                    return button;
                }
                
                // Add share buttons (functionality would need to be connected to actual APIs)
                shareOptions.appendChild(createShareButton('Facebook', '📘', function() {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
                }));
                
                shareOptions.appendChild(createShareButton('Instagram', '📸', function() {
                    alert('To share on Instagram, download the image and upload it to the Instagram app.');
                }));
                
                shareOptions.appendChild(createShareButton('Pinterest', '📌', function() {
                    window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(shareImage)}&description=My custom frame design`, '_blank');
                }));
                
                shareOptions.appendChild(createShareButton('Email', '✉️', function() {
                    window.location.href = `mailto:?subject=Check out my custom frame design&body=I created this custom frame design: ${encodeURIComponent(window.location.href)}`;
                }));
                
                shareOptions.appendChild(createShareButton('Download', '⬇️', function() {
                    const link = document.createElement('a');
                    link.href = shareImage;
                    link.download = 'custom-frame-design.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }));
                
                // Assemble elements
                shareContainer.appendChild(imagePreview);
                shareContainer.appendChild(shareOptions);
                
                modal.appendChild(closeButton);
                modal.appendChild(shareContainer);
                
                // Add to document body
                document.body.appendChild(modal);
            });
        }
    }

    // Function to collect frame data for WooCommerce cart
    function collectFrameData() {
        // Basic print info
        const printWidth = parseFloat(document.getElementById('printWidth').value);
        const printHeight = parseFloat(document.getElementById('printHeight').value);
        const printType = document.getElementById('printType') ? document.getElementById('printType').value : 'framed';
        
        // Create data object
        const frameData = {
            printType: printType,
            printWidth: printWidth,
            printHeight: printHeight,
            price: calculatePrice()
        };
        
        // Add print type specific data
        if (printType === 'framed') {
            // Mat data
            frameData.matWidth = parseFloat(document.getElementById('matWidth').value);
            frameData.matColor = document.getElementById('matColor').value;
            frameData.openingShape = document.getElementById('openingShape').value;
            
            // Second mat data if enabled
            if (secondMatEnabled) {
                frameData.secondMatEnabled = true;
                frameData.secondMatColor = document.getElementById('secondMatColor').value;
                frameData.revealSize = parseFloat(document.getElementById('revealSize').value);
            }
            
            // Whitespace data if enabled
            if (whitespaceEnabled) {
                frameData.whitespaceEnabled = true;
                frameData.whitespaceSize = parseFloat(document.getElementById('whitespaceSize').value);
            }
            
            // V-groove data if enabled
            if (vGrooveEnabled) {
                frameData.vGrooveEnabled = true;
                frameData.vGrooveDistance = parseFloat(document.getElementById('vGrooveDistance').value);
            }
            
            // Multiple openings data if enabled
            if (multipleOpeningsEnabled) {
                frameData.multipleOpeningsEnabled = true;
                frameData.plaqueWidth = parseFloat(document.getElementById('plaqueWidth').value);
                frameData.plaqueHeight = parseFloat(document.getElementById('plaqueHeight').value);
                frameData.plaquePosition = document.getElementById('plaquePosition').value;
                frameData.plaqueSpacing = parseFloat(document.getElementById('plaqueSpacing').value);
            }
            
            // Frame data
            frameData.mouldingProfile = document.getElementById('mouldingProfile').value;
            
            // Glass data
            frameData.glassType = document.getElementById('glassType').value;
        } 
        // Paper specific options
        else if (printType === 'paper') {
            frameData.paperType = document.getElementById('paperType').value;
        }
        
        return frameData;
    }

    // Setup Add to Cart functionality
    function setupAddToCartButton() {
        const addToCartButton = document.getElementById('addToCart');
        
        if (addToCartButton) {
            addToCartButton.addEventListener('click', function() {
                // Collect all frame design data
                const frameData = collectFrameData();
                
                // Convert design to preview image
                const previewImage = stage.toDataURL({ pixelRatio: 1 });
                
                // Create form to submit data to WooCommerce
                const form = document.createElement('form');
                form.method = 'post';
                form.action = ''; // Set to current page or cart page
                form.style.display = 'none';
                
                // Add WooCommerce product ID
                const productId = getProductIdForSelection(frameData.printType);
                addFormField(form, 'add-to-cart', productId);
                
                // Add quantity
                addFormField(form, 'quantity', '1');
                
                // Add all frame design options as custom fields
                Object.keys(frameData).forEach(key => {
                    addFormField(form, `custom_data[${key}]`, frameData[key]);
                });
                
                // Add preview image as custom field
                addFormField(form, 'custom_data[preview_image]', previewImage);
                
                // Add to document and submit
                document.body.appendChild(form);
                form.submit();
            });
        }
    }

    // Helper function to add form fields
    function addFormField(form, name, value) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }

    // Helper function to get the appropriate product ID for the selected print type
    function getProductIdForSelection(printType) {
        switch (printType) {
            case 'framed':
                return '1001'; // Product ID for custom framed prints
            case 'canvas':
                return '1002'; // Product ID for canvas gallery wraps
            case 'acrylic':
                return '1003'; // Product ID for acrylic face mounts
            case 'paper':
                return '1004'; // Product ID for fine art paper prints
            default:
                return '1001';
        }
    }


		
let lastState = {};
const triggerUpdate = debounce(function() {
    const printWidth = parseFloat(document.getElementById('printWidth').value);
    const printHeight = parseFloat(document.getElementById('printHeight').value);
    const matWidth = parseFloat(document.getElementById('matWidth').value);
    const matColor = document.getElementById('matColor').value;
    const mouldingProfile = document.getElementById('mouldingProfile').value;

    const newState = { printWidth, printHeight, matWidth, matColor, mouldingProfile };

    if (JSON.stringify(lastState) === JSON.stringify(newState)) {
        return;  // Skip update if nothing changed
    }

    lastState = newState;
    updateMockup(printWidth, printHeight, matWidth, matColor, mouldingProfile);
    updatePriceDisplay();
}, 300);

			const printWidthInput = document.getElementById('printWidth');
			const printHeightInput = document.getElementById('printHeight');
			const matWidthInput = document.getElementById('matWidth');
			const matColorInput = document.getElementById('matColor');
			const mouldingProfileInput = document.getElementById('mouldingProfile');
			
			if (printWidthInput && printHeightInput && matWidthInput && 
				matColorInput && mouldingProfileInput) {
				
				// Add a console log to debug the update flow
				console.log("Triggering update with debounce");
				
				updateMockup(
					parseFloat(printWidthInput.value),
					parseFloat(printHeightInput.value),
					parseFloat(matWidthInput.value),
					matColorInput.value,
					mouldingProfileInput.value
				);
				
				// Update price after mockup is updated
				updatePriceDisplay();
			}
//		}, 300); // 300ms debounce time  - removed, redundant - gives error

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
        
        // Initialize UI toggles for enhanced options
        initializeUIToggles();
        updateSecondaryMatOptions();
        updateWhitespaceOptions();
        updateVGrooveOptions();
        updateMultipleOpeningsOptions();
        
        // Setup additional functionality
        setupDownloadButton();
        setupWallViewButton();
        setupShareButtons();
        setupAddToCartButton();
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
	}
});

