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

const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
camera.position.set(8, 8, 8);
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
    opacity: 0.3 // Slightly more transparent to help readability
});

const geometry = new THREE.BoxGeometry(1, 1, 1);
const room = new THREE.Mesh(geometry, material);
room.renderOrder = 0;
scene.add(room);

// Grid Helper
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
        height: size * 0.05, // Very thin extrusion for crisp look
        curveSegments: 3,    // Low poly for performance
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

// Camera target for smoothing
let targetCameraPosition = null;

// Update 3D Scene
function updateScene() {
    const { length, width, height, price } = params;

    // 1. Update Room geometry
    room.scale.set(length, height, width);
    room.position.y = height / 2;

    // 2. Dynamic Grid
    scene.remove(gridHelper);
    const maxDim = Math.max(length, width, height);
    const gridSize = Math.max(20, maxDim * 2);
    gridHelper = new THREE.GridHelper(gridSize, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 3. Clear Labels
    labelsGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    });
    labelsGroup.clear();

    if (!font) return;

    // --- SMART TEXT SIZING FIX ---
    // 1. Base size is 3% of the largest dimension (down from 5%).
    let textSize = maxDim * 0.03;

    // 2. CRITICAL: Clamp text size so it never exceeds 15% of the HEIGHT.
    // This prevents Floor and Ceiling labels from overlapping in flat rooms (e.g. 50x50x2).
    if (textSize > height * 0.15) {
        textSize = height * 0.15;
    }

    // 3. Min/Max clamps for readability
    textSize = Math.max(0.15, textSize); // Never smaller than 0.15m

    // Gap calculation (tighten it up)
    const gap = textSize * 1.2;

    // Formatting
    const totalArea = (2 * (length * height) + 2 * (width * height)) + (length * width * 2);
    const totalCost = totalArea * price;
    const formattedCost = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalCost);
    const floorArea = (length * width).toFixed(2);
    const ceilingArea = (length * width).toFixed(2);
    const wallArea = (2 * length * height + 2 * width * height).toFixed(2);

    // -- Dimensions --
    // Push out slightly
    createLabel(`${length}m`, new THREE.Vector3(0, 0, width / 2 + gap), 0xffffff, textSize);
    createLabel(`${width}m`, new THREE.Vector3(length / 2 + gap, 0, 0), 0xffffff, textSize);
    createLabel(`${height}m`, new THREE.Vector3(-length / 2 - gap, height / 2, -width / 2), 0xffffff, textSize);

    // -- Surfaces --
    // Floor: Positioned just above the grid
    createLabel(`Floor: ${floorArea}m²`, new THREE.Vector3(0, gap, 0), 0xffff00, textSize);

    // Ceiling: Positioned just below the roof
    createLabel(`Ceiling: ${ceilingArea}m²`, new THREE.Vector3(0, height - gap, 0), 0xffff00, textSize);

    // Walls: Centered vertically
    createLabel(`Walls: ${wallArea}m²`, new THREE.Vector3(0, height / 2, -width / 2 + gap), 0xffff00, textSize);

    // -- Total Cost --
    // Floating above, slightly larger but not huge
    createLabel(
        `Total: ${formattedCost}`,
        new THREE.Vector3(0, height + (textSize * 2), 0),
        0x00ff88,
        textSize * 1.2
    );

    // --- AUTO CAMERA ---
    const fitDistance = maxDim * 1.5; // Moved closer (was 2.0)
    const currentDist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));

    if (currentDist < fitDistance * 0.4 || currentDist > fitDistance * 2.5) {
        const direction = camera.position.clone().normalize();
        targetCameraPosition = direction.multiplyScalar(fitDistance);
        if (targetCameraPosition.y < fitDistance * 0.3) targetCameraPosition.y = fitDistance * 0.3;
    }
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

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function animate() {
    requestAnimationFrame(animate);

    if (targetCameraPosition) {
        camera.position.lerp(targetCameraPosition, 0.05);
        if (camera.position.distanceTo(targetCameraPosition) < 0.1) {
            targetCameraPosition = null;
        }
    }

    labelsGroup.children.forEach(label => {
        label.quaternion.copy(camera.quaternion);
    });

    controls.update();
    renderer.render(scene, camera);
}

onInput();
animate();