<?php
/**
 * Plugin Name: Custom Frame Designer
 * Description: A custom framing tool using Konva.js for live previews of framed prints.
 * Version: 2.1
 * Author: Precision Imaging Ltd
 * License: GPL2
 */

	// Prevent direct access
	if (!defined('ABSPATH')) {
		exit;
	}

	// Load admin functionality if in admin area
	if (is_admin()) {
		require_once plugin_dir_path(__FILE__) . 'admin/pricing-admin.php';
		require_once plugin_dir_path(__FILE__) . 'admin/options-admin.php';
	}

	// Load image processing handlers
	require_once plugin_dir_path(__FILE__) . 'includes/image-handler.php';

function cfd_enqueue_scripts() {
    // Load fabric.js
    wp_enqueue_script('fabric-js', 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js', array('jquery'), null, true);

    // Load and localize main.js
    wp_enqueue_script('cfd-main-js', plugin_dir_url(__FILE__) . 'assets/js/main.js', array('jquery', 'fabric-js'), null, true);
    wp_localize_script('cfd-main-js', 'cfdData', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('custom_frame_nonce')
    ));

    // Load styles
    wp_enqueue_style('cfd-styles', plugin_dir_url(__FILE__) . 'assets/css/style.css');
}
add_action('wp_enqueue_scripts', 'cfd_enqueue_scripts');

