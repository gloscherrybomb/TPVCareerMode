/**
 * Elevation Profile Generator for TPV Career Mode
 * Generates elevation profile charts from route coordinate data
 */

class ElevationProfileGenerator {
    constructor() {
        this.routesData = null;
        this.gpxData = {}; // Store GPX routes separately
        
        // Map event courses to route names in ExportedWorld.json
        this.courseToRouteMapping = {
            'Coast and Roast': 'Coast And Roast',
            'So Near Yet So Far': 'So Near Yet So Far',
            'Velodrome': 'Forest Velodrome',
            'Coastal Loop': 'Coastal Loop',
            'North Lake Loop Reverse': 'North Lake Loop Reverse',
            'North Lake Loop': 'North Lake Loop',
            'Easy Hill Climb': 'Easy Hill Climb',
            'Flat Eight': 'Flat Eight',
            'A Grand Day Out': 'A Grand Day Out',
            'Base Camp': 'Base Camp',
            'Big Loop': 'Big Loop',
            'South Lake Loop Reverse': 'South Lake Loop Reverse',
            'Unbound Little Egypt': 'gpx:UnboundLittleEgypt', // Special marker for GPX
            'Valentine Bosberg': 'gpx:Valentine Bosberg', // Valentine's Invitational GPX
            // Tour stage courses
            'Figure Of Eight': 'Figure Of Eight',
            'Loop the Loop': 'Loop the Loop',
            'A Bit Of Everything': 'A Bit Of Everything'
        };
    }

    /**
     * Load GPX file and parse to elevation data
     */
    async loadGPXRoute(gpxFileName) {
        if (this.gpxData[gpxFileName]) {
            console.log(`GPX data already loaded (cached): ${gpxFileName}`);
            return this.gpxData[gpxFileName];
        }

        try {
            console.log(`Loading GPX file: ${gpxFileName}`);
            const response = await fetch(gpxFileName);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const gpxText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
            
            // Extract track points
            const trkpts = xmlDoc.getElementsByTagName('trkpt');
            const points = [];
            
            for (let i = 0; i < trkpts.length; i++) {
                const pt = trkpts[i];
                const lat = parseFloat(pt.getAttribute('lat'));
                const lon = parseFloat(pt.getAttribute('lon'));
                const eleTag = pt.getElementsByTagName('ele')[0];
                const ele = eleTag ? parseFloat(eleTag.textContent) : 0;
                
                points.push({ lat, lon, ele });
            }
            
            console.log(`✓ Loaded GPX: ${points.length} points`);
            
            // Calculate distances using Haversine formula
            const distances = [0];
            let totalDist = 0;
            
            for (let i = 1; i < points.length; i++) {
                const R = 6371; // Earth radius in km
                const lat1 = points[i-1].lat * Math.PI / 180;
                const lat2 = points[i].lat * Math.PI / 180;
                const dLat = (points[i].lat - points[i-1].lat) * Math.PI / 180;
                const dLon = (points[i].lon - points[i-1].lon) * Math.PI / 180;
                
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(lat1) * Math.cos(lat2) *
                         Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const dist = R * c;
                
                totalDist += dist;
                distances.push(totalDist);
            }
            
            const elevations = points.map(p => p.ele);
            
            const gpxRoute = {
                distances,
                elevations,
                totalDistance: totalDist
            };
            
            this.gpxData[gpxFileName] = gpxRoute;
            console.log(`✓ Processed GPX: ${totalDist.toFixed(2)} km`);
            
            return gpxRoute;
        } catch (error) {
            console.error(`Error loading GPX file ${gpxFileName}:`, error);
            return null;
        }
    }

