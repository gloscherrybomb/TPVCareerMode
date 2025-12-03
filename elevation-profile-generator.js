/**
 * Elevation Profile Generator for TPV Career Mode
 * Generates elevation profile charts from route coordinate data
 */

class ElevationProfileGenerator {
    constructor() {
        this.routesData = null;
        
        // Map event courses to route names in ExportedWorld.json
        this.courseToRouteMapping = {
            'Coast and Roast': 'Coast And Roast',
            'So Near Yet So Far': 'So Near Yet So Far',
            'Velodrome': 'Forest Velodrome',
            'Coastal Loop': 'Coastal Loop',
            'North Lake Loop Reverse': 'North Lake Loop Reverse',
            'Easy Hill Climb': 'Easy Hill Climb',
            'Flat Eight': 'Flat Eight',
            'A Grand Day Out': 'A Grand Day Out',
            'Base Camp': 'Base Camp',
            'Big Loop': 'Big Loop',
            'South Lake Loop Reverse': 'South Lake Loop Reverse',
            'Unbound Little Egypt': null // Not in dataset
        };
    }

    /**
     * Load routes data from JSON file
     */
    async loadRoutesData() {
        if (this.routesData) {
            return this.routesData;
        }

        try {
            const response = await fetch('ExportedWorld.json');
            const data = await response.json();
            this.routesData = data.routes;
            console.log(`✓ Loaded ${this.routesData.length} routes from ExportedWorld.json`);
            return this.routesData;
        } catch (error) {
            console.error('Error loading routes data:', error);
            return null;
        }
    }

    /**
     * Find route by course name
     */
    findRoute(courseName) {
        if (!this.routesData) {
            console.error('Routes data not loaded');
            return null;
        }

        // Try mapped name first
        const mappedName = this.courseToRouteMapping[courseName];
        
        if (mappedName === null) {
            console.log(`Route mapping explicitly set to null for: ${courseName}`);
            return null;
        }

        // Search for route
        let route = this.routesData.find(r => 
            r.name === mappedName || 
            r.name === courseName ||
            r.name.toLowerCase() === courseName.toLowerCase()
        );

        if (!route) {
            console.warn(`Route not found for course: ${courseName}`);
        } else {
            console.log(`✓ Found route: ${route.name}`);
        }

        return route;
    }

    /**
     * Calculate distance and elevation data from coordinates
     * Coordinates have x, y, z where y is elevation
     */
    processCoordinates(coordinates) {
        if (!coordinates || coordinates.length === 0) {
            return { distances: [], elevations: [] };
        }

        const distances = [0];
        const elevations = [coordinates[0].y];
        let totalDistance = 0;

        for (let i = 1; i < coordinates.length; i++) {
            const prev = coordinates[i - 1];
            const curr = coordinates[i];

            // Calculate 2D distance between points (x and z are horizontal)
            const dx = curr.x - prev.x;
            const dz = curr.z - prev.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            totalDistance += distance;
            distances.push(totalDistance);
            elevations.push(curr.y);
        }

        // Convert distances from meters to kilometers
        const distancesKm = distances.map(d => d / 1000);

        return { distances: distancesKm, elevations };
    }

