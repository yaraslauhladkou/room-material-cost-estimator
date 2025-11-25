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
camera.position.set(10, 10, 10); // Moved camera back slightly
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Room Mesh
const material = new THREE.MeshStandardMaterial({
    color: 0x646cff,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.4 // Slightly more transparent for better text visibility
});

const geometry = new THREE.BoxGeometry(1, 1, 1);
const room = new THREE.Mesh(geometry, material);
room.renderOrder = 0;
scene.add(room);

// Grid Helper
// We initialize it but will resize it in updateScene
let gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
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
        height: size * 0.1, // Thickness relative to size
        curveSegments: 6,   // Lower segments for performance
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

    // 1. Update Room geometry
    room.scale.set(length, height, width);
    room.position.y = height / 2;

    // 2. Update Grid Helper size to match the room (plus some margin)
    scene.remove(gridHelper);
    const gridSize = Math.max(length, width) * 2;
    // Ensure grid divisions are integers and not too dense
    const gridDivisions = Math.floor(gridSize / 1);
    gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 3. Clear old labels
    labelsGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    });
    labelsGroup.clear();

    if (!font) return;

    // 4. Calculate Text Size & Spacing
    // We dampen the scaling so text doesn't get ridiculously huge
    const maxDim = Math.max(length, width, height);
    // Formula: Base 0.3 + 3% of the largest dimension
    const textSize = 0.3 + (maxDim * 0.03);

    // Spacing Gap: The buffer zone between geometry and text
    const gap = textSize * 2.0;

    // Calculations for text
    const totalArea = (2 * (length * height) + 2 * (width * height)) + (length * width * 2);
    const totalCost = totalArea * price;
    const formattedCost = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost);
    const floorArea = (length * width).toFixed(2);
    const ceilingArea = (length * width).toFixed(2);
    const wallArea = (2 * length * height + 2 * width * height).toFixed(2);

    // -- Dimensions Labels --
    // Push them out by 'width/2 + gap' to avoid clipping
    createLabel(`${length}m`, new THREE.Vector3(0, 0, width / 2 + gap), 0xffffff, textSize);
    createLabel(`${width}m`, new THREE.Vector3(length / 2 + gap, 0, 0), 0xffffff, textSize);
    createLabel(`${height}m`, new THREE.Vector3(-length / 2 - gap, height / 2, -width / 2), 0xffffff, textSize);

    // -- Surface Labels --

    // Floor: Raised by 'gap' so it floats above grid
    createLabel(`Floor: ${floorArea}m²`, new THREE.Vector3(0, gap, 0), 0xffff00, textSize);

    // Ceiling: Lowered by 'gap' from the top
    createLabel(`Ceiling: ${ceilingArea}m²`, new THREE.Vector3(0, height - gap, 0), 0xffff00, textSize);

    // Walls: Centered on height, pushed out slightly
    createLabel(`Walls: ${wallArea}m²`, new THREE.Vector3(0, height / 2, -width / 2 + gap), 0xffff00, textSize);

    // -- TOTAL COST LABEL --
    // Pushed WAY up: Height + extra buffer based on text size
    createLabel(
        `Total Estimate: ${formattedCost}`,
        new THREE.Vector3(0, height + (gap * 2), 0),
        0x00ff88,
        textSize * 1.5 // Total cost is 1.5x larger than normal text
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

    labelsGroup.children.forEach(label => {
        label.quaternion.copy(camera.quaternion);
    });

    controls.update();
    renderer.render(scene, camera);
}

// Init
onInput();
animate();