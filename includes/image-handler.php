<?php
// Exit if accessed directly
if (!defined('ABSPATH')) exit;

/**
 * Handles AJAX upload of the original image (for printing).
 * Saves the file in the /uploads/custom-frame-originals/ folder.
 */
function upload_original_image() {
    // debugging
    file_put_contents(ABSPATH . '/upload-debug.txt', "upload_original_image triggered\n", FILE_APPEND);
    
    check_ajax_referer('custom_frame_nonce', 'nonce');

    if (!function_exists('wp_handle_upload')) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
    }

    // Set custom upload directory
    add_filter('upload_dir', 'cfd_custom_upload_directory');
    
    $uploadedfile = $_FILES['file'];
    $upload_overrides = array('test_form' => false);

    $movefile = wp_handle_upload($uploadedfile, $upload_overrides);

    // Remove the upload_dir filter after use
    remove_filter('upload_dir', 'cfd_custom_upload_directory');

    if ($movefile && !isset($movefile['error'])) {
        // Debug the successful response
        file_put_contents(ABSPATH . '/upload-debug.txt', "Upload success: " . print_r($movefile, true), FILE_APPEND);
        
        // Correctly format response for WordPress AJAX
        wp_send_json_success(array(
            'file_url'  => $movefile['url'],
            'file_path' => $movefile['file'],
            'message'   => 'File uploaded successfully'
        ));
    } else {
        // Debug the error response
        file_put_contents(ABSPATH . '/upload-debug.txt', "Upload error: " . print_r($movefile, true), FILE_APPEND);
        
        wp_send_json_error(array(
            'message' => $movefile['error'] ?? 'Upload failed.'
        ));
    }
}

add_action('wp_ajax_upload_original_image', 'upload_original_image');
add_action('wp_ajax_nopriv_upload_original_image', 'upload_original_image');

/**
 * Set custom upload directory for original images.
 */
function cfd_custom_upload_directory($dirs) {
    $subdir = '/custom-frame-originals';

    $dirs['subdir'] = $subdir;
    $dirs['path'] = $dirs['basedir'] . $subdir;
    $dirs['url'] = $dirs['baseurl'] . $subdir;

    return $dirs;
}