<?php
/**
 * Frame Options admin page
 */
function cfd_frame_options_page() {
    // Process form submission
    if (isset($_POST['cfd_frame_options_nonce']) && wp_verify_nonce($_POST['cfd_frame_options_nonce'], 'cfd_frame_options_update')) {
        // Handle new frame addition
        if (isset($_POST['add_frame']) && !empty($_POST['frame_key']) && !empty($_POST['frame_name'])) {
            $frame_key = sanitize_key($_POST['frame_key']);
            $frame_name = sanitize_text_field($_POST['frame_name']);
            $frame_width = floatval($_POST['frame_width']);
            $frame_color = sanitize_text_field($_POST['frame_color']);
            
            // Handle texture upload
            $texture_url = '';
            if (!empty($_FILES['frame_texture']['name'])) {
                // Check file type
                $allowed_types = array('jpg', 'jpeg', 'png');
                $file_type = strtolower(pathinfo($_FILES['frame_texture']['name'], PATHINFO_EXTENSION));
                
                if (in_array($file_type, $allowed_types)) {
                    // Upload to WordPress media library
                    $upload = wp_upload_bits($_FILES['frame_texture']['name'], null, file_get_contents($_FILES['frame_texture']['tmp_name']));
                    
                    if (!$upload['error']) {
                        $texture_url = $upload['url'];
                    }
                }
            }
            
            // Get existing frames
            $moulding_profiles = get_option('cfd_moulding_profiles', array());
            $frame_textures = get_option('cfd_frame_textures', array());
            
            // Add new frame
            $moulding_profiles[$frame_key] = array(
                'name' => $frame_name,
                'width' => $frame_width,
                'color' => $frame_color
            );
            
            // Add texture if uploaded
            if (!empty($texture_url)) {
                $frame_textures[$frame_key] = array(
                    'name' => $frame_name,
                    'src' => $texture_url,
                    'width' => $frame_width
                );
                
                // Link texture to profile
                $moulding_profiles[$frame_key]['texture'] = $frame_key;
            }
            
            // Save updated options
            update_option('cfd_moulding_profiles', $moulding_profiles);
            update_option('cfd_frame_textures', $frame_textures);
            
            // Add price for new frame
            $frame_pricing = get_option('cfd_frame_pricing', array());
            $frame_pricing[$frame_key] = '1.00'; // Default price
            update_option('cfd_frame_pricing', $frame_pricing);
            
            // Success message
            add_settings_error('cfd_frame_options', 'cfd_frame_added', 'New frame added successfully.', 'updated');
        }
        
        // Handle frame deletion
        if (isset($_POST['delete_frame']) && !empty($_POST['delete_key'])) {
            $delete_key = sanitize_key($_POST['delete_key']);
            
            // Get existing frames
            $moulding_profiles = get_option('cfd_moulding_profiles', array());
            $frame_textures = get_option('cfd_frame_textures', array());
            $frame_pricing = get_option('cfd_frame_pricing', array());
            
            // Remove frame from all arrays
            if (isset($moulding_profiles[$delete_key])) {
                unset($moulding_profiles[$delete_key]);
            }
            
            if (isset($frame_textures[$delete_key])) {
                unset($frame_textures[$delete_key]);
            }
            
            if (isset($frame_pricing[$delete_key])) {
                unset($frame_pricing[$delete_key]);
            }
            
            // Save updated options
            update_option('cfd_moulding_profiles', $moulding_profiles);
            update_option('cfd_frame_textures', $frame_textures);
            update_option('cfd_frame_pricing', $frame_pricing);
            
            // Success message
            add_settings_error('cfd_frame_options', 'cfd_frame_deleted', 'Frame deleted successfully.', 'updated');
        }
    }
    
    // Get current frame data
    $moulding_profiles = get_option('cfd_moulding_profiles', array(
        'black-1' => array('name' => 'Black Frame (1")', 'width' => 1, 'color' => '#000000'),
        'brown-1.5' => array('name' => 'Cherry Frame (1.5")', 'width' => 1.5, 'color' => '#8B4513'),
        'blue-2' => array('name' => 'Gold Frame (2")', 'width' => 2, 'color' => '#DAA520')
    ));
    
    $frame_textures = get_option('cfd_frame_textures', array(
        'black' => array('name' => 'Black Frame', 'src' => '/wp-content/uploads/frame-textures/black-frame.jpg', 'width' => 1),
        'cherry' => array('name' => 'Cherry Frame', 'src' => '/wp-content/uploads/frame-textures/cherry-frame.jpg', 'width' => 1.5),
        'gold-ornate' => array('name' => 'Gold Ornate Frame', 'src' => '/wp-content/uploads/frame-textures/gold-ornate.jpg', 'width' => 2)
    ));
    
    // Display the admin page
    ?>
    <div class="wrap">
        <h1>Custom Frame Designer - Frame Options</h1>
        
        <?php settings_errors('cfd_frame_options'); ?>
        
        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>Current Frame Options</h2>
            <p>Manage available frame mouldings for the custom frame designer.</p>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Frame Key</th>
                        <th>Display Name</th>
                        <th>Width</th>
                        <th>Color</th>
                        <th>Texture</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($moulding_profiles)): ?>
                        <tr>
                            <td colspan="6">No frames found. Add your first frame below.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($moulding_profiles as $key => $profile): ?>
                            <tr>
                                <td><?php echo esc_html($key); ?></td>
                                <td><?php echo esc_html($profile['name']); ?></td>
                                <td><?php echo esc_html($profile['width']); ?>"</td>
                                <td>
                                    <div style="width: 30px; height: 20px; background-color: <?php echo esc_attr(isset($profile['color']) ? $profile['color'] : '#000000'); ?>; border: 1px solid #ddd;"></div>
                                </td>
                                <td>
                                    <?php if (isset($profile['texture']) && isset($frame_textures[$profile['texture']])): ?>
                                        <img src="<?php echo esc_url($frame_textures[$profile['texture']]['src']); ?>" style="max-width: 100px; max-height: 30px;" alt="Texture preview">
                                    <?php else: ?>
                                        No texture
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <form method="post" action="">
                                        <?php wp_nonce_field('cfd_frame_options_update', 'cfd_frame_options_nonce'); ?>
                                        <input type="hidden" name="delete_key" value="<?php echo esc_attr($key); ?>">
                                        <button type="submit" name="delete_frame" class="button" onclick="return confirm('Are you sure you want to delete this frame?');">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        
        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>Add New Frame</h2>
            <p>Add a new frame option to the custom frame designer.</p>
            
            <form method="post" action="" enctype="multipart/form-data">
                <?php wp_nonce_field('cfd_frame_options_update', 'cfd_frame_options_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="frame_key">Frame Key</label></th>
                        <td>
                            <input type="text" name="frame_key" id="frame_key" class="regular-text" required>
                            <p class="description">Unique identifier for this frame (e.g., 'black-metal-1').</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="frame_name">Display Name</label></th>
                        <td>
                            <input type="text" name="frame_name" id="frame_name" class="regular-text" required>
                            <p class="description">Name displayed to customers (e.g., 'Black Metal Frame (1")').</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="frame_width">Width (inches)</label></th>
                        <td>
                            <input type="number" name="frame_width" id="frame_width" class="regular-text" min="0.5" max="3" step="0.125" value="1" required>
                            <p class="description">Width of the frame moulding in inches.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="frame_color">Base Color</label></th>
                        <td>
                            <input type="color" name="frame_color" id="frame_color" value="#000000">
                            <p class="description">Base color for the frame (used as fallback if texture fails to load).</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="frame_texture">Texture Image</label></th>
                        <td>
                            <input type="file" name="frame_texture" id="frame_texture">
                            <p class="description">Upload a texture image for the frame (JPG or PNG, recommended size: 500x100px).</p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="add_frame" class="button button-primary" value="Add New Frame">
                </p>
            </form>
        </div>
    </div>
    <?php
}

