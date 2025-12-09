/**
 * Notification Queue Manager
 * Manages achievement notification queue in localStorage
 */

class NotificationQueue {
  constructor() {
    this.storageKey = 'tpv_achievement_notifications';
    this.queue = this.load();
  }

  /**
   * Load notification queue from localStorage
   * @returns {Array} Array of notification objects
   */
  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load notification queue:', error);
      return [];
    }
  }

  /**
   * Save notification queue to localStorage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save notification queue:', error);
    }
  }

  /**
   * Add a notification to the queue
   * @param {Object} notification - Notification object containing awardId, eventNumber, category, intensity
   */
  add(notification) {
    const id = `${notification.awardId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({
      id,
      awardId: notification.awardId,
      eventNumber: notification.eventNumber,
      timestamp: Date.now(),
      category: notification.category,
      intensity: notification.intensity,
      shown: false
    });

    this.save();
    console.log('Notification queued:', id);
  }

  /**
   * Get all unshown notifications
   * @returns {Array} Array of unshown notification objects
   */
  getUnshown() {
    return this.queue.filter(n => !n.shown);
  }

  /**
   * Check if there are any unshown notifications
   * @returns {boolean}
   */
  hasUnshownNotifications() {
    return this.getUnshown().length > 0;
  }

  /**
   * Mark a notification as shown
   * @param {string} id - Notification ID
   */
  markAsShown(id) {
    const notification = this.queue.find(n => n.id === id);
    if (notification) {
      notification.shown = true;
      this.save();
    }
  }

  /**
   * Mark all notifications as shown
   */
  markAllAsShown() {
    this.queue.forEach(n => n.shown = true);
    this.save();
  }

  /**
   * Clean up old shown notifications (7+ days old)
   */
  cleanup() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const beforeCount = this.queue.length;

    this.queue = this.queue.filter(n => {
      // Keep unshown notifications or shown notifications less than 7 days old
      return !n.shown || n.timestamp > sevenDaysAgo;
    });

    const removed = beforeCount - this.queue.length;
    if (removed > 0) {
      console.log(`Cleaned up ${removed} old notification(s)`);
      this.save();
    }
  }

  /**
   * Clear all notifications from queue
   */
  clear() {
    this.queue = [];
    this.save();
    console.log('Notification queue cleared');
  }

  /**
   * Get queue size
   * @returns {number}
   */
  size() {
    return this.queue.length;
  }

  /**
   * Get count of unshown notifications
   * @returns {number}
   */
  unshownCount() {
    return this.getUnshown().length;
  }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.NotificationQueue = NotificationQueue;
}

// Export for Node.js (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationQueue;
}
