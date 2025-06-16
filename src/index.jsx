import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../assets/css/style.css';
import { Stage, Layer, Image as KonvaImage } from 'konva';

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

// Example React component for image upload
function App() {
    const containerRef = useRef(null);
    const stageRef = useRef(null);

    useEffect(() => {
        if (containerRef.current && !stageRef.current) {
            // Initialize Konva stage
            stageRef.current = new Stage({
                container: containerRef.current,
                width: 800,
                height: 600,
            });

            const layer = new Layer();
            stageRef.current.add(layer);

            // Handle image upload
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            // Use existing upload button from WordPress
            const existingUploadButton = document.querySelector('#imageUpload');
            if (existingUploadButton) {
                existingUploadButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    fileInput.click();
                });
            }

            // Handle file selection
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(event) {
                    const imageObj = new window.Image();
                    imageObj.src = event.target.result;
                    imageObj.onload = function() {
                        const konvaImage = new KonvaImage({
                            x: 50,
                            y: 50,
                            image: imageObj,
                            width: 300,
                            height: 200,
                        });
                        layer.add(konvaImage);
                        layer.draw();
                        
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
                        formData.append('_ajax_nonce', nonce);  // Changed from 'nonce' to '_ajax_nonce'
                        formData.append('order_id', orderId);

                        // Show loading state
                        const uploadButton = document.querySelector('label[for="imageUpload"]');
                        if (uploadButton) {
                            const originalText = uploadButton.textContent;
                            uploadButton.style.opacity = '0.7';
                            uploadButton.style.pointerEvents = 'none';
                            uploadButton.textContent = 'Uploading...';
                            
                            // Store original text in a data attribute for later restoration
                            uploadButton.setAttribute('data-original-text', originalText);
                        }

                        // Use the full URL in development, or wpVars.ajaxurl in production
                        const apiUrl = import.meta.env.DEV 
                            ? 'https://wp.precisionimaging.ca/wp-admin/admin-ajax.php' 
                            : (window.wpVars?.ajaxurl || '/wp-admin/admin-ajax.php');
                            
                        fetch(apiUrl, {
                            method: 'POST',
                            body: formData,
                            credentials: 'same-origin',
                            headers: {
                                'X-WP-Nonce': nonce  // Using the same nonce in headers
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
                                console.log('Original file:', data.data.original);
                                console.log('Preview file:', data.data.preview);
                                
                                // Use the preview image for the Konva stage
                                const imageObj = new window.Image();
                                imageObj.src = data.data.preview.url;
                                imageObj.onload = function() {
                                    const konvaImage = new KonvaImage({
                                        x: 50,
                                        y: 50,
                                        image: imageObj,
                                        width: 300,
                                        height: 200 * (imageObj.height / imageObj.width),
                                        draggable: true
                                    });
                                    layer.add(konvaImage);
                                    layer.draw();
                                    
                                    // Store the original file info for later use
                                    konvaImage.setAttr('originalFile', {
                                        id: data.data.attachment_id,
                                        url: data.data.original.url,
                                        path: data.data.original.path
                                    });
                                };
                                
                                // If this was a temporary order, you might want to update it to a real order later
                                if (orderId.startsWith('temp-')) {
                                    console.log('Temporary order ID:', orderId);
                                    // You can update this to a real order ID when the order is completed
                                }
                                
                                // Show the options container after successful upload
                                const optionsContainer = document.getElementById('optionsContainer');
                                const uploadForm = document.getElementById('uploadFormContainer');
                                if (optionsContainer && uploadForm) {
                                    uploadForm.style.display = 'none';
                                    optionsContainer.style.display = 'block';
                                }
                            } else {
                                throw new Error(data.data || 'Upload failed');
                            }
                        })
                        .catch(error => {
                            console.error('Error uploading image:', error);
                            alert('Error uploading image: ' + (error.message || 'Unknown error'));
                        })
                        .catch(error => {
                            console.error('Error uploading image:', error);
                            alert('Error uploading image: ' + (error.message || 'Unknown error'));
                        })
                        .finally(() => {
                            // Reset button state
                            const uploadButton = document.querySelector('label[for="imageUpload"]');
                            if (uploadButton) {
                                uploadButton.style.opacity = '1';
                                uploadButton.style.pointerEvents = 'auto';
                                const originalText = uploadButton.getAttribute('data-original-text') || 'Upload Image';
                                uploadButton.textContent = originalText;
                            }
                        });
                    };
                };
                reader.readAsDataURL(file);
            });
        }

        // Cleanup function
        return () => {
            if (stageRef.current) {
                stageRef.current.destroy();
                stageRef.current = null;
            }
        };
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1>Welcome to Print and Frame Studio</h1>
            <p>Upload your image and customize your frame!</p>
            <div 
                ref={containerRef} 
                style={{
                    border: '1px solid #ddd',
                    marginTop: '20px',
                    width: '800px',
                    height: '600px'
                }}
            />
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
