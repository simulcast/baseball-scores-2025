import WebRenderer from '@elemaudio/web-renderer';
import { el } from '@elemaudio/core';

/**
 * ElementaryRenderer manages the Elementary Audio WebRenderer instance
 * and provides methods for initializing, rendering, and updating audio parameters
 */
class ElementaryRenderer {
  constructor() {
    this.core = new WebRenderer();
    this.isInitialized = false;
    this.virtualFileSystem = {};
    this.parameterValues = new Map();
    
    // Event listeners
    this.eventListeners = {
      load: [],
      error: [],
      meter: [],
      snapshot: []
    };
    
    // Set up core event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up internal event handlers for the renderer
   */
  setupEventHandlers() {
    this.core.on('load', () => {
      this.isInitialized = true;
      this.emit('load');
    });

    this.core.on('error', (err) => {
      console.error('Elementary renderer error:', err);
      this.emit('error', err);
    });

    this.core.on('meter', (e) => {
      this.emit('meter', e);
    });

    this.core.on('snapshot', (e) => {
      this.emit('snapshot', e);
    });
  }

  /**
   * Initialize the Elementary audio renderer
   * Must be called after user interaction (click, keypress, etc.)
   * @param {Object} options - Initialization options
   * @param {number} options.sampleRate - Sample rate (default: 44100)
   * @param {Object} options.virtualFileSystem - Virtual file system for samples
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    const {
      sampleRate = 44100,
      virtualFileSystem = {}
    } = options;

    try {
      // Store virtual file system for later use
      this.virtualFileSystem = virtualFileSystem;
      
      // Initialize the renderer with options
      await this.core.initialize({
        sampleRate,
        virtualFileSystem: this.virtualFileSystem
      });
      
      console.log('Elementary renderer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Elementary renderer:', error);
      throw error;
    }
  }

  /**
   * Render audio signal to left and right channels
   * @param {Signal} leftChannel - Left channel signal
   * @param {Signal} rightChannel - Right channel signal
   */
  render(leftChannel, rightChannel) {
    if (!this.isInitialized) {
      console.warn('ElementaryRenderer not initialized. Call initialize() first.');
      return;
    }

    try {
      this.core.render(leftChannel, rightChannel);
    } catch (error) {
      console.error('Error rendering audio:', error);
      this.emit('error', error);
    }
  }

  /**
   * Update a parameter value using Elementary's event system
   * @param {string} key - Parameter key (e.g., 'filter:cutoff')
   * @param {number} value - New parameter value
   */
  updateParameter(key, value) {
    if (!this.isInitialized) {
      console.warn('ElementaryRenderer not initialized. Call initialize() first.');
      return;
    }

    // Store the value for reference
    this.parameterValues.set(key, value);
    
    // Send the update event to Elementary
    this.core.emit('change', { key, value });
  }

  /**
   * Get current parameter value
   * @param {string} key - Parameter key
   * @returns {number|undefined} Current parameter value
   */
  getParameter(key) {
    return this.parameterValues.get(key);
  }

  /**
   * Update multiple parameters at once
   * @param {Object} parameters - Object with key-value pairs
   */
  updateParameters(parameters) {
    Object.entries(parameters).forEach(([key, value]) => {
      this.updateParameter(key, value);
    });
  }

  /**
   * Stop all audio playback
   */
  stop() {
    if (!this.isInitialized) return;
    
    // Render silence to both channels
    const silence = el.const({ value: 0 });
    this.render(silence, silence);
  }

  /**
   * Add event listener
   * @param {string} event - Event name ('load', 'error', 'meter', 'snapshot')
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        cb => cb !== callback
      );
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      });
    }
  }

  /**
   * Check if renderer is initialized
   * @returns {boolean}
   */
  get initialized() {
    return this.isInitialized;
  }

  /**
   * Get the underlying WebRenderer instance
   * @returns {WebRenderer}
   */
  get renderer() {
    return this.core;
  }
}

// Export singleton instance
export default new ElementaryRenderer();