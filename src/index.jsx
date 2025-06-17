import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Stage, Layer, Image as KonvaImage, Group } from 'konva';
import FrameRenderer from '@components/FrameRenderer';
import '../assets/css/style.css';

// Simple error boundary for the FrameRenderer
const FrameRendererBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  const componentDidCatch = (error, errorInfo) => {
    console.error('FrameRendererBoundary caught an error:', error, errorInfo);
    setHasError(true);
    setError(error);
    setErrorInfo(errorInfo);
  };

  if (hasError) {
    return (
      <div style={{ color: 'red', padding: '1rem', border: '1px solid red', margin: '1rem 0' }}>
        <h3>Something went wrong with the frame renderer:</h3>
        <p>{error && error.toString()}</p>
        <details style={{ whiteSpace: 'pre-wrap' }}>
          {errorInfo && errorInfo.componentStack}
        </details>
      </div>
    );
  }

  return children;
};

// Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Frame designer component
function App() {
    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const [frameWidth, setFrameWidth] = useState(12);
    const [frameHeight, setFrameHeight] = useState(16);
    const [matWidth, setMatWidth] = useState(2);
    const [hasMat, setHasMat] = useState(true);
    const [frameTexture, setFrameTexture] = useState('assets/textures/walnut-frame.png');
    const [matColor, setMatColor] = useState('#FFFFFF');
    const [imageNode, setImageNode] = useState(null);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Handle image upload
    const handleImageUpload = useCallback((file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target.result;
            img.onload = () => {
                const konvaImage = new KonvaImage({
                    image: img,
                    offsetX: 0,
                    offsetY: 0
                });
                setImageNode(konvaImage);
                setUploadedImage({
                    src: event.target.result,
                    width: img.width,
                    height: img.height
                });

                // Generate a unique order ID if we don't have one
                let orderId = localStorage.getItem('cfd_order_id');
                if (!orderId) {
                    orderId = 'temp-' + Date.now();
                    localStorage.setItem('cfd_order_id', orderId);
                }

                // Get fresh nonce from the page or use the cached one
                const nonce = window.wpVars?.ajax_nonce || '';
                if (!nonce) {
                    console.error('WordPress nonce not found. Please refresh the page.');
                    alert('Session expired. Please refresh the page and try again.');
                    return;
                }

                // Prepare form data
                const formData = new FormData();
                formData.append('file', file);
                formData.append('action', 'handle_image_upload');
                formData.append('_ajax_nonce', nonce);
                formData.append('order_id', orderId);

                setIsUploading(true);

                // Use the full URL in development, or wpVars.ajaxurl in production
                const apiUrl = import.meta.env.DEV 
                    ? 'https://wp.precisionimaging.ca/wp-admin/admin-ajax.php' 
                    : (window.wpVars?.ajaxurl || '/wp-admin/admin-ajax.php');
                    
                fetch(apiUrl, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin',
                    headers: {
                        'X-WP-Nonce': nonce
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        console.log('Upload successful:', data.data);
                    } else {
                        throw new Error(data.data || 'Upload failed');
                    }
                })
                .catch(error => {
                    console.error('Error uploading image:', error);
                    alert('Error uploading image: ' + (error.message || 'Unknown error'));
                })
                .finally(() => {
                    setIsUploading(false);
                });
            };
        };
        reader.readAsDataURL(file);
    }, []);

    // Handle file input change
    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    }, [handleImageUpload]);

    // Initialize stage and handle window resize
    useEffect(() => {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const updateSize = () => {
            const width = container.offsetWidth;
            const height = 600; // Fixed height with scroll if needed
            
            if (stageRef.current) {
                stageRef.current.width(width);
                stageRef.current.height(height);
                stageRef.current.batchDraw();
            } else {
                stageRef.current = new Stage({
                    container: container,
                    width: width,
                    height: height,
                });
                
                const layer = new Layer();
                stageRef.current.add(layer);
                layer.batchDraw();
            }
        };
        
        updateSize();
        window.addEventListener('resize', updateSize);
        
        return () => {
            window.removeEventListener('resize', updateSize);
            if (stageRef.current) {
                stageRef.current.destroy();
                stageRef.current = null;
            }
        };
    }, []);

    // Set up file input when component mounts
    useEffect(() => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Use existing upload button from WordPress
        const existingUploadButton = document.querySelector('#imageUpload');
        if (existingUploadButton) {
            const handleClick = (e) => {
                e.preventDefault();
                fileInput.click();
            };
            
            existingUploadButton.addEventListener('click', handleClick);
            
            return () => {
                existingUploadButton.removeEventListener('click', handleClick);
                document.body.removeChild(fileInput);
            };
        }
        
        return () => {
            document.body.removeChild(fileInput);
        };
    }, []);

    // Control handlers
    const handleWidthChange = (e) => {
        setFrameWidth(parseFloat(e.target.value) || 12);
    };
    
    const handleHeightChange = (e) => {
        setFrameHeight(parseFloat(e.target.value) || 16);
    };
    
    const handleMatWidthChange = (e) => {
        setMatWidth(parseFloat(e.target.value) || 2);
    };
    
    const handleMatToggle = (e) => {
        setHasMat(e.target.checked);
    };
    
    const handleFrameTextureChange = (e) => {
        setFrameTexture(e.target.value);
    };
    
    const handleMatColorChange = (e) => {
        setMatColor(e.target.value);
    };

    return (
        <div className="frame-designer">
            <div className="frame-preview" ref={containerRef}>
                {stageRef.current && (
                    <FrameRendererBoundary>
                        <FrameRenderer 
                            width={stageRef.current?.width() || 800}
                            height={stageRef.current?.height() || 600}
                            frameTexture={frameTexture}
                            matWidth={matWidth}
                            hasMat={hasMat}
                            matColor={matColor}
                        >
                            {imageNode && imageNode.clone()}
                        </FrameRenderer>
                    </FrameRendererBoundary>
                )}
            </div>
            
            <div className="frame-controls">
                <div className="control-group">
                    <label>Frame Width (in):</label>
                    <input 
                        type="number" 
                        min="4" 
                        max="48" 
                        step="0.5" 
                        value={frameWidth}
                        onChange={handleWidthChange}
                    />
                </div>
                
                <div className="control-group">
                    <label>Frame Height (in):</label>
                    <input 
                        type="number" 
                        min="4" 
                        max="48" 
                        step="0.5" 
                        value={frameHeight}
                        onChange={handleHeightChange}
                    />
                </div>
                
                <div className="control-group">
                    <label>Frame Style:</label>
                    <select 
                        value={frameTexture}
                        onChange={handleFrameTextureChange}
                        className="frame-texture-select"
                    >
                        <option value="assets/textures/walnut-frame.png">Walnut</option>
                        <option value="assets/textures/black-frame.png">Black</option>
                        <option value="assets/textures/cherry-frame.png">Cherry</option>
                        <option value="assets/textures/gold-ornate.png">Gold Ornate</option>
                    </select>
                </div>
                
                <div className="control-group">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={hasMat}
                            onChange={handleMatToggle}
                        />
                        Include Mat
                    </label>
                </div>
                
                {hasMat && (
                    <div className="control-group">
                        <label>Mat Width (in):</label>
                        <input 
                            type="number" 
                            min="0.5" 
                            max="6" 
                            step="0.25" 
                            value={matWidth}
                            onChange={handleMatWidthChange}
                        />
                    </div>
                )}
                
                {hasMat && (
                    <div className="control-group">
                        <label>Mat Color:</label>
                        <input 
                            type="color" 
                            value={matColor}
                            onChange={handleMatColorChange}
                        />
                    </div>
                )}
                
                <div className="control-group">
                    <button 
                        className="upload-button"
                        onClick={() => document.querySelector('label[for="imageUpload"]')?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Uploading...' : 'Upload Image'}
                    </button>
                </div>
            </div>
            
            <style jsx>{`
                .frame-designer {
                    display: flex;
                    gap: 2rem;
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                .frame-preview {
                    flex: 1;
                    min-height: 600px;
                    background: #f9f9f9;
                    border-radius: 4px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .frame-controls {
                    width: 280px;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    background: #f5f5f5;
                    border-radius: 8px;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .control-group label {
                    font-weight: 500;
                    color: #333;
                    font-size: 0.9rem;
                }
                
                input[type="number"],
                select {
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 1rem;
                    width: 100%;
                }
                
                input[type="color"] {
                    width: 100%;
                    height: 48px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 2px;
                    background: white;
                    cursor: pointer;
                }
                
                .upload-button {
                    background: #4a90e2;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 4px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.2s;
                    margin-top: 1rem;
                }
                
                .upload-button:hover {
                    background: #357abd;
                }
                
                .upload-button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                
                .frame-texture-select {
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 0.75rem center;
                    background-size: 1em;
                    padding-right: 2.5rem;
                }
            `}</style>
        </div>
    );
}

// Initialize React 18 root
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
