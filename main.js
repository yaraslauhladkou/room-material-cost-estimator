import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// DOM Elements
const inputs = {
    length: document.getElementById('length'),
    width: document.getElementById('width'),
    height: document.getElementById('height'),
};

const materialListContainer = document.getElementById('material-list');
const addMaterialBtn = document.getElementById('add-material-btn');
const costBreakdownContainer = document.getElementById('cost-breakdown');

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
    materials: [
        // Default: Insulation on walls (4) and ceiling, but not floor
        { id: 1, name: 'Insulation', price: 12.00, wallCount: 4, floor: false, ceiling: true },
        // Default: Paint everywhere
        { id: 2, name: 'Paint', price: 5.50, wallCount: 4, floor: false, ceiling: true },
        // Default: Flooring only on floor
        { id: 3, name: 'Laminate', price: 25.00, wallCount: 0, floor: true, ceiling: false }
    ]
};

// --- Material List Logic ---
function renderMaterialInputs() {
    if (!materialListContainer) return;
    materialListContainer.innerHTML = '';

    params.materials.forEach((mat, index) => {
        const card = document.createElement('div');
        card.className = 'material-card';

        // --- Header (Name, Price, Delete) ---
        const header = document.createElement('div');
        header.className = 'material-header';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Material Name';
        nameInput.value = mat.name;
        nameInput.addEventListener('input', (e) => {
            mat.name = e.target.value;
            updateCalculations();
        });

        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.placeholder = '$/m²';
        priceInput.value = mat.price;
        priceInput.min = 0;
        priceInput.step = 0.1;
        priceInput.addEventListener('input', (e) => {
            mat.price = parseFloat(e.target.value) || 0;
            onInput();
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove';
        removeBtn.innerHTML = '×';
        removeBtn.title = "Remove Layer";
        removeBtn.addEventListener('click', () => {
            params.materials.splice(index, 1);
            renderMaterialInputs();
            onInput();
        });

        header.appendChild(nameInput);
        header.appendChild(priceInput);
        header.appendChild(removeBtn);

        // --- Options (Walls Qty, Floor, Ceiling) ---
        const options = document.createElement('div');
        options.className = 'material-options';

        // Wall Counter
        const wallLabel = document.createElement('label');
        wallLabel.className = 'option-group';
        wallLabel.innerHTML = `Walls:`;
        const wallInput = document.createElement('input');
        wallInput.type = 'number';
        wallInput.min = 0;
        wallInput.max = 4;
        wallInput.value = mat.wallCount;
        wallInput.addEventListener('input', (e) => {
            mat.wallCount = Math.max(0, Math.min(4, parseInt(e.target.value) || 0));
            onInput();
        });
        wallLabel.appendChild(wallInput);

        // Floor Checkbox
        const floorLabel = document.createElement('label');
        floorLabel.className = 'option-group';
        const floorInput = document.createElement('input');
        floorInput.type = 'checkbox';
        floorInput.checked = mat.floor;
        floorInput.addEventListener('change', (e) => {
            mat.floor = e.target.checked;
            onInput();
        });
        floorLabel.appendChild(floorInput);
        floorLabel.append("Floor");

        // Ceiling Checkbox
        const ceilingLabel = document.createElement('label');
        ceilingLabel.className = 'option-group';
        const ceilingInput = document.createElement('input');
        ceilingInput.type = 'checkbox';
        ceilingInput.checked = mat.ceiling;
        ceilingInput.addEventListener('change', (e) => {
            mat.ceiling = e.target.checked;
            onInput();
        });
        ceilingLabel.appendChild(ceilingInput);
        ceilingLabel.append("Ceil");

        options.appendChild(wallLabel);
        options.appendChild(floorLabel);
        options.appendChild(ceilingLabel);

        card.appendChild(header);
        card.appendChild(options);
        materialListContainer.appendChild(card);
    });
}

if (addMaterialBtn) {
    addMaterialBtn.addEventListener('click', () => {
        params.materials.push({
            id: Date.now(),
            name: 'New Layer',
            price: 0,
            wallCount: 4, // Default all walls
            floor: true,
            ceiling: true
        });
        renderMaterialInputs();
        onInput();
    });
}

// --- Calculation Logic ---
function updateCalculations() {
    const { length, width, height } = params;

    const totalWallArea = 2 * (length * height) + 2 * (width * height);
    const floorArea = length * width;
    const ceilingArea = length * width;

    // Average area per wall (estimation)
    const avgWallArea = totalWallArea / 4;

    // Update UI Stats
    if (outputs.wall) outputs.wall.textContent = `${totalWallArea.toFixed(2)} m²`;
    if (outputs.floor) outputs.floor.textContent = `${floorArea.toFixed(2)} m²`;
    if (outputs.ceiling) outputs.ceiling.textContent = `${ceilingArea.toFixed(2)} m²`;

    // Calculate Total Area (Just geometry)
    const totalGeoArea = totalWallArea + floorArea + ceilingArea;
    if (outputs.total) outputs.total.textContent = `${totalGeoArea.toFixed(2)} m²`;

    let grandTotal = 0;

    if (costBreakdownContainer) {
        costBreakdownContainer.innerHTML = '';

        params.materials.forEach(mat => {
            // Calculate specific area for this material
            let matArea = 0;

            // Wall Calculation (based on count 0-4)
            matArea += (mat.wallCount * avgWallArea);

            // Floor/Ceiling
            if (mat.floor) matArea += floorArea;
            if (mat.ceiling) matArea += ceilingArea;

            const materialCost = matArea * mat.price;
            grandTotal += materialCost;

            // UI Item
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            const formatPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(materialCost);

            // Small subtitle to show what's included
            let includes = [];
            if (mat.wallCount > 0) includes.push(`${mat.wallCount}W`);
            if (mat.floor) includes.push('F');
            if (mat.ceiling) includes.push('C');
            const sub = includes.length ? `(${includes.join('+')})` : '(None)';

            item.innerHTML = `
                <span>${mat.name || 'Layer'} <small style="opacity:0.5">${sub}</small></span>
                <span>${formatPrice}</span>
            `;
            costBreakdownContainer.appendChild(item);
        });
    }

    if (outputs.cost) {
        const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(grandTotal);
        outputs.cost.textContent = currency;
    }

    return grandTotal;
}

// --- Three.js Setup ---
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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const material = new THREE.MeshStandardMaterial({
    color: 0x646cff,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.3
});

const geometry = new THREE.BoxGeometry(1, 1, 1);
const room = new THREE.Mesh(geometry, material);
room.renderOrder = 0;
scene.add(room);

let gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
scene.add(gridHelper);

let font = null;
const labelsGroup = new THREE.Group();
scene.add(labelsGroup);

const loader = new FontLoader();
loader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
    font = loadedFont;
    updateScene();
});

