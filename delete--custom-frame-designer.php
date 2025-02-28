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

// register shortcode - framin_stage
