<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class CFD_File_Manager {
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'schedule_cleanup'));
        add_action('cfd_daily_cleanup', array($this, 'cleanup_temp_uploads'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function activate() {
        $this->schedule_cleanup();
    }
    
    public function deactivate() {
        wp_clear_scheduled_hook('cfd_daily_cleanup');
    }
    
    public function schedule_cleanup() {
        if (!wp_next_scheduled('cfd_daily_cleanup')) {
            wp_schedule_event(time(), 'daily', 'cfd_daily_cleanup');
        }
    }
    
    public function cleanup_temp_uploads() {
        $upload_dir = wp_upload_dir();
        $temp_dir = $upload_dir['basedir'] . '/cfd-orders/temp';
        
        if (is_dir($temp_dir)) {
            $this->remove_old_files($temp_dir, 86400); // 24 hours
        }
    }
    
    private function remove_old_files($dir, $max_age) {
        $files = glob($dir . '/*');
        $now = time();
        
        foreach ($files as $file) {
            if (is_dir($file)) {
                $this->remove_old_files($file, $max_age);
                @rmdir($file); // Remove directory if empty
            } elseif (is_file($file) && ($now - filemtime($file) >= $max_age)) {
                @unlink($file);
            }
        }
    }
    
    public static function get_order_upload_dir($order_id = 'temp', $create = true) {
        $upload_dir = wp_upload_dir();
        $order_dir = array(
            'basedir' => $upload_dir['basedir'] . '/cfd-orders/' . $order_id,
            'baseurl' => $upload_dir['baseurl'] . '/cfd-orders/' . $order_id,
            'original' => array(
                'dir' => $upload_dir['basedir'] . '/cfd-orders/' . $order_id . '/originals',
                'url' => $upload_dir['baseurl'] . '/cfd-orders/' . $order_id . '/originals'
            ),
            'preview' => array(
                'dir' => $upload_dir['basedir'] . '/cfd-orders/' . $order_id . '/previews',
                'url' => $upload_dir['baseurl'] . '/cfd-orders/' . $order_id . '/previews'
            )
        );
        
        if ($create) {
            wp_mkdir_p($order_dir['original']['dir']);
            wp_mkdir_p($order_dir['preview']['dir']);
            
            // Add .htaccess for security
            $htaccess = $upload_dir['basedir'] . '/cfd-orders/.htaccess';
            if (!file_exists($htaccess)) {
                file_put_contents($htaccess, "Options -Indexes\nDeny from all");
            }
        }
        
        return $order_dir;
    }
}

// Initialize the file manager
function cfd_file_manager_init() {
    return CFD_File_Manager::get_instance();
}
add_action('plugins_loaded', 'cfd_file_manager_init');
