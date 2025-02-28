<?php
/**
 * Plugin Name: Custom Frame Designer
 * Description: A custom framing tool using Konva.js for live previews.
 * Version: 1.0
 * Author: Your Name
 * License: GPL2
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Enqueue scripts and styles
function cfd_enqueue_scripts() {
    // Load Konva.js from npm (or use CDN)
    wp_enqueue_script('konva-js', 'https://cdn.jsdelivr.net/npm/konva@9.3.2/konva.min.js', array(), null, true);
    
    // Load our custom script
    wp_enqueue_script('cfd-main-js', plugin_dir_url(__FILE__) . 'assets/js/main.js', array('konva-js'), null, true);

    // Load styles
    wp_enqueue_style('cfd-styles', plugin_dir_url(__FILE__) . 'assets/css/style.css');
}
add_action('wp_enqueue_scripts', 'cfd_enqueue_scripts');

// Register shortcode - framing_stage
function cfd_framing_stage_shortcode() {
    ob_start(); ?>
    
    <!-- Main container with responsive layout -->
    <div class="framing-studio-container">
        
        <!-- Left column: Mockup area -->
        <div class="mockup-container">
            <!-- Framing container (Konva stage will render here) -->
            <div id="framingContainer"></div>
        </div>
        
        <!-- Right column: Controls -->
        <div class="controls-container">
            <!-- Upload form (this displays first) -->
            <div id="uploadFormContainer">
                <h3>Upload Your Image</h3>
                <p>Select an image file to begin framing</p>
                <input type="file" id="imageUpload" accept="image/*" />
            </div>
            
            <!-- Options container (hidden initially, shows after upload) -->
            <div id="optionsContainer" style="display: none;">
                <h3>Customize Your Frame</h3>
                
                <!-- Print dimensions -->
                <div class="input-group">
                    <label for="printWidth">Print Width (inches):</label>
                    <input type="number" id="printWidth" min="5" max="40" value="8">
                </div>
                
                <div class="input-group">
                    <label for="printHeight">Print Height (inches):</label>
                    <input type="number" id="printHeight" min="7" max="60" value="10">
                </div>
                
                <!-- Mat options -->
                <div class="input-group">
                    <label for="matWidth">Mat Width (inches):</label>
                    <input type="number" id="matWidth" min="0" max="6" step="0.125" value="2">
                </div>
                
                <div class="input-group">
                    <label for="matColor">Mat Color:</label>
                    <select id="matColor">
                        <option value="cream">Cream</option>
                        <option value="tan">Tan</option>
                        <option value="dark-brown">Dark Brown</option>
                        <option value="gray">Gray</option>
                        <option value="black">Black</option>
                        <option value="pink">Pink</option>
                        <option value="green">Green</option>
                    </select>
                </div>
                
                <!-- Frame options -->
                <div class="input-group">
                    <label for="mouldingProfile">Frame Style:</label>
                    <select id="mouldingProfile">
                        <option value="black-1">Black Frame (1")</option>
                        <option value="brown-1.5">Cherry Frame (1.5")</option>
                        <option value="blue-2">Gold Frame (2")</option>
                    </select>
                </div>
                
                <!-- Start over button -->
                <button type="button" id="startOver" class="action-button">Start Over</button>
            </div>
        </div>
    </div>
    
    <?php return ob_get_clean();
}
add_shortcode('framing_stage', 'cfd_framing_stage_shortcode');