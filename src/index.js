import React from 'react';
import ReactDOM from 'react-dom';
import '../css/style.css';

// Example React component for image upload
function App() {
    return (
        <div>
            <h1>Welcome to Print and Frame Studio</h1>
            <p>Upload your image and customize your frame!</p>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));

// konva for framing stage area
import Konva from 'konva';

const stage = new Konva.Stage({
  container: 'framingContainer', // HTML div ID
  width: 800,
  height: 600,
});

const layer = new Konva.Layer();
stage.add(layer);

// Load an image (example)
const imageObj = new Image();
imageObj.src = 'path/to/your/image.jpg';
imageObj.onload = function () {
    const konvaImage = new Konva.Image({
        x: 50,
        y: 50,
        image: imageObj,
        width: 300,
        height: 200,
    });
    layer.add(konvaImage);
    layer.draw();
};
