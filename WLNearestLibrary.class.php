<?php
 /* 
     This singleton class contains all the logic for the WL Nearest Library plugin

 */

class WLNearestLibrary {
	public $settings= array();
	protected static $instance = null;

	function __construct() {
		$this->settings = get_option('wl-nearest-library_options', array());
	}

	// This class should only get instantiated with this method. IOK 2019-10-14 
	public static function instance()  {
		if (!static::$instance) static::$instance = new static();
		return static::$instance;
	}

	private function translation_dummy () {
		print __('Dynamic string', 'wl-nearest-library');
	}

	public function init () {
                $this->enqueue_scripts();
                $this->add_shortcodes();
	}

        function add_shortcodes() {
            add_shortcode('library_shortcode', array($this,'nearest_library_shortcode'));
            add_shortcode('google-map', function ($attr,$content) {
                return '<div id="map-canvas" style="height: 400px; margin: 0;padding: 0;"></div></br>';
            });

        }

        public function enqueue_scripts() {
            $key = @$this->settings['gmapkey']; 
            $geolockey= @$this->settings['geolockey']; 
            //wp_enqueue_script( 'WLgmap', 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBr36rqZ6Xv97_0yW8kgvza-7_xAKQhvBo' );
            wp_enqueue_script( 'WLgmap', 'https://maps.googleapis.com/maps/api/js?key=' . $key, array(), '5.5' );

            wp_register_script('WLNearestLibraries', plugins_url( 'js/nearest-library.js', __FILE__ ), array('jquery'), filemtime( plugin_dir_path( __FILE__ ) . 'js/nearest-library.js'));
            wp_localize_script('WLNearestLibraries', 'WLNearestLibrarySettings', array('gmapkey'=>$key,'geolockey'=>$geolockey));
            wp_enqueue_script('WLNearestLibraries');
        }
      
	public function plugins_loaded () {
		$ok = load_plugin_textdomain('wl-nearest-library', false, basename( dirname( __FILE__ ) ) . "/languages");
	}

	public function admin_init () {
		register_setting('wl-nearest-library_options','wl-nearest-library_options', array($this,'validate'));
	}

	public function admin_menu () {
		add_options_page(__('static', 'wl-nearest-library'), __('WL Nearest Library','wl-nearest-library'), 'manage_options', 'wl-nearest-library_options',array($this,'toolpage'));
	}
	// Helper function for creating an admin notice.
	public function add_admin_notice($notice,$type='info') {
		add_action('admin_notices', function() use ($notice,$type) { echo "<div class='notice notice-$type is-dismissible'><p>$notice</p></div>"; });
	}

	// This is the main options-page for this plugin. The classes VippsLogin and WooLogin adds more options to this screen just to 
	// keep the option-data local to each class. IOK 2019-10-14
	public function toolpage () {
		if (!is_admin() || !current_user_can('manage_options')) {
			die(__("Insufficient privileges",'wl-nearest-library'));
		}
		$options = get_option('wl-nearest-library_options'); 
                $xmlfile =  $this->getXMLFile();
                if (!$xmlfile) {
                    $this->add_admin_notice(__('Could not download the libriaries.xml file containing the locations of libraries. See the error log for details', 'wl-nearest-library'),'error');
                } else {
                    $this->add_admin_notice(sprintf(__('Library location file downloaded OK to %s', 'wl-nearest-library'),$xmlfile));
                }

		?>
			<div class='wrap'>
			<h2><?php _e('WL Nearest Library', 'wl-nearest-library'); ?></h2>

			<?php do_action('admin_notices'); ?>

			<form action='options.php' method='post'>
			<?php settings_fields('wl-nearest-library_options'); ?>
			<table class="form-table" style="width:100%">

			<tr>
			<td><?php _e('Google Maps Key', 'wl-nearest-library'); ?></td>
			<td width=30%>
			<input style="width:100%" type=text required id=gmapkey name="wl-nearest-library_options[gmapkey]" value="<?php echo esc_attr($options['gmapkey']); ?>">
			</td>
			<td><?php _e('Enter your Google Maps key.','wl-nearest-library'); ?></td>
			</tr>
			<tr>
			<td><?php _e('Google Maps Geolocation Key', 'wl-nearest-library'); ?></td>
			<td width=30%>
			<input style="width:100%" type=text required id=gmapkey name="wl-nearest-library_options[geolockey]" value="<?php echo esc_attr($options['geolockey']); ?>">
			</td>
			<td><?php _e('Enter your Google Maps GeoLocation API key. Can be the same as the above if you have activated the geolocation API for that key','wl-nearest-library'); ?></td>
			</tr>

			</table>
			<div> <input type="submit" style="float:left" class="button-primary" value="<?php _e('Save Changes') ?>" /> </div>

			</form>

			</div>

			<?php
	}

