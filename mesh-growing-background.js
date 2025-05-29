 const initThreeBackground = () => {
            // Get the canvas element
            const canvas = document.getElementById('bg-canvas');
            
            // Create scene, camera, and renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            
            // Set renderer size and pixel ratio
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Array to store all vertices
            let vertices = [];
            
            // Add some initial vertices in a grid pattern
            const gridSize = 6;
            const spacing = 1.2;
            
            for (let x = -gridSize / 2; x <= gridSize / 2; x++) {
                for (let y = -gridSize / 2; y <= gridSize / 2; y++) {
                    vertices.push(new THREE.Vector3(
                        x * spacing,
                        y * spacing,
                        (Math.random() - 0.5) * 0.1  // Small z variation
                    ));
                }
            }
            
            // Create initial geometry
            let geometry = new THREE.BufferGeometry().setFromPoints(vertices);
            
            // Create material for the points
            const pointsMaterial = new THREE.PointsMaterial({
                color: 0x66ccff,
                size: 0.05,
                transparent: true,
                opacity: 0.8
            });
            
            // Create points for vertices
            const points = new THREE.Points(geometry, pointsMaterial);
            scene.add(points);
            
            // Create material for the mesh
            const meshMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            
            // Create initial mesh
            let mesh = null;
            rebuildMesh();
            
            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);
            
            // Position camera
            camera.position.z = 8;
            
            // Mouse tracking variables
            const mouse = {
                x: 0,
                y: 0,
                prevX: 0,
                prevY: 0,
                directionX: 0,
                directionY: 0,
                prevDirectionX: 0,
                prevDirectionY: 0
            };
            
            // Variables for vertex growth animation
            const newVertices = [];
            const vertexGrowthSpeed = 0.05;
            
            // Track mouse movement
            document.addEventListener('mousemove', (event) => {
                // Get normalized mouse coordinates
                mouse.prevX = mouse.x;
                mouse.prevY = mouse.y;
                
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                
                // Calculate current direction
                mouse.prevDirectionX = mouse.directionX;
                mouse.prevDirectionY = mouse.directionY;
                
                mouse.directionX = mouse.x - mouse.prevX;
                mouse.directionY = mouse.y - mouse.prevY;
                
                // Check for significant direction change
                const directionChangeThreshold = 0.005;
                const directionChanged = 
                    (Math.sign(mouse.directionX) !== Math.sign(mouse.prevDirectionX) && 
                     Math.abs(mouse.directionX) > directionChangeThreshold) ||
                    (Math.sign(mouse.directionY) !== Math.sign(mouse.prevDirectionY) && 
                     Math.abs(mouse.directionY) > directionChangeThreshold);
                
                // Add new vertex when direction changes
                if (directionChanged) {
                    addGrowingVertexAtMousePosition(mouse.x, mouse.y);
                }
                
                // Also make mesh respond to mouse position
                if (mesh) {
                    mesh.rotation.x += (mouse.directionY * 0.1);
                    mesh.rotation.y += (mouse.directionX * 0.1);
                }
            });
            
            // Function to add a new vertex at mouse position with growth animation
            function addGrowingVertexAtMousePosition(mouseX, mouseY) {
                // Project mouse position to 3D space
                const vector = new THREE.Vector3(mouseX, mouseY, 0);
                vector.unproject(camera);
                
                const dir = vector.sub(camera.position).normalize();
                const distance = -camera.position.z / dir.z;
                const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));
                
                // Add a small random offset to z
                targetPos.z += (Math.random() - 0.5) * 0.8;
                
                // Create a new growing vertex object
                const growingVertex = {
                    vertex: targetPos.clone(),
                    targetPosition: targetPos,
                    startPosition: targetPos.clone().setZ(-5), // Start from below
                    progress: 0
                };
                
                // Add to growing vertices list
                newVertices.push(growingVertex);
                
                // Limit maximum vertices to prevent performance issues
                const maxVertices = 300;
                if (vertices.length > maxVertices) {
                    vertices = vertices.slice(vertices.length - maxVertices);
                }
            }
            
            // Function to rebuild the mesh from vertices
            function rebuildMesh() {
                // Remove old mesh
                if (mesh) scene.remove(mesh);
                
                // Create new geometry from points
                const updatedGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
                
                // If we have enough vertices, try to create faces
                if (vertices.length > 3) {
                    try {
                        // Create indices for triangulation
                        const indices = [];
                        
                        // Simple triangulation approach - not perfect but works for the effect
                        // We'll connect each vertex to its nearest neighbors
                        
                        for (let i = 0; i < vertices.length; i++) {
                            // Find nearest neighbors
                            const nearestIndices = findNearestNeighbors(i, 4);
                            
                            // Create triangles with nearest neighbors
                            for (let j = 0; j < nearestIndices.length - 1; j++) {
                                indices.push(i, nearestIndices[j], nearestIndices[j + 1]);
                            }
                        }
                        
                        updatedGeometry.setIndex(indices);
                        
                        // Compute normals
                        updatedGeometry.computeVertexNormals();
                    } catch (e) {
                        console.error("Error creating mesh:", e);
                    }
                }
                
                // Create new mesh and add to scene
                mesh = new THREE.Mesh(updatedGeometry, meshMaterial);
                scene.add(mesh);
                
                // Update points
                points.geometry = updatedGeometry.clone();
            }
            
            // Function to find nearest neighbors to a vertex
            function findNearestNeighbors(vertexIndex, count) {
                const vertex = vertices[vertexIndex];
                const distances = [];
                
                // Calculate distances to all other vertices
                for (let i = 0; i < vertices.length; i++) {
                    if (i === vertexIndex) continue;
                    
                    const distance = vertex.distanceTo(vertices[i]);
                    distances.push({ index: i, distance: distance });
                }
                
                // Sort by distance
                distances.sort((a, b) => a.distance - b.distance);
                
                // Return the indices of the nearest vertices
                return distances.slice(0, Math.min(count, distances.length)).map(d => d.index);
            }
            
            // Handle window resize
            window.addEventListener('resize', () => {
                // Update camera aspect ratio
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                
                // Update renderer size
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
            
            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);
                
                // Animate new vertices growing
                let meshNeedsUpdate = false;
                
                for (let i = newVertices.length - 1; i >= 0; i--) {
                    const growingVertex = newVertices[i];
                    
                    // Update progress
                    growingVertex.progress += vertexGrowthSpeed;
                    
                    if (growingVertex.progress >= 1) {
                        // Growth finished - add to main vertices array
                        vertices.push(growingVertex.targetPosition);
                        newVertices.splice(i, 1);
                        meshNeedsUpdate = true;
                    } else {
                        // Interpolate position
                        growingVertex.vertex.lerpVectors(
                            growingVertex.startPosition,
                            growingVertex.targetPosition,
                            growingVertex.progress
                        );
                    }
                }
                
                // Update mesh if needed
                if (meshNeedsUpdate) {
                    rebuildMesh();
                }
                
                // Gentle constant rotation animation
                if (mesh) {
                    mesh.rotation.x += 0.001;
                    mesh.rotation.y += 0.002;
                }
                
                // Render the scene
                renderer.render(scene, camera);
            };
            
            // Start animation
            animate();
        };

        // Initialize Three.js background when DOM is loaded
        document.addEventListener('DOMContentLoaded', initThreeBackground);