function createLabel(text, position, color = 0xffffff, size = 0.3) {
    if (!font) return;
    const textGeometry = new TextGeometry(text, { font: font, size: size, height: size * 0.05, curveSegments: 3, bevelEnabled: false });
    textGeometry.center();
    const textMaterial = new THREE.MeshBasicMaterial({ color: color, depthTest: false, depthWrite: false });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.copy(position);
    textMesh.renderOrder = 999;
    labelsGroup.add(textMesh);
}

let targetCameraPosition = null;

function updateScene() {
    const { length, width, height } = params;

    const grandTotal = updateCalculations();

    // Update Geometry
    room.scale.set(length, height, width);
    room.position.y = height / 2;

    // Grid
    scene.remove(gridHelper);
    const maxDim = Math.max(length, width, height);
    const gridSize = Math.max(20, maxDim * 2);
    gridHelper = new THREE.GridHelper(gridSize, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Clean Labels
    labelsGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    });
    labelsGroup.clear();

    if (!font) return;

    // Label Logic
    let textSize = maxDim * 0.03;
    if (textSize > height * 0.15) textSize = height * 0.15;
    textSize = Math.max(0.15, textSize);
    const gap = textSize * 1.2;

    const formattedCost = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(grandTotal);
    const floorArea = (length * width).toFixed(2);
    const ceilingArea = (length * width).toFixed(2);
    const wallArea = (2 * length * height + 2 * width * height).toFixed(2);

    createLabel(`${length}m`, new THREE.Vector3(0, 0, width / 2 + gap), 0xffffff, textSize);
    createLabel(`${width}m`, new THREE.Vector3(length / 2 + gap, 0, 0), 0xffffff, textSize);
    createLabel(`${height}m`, new THREE.Vector3(-length / 2 - gap, height / 2, -width / 2), 0xffffff, textSize);

    createLabel(`Floor: ${floorArea}m²`, new THREE.Vector3(0, gap, 0), 0xffff00, textSize);
    createLabel(`Ceiling: ${ceilingArea}m²`, new THREE.Vector3(0, height - gap, 0), 0xffff00, textSize);
    createLabel(`Walls: ${wallArea}m²`, new THREE.Vector3(0, height / 2, -width / 2 + gap), 0xffff00, textSize);

    createLabel(
        `Total: ${formattedCost}`,
        new THREE.Vector3(0, height + (textSize * 2), 0),
        0x00ff88,
        textSize * 1.2
    );

    // Auto Camera
    const fitDistance = maxDim * 1.5;
    const currentDist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (currentDist < fitDistance * 0.4 || currentDist > fitDistance * 2.5) {
        const direction = camera.position.clone().normalize();
        targetCameraPosition = direction.multiplyScalar(fitDistance);
        if (targetCameraPosition.y < fitDistance * 0.3) targetCameraPosition.y = fitDistance * 0.3;
    }
}

function onInput() {
    if (inputs.length) params.length = parseFloat(inputs.length.value) || 0;
    if (inputs.width) params.width = parseFloat(inputs.width.value) || 0;
    if (inputs.height) params.height = parseFloat(inputs.height.value) || 0;
    updateScene();
}

Object.values(inputs).forEach(input => {
    if (input) input.addEventListener('input', onInput);
});

// Initial Render
renderMaterialInputs();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function animate() {
    requestAnimationFrame(animate);
    if (targetCameraPosition) {
        camera.position.lerp(targetCameraPosition, 0.05);
        if (camera.position.distanceTo(targetCameraPosition) < 0.1) targetCameraPosition = null;
    }
    labelsGroup.children.forEach(label => label.quaternion.copy(camera.quaternion));
    controls.update();
    renderer.render(scene, camera);
}

onInput();
animate();