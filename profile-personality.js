// profile-personality.js - Display personality spider diagram on profile page

import { getPersonalityStats } from './interview-persistence.js';
import { getPersonaLabel } from './interview-engine.js';

// Module-level state for chart interactivity
let chartDataPoints = [];
let currentHoverPoint = null;
let tooltipElement = null;
let canvasElement = null;

/**
 * Draw personality spider/radar chart on canvas
 */
export function drawPersonalityChart(canvasId, personalityData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 45;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Personality traits to display
    const traits = [
        { name: 'Confidence', value: personalityData.confidence || 50, angle: 0 },
        { name: 'Humility', value: personalityData.humility || 50, angle: Math.PI / 3 },
        { name: 'Aggression', value: personalityData.aggression || 50, angle: (2 * Math.PI) / 3 },
        { name: 'Professionalism', value: personalityData.professionalism || 50, angle: Math.PI },
        { name: 'Showmanship', value: personalityData.showmanship || 50, angle: (4 * Math.PI) / 3 },
        { name: 'Resilience', value: personalityData.resilience || 50, angle: (5 * Math.PI) / 3 }
    ];

    // Draw background grid (concentric hexagons at 25%, 50%, 75%, 100%)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let level = 1; level <= 4; level++) {
        const radius = (maxRadius * level) / 4;
        drawPolygon(ctx, centerX, centerY, radius, traits.length, 0);
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;

    traits.forEach((trait, index) => {
        const x = centerX + maxRadius * Math.cos(trait.angle - Math.PI / 2);
        const y = centerY + maxRadius * Math.sin(trait.angle - Math.PI / 2);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw trait labels
        const labelX = centerX + (maxRadius + 30) * Math.cos(trait.angle - Math.PI / 2);
        const labelY = centerY + (maxRadius + 30) * Math.sin(trait.angle - Math.PI / 2);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 12px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(trait.name, labelX, labelY);
    });

    // Draw data polygon
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 27, 107, 0.2)');
    gradient.addColorStop(1, 'rgba(69, 202, 255, 0.2)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#ff1b6b';
    ctx.lineWidth = 3;

    ctx.beginPath();
    traits.forEach((trait, index) => {
        const value = Math.max(0, Math.min(100, trait.value)); // Clamp 0-100
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(trait.angle - Math.PI / 2);
        const y = centerY + radius * Math.sin(trait.angle - Math.PI / 2);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw data points and store coordinates for interactivity
    ctx.fillStyle = '#45caff';
    const dataPoints = [];
    traits.forEach(trait => {
        const value = Math.max(0, Math.min(100, trait.value));
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(trait.angle - Math.PI / 2);
        const y = centerY + radius * Math.sin(trait.angle - Math.PI / 2);

        // Store coordinates for hover detection
        dataPoints.push({ name: trait.name, value: value, x: x, y: y });

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Store data points at module level for interactivity
    chartDataPoints = dataPoints;
    canvasElement = canvas;
}

/**
 * Draw a regular polygon
 */
function drawPolygon(ctx, centerX, centerY, radius, sides, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
        const angle = (i * 2 * Math.PI) / sides + rotation - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

/**
 * Create tooltip DOM element for displaying personality trait values
 */
function createTooltipElement() {
    // Check if tooltip already exists
    if (tooltipElement) {
        return tooltipElement;
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'personality-tooltip';
    tooltip.innerHTML = `
        <span class="trait-name"></span>
        <span class="trait-value"></span>
    `;

    // Insert into DOM (append to body for absolute positioning)
    document.body.appendChild(tooltip);

    tooltipElement = tooltip;
    return tooltip;
}

/**
 * Get the data point that is currently being hovered over
 */
function getHoveredPoint(mouseX, mouseY) {
    const hitRadius = 12; // 6px point + 6px tolerance

    for (const point of chartDataPoints) {
        const distance = Math.sqrt(
            Math.pow(mouseX - point.x, 2) +
            Math.pow(mouseY - point.y, 2)
        );

        if (distance <= hitRadius) {
            return point;
        }
    }

    return null;
}

/**
 * Update visual highlighting of hovered point
 */
function updatePointHighlight(point) {
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');

    // Need to redraw the chart to clear previous highlight
    // Get personality data from stored points
    const personalityData = {};
    chartDataPoints.forEach(p => {
        const traitKey = p.name.toLowerCase();
        personalityData[traitKey] = p.value;
    });

    // Redraw chart (this clears previous highlight)
    const canvasId = canvasElement.id;
    drawPersonalityChart(canvasId, personalityData);

    // If there's a point to highlight, draw it enlarged with glow
    if (point) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#45caff';
        ctx.fillStyle = '#45caff';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Show tooltip for a hovered point
 */
function showTooltip(point) {
    if (!tooltipElement || !canvasElement) return;

    // Update tooltip content
    const traitName = tooltipElement.querySelector('.trait-name');
    const traitValue = tooltipElement.querySelector('.trait-value');

    traitName.textContent = `${point.name}:`;
    traitValue.textContent = `${Math.round(point.value)}/100`;

    // Calculate tooltip position
    const canvasRect = canvasElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();

    // Default: position above the point
    let left = canvasRect.left + point.x;
    let top = canvasRect.top + point.y - tooltipRect.height - 10;

    // Boundary detection: flip below if too close to top
    if (top < 10) {
        top = canvasRect.top + point.y + 10;
    }

    // Boundary detection: adjust horizontal if too close to edges
    if (left - tooltipRect.width / 2 < 10) {
        left = 10 + tooltipRect.width / 2;
    } else if (left + tooltipRect.width / 2 > window.innerWidth - 10) {
        left = window.innerWidth - 10 - tooltipRect.width / 2;
    }

    // Position tooltip
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.transform = 'translate(-50%, 0)';

    // Show tooltip
    tooltipElement.classList.add('active');
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove('active');
    }
}

/**
 * Initialize chart interactivity (hover detection and tooltips)
 */
function initializeChartInteractivity(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Create tooltip element if it doesn't exist
    createTooltipElement();

    // Throttle mousemove for performance (60fps)
    let lastMoveTime = 0;
    const throttleDelay = 16; // ~60fps

    // Mouse move handler
    const handleMouseMove = (event) => {
        const now = Date.now();
        if (now - lastMoveTime < throttleDelay) return;
        lastMoveTime = now;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const hoveredPoint = getHoveredPoint(mouseX, mouseY);

        // Only update if hover state changed
        if (hoveredPoint !== currentHoverPoint) {
            currentHoverPoint = hoveredPoint;

            if (hoveredPoint) {
                updatePointHighlight(hoveredPoint);
                showTooltip(hoveredPoint);
            } else {
                updatePointHighlight(null);
                hideTooltip();
            }
        }
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
        currentHoverPoint = null;
        updatePointHighlight(null);
        hideTooltip();
    };

    // Add event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Return cleanup function
    return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
}

/**
 * Update personality display on profile page
 */
export function displayPersonality(userData) {
    const personalityHeaderSection = document.getElementById('personalityHeaderSection');

    // Check if user has personality data
    if (!userData.personality || !userData.interviewHistory || userData.interviewHistory.totalInterviews === 0) {
        // Hide section if no interviews completed
        if (personalityHeaderSection) {
            personalityHeaderSection.style.display = 'none';
        }
        return;
    }

    // Show section
    if (personalityHeaderSection) {
        personalityHeaderSection.style.display = 'flex';
    }

    // Draw spider chart in header
    drawPersonalityChart('personalityChart', userData.personality);

    // Initialize chart interactivity (hover tooltips)
    initializeChartInteractivity('personalityChart');

    // Update persona label in header
    const persona = getPersonaLabel(userData.personality);
    const interviewCount = userData.interviewHistory.totalInterviews || 0;

    document.getElementById('personaTitle').textContent = 'Your Persona';
    document.getElementById('personaSubtitle').textContent = `"${persona}"`;
}
