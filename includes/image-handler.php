<?php
/**
 * Server-side handler for image uploads and cart integration
 * Add this code to your theme's functions.php file or a separate plugin file
 */

// Register AJAX handlers
add_action('wp_ajax_upload_original_image', 'handle_original_image_upload');
add_action('wp_ajax_nopriv_upload_original_image', 'handle_original_image_upload'); // Allow non-logged in users

add_action('wp_ajax_custom_frame_add_to_cart', 'handle_custom_frame_add_to_cart');
add_action('wp_ajax_nopriv_custom_frame_add_to_cart', 'handle_custom_frame_add_to_cart');

/**
 * Handle upload of original high-resolution image
 */
function handle_original_image_upload() {
	
	check_ajax_referer('custom_frame_nonce', 'nonce');

    // Check if file was uploaded
    if (empty($_FILES['file'])) {
        wp_send_json_error(array('message' => 'No file was uploaded'));
    }
    
    // Get the uploaded file
    $file = $_FILES['file'];
    
    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $error_message = get_upload_error_message($file['error']);
        wp_send_json_error(array('message' => $error_message));
    }
    
    // Validate file type
    $allowed_types = array('image/jpeg', 'image/png', 'image/gif', 'image/webp');
    if (!in_array($file['type'], $allowed_types)) {
        wp_send_json_error(array('message' => 'Invalid file type. Please upload a valid image file.'));
    }
    
    // Create a custom upload directory for original images
    $upload_dir = wp_upload_dir();
    $custom_dir = $upload_dir['basedir'] . '/custom-frame-originals';
    
    // Create directory if it doesn't exist
    if (!file_exists($custom_dir)) {
        mkdir($custom_dir, 0755, true);
    }
    
    // Generate a unique filename
    $filename = wp_unique_filename($custom_dir, $file['name']);
    $filepath = $custom_dir . '/' . $filename;
    
    // Move the uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        wp_send_json_error(array('message' => 'Failed to move uploaded file'));
    }
    
    // Create a record in the WordPress media library
    $attachment = array(
        'guid' => $upload_dir['baseurl'] . '/custom-frame-originals/' . $filename,
        'post_mime_type' => $file['type'],
        'post_title' => preg_replace('/\.[^.]+$/', '', $filename),
        'post_content' => '',
        'post_status' => 'private', // Keep it private
    );
    
    // Insert the attachment
    $attachment_id = wp_insert_attachment($attachment, $filepath);
    
    // Generate metadata for the attachment
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    $attachment_data = wp_generate_attachment_metadata($attachment_id, $filepath);
    wp_update_attachment_metadata($attachment_id, $attachment_data);
    
    // Return the file information
    wp_send_json_success(array(
        'file_id' => $attachment_id,
        'file_url' => wp_get_attachment_url($attachment_id),
        'file_path' => $filepath,
        'message' => 'File uploaded successfully'
    ));
}

/**
 * Handle adding custom frame to WooCommerce cart
 */
function handle_custom_frame_add_to_cart() {
    // Verify nonce for security (uncomment when adding nonce)
    //if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'custom_frame_cart_nonce')) {
    //    wp_send_json_error(array('message' => 'Security check failed'));
    //}
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error(array('message' => 'WooCommerce is not active'));
    }
    
    // Get product ID
    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
    if (!$product_id) {
        wp_send_json_error(array('message' => 'Invalid product ID'));
    }
    
    // Check if the product exists
    $product = wc_get_product($product_id);
    if (!$product) {
        wp_send_json_error(array('message' => 'Product not found'));
    }
    
    // Get quantity
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
    
    // Get image information
    $image_id = isset($_POST['frame_image_id']) ? intval($_POST['frame_image_id']) : 0;
    if (!$image_id) {
        wp_send_json_error(array('message' => 'No image selected'));
    }
    
    // Collect all custom frame options
    $cart_item_data = array(
        'custom_frame_data' => array(
            'image_id' => $image_id,
            'image_url' => sanitize_text_field($_POST['frame_image_url'] ?? ''),
            'image_name' => sanitize_text_field($_POST['frame_image_name'] ?? ''),
            'frame_width' => floatval($_POST['frame_width'] ?? 0),
            'frame_height' => floatval($_POST['frame_height'] ?? 0),
            'frame_style' => sanitize_text_field($_POST['frame_style'] ?? ''),
            'mat_width' => floatval($_POST['mat_width'] ?? 0),
            'mat_color' => sanitize_text_field($_POST['mat_color'] ?? ''),
            'second_mat' => sanitize_text_field($_POST['second_mat'] ?? 'no') === 'yes',
        )
    );
    
    // Add second mat details if enabled
    if ($cart_item_data['custom_frame_data']['second_mat']) {
        $cart_item_data['custom_frame_data']['second_mat_color'] = sanitize_text_field($_POST['second_mat_color'] ?? '');
        $cart_item_data['custom_frame_data']['reveal_size'] = floatval($_POST['reveal_size'] ?? 0);
    }
    
    // Add data hash to avoid duplicate items
    $cart_item_data['unique_key'] = md5(json_encode($cart_item_data) . time());
    
    // Add to cart
    $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, 0, array(), $cart_item_data);
    
    if (!$cart_item_key) {
        wp_send_json_error(array('message' => 'Error adding item to cart'));
    }
    
    // Return success
    wp_send_json_success(array(
        'message' => 'Product added to cart',
        'cart_url' => wc_get_cart_url(),
        'cart_item_key' => $cart_item_key
    ));
}

