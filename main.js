import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// DOM Elements
const inputs = {
    length: document.getElementById('length'),
    width: document.getElementById('width'),
    height: document.getElementById('height'),
    price: document.getElementById('price'),
};

const outputs = {
    wall: document.getElementById('wall-area'),
    floor: document.getElementById('floor-area'),
    ceiling: document.getElementById('ceiling-area'),
    total: document.getElementById('total-area'),
    cost: document.getElementById('total-cost'),
};

// State
const params = {
    length: 5,
    width: 4,
    height: 3,
    price: 15,
};

// Calculation Logic
function updateCalculations() {
    const { length, width, height, price } = params;

    const wallArea = 2 * (length * height) + 2 * (width * height);
    const floorArea = length * width;
    const ceilingArea = length * width;
    const totalArea = wallArea + floorArea + ceilingArea;
    const totalCost = totalArea * price;

    outputs.wall.textContent = `${wallArea.toFixed(2)} m²`;
    outputs.floor.textContent = `${floorArea.toFixed(2)} m²`;
    outputs.ceiling.textContent = `${ceilingArea.toFixed(2)} m²`;
    outputs.total.textContent = `${totalArea.toFixed(2)} m²`;

    // Format Currency
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost);
    outputs.cost.textContent = currency;
}

// Three.js Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Room Mesh
const material = new THREE.MeshStandardMaterial({
    color: 0x646cff,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.5
});

const geometry = new THREE.BoxGeometry(1, 1, 1);
const room = new THREE.Mesh(geometry, material);
room.renderOrder = 0;
scene.add(room);

// Grid Helper
const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
scene.add(gridHelper);

// Font & Labels
let font = null;
const labelsGroup = new THREE.Group();
scene.add(labelsGroup);

const loader = new FontLoader();
loader.load('./vendor/helvetiker_regular.typeface.json', function (loadedFont) {
    font = loadedFont;
    updateScene();
});

function createLabel(text, position, color = 0xffffff, size = 0.3) {
    if (!font) return;

    const textGeometry = new TextGeometry(text, {
        font: font,
        size: size,
        height: 0.02,
        curveSegments: 12,
        bevelEnabled: false,
    });

    textGeometry.center();

    const textMaterial = new THREE.MeshBasicMaterial({
        color: color,
        depthTest: false,
        depthWrite: false
    });

    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.copy(position);
    textMesh.renderOrder = 999;

    labelsGroup.add(textMesh);
}

// Update 3D Scene
function updateScene() {
    const { length, width, height, price } = params;

    // Scale the room mesh
    room.scale.set(length, height, width);
    room.position.y = height / 2;

    // Memory Cleanup
    labelsGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    });
    labelsGroup.clear();

    if (!font) return;

    // Calculations for labels
    const totalArea = (2 * (length * height) + 2 * (width * height)) + (length * width * 2);
    const totalCost = totalArea * price;
    const formattedCost = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost);

    // Dynamic Text Size
    const minDim = Math.min(length, width, height);
    const textSize = Math.max(0.2, minDim * 0.08);

    // -- Dimensions --
    createLabel(`${length}m`, new THREE.Vector3(0, 0, width / 2 + 0.5), 0xffffff, textSize);
    createLabel(`${width}m`, new THREE.Vector3(length / 2 + 0.5, 0, 0), 0xffffff, textSize);
    createLabel(`${height}m`, new THREE.Vector3(-length / 2 - 0.5, height / 2, -width / 2), 0xffffff, textSize);

    // -- Surfaces --
    // Floor
    const floorArea = (length * width).toFixed(2);
    createLabel(`Floor: ${floorArea}m²`, new THREE.Vector3(0, 0.5, 0), 0xffff00, textSize);

    // Ceiling
    const ceilingArea = (length * width).toFixed(2);
    createLabel(`Ceiling: ${ceilingArea}m²`, new THREE.Vector3(0, height - 0.5, 0), 0xffff00, textSize);

    // Walls
    const wallArea = (2 * length * height + 2 * width * height).toFixed(2);
    createLabel(`Walls: ${wallArea}m²`, new THREE.Vector3(0, height / 2, -width / 2 + 0.5), 0xffff00, textSize);

    // -- TOTAL COST LABEL (Floating above) --
    // We create a larger, green label floating above the room
    createLabel(
        `Total Estimate: ${formattedCost}`,
        new THREE.Vector3(0, height + 1.0, 0), // Floats 1m above the room
        0x00ff88, // Green color
        textSize * 1.5 // Larger text
    );
}

function onInput() {
    params.length = parseFloat(inputs.length.value) || 0;
    params.width = parseFloat(inputs.width.value) || 0;
    params.height = parseFloat(inputs.height.value) || 0;
    params.price = parseFloat(inputs.price.value) || 0;

    updateCalculations();
    updateScene();
}

Object.values(inputs).forEach(input => {
    input.addEventListener('input', onInput);
});

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Rotate labels to match camera (Billboarding)
    labelsGroup.children.forEach(label => {
        label.quaternion.copy(camera.quaternion);
    });

    controls.update();
    renderer.render(scene, camera);
}

// Init
onInput();
animate();