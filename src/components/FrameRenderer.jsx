import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Group, Image as KonvaImage, Rect } from 'konva';

// Error boundary for the FrameRenderer component
class FrameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FrameRenderer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '0.375rem',
          color: '#991b1b',
          margin: '1rem 0'
        }}>
          <h3 style={{ marginTop: 0 }}>Frame Rendering Error</h3>
          <p>{this.state.error?.message || 'An unknown error occurred'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Debug helper to log component lifecycle
const useDebug = (componentName) => {
  useEffect(() => {
    console.log(`[${componentName}] Mounted`);
    return () => console.log(`[${componentName}] Unmounted`);
  }, [componentName]);

  const log = useCallback((...args) => {
    console.log(`[${componentName}]`, ...args);
  }, [componentName]);

  return { log };
};

const FrameRenderer = (props) => {
  // Destructure with defaults
  const {
    width = 800,
    height = 600,
    frameTexture = 'assets/textures/walnut-frame.png',
    matWidth = 2,
    hasMat = true,
    matColor = '#FFFFFF',
    children
  } = props;
  
  // Log props for debugging
  useEffect(() => {
    console.log('FrameRenderer props:', {
      width: { value: props.width, type: typeof props.width },
      height: { value: props.height, type: typeof props.height },
      frameTexture: { value: props.frameTexture, type: typeof props.frameTexture },
      matWidth: { value: props.matWidth, type: typeof props.matWidth },
      hasMat: { value: props.hasMat, type: typeof props.hasMat },
      matColor: { value: props.matColor, type: typeof props.matColor },
      children: { hasChildren: Boolean(props.children) }
    });
  }, [props]);
  const { log } = useDebug('FrameRenderer');
  const groupRef = useRef(null);
  const [frameImage, setFrameImage] = useState(null);
  const [cornerImage, setCornerImage] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Helper to get correct asset URL
  const getAssetUrl = useCallback((path) => {
    if (!path) {
      log('Warning: Empty path provided to getAssetUrl');
      return '';
    }
    
    // In development, Vite serves files from the root
    // In production, the path will be relative to the built files
    const baseUrl = import.meta.env.DEV ? '/' : '';
    const url = `${baseUrl}${path}`.replace(/\/+/g, '/'); // Normalize slashes
    log('Resolved asset URL:', { original: path, resolved: url });
    return url;
  }, [log]);

  // Load frame texture and corner image
  useEffect(() => {
    if (!isMounted) {
      log('Skipping texture load - component not mounted');
      return;
    }

    log('Starting texture loading', { frameTexture, hasMat, matWidth, matColor });
    setLoadError(null);
    
    const loadImage = async (src, setImage, type = 'frame') => {
      if (!src) {
        log(`Skipping ${type} image load - no source provided`);
        return null;
      }

      const fullUrl = getAssetUrl(src);
      log(`Loading ${type} image:`, { src, fullUrl });
      
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
          log(`Successfully loaded ${type} image:`, { 
            src, 
            width: img.width, 
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
            currentSrc: img.currentSrc
          });
          setImage(img);
          resolve(img);
        };
        
        img.onerror = (e) => {
          const errorMsg = `Failed to load ${type} image: ${src}`;
          console.error(errorMsg, { 
            src, 
            fullUrl,
            error: e.toString(),
            errorEvent: e
          });
          setLoadError(prev => ({
            ...prev,
            [type]: errorMsg
          }));
          resolve(null);
        };
        
        // Set src last to ensure event handlers are registered
        img.src = fullUrl;
        log(`Set image source for ${type}:`, fullUrl);
      });
    };

    // Load textures in parallel
    const loadTextures = async () => {
      try {
        // Load frame texture
        await loadImage(frameTexture, setFrameImage, 'frame');
        
        // Load corner texture (try with -corner suffix)
        let cornerSrc = frameTexture;
        if (!frameTexture.includes('-corner.')) {
          cornerSrc = frameTexture.replace(/\.(\w+)$/, '-corner.$1');
          log('Generated corner texture path:', cornerSrc);
        }
        
        await loadImage(cornerSrc, setCornerImage, 'corner');
        
        log('All textures loaded successfully');
      } catch (error) {
        console.error('Error loading textures:', error);
        setLoadError(prev => ({
          ...prev,
          global: 'Failed to load textures: ' + error.message
        }));
      }
    };

    loadTextures();

    return () => {
      log('Cleaning up FrameRenderer');
      // Cleanup is handled by garbage collection
    };
  }, [frameTexture, isMounted, getAssetUrl, log, hasMat, matWidth, matColor]);

  // Calculate frame dimensions
  const getFrameDimensions = useCallback(() => {
    const frameDepth = 2; // Depth of the frame in inches
    const dpr = window.devicePixelRatio || 1;
    const frameWidth = width * dpr;
    const frameHeight = height * dpr;
    const frameSize = frameDepth * 10 * dpr; // Convert inches to pixels
    const innerWidth = frameWidth - (frameSize * 2);
    const innerHeight = frameHeight - (frameSize * 2);
    
    return { frameWidth, frameHeight, frameSize, innerWidth, innerHeight, dpr };
  }, [width, height]);

  // Draw frame edges
  const drawEdge = useCallback((group, x, y, edgeWidth, rotation = 0) => {
    if (!frameImage) return null;
    
    const edge = new KonvaImage({
      image: frameImage,
      width: edgeWidth,
      height: 20, // Height of the frame edge
      x,
      y,
      rotation,
      offsetX: rotation === 0 ? 0 : edgeWidth / 2,
      offsetY: 0
    });
    
    group.add(edge);
    return edge;
  }, [frameImage]);

  // Draw corner
  const drawCorner = useCallback((group, x, y, size, rotation = 0) => {
    if (!cornerImage) return null;
    
    const corner = new KonvaImage({
      image: cornerImage,
      width: size,
      height: size,
      x,
      y,
      rotation,
      offsetX: size / 2,
      offsetY: size / 2
    });
    
    group.add(corner);
    return corner;
  }, [cornerImage]);

  // Update frame when dimensions or textures change
  useEffect(() => {
    if (!isMounted || !groupRef.current || !frameImage) return;

    const group = groupRef.current;
    group.destroyChildren();

    const { frameWidth, frameHeight, frameSize, innerWidth, innerHeight } = getFrameDimensions();
    
    // Draw frame edges
    drawEdge(group, frameSize, 0, innerWidth); // Top
    drawEdge(group, frameWidth, frameSize, innerHeight, 90); // Right
    drawEdge(group, frameSize, frameHeight, innerWidth, 180); // Bottom
    drawEdge(group, 0, frameSize, innerHeight, 270); // Left
    
    // Draw corners if we have corner images
    if (cornerImage) {
      drawCorner(group, frameSize, frameSize, frameSize * 2); // Top-left
      drawCorner(group, frameWidth - frameSize, frameSize, frameSize * 2, 90); // Top-right
      drawCorner(group, frameWidth - frameSize, frameHeight - frameSize, frameSize * 2, 180); // Bottom-right
      drawCorner(group, frameSize, frameHeight - frameSize, frameSize * 2, 270); // Bottom-left
    }

    // Draw mat if enabled
    if (hasMat) {
      const mat = new Rect({
        x: frameSize + 10,
        y: frameSize + 10,
        width: innerWidth - 20,
        height: innerHeight - 20,
        fill: matColor,
        stroke: '#ccc',
        strokeWidth: 1
      });
      group.add(mat);
    }

    // Add children if any
    if (children) {
      group.add(children);
    }
    
    // Update layer
    group.getLayer()?.batchDraw();
  }, [frameImage, cornerImage, width, height, hasMat, matColor, matWidth, children, isMounted, getFrameDimensions, drawEdge, drawCorner]);

  return (
    <Group ref={groupRef}>
      {/* Frame and mat are drawn in the effect */}
    </Group>
  );
};

// Wrap the FrameRenderer with the error boundary
const FrameRendererWithBoundary = (props) => (
  <FrameErrorBoundary>
    <FrameRenderer {...props} />
  </FrameErrorBoundary>
);

export default FrameRendererWithBoundary;
