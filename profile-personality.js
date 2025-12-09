// profile-personality.js - Display personality spider diagram on profile page

import { getPersonalityStats } from './interview-persistence.js';
import { getPersonaLabel } from './interview-engine.js';

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
    const maxRadius = Math.min(centerX, centerY) - 40;

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
        const labelX = centerX + (maxRadius + 25) * Math.cos(trait.angle - Math.PI / 2);
        const labelY = centerY + (maxRadius + 25) * Math.sin(trait.angle - Math.PI / 2);

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

    // Draw data points
    ctx.fillStyle = '#45caff';
    traits.forEach(trait => {
        const value = Math.max(0, Math.min(100, trait.value));
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(trait.angle - Math.PI / 2);
        const y = centerY + radius * Math.sin(trait.angle - Math.PI / 2);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
    });
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
 * Update personality display on profile page
 */
export function displayPersonality(userData) {
    const personalityHeaderSection = document.getElementById('personalityHeaderSection');
    const personalityDetailSection = document.getElementById('personalityDetailSection');

    // Check if user has personality data
    if (!userData.personality || !userData.interviewHistory || userData.interviewHistory.totalInterviews === 0) {
        // Hide sections if no interviews completed
        if (personalityHeaderSection) {
            personalityHeaderSection.style.display = 'none';
        }
        if (personalityDetailSection) {
            personalityDetailSection.style.display = 'none';
        }
        return;
    }

    // Show sections
    if (personalityHeaderSection) {
        personalityHeaderSection.style.display = 'flex';
    }
    if (personalityDetailSection) {
        personalityDetailSection.style.display = 'block';
    }

    // Get personality stats
    const stats = getPersonalityStats(userData.personality);

    // Update stat values in detail section
    document.getElementById('confidenceValue').textContent = stats.confidence;
    document.getElementById('humilityValue').textContent = stats.humility;
    document.getElementById('aggressionValue').textContent = stats.aggression;
    document.getElementById('professionalismValue').textContent = stats.professionalism;
    document.getElementById('showmanshipValue').textContent = stats.showmanship;
    document.getElementById('resilienceValue').textContent = stats.resilience;

    // Draw spider chart in header
    drawPersonalityChart('personalityChart', userData.personality);

    // Update persona label in header
    const persona = getPersonaLabel(userData.personality);
    const interviewCount = userData.interviewHistory.totalInterviews || 0;

    document.getElementById('personaTitle').textContent = 'Your Persona';
    document.getElementById('personaSubtitle').textContent = `"${persona}"`;

    // Update interview count in detail section
    const interviewCountDisplay = document.getElementById('interviewCountDisplay');
    if (interviewCountDisplay) {
        interviewCountDisplay.textContent =
            `Based on ${interviewCount} post-race interview${interviewCount !== 1 ? 's' : ''}`;
    }
}
