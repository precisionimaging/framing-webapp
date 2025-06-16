<?php
/**
 * Create a custom product type for framed prints
 */
 
function cfd_create_framed_print_product_type() {
    // Only proceed if WooCommerce is active
    if (!class_exists('WC_Product')) {
        return;
    }
    
    class WC_Product_Framed_Print extends WC_Product {
        
        /**
         * Initialize framed print product
         */
        public function __construct($product = 0) {
            $this->product_type = 'framed_print';
            parent::__construct($product);
        }
        
        /**
         * Get internal type
         */
        public function get_type() {
            return 'framed_print';
        }
        
        /**
         * Always virtual - we'll handle shipping separately
         */
        public function is_virtual() {
            return true;
        }
    }
}
add_action('init', 'cfd_create_framed_print_product_type');

/**
 * Add to product type dropdown
 */
function cfd_add_framed_print_product_type($types) {
    $types['framed_print'] = 'Framed Print';
    return $types;
}
add_filter('product_type_selector', 'cfd_add_framed_print_product_type');

/**
 * AJAX handler for adding custom framed print to cart
 */
function cfd_add_to_cart() {
    // Verify nonce
    check_ajax_referer('custom_frame_nonce', 'nonce');
    
    // Add debugging
    error_log('Custom Frame Add to Cart called with product_id: ' . (isset($_POST['product_id']) ? $_POST['product_id'] : 'none'));
    
    // Get frame details from POST
    $frame_data = array(
        'print_width' => isset($_POST['frame_width']) ? floatval($_POST['frame_width']) : 0,
        'print_height' => isset($_POST['frame_height']) ? floatval($_POST['frame_height']) : 0,
        'mat_width' => isset($_POST['mat_width']) ? floatval($_POST['mat_width']) : 0,
        'mat_color' => isset($_POST['mat_color']) ? sanitize_text_field($_POST['mat_color']) : '',
        'frame_style' => isset($_POST['frame_style']) ? sanitize_text_field($_POST['frame_style']) : '',
        'opening_shape' => isset($_POST['opening_shape']) ? sanitize_text_field($_POST['opening_shape']) : 'rectangle',
        'second_mat' => isset($_POST['second_mat']) && ($_POST['second_mat'] === 'yes'),
        'whitespace_size' => isset($_POST['whitespace_size']) ? floatval($_POST['whitespace_size']) : 0,
        'v_groove' => isset($_POST['v_groove']) && ($_POST['v_groove'] === 'yes'),
        'glass_type' => isset($_POST['glass_type']) ? sanitize_text_field($_POST['glass_type']) : 'regular',
        'print_type' => isset($_POST['print_type']) ? sanitize_text_field($_POST['print_type']) : 'framed',
    );
    
    // Log frame data for debugging
    error_log('Frame data: ' . print_r($frame_data, true));
    
    // Handle second mat details if enabled
    if ($frame_data['second_mat']) {
        $frame_data['second_mat_color'] = isset($_POST['second_mat_color']) ? sanitize_text_field($_POST['second_mat_color']) : '';
        $frame_data['reveal_size'] = isset($_POST['reveal_size']) ? floatval($_POST['reveal_size']) : 0.25;
    }
    
    // Handle v-groove details if enabled
    if ($frame_data['v_groove']) {
        $frame_data['v_groove_distance'] = isset($_POST['v_groove_distance']) ? floatval($_POST['v_groove_distance']) : 0.5;
    }
    
    // Get uploaded image info
    $image_data = array(
        'id' => isset($_POST['frame_image_id']) ? sanitize_text_field($_POST['frame_image_id']) : '',
        'url' => isset($_POST['frame_image_url']) ? esc_url_raw($_POST['frame_image_url']) : '',
        'name' => isset($_POST['frame_image_name']) ? sanitize_text_field($_POST['frame_image_name']) : '',
    );
    
    // Log image data for debugging
    error_log('Image data: ' . print_r($image_data, true));
    
    // Get product info
    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
    
    // Check if the product exists
    $product = wc_get_product($product_id);
    if (!$product) {
        error_log('Product not found with ID: ' . $product_id);
        wp_send_json_error(array(
            'message' => 'Product not found. Please check product ID: ' . $product_id
        ));
        return;
    }
    
    error_log('Product found: ' . $product->get_name() . ' (ID: ' . $product_id . ')');
    
    // Calculate price
    $price = cfd_calculate_frame_price($frame_data);
    
    // Log calculated price
    error_log('Calculated price: ' . $price);
    
    // Create cart item data
    $cart_item_data = array(
        'custom_frame_data' => $frame_data,
        'custom_image_data' => $image_data,
        'custom_price' => $price,
    );
    
    // Make sure WC() is available
    if (!function_exists('WC') || !WC()->cart) {
        error_log('WooCommerce cart not available');
        wp_send_json_error(array(
            'message' => 'WooCommerce cart not available. Please check if WooCommerce is active.'
        ));
        return;
    }
    
    // Add to cart
    try {
        $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, 0, array(), $cart_item_data);
        
        if ($cart_item_key) {
            // Success
            error_log('Item added to cart successfully with key: ' . $cart_item_key);
            wp_send_json_success(array(
                'message' => 'Item added to cart successfully',
                'cart_url' => wc_get_cart_url(),
                'price' => wc_price($price)
            ));
        } else {
            // Failed
            error_log('Failed to add item to cart. WooCommerce returned no cart item key.');
            // Check WC_Cart last error if available
            if (function_exists('wc_get_notices') && !empty(wc_get_notices('error'))) {
                error_log('WooCommerce errors: ' . print_r(wc_get_notices('error'), true));
            }
            wp_send_json_error(array(
                'message' => 'Failed to add item to cart. Check server logs for details.'
            ));
        }
    } catch (Exception $e) {
        error_log('Exception adding to cart: ' . $e->getMessage());
        wp_send_json_error(array(
            'message' => 'Exception: ' . $e->getMessage()
        ));
    }
}
add_action('wp_ajax_custom_frame_add_to_cart', 'cfd_add_to_cart');
add_action('wp_ajax_nopriv_custom_frame_add_to_cart', 'cfd_add_to_cart');

