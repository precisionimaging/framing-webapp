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

	// Load required files
require_once plugin_dir_path(__FILE__) . 'includes/class-cfd-file-manager.php';
require_once plugin_dir_path(__FILE__) . 'includes/image-handler.php';

function cfd_enqueue_scripts() {
    // Only load scripts on pages that need them
    if (!is_admin()) {
        // Load fabric.js
        wp_enqueue_script('fabric-js', 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js', array('jquery'), '5.3.1', true);

        // Enqueue the Vite-built React app
        $react_script_handle = 'cfd-react-app';
        wp_enqueue_script(
            $react_script_handle,
            plugin_dir_url(__FILE__) . 'dist/bundle.js',
            array('wp-element', 'wp-i18n', 'jquery', 'fabric-js'),
            filemtime(plugin_dir_path(__FILE__) . 'dist/bundle.js'),
            true // Load in footer
        );
        
        // Localize script with WordPress data
        wp_localize_script($react_script_handle, 'wpVars', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('wp_rest'),
            'rest_url' => esc_url_raw(rest_url()),
            'home_url' => esc_url_raw(home_url('/')),
            'plugin_url' => plugin_dir_url(__FILE__),
            'ajax_nonce' => wp_create_nonce('cfd_ajax_nonce')
        ));

        // Load styles
        wp_enqueue_style('cfd-styles', plugin_dir_url(__FILE__) . 'assets/css/style.css');
    }
}
add_action('wp_enqueue_scripts', 'cfd_enqueue_scripts');

// Handle image uploads via AJAX
function cfd_handle_image_upload() {
    // Verify nonce
    if (!isset($_POST['_ajax_nonce']) || !wp_verify_nonce($_POST['_ajax_nonce'], 'cfd_ajax_nonce')) {
        wp_send_json_error('Invalid nonce');
        return;
    }

    if (!function_exists('wp_handle_upload') || !function_exists('wp_get_image_editor')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
    }

    // Get order ID or use 'temp' for unassigned uploads
    $order_id = !empty($_POST['order_id']) ? sanitize_text_field($_POST['order_id']) : 'temp';
    
    // Get upload directories
    $upload_dirs = CFD_File_Manager::get_order_upload_dir($order_id);
    
    // Set upload overrides
    $upload_overrides = array(
        'test_form' => false,
        'unique_filename_callback' => function($dir, $name, $ext) use ($upload_dirs) {
            return wp_unique_filename($upload_dirs['original']['dir'], $name . $ext);
        }
    );

    // Handle the original file upload
    $uploadedfile = $_FILES['file'];
    $original_file = wp_handle_upload($uploadedfile, $upload_overrides);

    if (isset($original_file['error'])) {
        wp_send_json_error('Upload error: ' . $original_file['error']);
        return;
    }

    // Generate preview filename
    $preview_filename = basename($original_file['file']);
    $preview_file = $upload_dirs['preview']['dir'] . '/' . $preview_filename;
    $preview_url = $upload_dirs['preview']['url'] . '/' . $preview_filename;
    
    // Create optimized version for preview (max 1200px, 80% quality)
    $image = wp_get_image_editor($original_file['file']);
    if (!is_wp_error($image)) {
        $image->resize(1200, 1200, false); // Resize while maintaining aspect ratio
        $image->set_quality(80);
        $saved = $image->save($preview_file);
        
        if (is_wp_error($saved)) {
            error_log('Preview creation failed: ' . $saved->get_error_message());
            // Fallback to original if preview creation fails
            copy($original_file['file'], $preview_file);
        }
    } else {
        error_log('Image editor error: ' . $image->get_error_message());
        copy($original_file['file'], $preview_file);
    }

    // Create attachment for the original file
    $attachment = array(
        'post_mime_type' => $original_file['type'],
        'post_title'     => preg_replace('/\.[^.]+$/', '', basename($original_file['file'])),
        'post_content'   => '',
        'post_status'    => 'inherit',
        'meta_input'     => array(
            '_cfd_original_path' => $original_file['file'],
            '_cfd_preview_path' => $preview_file,
            '_cfd_order_id'     => $order_id
        )
    );

    $attach_id = wp_insert_attachment($attachment, $original_file['file']);
    $attach_data = wp_generate_attachment_metadata($attach_id, $original_file['file']);
    wp_update_attachment_metadata($attach_id, $attach_data);

    // Return both file URLs
    wp_send_json_success(array(
        'original' => array(
            'url' => $original_file['url'],
            'path' => $original_file['file']
        ),
        'preview' => array(
            'url' => $preview_url,
            'path' => $preview_file
        ),
        'attachment_id' => $attach_id,
        'order_id' => $order_id
    ));
}
add_action('wp_ajax_handle_image_upload', 'cfd_handle_image_upload');
add_action('wp_ajax_nopriv_handle_image_upload', 'cfd_handle_image_upload');

//  Register shortcode - framing_stage
function cfd_framing_stage_shortcode() {
    ob_start(); ?>
    
    <!-- Main container with responsive layout -->
    <div class="framing-studio-container">
        
        <!-- Left column: Mockup area -->
        <div class="mockup-container">
            <!-- Framing container (Konva stage will render here) -->
            <div id="root"></div>
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