/**
 * Get error message for upload errors
 */
function get_upload_error_message($error_code) {
    switch ($error_code) {
        case UPLOAD_ERR_INI_SIZE:
            return 'The uploaded file exceeds the upload_max_filesize directive in php.ini';
        case UPLOAD_ERR_FORM_SIZE:
            return 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form';
        case UPLOAD_ERR_PARTIAL:
            return 'The uploaded file was only partially uploaded';
        case UPLOAD_ERR_NO_FILE:
            return 'No file was uploaded';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Missing a temporary folder';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Failed to write file to disk';
        case UPLOAD_ERR_EXTENSION:
            return 'A PHP extension stopped the file upload';
        default:
            return 'Unknown upload error';
    }
}

/**
 * Display custom frame data in cart and checkout
 */
add_filter('woocommerce_get_item_data', 'display_custom_frame_data_in_cart', 10, 2);
function display_custom_frame_data_in_cart($item_data, $cart_item) {
    if (empty($cart_item['custom_frame_data'])) {
        return $item_data;
    }
    
    $custom_data = $cart_item['custom_frame_data'];
    
    // Add frame dimensions
    $item_data[] = array(
        'key' => 'Print Size',
        'value' => $custom_data['frame_width'] . '" × ' . $custom_data['frame_height'] . '"'
    );
    
    // Add frame style
    $item_data[] = array(
        'key' => 'Frame Style',
        'value' => $custom_data['frame_style']
    );
    
    // Add mat information
    $item_data[] = array(
        'key' => 'Mat Color',
        'value' => $custom_data['mat_color'] . ' (' . $custom_data['mat_width'] . '")'
    );
    
    // Add second mat if present
    if (!empty($custom_data['second_mat']) && $custom_data['second_mat']) {
        $item_data[] = array(
            'key' => 'Second Mat',
            'value' => $custom_data['second_mat_color'] . ' (' . $custom_data['reveal_size'] . '" reveal)'
        );
    }
    
    return $item_data;
}

/**
 * Save custom frame data to order
 */
add_action('woocommerce_checkout_create_order_line_item', 'save_custom_frame_data_to_order', 10, 4);
function save_custom_frame_data_to_order($item, $cart_item_key, $values, $order) {
    if (empty($values['custom_frame_data'])) {
        return;
    }
    
    $custom_data = $values['custom_frame_data'];
    
    // Store image ID as meta
    $item->add_meta_data('_frame_image_id', $custom_data['image_id']);
    
    // Store all frame options
    $item->add_meta_data('_custom_frame_data', $custom_data);
    
    // Store individual properties for easy access
    $item->add_meta_data('frame_width', $custom_data['frame_width']);
    $item->add_meta_data('frame_height', $custom_data['frame_height']);
    $item->add_meta_data('frame_style', $custom_data['frame_style']);
    $item->add_meta_data('mat_color', $custom_data['mat_color']);
    
    if (!empty($custom_data['second_mat']) && $custom_data['second_mat']) {
        $item->add_meta_data('second_mat_color', $custom_data['second_mat_color']);
    }
}

/**
 * Get the price of custom framing based on options
 * This would tie into your existing pricing functions
 */
function calculate_custom_frame_price($options) {
    // Implement your pricing logic here based on the options
    // This should match the JavaScript pricing calculation
    
    // Example: Start with base price
    $price = 0;
    
    // Calculate based on size (area)
    $area = $options['frame_width'] * $options['frame_height'];
    $price += $area * 0.35; // Base price per square inch
    
    // Add frame cost
    // Get the frame price from your options
    // $price += get_frame_price($options['frame_style']) * perimeter;
    
    // Add mat cost
    // $price += get_mat_price($options['mat_color'], $options['mat_width']);
    
    // Add second mat if needed
    if (!empty($options['second_mat']) && $options['second_mat']) {
        // $price += get_second_mat_price($options['second_mat_color'], $options['reveal_size']);
    }
    
    return $price;
}