<?php
/**
 * Add admin menu for Custom Frame Designer
 */
function cfd_add_admin_menu() {
    add_menu_page(
        'Custom Frame Designer',
        'Frame Designer',
        'manage_options',
        'custom-frame-designer',
        'cfd_admin_page',
        'dashicons-layout',
        30
    );
    
    add_submenu_page(
        'custom-frame-designer',
        'Pricing Settings',
        'Pricing',
        'manage_options',
        'cfd-pricing',
        'cfd_pricing_page'
    );
    
    add_submenu_page(
        'custom-frame-designer',
        'Frame Options',
        'Frame Options',
        'manage_options',
        'cfd-frame-options',
        'cfd_frame_options_page'
    );
    
    add_submenu_page(
        'custom-frame-designer',
        'Mat Options',
        'Mat Options',
        'manage_options',
        'cfd-mat-options',
        'cfd_mat_options_page'
    );
}
add_action('admin_menu', 'cfd_add_admin_menu');

/**
 * Main admin page
 */
function cfd_admin_page() {
    ?>
    <div class="wrap">
        <h1>Custom Frame Designer Settings</h1>
        
        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>Welcome to the Custom Frame Designer Admin</h2>
            <p>Use the submenu options to manage pricing and available options for your custom framing tool.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div class="card" style="padding: 15px;">
                    <h3>Pricing Settings</h3>
                    <p>Configure base prices, mat costs, frame moulding rates, and additional fees.</p>
                    <a href="<?php echo admin_url('admin.php?page=cfd-pricing'); ?>" class="button">Manage Pricing</a>
                </div>
                
                <div class="card" style="padding: 15px;">
                    <h3>Frame Options</h3>
                    <p>Manage available frame mouldings, textures, and dimensions.</p>
                    <a href="<?php echo admin_url('admin.php?page=cfd-frame-options'); ?>" class="button">Manage Frames</a>
                </div>
                
                <div class="card" style="padding: 15px;">
                    <h3>Mat Options</h3>
                    <p>Configure available mat colors, sizes, and special options.</p>
                    <a href="<?php echo admin_url('admin.php?page=cfd-mat-options'); ?>" class="button">Manage Mats</a>
                </div>
                
                <div class="card" style="padding: 15px;">
                    <h3>WooCommerce Integration</h3>
                    <p>Connect frame designer to your product catalog.</p>
                    <a href="<?php echo admin_url('admin.php?page=wc-settings&tab=products'); ?>" class="button">WooCommerce Settings</a>
                </div>
            </div>
        </div>
    </div>
    <?php
}

/**
 * Pricing admin page
 */