    /**
     * Get elevation statistics
     */
    getElevationStats(elevations) {
        if (!elevations || elevations.length === 0) {
            return null;
        }

        let gain = 0;
        let loss = 0;
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);

        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) {
                gain += diff;
            } else {
                loss += Math.abs(diff);
            }
        }

        return {
            minElevation: minElevation.toFixed(1),
            maxElevation: maxElevation.toFixed(1),
            totalGain: Math.round(gain),
            totalLoss: Math.round(loss),
            range: (maxElevation - minElevation).toFixed(1)
        };
    }

    /**
     * Generate elevation profile using Canvas
     */
    async generateProfile(canvasId, courseName, laps = 1) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element not found: ${canvasId}`);
            return;
        }

        // Ensure routes are loaded
        await this.loadRoutesData();

        const route = this.findRoute(courseName);
        if (!route) {
            this.drawNoDataMessage(canvas, courseName);
            return;
        }

        // Get route coordinates (prefer leadin which contains the full route)
        const routeCoordinates = route.leadin?.coordinates || route.lapRoute?.coordinates || [];
        
        if (routeCoordinates.length === 0) {
            this.drawNoDataMessage(canvas, courseName);
            return;
        }

        // For multi-lap events, repeat the coordinates
        let allCoordinates = routeCoordinates;
        if (laps > 1) {
            allCoordinates = [];
            for (let lap = 0; lap < laps; lap++) {
                allCoordinates = allCoordinates.concat(routeCoordinates);
            }
        }

        // Process coordinates
        const { distances, elevations } = this.processCoordinates(allCoordinates);
        
        console.log(`Profile data: ${distances.length} points, ${distances[distances.length-1].toFixed(2)}km`);
        
        // Draw profile
        this.drawProfile(canvas, distances, elevations, courseName, laps);
    }

    /**
     * Draw elevation profile on canvas
     */
    drawProfile(canvas, distances, elevations, courseName, laps) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Padding
        const padding = { top: 50, right: 50, bottom: 70, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Calculate scales
        const maxDistance = Math.max(...distances);
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const elevationRange = maxElevation - minElevation;

        // Add vertical padding (10% on each side)
        const elevationPadding = elevationRange * 0.1;
        const displayMinElevation = minElevation - elevationPadding;
        const displayMaxElevation = maxElevation + elevationPadding;
        const displayRange = displayMaxElevation - displayMinElevation;

        const xScale = chartWidth / maxDistance;
        const yScale = chartHeight / displayRange;

        // Draw background
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid(ctx, padding, chartWidth, chartHeight, maxDistance, displayMinElevation, displayMaxElevation);

        // Draw elevation area fill
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        
        distances.forEach((dist, i) => {
            const x = padding.left + dist * xScale;
            const y = padding.top + chartHeight - (elevations[i] - displayMinElevation) * yScale;
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.5)');
        gradient.addColorStop(0.5, 'rgba(52, 152, 219, 0.3)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw elevation line
        ctx.beginPath();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        distances.forEach((dist, i) => {
            const x = padding.left + dist * xScale;
            const y = padding.top + chartHeight - (elevations[i] - displayMinElevation) * yScale;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw axes
        this.drawAxes(ctx, padding, chartWidth, chartHeight, maxDistance, displayMinElevation, displayMaxElevation);

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Exo 2", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        const title = laps > 1 ? `${courseName} (${laps} laps)` : courseName;
        ctx.fillText(title, width / 2, 30);

        // Draw elevation stats in bottom left
        const stats = this.getElevationStats(elevations);
        ctx.font = '13px "Exo 2", -apple-system, sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'left';
        
        const statY = height - 15;
        ctx.fillText(`Min: ${stats.minElevation}m`, padding.left, statY);
        ctx.fillText(`Max: ${stats.maxElevation}m`, padding.left + 110, statY);
        ctx.fillText(`↑${stats.totalGain}m`, padding.left + 220, statY);
        ctx.fillText(`↓${stats.totalLoss}m`, padding.left + 300, statY);
        
        // Distance in top right
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px "Exo 2", -apple-system, sans-serif';
        ctx.fillText(`${maxDistance.toFixed(2)} km`, width - padding.right, 30);
    }

    /**
     * Draw grid lines
     */
    drawGrid(ctx, padding, chartWidth, chartHeight, maxDistance, minElevation, maxElevation) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;

        // Vertical grid lines (every 5km or appropriate interval)
        const distanceInterval = maxDistance > 50 ? 10 : maxDistance > 20 ? 5 : maxDistance > 10 ? 2 : 1;
        const numVerticalLines = Math.floor(maxDistance / distanceInterval);
        
        for (let i = 1; i <= numVerticalLines; i++) {
            const dist = i * distanceInterval;
            const x = padding.left + (dist / maxDistance) * chartWidth;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
        }

        // Horizontal grid lines
        const elevationRange = maxElevation - minElevation;
        const elevationInterval = elevationRange > 500 ? 100 : elevationRange > 200 ? 50 : elevationRange > 100 ? 25 : 10;
        const numHorizontalLines = Math.floor(elevationRange / elevationInterval);
        
        for (let i = 1; i <= numHorizontalLines; i++) {
            const elev = Math.ceil(minElevation / elevationInterval) * elevationInterval + i * elevationInterval;
            if (elev <= maxElevation) {
                const y = padding.top + chartHeight - ((elev - minElevation) / elevationRange) * chartHeight;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + chartWidth, y);
                ctx.stroke();
            }
        }
    }

    /**
     * Draw axes with labels
     */
    drawAxes(ctx, padding, chartWidth, chartHeight, maxDistance, minElevation, maxElevation) {
        // Axes lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.stroke();

        // X-axis labels (distance)
        ctx.fillStyle = '#cccccc';
        ctx.font = '12px "Exo 2", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        
        const distanceInterval = maxDistance > 50 ? 10 : maxDistance > 20 ? 5 : maxDistance > 10 ? 2 : 1;
        const numXLabels = Math.floor(maxDistance / distanceInterval);
        
        for (let i = 0; i <= numXLabels; i++) {
            const dist = i * distanceInterval;
            const x = padding.left + (dist / maxDistance) * chartWidth;
            ctx.fillText(dist.toFixed(0), x, padding.top + chartHeight + 20);
        }
        
        // X-axis title
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px "Exo 2", -apple-system, sans-serif';
        ctx.fillText('Distance (km)', padding.left + chartWidth / 2, padding.top + chartHeight + 45);

        // Y-axis labels (elevation)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#cccccc';
        ctx.font = '12px "Exo 2", -apple-system, sans-serif';
        
        const elevationRange = maxElevation - minElevation;
        const elevationInterval = elevationRange > 500 ? 100 : elevationRange > 200 ? 50 : elevationRange > 100 ? 25 : 10;
        const numYLabels = Math.floor(elevationRange / elevationInterval);
        
        for (let i = 0; i <= numYLabels + 1; i++) {
            const elev = Math.ceil(minElevation / elevationInterval) * elevationInterval + i * elevationInterval;
            if (elev >= minElevation && elev <= maxElevation) {
                const y = padding.top + chartHeight - ((elev - minElevation) / elevationRange) * chartHeight;
                ctx.fillText(Math.round(elev) + 'm', padding.left - 10, y + 4);
            }
        }
        
        // Y-axis title (rotated)
        ctx.save();
        ctx.translate(20, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px "Exo 2", -apple-system, sans-serif';
        ctx.fillText('Elevation (m)', 0, 0);
        ctx.restore();
    }

    /**
     * Draw "no data" message
     */
    drawNoDataMessage(canvas, courseName) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#666666';
        ctx.font = '16px "Exo 2", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Route elevation data not available for ${courseName}`, width / 2, height / 2 - 10);
        
        ctx.fillStyle = '#888888';
        ctx.font = '13px "Exo 2", -apple-system, sans-serif';
        ctx.fillText('Check back soon as we continue adding route profiles', width / 2, height / 2 + 15);
    }
}

// Create and export global instance
if (typeof window !== 'undefined') {
    window.elevationProfileGen = new ElevationProfileGenerator();
    console.log('✓ Elevation Profile Generator initialized');
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ElevationProfileGenerator };
}