// image processing - creates a smaller optimized ver of uploaded image to use in Mockup
// and saves the orig for use as a print file.
function cfd_enqueue_image_processing_scripts() {
    wp_enqueue_script(
        'cfd-image-processing-js',
        plugin_dir_url(__FILE__) . 'assets/js/image-processing.js',
        array('jquery'), // Dependencies
        '1.0.0', // Version
        true // Load in footer
    );
    
    // Pass WordPress AJAX URL to JavaScript
    wp_localize_script('cfd-image-processing-js', 'cfdData', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
		'nonce' => wp_create_nonce('custom_frame_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'cfd_enqueue_image_processing_scripts');

//  Register shortcode - framing_stage
function cfd_framing_stage_shortcode() {
    ob_start(); ?>
    
    <!-- Main container with responsive layout -->
    <div class="framing-studio-container">
        
        <!-- Left column: Mockup area -->
        <div class="mockup-container">
            <!-- Framing container (Konva stage will render here) -->
            <div id="framingContainer"></div>
        </div>
        
        <!-- Right column: Controls   -->
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
                
		<!--- Enhanced mat options --->
		<!-- Mat options (enhanced) -->
		<div class="options-section" id="matOptionsSection">
			<h4>Mat Options</h4>
			
			<!-- Main mat settings -->
			<div class="input-group">
				<label for="matWidth">Main Mat Width (inches):</label>
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
					<option value="white">White</option>
					<option value="pink">Pink</option>
					<option value="green">Green</option>
				</select>
			</div>
			
			<!-- Secondary mat (reveal) -->
			<div class="input-group">
				<label for="enableSecondMat">
					<input type="checkbox" id="enableSecondMat"> 
					Add Second Mat
				</label>
			</div>
			
			<div class="secondary-mat-options" style="display: none; padding-left: 15px;">
				<div class="input-group">
					<label for="secondMatColor">Second Mat Color:</label>
					<select id="secondMatColor">
						<option value="cream">Cream</option>
						<option value="tan">Tan</option>
						<option value="dark-brown">Dark Brown</option>
						<option value="gray">Gray</option>
						<option value="black">Black</option>
						<option value="white">White</option>
						<option value="pink">Pink</option>
						<option value="green">Green</option>
					</select>
				</div>
				
				<div class="input-group">
					<label for="revealSize">Reveal Size (inches):</label>
					<select id="revealSize">
						<option value="0.125">1/8"</option>
						<option value="0.25">1/4"</option>
						<option value="0.375">3/8"</option>
						<option value="0.5">1/2"</option>
						<option value="0.625">5/8"</option>
						<option value="0.75">3/4"</option>
						<option value="0.875">7/8"</option>
						<option value="1">1"</option>
					</select>
				</div>
			</div>
			
			<!-- Whitespace option -->
			<div class="input-group">
				<label for="enableWhitespace">
					<input type="checkbox" id="enableWhitespace"> 
					Add Whitespace Around Image
				</label>
			</div>
			
			<div class="whitespace-options" style="display: none; padding-left: 15px;">
				<div class="input-group">
					<label for="whitespaceSize">Whitespace Size (inches):</label>
					<select id="whitespaceSize">
						<option value="0.25">1/4"</option>
						<option value="0.375">3/8"</option>
						<option value="0.5">1/2"</option>
						<option value="0.625">5/8"</option>
						<option value="0.75">3/4"</option>
						<option value="0.875">7/8"</option>
						<option value="1">1"</option>
					</select>
				</div>
			</div>
			
			<!-- V-groove option -->
			<div class="input-group">
				<label for="enableVGroove">
					<input type="checkbox" id="enableVGroove"> 
					Add V-Groove
				</label>
			</div>
			
			<div class="vgroove-options" style="display: none; padding-left: 15px;">
				<div class="input-group">
					<label for="vGrooveDistance">Distance from Opening (inches):</label>
					<select id="vGrooveDistance">
						<option value="0.5">1/2"</option>
						<option value="0.75">3/4"</option>
						<option value="1">1"</option>
						<option value="1.5">1-1/2"</option>
						<option value="2">2"</option>
						<option value="2.5">2-1/2"</option>
						<option value="3">3"</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Opening Shape options (default rectangle, can be changed) -->
		<div class="options-section" id="openingShapeSection">
			<h4>Opening Shape</h4>
			
			<div class="input-group">
				<label for="openingShape">Shape:</label>
				<select id="openingShape">
					<option value="rectangle">Rectangle</option>
					<option value="oval">Oval</option>
				</select>
			</div>
			
			<div class="input-group">
				<label for="enableMultipleOpenings">
					<input type="checkbox" id="enableMultipleOpenings"> 
					Add Additional Opening (for plaque)
				</label>
			</div>
			
			<div class="multiple-openings-options" style="display: none; padding-left: 15px;">
				<div class="input-group">
					<label for="plaqueWidth">Plaque Width (inches):</label>
					<input type="number" id="plaqueWidth" min="2" max="12" value="5">
				</div>
				
				<div class="input-group">
					<label for="plaqueHeight">Plaque Height (inches):</label>
					<input type="number" id="plaqueHeight" min="0.5" max="4" value="1">
				</div>
				
				<div class="input-group">
					<label for="plaquePosition">Position:</label>
					<select id="plaquePosition">
						<option value="below">Below Image</option>
						<option value="above">Above Image</option>
					</select>
				</div>
				
				<div class="input-group">
					<label for="plaqueSpacing">Spacing (inches):</label>
					<input type="number" id="plaqueSpacing" min="0.5" max="3" step="0.125" value="1">
				</div>
			</div>
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



		<!-- Glass Options -->
		<div class="options-section" id="glassOptionsSection">
			<h4>Glass Options</h4>
			
			<div class="input-group">
				<label for="glassType">Glass Type:</label>
				<select id="glassType">
					<option value="regular">Regular Glass</option>
					<option value="reflection-control">Reflection Control Glass</option>
				</select>
			</div>
		</div>

		<!-- Print Type Options -->
		<div class="options-section" id="printTypeSection">
			<h4>Print Type</h4>
			
			<div class="input-group">
				<label for="printType">Choose Print Option:</label>
				<select id="printType">
					<option value="framed">Custom Framed Print</option>
					<option value="canvas">Gallery Wrapped Canvas</option>
					<option value="acrylic">Face Mounted Acrylic</option>
					<option value="paper">Fine Art Paper Print</option>
				</select>
			</div>
			
			<!-- Paper type options (only shown when paper is selected) -->
			<div class="paper-options" style="display: none; padding-left: 15px;">
				<div class="input-group">
					<label for="paperType">Paper Type:</label>
					<select id="paperType">
						<option value="matte">Matte Photo Paper</option>
						<option value="glossy">Glossy Photo Paper</option>
						<option value="cotton">100% Cotton Rag Paper</option>
						<option value="baryta">Baryta Fiber Paper</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Share & Download Options -->
		<div class="options-section" id="shareDownloadSection">
			<button type="button" id="downloadMockup" class="action-button">Download Mockup</button>
			
			<div class="share-buttons" style="margin-top: 15px;">
				<button type="button" id="shareWall" class="action-button">View on Wall</button>
				<button type="button" id="shareButtons" class="action-button">Share Design</button>
			</div>
		</div>

		<!-- Price Display -->
		<div class="price-display" id="priceDisplay">
			<h3>Estimated Price: <span id="totalPrice">$0.00</span></h3>
		</div>

		<!-- Add to Cart Button -->
		<button type="button" id="addToCart" class="action-button primary-button">Add to Cart</button>



 
                
                <!-- Start over button -->
                <button type="button" id="startOver" class="action-button">Start Over</button>
            </div>
        </div>
    </div>
    
    <?php return ob_get_clean();
}
add_shortcode('framing_stage', 'cfd_framing_stage_shortcode');