function cfd_pricing_page() {
    // Process form submission
    if (isset($_POST['cfd_pricing_nonce']) && wp_verify_nonce($_POST['cfd_pricing_nonce'], 'cfd_pricing_update')) {
        // Base prices
        $base_prices = array(
            'framed' => sanitize_text_field($_POST['base_price_framed']),
            'canvas' => sanitize_text_field($_POST['base_price_canvas']),
            'acrylic' => sanitize_text_field($_POST['base_price_acrylic']),
            'paper' => sanitize_text_field($_POST['base_price_paper'])
        );
        update_option('cfd_base_prices', $base_prices);
        
        // Mat pricing
        $mat_pricing = array(
            'standard' => sanitize_text_field($_POST['mat_pricing_standard']),
            'secondMat' => sanitize_text_field($_POST['mat_pricing_second']),
            'vgroove' => sanitize_text_field($_POST['mat_pricing_vgroove'])
        );
        update_option('cfd_mat_pricing', $mat_pricing);
        
        // Frame pricing - dynamic based on available mouldings
        $frame_pricing = array();
        if (isset($_POST['frame_pricing']) && is_array($_POST['frame_pricing'])) {
            foreach ($_POST['frame_pricing'] as $key => $value) {
                $frame_pricing[$key] = sanitize_text_field($value);
            }
        }
        update_option('cfd_frame_pricing', $frame_pricing);
        
        // Glass pricing
        $glass_pricing = array(
            'regular' => sanitize_text_field($_POST['glass_pricing_regular']),
            'reflection-control' => sanitize_text_field($_POST['glass_pricing_reflection'])
        );
        update_option('cfd_glass_pricing', $glass_pricing);
        
        // Paper pricing
        $paper_pricing = array(
            'matte' => sanitize_text_field($_POST['paper_pricing_matte']),
            'glossy' => sanitize_text_field($_POST['paper_pricing_glossy']),
            'cotton' => sanitize_text_field($_POST['paper_pricing_cotton']),
            'baryta' => sanitize_text_field($_POST['paper_pricing_baryta'])
        );
        update_option('cfd_paper_pricing', $paper_pricing);
        
        // Additional fees
        $additional_fees = array(
            'multipleOpenings' => sanitize_text_field($_POST['fee_multiple_openings']),
            'circularOpening' => sanitize_text_field($_POST['fee_circular_opening']),
            'handling' => sanitize_text_field($_POST['fee_handling'])
        );
        update_option('cfd_additional_fees', $additional_fees);
        
        // Show success message
        add_settings_error('cfd_pricing', 'cfd_pricing_updated', 'Pricing settings saved successfully.', 'updated');
    }
    
    // Get current pricing data
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
    
    $frame_pricing = get_option('cfd_frame_pricing', array(
        'black-1' => '0.80',
        'brown-1.5' => '1.20',
        'blue-2' => '1.80'
    ));
    
    $glass_pricing = get_option('cfd_glass_pricing', array(
        'regular' => '0.08',
        'reflection-control' => '0.12'
    ));
    
    $paper_pricing = get_option('cfd_paper_pricing', array(
        'matte' => '0.05',
        'glossy' => '0.06',
        'cotton' => '0.10',
        'baryta' => '0.12'
    ));
    
    $additional_fees = get_option('cfd_additional_fees', array(
        'multipleOpenings' => '15.00',
        'circularOpening' => '10.00',
        'handling' => '5.00'
    ));
    
    // Get frame moulding options
    $moulding_profiles = get_option('cfd_moulding_profiles', array(
        'black-1' => array('name' => 'Black Frame (1")', 'width' => 1),
        'brown-1.5' => array('name' => 'Cherry Frame (1.5")', 'width' => 1.5),
        'blue-2' => array('name' => 'Gold Frame (2")', 'width' => 2)
    ));
    
    // Display the settings form
    ?>
    <div class="wrap">
        <h1>Custom Frame Designer - Pricing Settings</h1>
        
        <?php settings_errors('cfd_pricing'); ?>
        
        <form method="post" action="">
            <?php wp_nonce_field('cfd_pricing_update', 'cfd_pricing_nonce'); ?>
            
            <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
                <h2>Base Prices (per square inch)</h2>
                <p>Set the base price per square inch for each print type.</p>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Custom Framed Print</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="base_price_framed" value="<?php echo esc_attr($base_prices['framed']); ?>" step="0.01" min="0">
                            <p class="description">Base price per square inch for framed prints.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Canvas Gallery Wrap</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="base_price_canvas" value="<?php echo esc_attr($base_prices['canvas']); ?>" step="0.01" min="0">
                            <p class="description">Base price per square inch for canvas gallery wraps.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Acrylic Face Mount</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="base_price_acrylic" value="<?php echo esc_attr($base_prices['acrylic']); ?>" step="0.01" min="0">
                            <p class="description">Base price per square inch for acrylic face mounts.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Paper Print Only</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="base_price_paper" value="<?php echo esc_attr($base_prices['paper']); ?>" step="0.01" min="0">
                            <p class="description">Base price per square inch for paper prints without frame.</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
                <h2>Mat Pricing (per linear inch)</h2>
                <p>Set the price per linear inch of mat perimeter.</p>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Standard Mat</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="mat_pricing_standard" value="<?php echo esc_attr($mat_pricing['standard']); ?>" step="0.01" min="0">
                            <p class="description">Price per linear inch for standard mat.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Second Mat (additional)</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="mat_pricing_second" value="<?php echo esc_attr($mat_pricing['secondMat']); ?>" step="0.01" min="0">
                            <p class="description">Additional price per linear inch for second mat.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">V-Groove</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="mat_pricing_vgroove" value="<?php echo esc_attr($mat_pricing['vgroove']); ?>" step="0.01" min="0">
                            <p class="description">Price per linear inch for v-groove.</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
                <h2>Frame Moulding Pricing (per linear inch)</h2>
                <p>Set the price per linear inch for each frame moulding option.</p>
                
                <table class="form-table">
                    <?php foreach ($moulding_profiles as $key => $profile): ?>
                    <tr>
                        <th scope="row"><?php echo esc_html($profile['name']); ?></th>
                        <td>
                            <label>$</label>
                            <input type="number" name="frame_pricing[<?php echo esc_attr($key); ?>]" 
                                value="<?php echo isset($frame_pricing[$key]) ? esc_attr($frame_pricing[$key]) : '0.00'; ?>" 
                                step="0.01" min="0">
                            <p class="description"><?php echo esc_html($profile['width']); ?>" width moulding.</p>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </table>
            </div>
            
            <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
                <h2>Glass Pricing (per square inch)</h2>
                <p>Set the price per square inch for each glass option.</p>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Regular Glass</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="glass_pricing_regular" value="<?php echo esc_attr($glass_pricing['regular']); ?>" step="0.01" min="0">
                            <p class="description">Price per square inch for regular glass.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Reflection Control Glass</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="glass_pricing_reflection" value="<?php echo esc_attr($glass_pricing['reflection-control']); ?>" step="0.01" min="0">
                            <p class="description">Price per square inch for reflection control glass.</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
                <h2>Paper Pricing (per square inch - additional)</h2>
                <p>Set the additional price per square inch for each paper type.</p>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Matte Photo Paper</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="paper_pricing_matte" value="<?php echo esc_attr($paper_pricing['matte']); ?>" step="0.01" min="0">
                            <p class="description">Additional price per square inch for matte photo paper.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Glossy Photo Paper</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="paper_pricing_glossy" value="<?php echo esc_attr($paper_pricing['glossy']); ?>" step="0.01" min="0">
                            <p class="description">Additional price per square inch for glossy photo paper.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">100% Cotton Rag Paper</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="paper_pricing_cotton" value="<?php echo esc_attr($paper_pricing['cotton']); ?>" step="0.01" min="0">
                            <p class="description">Additional price per square inch for cotton rag paper.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Baryta Fiber Paper</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="paper_pricing_baryta" value="<?php echo esc_attr($paper_pricing['baryta']); ?>" step="0.01" min="0">
                            <p class="description">Additional price per square inch for baryta fiber paper.</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
                <h2>Additional Fees (flat fees)</h2>
                <p>Set flat fees for special options and handling.</p>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Multiple Openings</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="fee_multiple_openings" value="<?php echo esc_attr($additional_fees['multipleOpenings']); ?>" step="0.01" min="0">
                            <p class="description">Additional flat fee for multiple mat openings (e.g., for plaques).</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Circular/Oval Opening</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="fee_circular_opening" value="<?php echo esc_attr($additional_fees['circularOpening']); ?>" step="0.01" min="0">
                            <p class="description">Additional flat fee for circular or oval mat openings.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Handling Fee</th>
                        <td>
                            <label>$</label>
                            <input type="number" name="fee_handling" value="<?php echo esc_attr($additional_fees['handling']); ?>" step="0.01" min="0">
                            <p class="description">Base handling fee applied to all orders.</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <p class="submit">
                <input type="submit" name="submit" id="submit" class="button button-primary" value="Save Pricing Settings">
            </p>
        </form>
    </div>
    <?php
}