/**
 * Calculate frame price based on specifications
 */
function cfd_calculate_frame_price($frame_data) {
    // Get pricing data from options
    $base_prices = get_option('cfd_base_prices', array(
        'framed' => '0.35',
        'canvas' => '0.30',
        'acrylic' => '0.45',
        'paper' => '0.20'
    ));
    
    $mat_pricing = get_option('cfd_mat_pricing', array(
        'standard' => '0.20',
        'secondMat' => '0.25',
        'vgroove' => '0.30'
    ));
    
    $frame_pricing = get_option('cfd_frame_pricing', array());
    
    $glass_pricing = get_option('cfd_glass_pricing', array(
        'regular' => '0.08',
        'reflection-control' => '0.12'
    ));
    
    $additional_fees = get_option('cfd_additional_fees', array(
        'multipleOpenings' => '15.00',
        'circularOpening' => '10.00',
        'handling' => '5.00'
    ));
    
    // Get dimensions
    $width = $frame_data['print_width'];
    $height = $frame_data['print_height'];
    $area = $width * $height; // Square inches
    
    // Calculate base price
    $print_type = isset($frame_data['print_type']) ? $frame_data['print_type'] : 'framed';
    $base_rate = isset($base_prices[$print_type]) ? floatval($base_prices[$print_type]) : 0.35;
    $price = $area * $base_rate;
    
    // Add frame cost if framed
    if ($print_type === 'framed') {
        $frame_style = $frame_data['frame_style'];
        $frame_rate = isset($frame_pricing[$frame_style]) ? floatval($frame_pricing[$frame_style]) : 1.00;
        $frame_perimeter = 2 * ($width + $height); // Linear inches
        $price += $frame_perimeter * $frame_rate;
        
        // Add mat cost
        $mat_width = $frame_data['mat_width'];
        $mat_perimeter = 2 * (($width + (2 * $mat_width)) + ($height + (2 * $mat_width)));
        $price += $mat_perimeter * floatval($mat_pricing['standard']);
        
        // Add second mat cost if applicable
        if ($frame_data['second_mat']) {
            $price += $mat_perimeter * floatval($mat_pricing['secondMat']);
        }
        
        // Add v-groove cost if applicable
        if ($frame_data['v_groove']) {
            $vgroove_perimeter = 2 * (($width + (2 * $frame_data['v_groove_distance'])) + 
                                    ($height + (2 * $frame_data['v_groove_distance'])));
            $price += $vgroove_perimeter * floatval($mat_pricing['vgroove']);
        }
        
        // Add glass cost
        $glass_type = $frame_data['glass_type'];
        $glass_rate = isset($glass_pricing[$glass_type]) ? floatval($glass_pricing[$glass_type]) : 0.08;
        $glass_area = ($width + (2 * $mat_width)) * ($height + (2 * $mat_width));
        $price += $glass_area * $glass_rate;
        
        // Add special opening fee if applicable
        if ($frame_data['opening_shape'] === 'oval') {
            $price += floatval($additional_fees['circularOpening']);
        }
    }
    
    // Add handling fee
    $price += floatval($additional_fees['handling']);
    
    return $price;
}