    /**
     * Load routes data from JSON file
     */
    async loadRoutesData() {
        if (this.routesData) {
            console.log('Routes data already loaded (cached)');
            return this.routesData;
        }

        try {
            console.log('Fetching ExportedWorld.json...');
            const response = await fetch('ExportedWorld.json', {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`Fetch response status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.routes || !Array.isArray(data.routes)) {
                throw new Error('Invalid data structure: routes array not found');
            }
            
            this.routesData = data.routes;
            console.log(`✓ Loaded ${this.routesData.length} routes from ExportedWorld.json`);
            
            // Log first few route names for debugging
            console.log('Available routes:', this.routesData.slice(0, 5).map(r => r.name).join(', '), '...');
            
            return this.routesData;
        } catch (error) {
            console.error('❌ Error loading routes data:', error);
            console.error('Fetch URL attempted:', window.location.origin + '/ExportedWorld.json');
            console.error('Make sure ExportedWorld.json is in the same directory as event-detail.html');
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
     * Detect and score climbs from elevation data
     */
    detectClimbs(distances, elevations, totalDistance) {
        const CHUNK_SIZE = 0.04; // Analyze route in 40m chunks
        const MIN_UPHILL_GRADIENT = 1.5; // Threshold for uphill segment
        const MAX_MERGE_GAP_KM = 0.35; // Merge climbs if gap is <= 0.35 km
        
        let chunks = [];
        
        // Create points array with distance and elevation
        const points = distances.map((dist, i) => ({ dist, ele: elevations[i] }));
        
        // 1. Break route into distance chunks to calculate local gradient
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            let j = i + 1;
            while (j < points.length && points[j].dist - start.dist < CHUNK_SIZE) {
                j++;
            }
            if (j < points.length) {
                const end = points[j];
                const dist = end.dist - start.dist;
                const gain = end.ele - start.ele;
                const gradient = (gain / (dist * 1000)) * 100;
                chunks.push({ 
                    startDist: start.dist, 
                    endDist: end.dist, 
                    gradient, 
                    gain, 
                    startEle: start.ele, 
                    endEle: end.ele 
                });
                i = j - 1;
            }
        }
        
        // 2. Identify raw uphill runs (contiguous chunks > threshold gradient)
        let rawUphillRuns = [];
        let currentRun = null;
        
        chunks.forEach((chunk) => {
            const isUphill = chunk.gradient > MIN_UPHILL_GRADIENT;
            
            if (isUphill) {
                if (!currentRun) {
                    currentRun = {
                        startDist: chunk.startDist,
                        endDist: chunk.endDist,
                        gain: chunk.gain,
                        chunks: [chunk]
                    };
                } else {
                    currentRun.endDist = chunk.endDist;
                    currentRun.gain += chunk.gain;
                    currentRun.chunks.push(chunk);
                }
            } else {
                if (currentRun) {
                    rawUphillRuns.push(currentRun);
                    currentRun = null;
                }
            }
        });
        
        if (currentRun) rawUphillRuns.push(currentRun);
        
        // 3. Merge runs if gap between them is small
        let climbs = [];
        let currentClimbToBuild = null;
        
        rawUphillRuns.forEach((run, index) => {
            if (!currentClimbToBuild) {
                currentClimbToBuild = { ...run };
            } else {
                const gap = run.startDist - currentClimbToBuild.endDist;
                
                if (gap <= MAX_MERGE_GAP_KM) {
                    currentClimbToBuild.endDist = run.endDist;
                    currentClimbToBuild.gain += run.gain;
                    currentClimbToBuild.chunks = currentClimbToBuild.chunks.concat(run.chunks);
                } else {
                    climbs.push(currentClimbToBuild);
                    currentClimbToBuild = { ...run };
                }
            }
            
            if (index === rawUphillRuns.length - 1) {
                climbs.push(currentClimbToBuild);
            }
        });
        
        // 4. Filter and score climbs
        let validClimbs = climbs.filter(c => c.gain > 20).map((c) => {
            const lengthKm = c.endDist - c.startDist;
            const gradientAvg = lengthKm > 0 ? (c.gain / (lengthKm * 1000)) * 100 : 0;
            const maxGradient = Math.max(...c.chunks.map(chunk => chunk.gradient));
            const rawScore = Math.pow(gradientAvg / 2, 2) * lengthKm;
            const distFromFinish = totalDistance - c.endDist;
            
            return {
                ...c,
                lengthKm,
                gradientAvg,
                maxGradient,
                rawScore,
                distFromFinish
            };
        }).sort((a, b) => a.startDist - b.startDist);
        
        // Filter out climbs that are too easy
        validClimbs = validClimbs.filter(climb => {
            return !(climb.gradientAvg < 2 && climb.maxGradient < 3);
        });
        
        // Add climb IDs
        validClimbs = validClimbs.map((climb, index) => ({
            ...climb,
            id: index + 1
        }));
        
        return validClimbs;
    }
    
    /**
     * Get color based on climb difficulty score
     */
    getScoreHexColor(score) {
        if (score >= 46) return '#991b1b'; // Red 800
        if (score >= 41) return '#b91c1c'; // Red 700
        if (score >= 36) return '#dc2626'; // Red 600
        if (score >= 31) return '#ef4444'; // Red 500
        if (score >= 26) return '#f87171'; // Red 400
        if (score >= 21) return '#fb923c'; // Orange 400
        if (score >= 16) return '#fbbf24'; // Amber 400
        if (score >= 11) return '#facc15'; // Yellow 400
        if (score >= 6) return '#a3e635';  // Lime 400
        return '#4ade80'; // Green 400
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
        console.log(`generateProfile called: canvas="${canvasId}", course="${courseName}", laps=${laps}`);
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element not found: ${canvasId}`);
            return;
        }

        // Check if this is a GPX route
        const mappedName = this.courseToRouteMapping[courseName];
        if (mappedName && mappedName.startsWith('gpx:')) {
            // Load from GPX file
            const gpxFileName = mappedName.replace('gpx:', '') + '.gpx';
            console.log(`Loading GPX route: ${gpxFileName}`);
            
            const gpxRoute = await this.loadGPXRoute(gpxFileName);
            
            if (!gpxRoute) {
                console.error(`Failed to load GPX file: ${gpxFileName}`);
                this.drawNoDataMessage(canvas, courseName);
                return;
            }
            
            // Draw profile from GPX data
            console.log(`Drawing GPX profile: ${gpxRoute.distances.length} points, ${gpxRoute.totalDistance.toFixed(2)}km`);
            this.drawProfile(canvas, gpxRoute.distances, gpxRoute.elevations, courseName, laps);
            console.log('✓ GPX profile rendered successfully');
            return;
        }

        // Ensure routes are loaded for JSON routes
        console.log('Loading routes data...');
        await this.loadRoutesData();
        
        if (!this.routesData) {
            console.error('Routes data failed to load');
            this.drawNoDataMessage(canvas, courseName);
            return;
        }

        const route = this.findRoute(courseName);
        if (!route) {
            console.warn(`No route found for: ${courseName}`);
            this.drawNoDataMessage(canvas, courseName);
            return;
        }

        // Build coordinates using: leadin + (lap × number of laps)
        const leadinCoords = route.leadin?.coordinates || [];
        const lapCoords = route.lap?.coordinates || [];
        
        console.log(`Route "${route.name}": ${leadinCoords.length} leadin points, ${lapCoords.length} lap points`);
        
        let allCoordinates = [];
        
        if (leadinCoords.length > 0) {
            // Add leadin
            allCoordinates = [...leadinCoords];
            
            // Add lap(s)
            if (lapCoords.length > 0 && laps > 0) {
                for (let i = 0; i < laps; i++) {
                    allCoordinates = allCoordinates.concat(lapCoords);
                }
                console.log(`Built route: leadin + ${laps} lap(s) = ${allCoordinates.length} total points`);
            } else {
                console.log(`No lap data available, using leadin only (${allCoordinates.length} points)`);
            }
        } else {
            console.error('Route has no leadin coordinates');
            this.drawNoDataMessage(canvas, courseName);
            return;
        }

        if (allCoordinates.length === 0) {
            console.error('No coordinates to display');
            this.drawNoDataMessage(canvas, courseName);
            return;
        }

        // Process coordinates
        const { distances, elevations } = this.processCoordinates(allCoordinates);
        
        console.log(`Processed: ${distances.length} points, ${distances[distances.length-1].toFixed(2)}km total`);
        console.log(`Elevation range: ${Math.min(...elevations).toFixed(1)}m to ${Math.max(...elevations).toFixed(1)}m`);
        
        // Draw profile
        this.drawProfile(canvas, distances, elevations, courseName, laps);
        console.log('✓ Profile rendered successfully');
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

        // Ensure minimum Y-axis range of 400m to prevent flat routes looking extreme
        const MIN_Y_RANGE = 400;
        let displayMinElevation, displayMaxElevation;
        
        if (elevationRange < MIN_Y_RANGE) {
            // Center the actual elevation range within the 400m minimum
            const centerElevation = (minElevation + maxElevation) / 2;
            displayMinElevation = centerElevation - MIN_Y_RANGE / 2;
            displayMaxElevation = centerElevation + MIN_Y_RANGE / 2;
        } else {
            // Use actual range with 10% padding on each side
            const elevationPadding = elevationRange * 0.1;
            displayMinElevation = minElevation - elevationPadding;
            displayMaxElevation = maxElevation + elevationPadding;
        }
        
        const displayRange = displayMaxElevation - displayMinElevation;

        const xScale = chartWidth / maxDistance;
        const yScale = chartHeight / displayRange;
        
        // Detect climbs
        const climbs = this.detectClimbs(distances, elevations, maxDistance);
        console.log(`✓ Detected ${climbs.length} climbs`);

        // Draw background
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid(ctx, padding, chartWidth, chartHeight, maxDistance, displayMinElevation, displayMaxElevation);

        // Draw climb fill areas first (behind the elevation line)
        this.drawClimbHighlights(ctx, climbs, distances, elevations, padding, chartWidth, chartHeight,
                                maxDistance, displayMinElevation, displayRange, xScale, yScale);

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
        
        // Draw thicker lines over climb sections
        this.drawClimbLines(ctx, climbs, distances, elevations, padding, chartWidth, chartHeight,
                           maxDistance, displayMinElevation, displayRange, xScale, yScale);
        
        // Draw climb numbers
        this.drawClimbNumbers(ctx, climbs, distances, elevations, padding, chartWidth, chartHeight,
                             maxDistance, displayMinElevation, displayRange, xScale, yScale);

        // Draw axes
        this.drawAxes(ctx, padding, chartWidth, chartHeight, maxDistance, displayMinElevation, displayMaxElevation);

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Exo 2", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        const title = laps > 1 ? `${courseName} (${laps} laps)` : courseName;
        ctx.fillText(title, width / 2, 30);
        
        // Add subtitle
        ctx.fillStyle = '#888888';
        ctx.font = '11px "Exo 2", -apple-system, sans-serif';
        ctx.fillText('Elevation Profile', width / 2, 48);

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
     * Draw colored fill areas for climbs
     */
    drawClimbHighlights(ctx, climbs, distances, elevations, padding, chartWidth, chartHeight,
                       maxDistance, displayMinElevation, displayRange, xScale, yScale) {
        climbs.forEach(climb => {
            // Get all points within the climb distance range
            const climbPoints = [];
            for (let i = 0; i < distances.length; i++) {
                if (distances[i] >= climb.startDist && distances[i] <= climb.endDist) {
                    climbPoints.push({ dist: distances[i], ele: elevations[i] });
                }
            }
            
            if (climbPoints.length < 2) return;
            
            // Create fill path
            ctx.beginPath();
            
            // Start at bottom left of climb
            const startX = padding.left + climb.startDist * xScale;
            ctx.moveTo(startX, padding.top + chartHeight);
            
            // Draw along the elevation profile
            climbPoints.forEach(point => {
                const x = padding.left + point.dist * xScale;
                const y = padding.top + chartHeight - (point.ele - displayMinElevation) * yScale;
                ctx.lineTo(x, y);
            });
            
            // Close to bottom right
            const endX = padding.left + climb.endDist * xScale;
            ctx.lineTo(endX, padding.top + chartHeight);
            ctx.closePath();
            
            // Fill with color based on difficulty
            const color = this.getScoreHexColor(climb.rawScore);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
    }
    
    /**
     * Draw thicker colored lines over climb sections
     */
    drawClimbLines(ctx, climbs, distances, elevations, padding, chartWidth, chartHeight,
                  maxDistance, displayMinElevation, displayRange, xScale, yScale) {
        climbs.forEach(climb => {
            // Draw thicker line over each chunk (uphill segment)
            climb.chunks.forEach(chunk => {
                ctx.beginPath();
                let isFirstPoint = true;
                
                for (let i = 0; i < distances.length; i++) {
                    if (distances[i] >= chunk.startDist && distances[i] <= chunk.endDist) {
                        const x = padding.left + distances[i] * xScale;
                        const y = padding.top + chartHeight - (elevations[i] - displayMinElevation) * yScale;
                        
                        if (isFirstPoint) {
                            ctx.moveTo(x, y);
                            isFirstPoint = false;
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                }
                
                const color = this.getScoreHexColor(climb.rawScore);
                ctx.strokeStyle = color;
                ctx.lineWidth = 3.5;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.stroke();
            });
        });
    }
    
    /**
     * Draw climb numbers above climbs
     */
    drawClimbNumbers(ctx, climbs, distances, elevations, padding, chartWidth, chartHeight,
                    maxDistance, displayMinElevation, displayRange, xScale, yScale) {
        climbs.forEach(climb => {
            // Find the first point of the climb
            let startPoint = null;
            for (let i = 0; i < distances.length; i++) {
                if (distances[i] >= climb.startDist) {
                    startPoint = { dist: distances[i], ele: elevations[i] };
                    break;
                }
            }
            
            if (!startPoint) return;
            
            // Position the number above the start of the climb
            const x = padding.left + startPoint.dist * xScale;
            const y = padding.top + chartHeight - (startPoint.ele - displayMinElevation) * yScale - 30;
            
            const color = this.getScoreHexColor(climb.rawScore);
            
            // Draw number with shadow for visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            ctx.fillStyle = color;
            ctx.font = 'bold 16px "Exo 2", -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(climb.id.toString(), x, y);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        });
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
        console.log('Drawing "no data" message for:', courseName);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get 2D context from canvas');
            return;
        }
        
        const width = canvas.width;
        const height = canvas.height;

        // Draw background
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, width, height);

        // Draw message
        ctx.fillStyle = '#666666';
        ctx.font = '16px "Exo 2", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Route elevation data not available for ${courseName}`, width / 2, height / 2 - 10);
        
        ctx.fillStyle = '#888888';
        ctx.font = '13px "Exo 2", -apple-system, sans-serif';
        ctx.fillText('Check back soon as we continue adding route profiles', width / 2, height / 2 + 15);
        
        console.log('✓ "No data" message drawn successfully');
    }
}

// Create and export global instance
if (typeof window !== 'undefined') {
    window.elevationProfileGen = new ElevationProfileGenerator();
    console.log('✓ Elevation Profile Generator initialized');
    
    // Test if ExportedWorld.json is accessible
    fetch('ExportedWorld.json', { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                console.log('✓ ExportedWorld.json is accessible (status: ' + response.status + ')');
            } else {
                console.warn('⚠️ ExportedWorld.json returned status: ' + response.status);
            }
        })
        .catch(error => {
            console.error('❌ Cannot access ExportedWorld.json:', error.message);
            console.error('   File must be in the same directory as this HTML page');
            console.error('   Current page:', window.location.href);
        });
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ElevationProfileGenerator };
}