	// Validating user options. Currenlty a trivial function. IOK 2019-10-19
	public function validate ($input) {
		$current =  get_option('wl-nearest-library_options'); 

		$valid = array();
		foreach($input as $k=>$v) {
			switch ($k) {
				default: 
					$valid[$k] = $v;
			}
		}
		return $valid;
	}

	// The activation hook will create the session database tables if they do not or if the database has been upgraded. IOK 2019-10-14
	public function activate () {
		// Options
		$default = array();
		add_option('wl-nearest-library_options',$default,false);
	}
	public static  function deactivate () {
                global $wpdb;
	}
	public static function uninstall() {
	}

        public function getXMLFile() {
            $uploadinfo = wp_get_upload_dir();
            $basedir = trailingslashit($uploadinfo['basedir']);
            $xmlfile = $basedir . 'libraries.xml';
            if (file_exists($xmlfile) && (time() - filemtime($xmlfile)) < (3600 * 24 * 14)) {
                return $xmlfile;
            }
            $tmpfile = $basedir . "libraries.tmp.xml";
            $fullfile = 'http://www.nb.no/baser/bibliotek/eksport/bb-full.xml';
            $download = wp_remote_get($fullfile);
            if (is_wp_error($download)) {
              error_log("Could not download the bb-full.xml libary file: " . $download->get_error_message());
              if (file_exists($xmlfile)) return $xmlfile;
              return null;
            }
            $content = wp_remote_retrieve_body($download);
            $ok = file_put_contents($tmpfile,$content);
            if ($ok) {
                 rename($tmpfile,$xmlfile);
            } else {
                 error_log("Could not write to $xmlfile!");
            }
            if (file_exists($xmlfile)) return $xmlfile;
            return null;
        }


        public function nearest_library_shortcode($attrs,$content) {
            $pathFile = $this->getXMLFile();
            if (is_file($pathFile) && is_readable($pathFile)) {
                ob_start();
                $xml = simplexml_load_file($pathFile);
                echo "<div id='librarydatabase'>";
                foreach ($xml->children() as $record) {
                    if(!empty($record->lat_lon))
                    {
                        /*if( strpos($record->bibltype,'FIL') !== false || strpos($record->bibltype,'FBI') !== false )
                          {*/
                        if(trim($record->bibltype) == 'FBI' || trim($record->bibltype) == 'FIL' || trim($record->bibltype) == 'FBI+GSK' || trim($record->bibltype) == 'FIL+GSK' || trim($record->bibltype) == 'FBI+VGS' || trim($record->bibltype) == 'FIL+VGS'){

                            echo "<div style='display:none' id='".$record->bibnr."'>".$record->lat_lon.'|'.$record->inst.'|'.$record->vadr.'|'.$record->vpostnr.'|'.$record->vpoststed.'|'.$record->tlf.'|'.$record->tlfax.'|'.$record->epost_adr.'|'.$record->bibltype.'|'.$record->url_hjem.'</div>';
                        }
                        /*}*/
                    }

                }
                echo "</div>";
                return ob_get_clean();
            } else {
              error_log("Could not read libraries.xml file containing positions of norwegian libraries - from $pathFile");
            }
        }


}
