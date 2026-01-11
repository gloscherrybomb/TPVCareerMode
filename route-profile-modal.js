/**
 * Route Profile Modal
 * Provides expandable, zoomable elevation profile viewing
 */

let modalInitialized = false;
let currentCourse = null;
let currentLaps = 1;
let currentZoom = 1.5;
let currentEventInfo = {};

// Base canvas dimensions (at 100% zoom)
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 400;

/**
 * Initialize the route profile modal
 */
function initRouteProfileModal() {
    if (modalInitialized) return;

    // Create modal HTML
    const modalHTML = `
        <div class="modal" id="routeProfileModal">
            <div class="modal-overlay" id="routeProfileModalOverlay"></div>
            <div class="modal-content route-profile-modal-content">
                <button class="modal-close" id="routeProfileModalClose">&times;</button>

                <div class="route-profile-zoom-controls">
                    <span class="zoom-label">Zoom:</span>
                    <button class="zoom-btn" data-zoom="1" aria-label="100% zoom">100%</button>
                    <button class="zoom-btn active" data-zoom="1.5" aria-label="150% zoom">150%</button>
                    <button class="zoom-btn" data-zoom="2" aria-label="200% zoom">200%</button>
                </div>

                <div class="route-profile-modal-canvas-wrapper" id="routeProfileModalCanvasWrapper">
                    <canvas id="elevationProfileModalCanvas" width="${BASE_WIDTH * 1.5}" height="${BASE_HEIGHT * 1.5}"></canvas>
                </div>

                <div class="route-profile-modal-info" id="routeProfileModalInfo"></div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event listeners
    document.getElementById('routeProfileModalClose').addEventListener('click', closeRouteProfileModal);
    document.getElementById('routeProfileModalOverlay').addEventListener('click', closeRouteProfileModal);

    // Zoom button listeners
    document.querySelectorAll('#routeProfileModal .zoom-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const zoom = parseFloat(e.target.dataset.zoom);
            setZoom(zoom);
        });
    });

    // Keyboard support (Escape to close)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('routeProfileModal');
            if (modal && modal.classList.contains('active')) {
                closeRouteProfileModal();
            }
        }
    });

    modalInitialized = true;
    console.log('Route Profile Modal initialized');
}

/**
 * Open the route profile modal
 * @param {string} courseName - The course name to display
 * @param {number} laps - Number of laps
 * @param {Object} eventInfo - Optional event info for display
 */
async function openRouteProfileModal(courseName, laps = 1, eventInfo = {}) {
    initRouteProfileModal();

    currentCourse = courseName;
    currentLaps = laps;
    currentEventInfo = eventInfo;
    currentZoom = 1.5; // Reset to default zoom

    const modal = document.getElementById('routeProfileModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Update active zoom button
    document.querySelectorAll('#routeProfileModal .zoom-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.zoom) === currentZoom);
    });

    // Update info bar
    updateInfoBar(eventInfo);

    // Draw profile at current zoom level
    await drawModalProfile(currentZoom);
}

/**
 * Close the route profile modal
 */
function closeRouteProfileModal() {
    const modal = document.getElementById('routeProfileModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Set zoom level and redraw canvas
 * @param {number} zoom - Zoom level (1, 1.5, or 2)
 */
async function setZoom(zoom) {
    currentZoom = zoom;

    // Update active button
    document.querySelectorAll('#routeProfileModal .zoom-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.zoom) === zoom);
    });

    // Update canvas wrapper class for scroll behavior
    const wrapper = document.getElementById('routeProfileModalCanvasWrapper');
    wrapper.classList.toggle('zoomed', zoom > 1);

    // Redraw at new resolution
    await drawModalProfile(zoom);
}

/**
 * Draw the elevation profile at specified zoom level
 * @param {number} zoom - Zoom multiplier
 */
async function drawModalProfile(zoom) {
    const canvas = document.getElementById('elevationProfileModalCanvas');
    if (!canvas || !currentCourse) return;

    // Calculate new dimensions
    const newWidth = Math.round(BASE_WIDTH * zoom);
    const newHeight = Math.round(BASE_HEIGHT * zoom);

    // Resize canvas (this clears it)
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Use the elevation profile generator to draw
    if (window.elevationProfileGen && window.elevationProfileGen.generateProfileToCanvas) {
        await window.elevationProfileGen.generateProfileToCanvas(
            canvas,
            currentCourse,
            currentLaps
        );
    } else if (window.elevationProfileGen) {
        // Fallback: use the standard method with a temporary ID swap
        const originalCanvas = document.getElementById('elevationProfileCanvas');
        if (originalCanvas) {
            // Copy the content from the original canvas (scaled)
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0f0f23';
            ctx.fillRect(0, 0, newWidth, newHeight);
            ctx.drawImage(originalCanvas, 0, 0, newWidth, newHeight);
        }
    }
}

/**
 * Update the info bar with event details
 * @param {Object} info - Event information
 */
function updateInfoBar(info) {
    const infoBar = document.getElementById('routeProfileModalInfo');
    if (!infoBar) return;

    const items = [];

    if (info.course) {
        items.push(`
            <div class="route-profile-modal-info-item">
                <div class="route-profile-modal-info-label">Course</div>
                <div class="route-profile-modal-info-value">${info.course}</div>
            </div>
        `);
    }

    if (info.distance) {
        items.push(`
            <div class="route-profile-modal-info-item">
                <div class="route-profile-modal-info-label">Distance</div>
                <div class="route-profile-modal-info-value">${info.distance}</div>
            </div>
        `);
    }

    if (info.climbing) {
        items.push(`
            <div class="route-profile-modal-info-item">
                <div class="route-profile-modal-info-label">Climbing</div>
                <div class="route-profile-modal-info-value">${info.climbing}</div>
            </div>
        `);
    }

    infoBar.innerHTML = items.join('');
}

// Expose functions globally
window.openRouteProfileModal = openRouteProfileModal;
window.closeRouteProfileModal = closeRouteProfileModal;
window.initRouteProfileModal = initRouteProfileModal;
