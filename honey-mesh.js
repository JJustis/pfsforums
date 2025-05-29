const initThreeBackground = () => {
    const canvas = document.getElementById('bg-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.position.set(0, 0, 50);

    const rows = 100;
    const cols = 100;
    const hexWidth = 1;
    const hexHeight = Math.sqrt(3) / 2 * hexWidth;

    const geometry = new THREE.PlaneGeometry(cols, rows, cols, rows);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        wireframe: true,
        flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Ripple state
    let mouse = { x: 0, y: 0 };

    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const dist = Math.hypot(x - mouse.x * cols / 2, y - mouse.y * rows / 2);
            const wave = Math.sin(dist * 0.5 - time * 3);
            position.setZ(i, wave);
        }
        position.needsUpdate = true;

        renderer.render(scene, camera);
    };

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
};

document.addEventListener('DOMContentLoaded', initThreeBackground);