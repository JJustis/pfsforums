const initHoneycombMeshBackground = () => {
    const canvas = document.getElementById('bg-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = 60;

    const group = new THREE.Group();
    scene.add(group);

    const radiusOuter = 1;
    const radiusInner = 0.8;

    function createHexRingGeometry(innerRadius, outerRadius) {
        const shape = new THREE.Shape();
        const segments = 6;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * outerRadius;
            const y = Math.sin(angle) * outerRadius;
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }

        const hole = new THREE.Path();
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * innerRadius;
            const y = Math.sin(angle) * innerRadius;
            if (i === 0) hole.moveTo(x, y);
            else hole.lineTo(x, y);
        }

        shape.holes.push(hole);
        const geometry = new THREE.ShapeGeometry(shape);
        return geometry;
    }

    const material = new THREE.MeshStandardMaterial({
        color: 0xffcc66,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xffe066,
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide,
        flatShading: true
    });

    const rows = 200;
    const cols = 200;
    const hexWidth = radiusOuter * 2;
    const hexHeight = Math.sqrt(3) * radiusOuter;

    const meshes = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const xOffset = (row % 2 === 0) ? 0 : hexWidth * 0.5;
            const x = col * hexWidth + xOffset - cols;
            const y = row * (hexHeight * 0.75) - rows;

            const hexMesh = new THREE.Mesh(createHexRingGeometry(radiusInner, radiusOuter), material.clone());
            hexMesh.position.set(x, y, 0);
            group.add(hexMesh);
            meshes.push(hexMesh);
        }
    }

    const light = new THREE.PointLight(0xffffff, 1.2);
    light.position.set(0, 0, 80);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    let mouse = { x: 0, y: 0 };
    document.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        meshes.forEach((m) => {
            const dx = m.position.x * 0.05 - mouse.x * 10;
            const dy = m.position.y * 0.05 - mouse.y * 10;
            const dist = Math.sqrt(dx * dx + dy * dy);
            m.position.z = Math.sin(dist - t * 3) * 0.5;
        });

        renderer.render(scene, camera);
    };

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
};

document.addEventListener('DOMContentLoaded', initHoneycombMeshBackground);