/**
 * Mat Options admin page
 */
function cfd_mat_options_page() {
    // Process form submission
    if (isset($_POST['cfd_mat_options_nonce']) && wp_verify_nonce($_POST['cfd_mat_options_nonce'], 'cfd_mat_options_update')) {
        // Handle new mat color addition
        if (isset($_POST['add_mat']) && !empty($_POST['mat_key']) && !empty($_POST['mat_name'])) {
            $mat_key = sanitize_key($_POST['mat_key']);
            $mat_name = sanitize_text_field($_POST['mat_name']);
            $mat_color = sanitize_text_field($_POST['mat_color']);
            
            // Get existing mat colors
            $mat_colors = get_option('cfd_mat_colors', array());
            
            // Add new mat color
            $mat_colors[$mat_key] = array(
                'name' => $mat_name,
                'hex' => $mat_color
            );
            
            // Save updated options
            update_option('cfd_mat_colors', $mat_colors);
            
            // Success message
            add_settings_error('cfd_mat_options', 'cfd_mat_added', 'New mat color added successfully.', 'updated');
        }
        
        // Handle mat color deletion
        if (isset($_POST['delete_mat']) && !empty($_POST['delete_key'])) {
            $delete_key = sanitize_key($_POST['delete_key']);
            
            // Get existing mat colors
            $mat_colors = get_option('cfd_mat_colors', array());
            
            // Remove mat color
            if (isset($mat_colors[$delete_key])) {
                unset($mat_colors[$delete_key]);
            }
            
            // Save updated options
            update_option('cfd_mat_colors', $mat_colors);
            
            // Success message
            add_settings_error('cfd_mat_options', 'cfd_mat_deleted', 'Mat color deleted successfully.', 'updated');
        }
    }
    
    // Get current mat colors
    $mat_colors = get_option('cfd_mat_colors', array(
        'cream' => array('name' => 'Cream', 'hex' => '#F5F5DC'),
        'tan' => array('name' => 'Tan', 'hex' => '#D2B48C'),
        'dark-brown' => array('name' => 'Dark Brown', 'hex' => '#654321'),
        'gray' => array('name' => 'Gray', 'hex' => '#808080'),
        'black' => array('name' => 'Black', 'hex' => '#000000'),
        'white' => array('name' => 'White', 'hex' => '#FFFFFF'),
        'pink' => array('name' => 'Pink', 'hex' => '#FFB6C1'),
        'green' => array('name' => 'Green', 'hex' => '#00AA00')
    ));
    
    // Display the admin page
    ?>
    <div class="wrap">
        <h1>Custom Frame Designer - Mat Options</h1>
        
        <?php settings_errors('cfd_mat_options'); ?>
        
        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>Current Mat Colors</h2>
            <p>Manage available mat colors for the custom frame designer.</p>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Mat Key</th>
                        <th>Display Name</th>
                        <th>Color</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($mat_colors)): ?>
                        <tr>
                            <td colspan="4">No mat colors found. Add your first mat color below.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($mat_colors as $key => $mat): ?>
                            <tr>
                                <td><?php echo esc_html($key); ?></td>
                                <td><?php echo esc_html($mat['name']); ?></td>
                                <td>
                                    <div style="width: 30px; height: 20px; background-color: <?php echo esc_attr($mat['hex']); ?>; border: 1px solid #ddd;"></div>
                                </td>
                                <td>
                                    <form method="post" action="">
                                        <?php wp_nonce_field('cfd_mat_options_update', 'cfd_mat_options_nonce'); ?>
                                        <input type="hidden" name="delete_key" value="<?php echo esc_attr($key); ?>">
                                        <button type="submit" name="delete_mat" class="button" onclick="return confirm('Are you sure you want to delete this mat color?');">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        
        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>Add New Mat Color</h2>
            <p>Add a new mat color option to the custom frame designer.</p>
            
            <form method="post" action="">
                <?php wp_nonce_field('cfd_mat_options_update', 'cfd_mat_options_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="mat_key">Mat Key</label></th>
                        <td>
                            <input type="text" name="mat_key" id="mat_key" class="regular-text" required>
                            <p class="description">Unique identifier for this mat color (e.g., 'navy-blue').</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="mat_name">Display Name</label></th>
                        <td>
                            <input type="text" name="mat_name" id="mat_name" class="regular-text" required>
                            <p class="description">Name displayed to customers (e.g., 'Navy Blue').</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="mat_color">Color</label></th>
                        <td>
                            <input type="color" name="mat_color" id="mat_color" value="#FFFFFF">
                            <p class="description">Select the color for this mat.</p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="add_mat" class="button button-primary" value="Add New Mat Color">
                </p>
            </form>
        </div>
        
        <!-- Mat Size Settings -->
        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>Mat Size Settings</h2>
            <p>Configure the min, max, and step values for mat sizing options.</p>
            
            <?php
            // Process mat size settings
            if (isset($_POST['update_mat_sizes']) && isset($_POST['cfd_mat_options_nonce'])) {
                $mat_settings = array(
                    'min_width' => floatval($_POST['min_mat_width']),
                    'max_width' => floatval($_POST['max_mat_width']),
                    'step_size' => floatval($_POST['mat_step_size']),
                    'min_reveal' => floatval($_POST['min_reveal']),
                    'max_reveal' => floatval($_POST['max_reveal']),
                    'min_whitespace' => floatval($_POST['min_whitespace']),
                    'max_whitespace' => floatval($_POST['max_whitespace']),
                    'min_vgroove' => floatval($_POST['min_vgroove']),
                    'max_vgroove' => floatval($_POST['max_vgroove'])
                );
                
                update_option('cfd_mat_settings', $mat_settings);
                add_settings_error('cfd_mat_options', 'cfd_mat_sizes_updated', 'Mat size settings updated successfully.', 'updated');
            }
            
            // Get current mat size settings
            $mat_settings = get_option('cfd_mat_settings', array(
                'min_width' => 0,
                'max_width' => 6,
                'step_size' => 0.125,
                'min_reveal' => 0.125,
                'max_reveal' => 1,
                'min_whitespace' => 0.25,
                'max_whitespace' => 1,
                'min_vgroove' => 0.5,
                'max_vgroove' => 3
            ));
            ?>
            
            <form method="post" action="">
                <?php wp_nonce_field('cfd_mat_options_update', 'cfd_mat_options_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Mat Width Range</th>
                        <td>
                            <label>Min: <input type="number" name="min_mat_width" value="<?php echo esc_attr($mat_settings['min_width']); ?>" step="0.125" min="0" max="6" style="width: 80px;"></label>
                            <label>Max: <input type="number" name="max_mat_width" value="<?php echo esc_attr($mat_settings['max_width']); ?>" step="0.125" min="0" max="12" style="width: 80px;"></label>
                            <label>Step: <input type="number" name="mat_step_size" value="<?php echo esc_attr($mat_settings['step_size']); ?>" step="0.0625" min="0.0625" max="0.5" style="width: 80px;"></label>
                            <p class="description">Set the minimum and maximum mat width in inches, and the step increment.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Reveal Size Range</th>
                        <td>
                            <label>Min: <input type="number" name="min_reveal" value="<?php echo esc_attr($mat_settings['min_reveal']); ?>" step="0.0625" min="0.0625" max="0.5" style="width: 80px;"></label>
                            <label>Max: <input type="number" name="max_reveal" value="<?php echo esc_attr($mat_settings['max_reveal']); ?>" step="0.0625" min="0.125" max="2" style="width: 80px;"></label>
                            <p class="description">Set the minimum and maximum reveal size in inches for second mats.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Whitespace Range</th>
                        <td>
                            <label>Min: <input type="number" name="min_whitespace" value="<?php echo esc_attr($mat_settings['min_whitespace']); ?>" step="0.125" min="0.125" max="0.5" style="width: 80px;"></label>
                            <label>Max: <input type="number" name="max_whitespace" value="<?php echo esc_attr($mat_settings['max_whitespace']); ?>" step="0.125" min="0.25" max="2" style="width: 80px;"></label>
                            <p class="description">Set the minimum and maximum whitespace size in inches.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">V-Groove Distance Range</th>
                        <td>
                            <label>Min: <input type="number" name="min_vgroove" value="<?php echo esc_attr($mat_settings['min_vgroove']); ?>" step="0.125" min="0.5" max="1" style="width: 80px;"></label>
                            <label>Max: <input type="number" name="max_vgroove" value="<?php echo esc_attr($mat_settings['max_vgroove']); ?>" step="0.125" min="1" max="6" style="width: 80px;"></label>
                            <p class="description">Set the minimum and maximum distance of v-grooves from the mat opening in inches.</p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="update_mat_sizes" class="button button-primary" value="Save Mat Size Settings">
                </p>
            </form>
        </div>
    </div>
    <?php
}

/**
 * Register JavaScript that loads pricing data from the database
 */
function cfd_load_dynamic_pricing() {
    // Only load on pages with our shortcode
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'framing_stage')) {
        // Get pricing data from options
        $base_prices = get_option('cfd_base_prices', array());
        $mat_pricing = get_option('cfd_mat_pricing', array());
        $frame_pricing = get_option('cfd_frame_pricing', array());
        $glass_pricing = get_option('cfd_glass_pricing', array());
        $paper_pricing = get_option('cfd_paper_pricing', array());
        $additional_fees = get_option('cfd_additional_fees', array());
        
        // Get moulding profiles data
        $moulding_profiles = get_option('cfd_moulding_profiles', array());
        
        // Get mat colors
        $mat_colors = get_option('cfd_mat_colors', array());
        
        // Prepare data for JavaScript
        $pricing_data = array(
            'basePrices' => $base_prices,
            'matPricing' => $mat_pricing,
            'framePricing' => $frame_pricing,
            'glassPricing' => $glass_pricing,
            'paperPricing' => $paper_pricing,
            'additionalFees' => $additional_fees
        );
        
        // Prepare profiles data
        $profiles_data = array();
        foreach ($moulding_profiles as $key => $profile) {
            $profiles_data[$key] = $profile;
        }
        
        // Prepare mat colors data
        $mat_colors_data = array();
        foreach ($mat_colors as $key => $color) {
            $mat_colors_data[$key] = $color['hex'];
        }
        
        // Enqueue custom script
        wp_register_script('cfd-pricing-data', false);
        wp_enqueue_script('cfd-pricing-data');
        
        // Add inline script with dynamic data
        wp_add_inline_script('cfd-pricing-data', 'const pricingData = ' . json_encode($pricing_data) . ';
        const mouldingProfiles = ' . json_encode($profiles_data) . ';
        const matColors = ' . json_encode($mat_colors_data) . ';', 'before');
    }
}
add_action('wp_enqueue_scripts', 'cfd_load_dynamic_pricing');