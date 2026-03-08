import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import particlesVertexShader from "./shaders/particles/vertex.glsl";
import particlesFragmentShader from "./shaders/particles/fragment.glsl";
import mercedesStarFragmentShader from "./shaders/mercedes/fragment.glsl";
import mercedesStarVertexShader from "./shaders/mercedes/vertex.glsl";

import {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
} from "three/examples/jsm/Addons.js";
import { texture } from "three/tsl";

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");
const canvasWheel = document.createElement("canvas");
canvasWheel.width = 1024;
canvasWheel.height = 1024;
canvasWheel.style.position = "fixed";
canvasWheel.style.width = "0px";
canvasWheel.style.height = "0px";
canvasWheel.style.top = 0;
canvasWheel.style.left = -1;
canvasWheel.style.zIndex = -1;
document.body.append(canvasWheel);

// Scene
const scene = new THREE.Scene();

const textureLoader = new THREE.TextureLoader();

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Materials
  particlesMaterial.uniforms.uResolution.value.set(
    sizes.width * sizes.pixelRatio,
    sizes.height * sizes.pixelRatio,
  );

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);

  composer.setSize(sizes.width, sizes.height);
});

/**
 * Elements
 */
function loadPeople() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

const people = loadPeople();

// --------------------- Events ------------------------
document.addEventListener("personAdded", (event) => {
  const person = event.detail;

  people.push(person);

  spinWheelTexture.needsUpdate = true;
});

document.addEventListener("personRemoved", (event) => {
  const index = people.findIndex((p) => p.id === event.detail.id);
  if (index !== -1) people.splice(index, 1);
});

document.addEventListener("personNotAvailable", (event) => {
  const index = people.findIndex((p) => p.id === event.detail.id);
  if (index !== -1) people[index].unavailable = true; // fixed typo
});

document.addEventListener("personAvailable", (event) => {
  const index = people.findIndex((p) => p.id === event.detail.id);
  if (index !== -1) people[index].unavailable = false;
});
// -----------------------------------------------------

function createSpinningWheel(canvas, people) {
  const ctx = canvas.getContext("2d");
  const padding = 20;
  const radius = Math.min(canvas.width, canvas.height) / 2 - padding;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  let angle = 0;
  let spinning = false;
  let spinVelocity = 0;
  let selectedPerson = null;

  function getActivePeople() {
    return people.filter((p) => !p.unavailable);
  }

  // --- WEIGHTED ARCS ---
  // Returns arc sizes (in radians) per person, proportional to inverse frequency.
  // Someone with frequency 0 gets weight 1 (baseline).
  // Someone with frequency N gets weight 1 / (N + 1).
  function computeArcs(activePeople) {
    const weights = activePeople.map(
      (p) => 1 / ((Number(p.frequency) || 0) + 1),
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    return weights.map((w) => (w / totalWeight) * Math.PI * 2);
  }

  // Precompute start angles for each slice given an array of arc sizes + base angle
  function computeStartAngles(arcs, baseAngle) {
    const starts = [];
    let acc = baseAngle;
    for (const arc of arcs) {
      starts.push(acc);
      acc += arc;
    }
    return starts;
  }

  function drawWheel() {
    const activePeople = getActivePeople();
    const arcs = computeArcs(activePeople);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    activePeople.forEach((person, i) => {
      const startAngle = computeStartAngles(arcs, angle)[i];
      const endAngle = startAngle + arcs[i];

      // Slice fill
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = person.color;
      ctx.fill();

      // Label — only draw if slice is big enough to be readable
      if (arcs[i] > 0.08) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + arcs[i] / 2);
        ctx.fillStyle = "#000";
        ctx.font = `${Math.floor(radius / 10) + 10}px DM-Mono`;
        ctx.textAlign = "right";
        ctx.fillText(person.name, radius - radius * 0.1, 5);
        ctx.restore();
      }
    });

    // Separators
    const arcs2 = computeArcs(activePeople);
    let acc = angle;
    for (let i = 0; i < activePeople.length; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(acc),
        centerY + radius * Math.sin(acc),
      );
      ctx.strokeStyle = "#222";
      ctx.lineWidth = Math.max(2, radius / 100);
      ctx.stroke();
      acc += arcs2[i];
    }

    // Outer border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(4, radius / 40);
    ctx.strokeStyle = "#222";
    ctx.stroke();

    // Pointer (right side)
    const pointerSize = radius * 0.1;
    ctx.beginPath();
    ctx.moveTo(centerX + radius + pointerSize, centerY - pointerSize);
    ctx.lineTo(centerX + radius + pointerSize, centerY + pointerSize);
    ctx.lineTo(centerX + radius - pointerSize, centerY);
    ctx.fillStyle = "#e2e2e2";
    ctx.fill();
  }

  function update() {
    if (spinning) {
      angle += spinVelocity;
      spinVelocity *= 0.985;
      if (spinVelocity < 0.002) {
        spinning = false;
        determineWinner();
      }
    }
    drawWheel();
    requestAnimationFrame(update);
  }

  function determineWinner() {
    const activePeople = getActivePeople();
    const arcs = computeArcs(activePeople);

    // The pointer sits at angle=0 on the right (3 o'clock).
    // We need to find which slice contains angle 0 (i.e. the right side).
    const normalizedAngle =
      (((0 - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    let acc = 0;
    let index = 0;
    for (let i = 0; i < arcs.length; i++) {
      acc += arcs[i];
      if (normalizedAngle < acc) {
        index = i;
        break;
      }
    }

    selectedPerson = activePeople[index];
    if (wheel.onFinish) wheel.onFinish(selectedPerson);
  }

  const wheel = {
    spin() {
      if (!spinning && people) {
        spinVelocity = Math.random() * 0.3 + 0.35;
        spinning = true;
      }
    },
    getWinner() {
      return selectedPerson;
    },
    onFinish: null,
  };

  update();
  return wheel;
}

const wheel = createSpinningWheel(canvasWheel, people);
window.setTimeout(() => console.log(wheel.getWinner()), 2000);

const spinWheelTexture = new THREE.CanvasTexture(canvasWheel);
document.getElementById("spinBtn").onclick = () => {
  wheel.spin();
};

window.addEventListener("dblclick", wheel.spin);

function savePeople() {
  const items = [...document.querySelectorAll(".person-item")].map((li) => ({
    id: li.dataset.id,
    name: li.dataset.name,
    color: li.dataset.color,
    frequency: li.dataset.frequency,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const updateVisual = (winner) => {
  const frequencyWinnerElement = document.getElementById(winner.id);

  if (!frequencyWinnerElement) {
    const stsList = document.getElementById("stsList" + winner.id);

    stsList.innerHTML =
      `<div id='${winner.id}' class="text-xs text-black bg-white rounded-full w-6 h-6 flex items-center justify-center font-medium transition-all">${winner.frequency}</div>` +
      stsList.innerHTML;

    console.log(stsList);
    return;
  }

  frequencyWinnerElement.textContent = winner.frequency;
};

function showWinner(person) {
  const winnerItem = document.getElementById("winnerItem");

  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  winnerItem.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="color-dot w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black"
        style="background:${person.color}">
        ${initials}
      </div>
      <span class="text-white text-xs tracking-wide">${person.name}</span>
    </div>
  `;

  document.getElementById("winnerModal").classList.remove("hidden");
}

const updateDatasetWinnerFrequency = (winner) => {
  const li = document.querySelector(`[data-id="${winner.id}"]`);
  li.dataset.frequency = winner.frequency;
};

wheel.onFinish = (winner) => {
  if (winner.frequency) winner.frequency++;
  else winner.frequency = 1;
  console.log("Winner:", winner);

  updateVisual(winner);
  updateDatasetWinnerFrequency(winner);
  showWinner(winner);
  savePeople();
};

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.set(0, -0.5, 25);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 2;   // closest zoom
controls.maxDistance = 40;  // farthest zoom
controls.minAzimuthAngle = -Math.PI / 2 - 0.5;
controls.maxAzimuthAngle = Math.PI / 2 + 0.5;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setClearColor("#181818");
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

/**
 * Displacement
 */

const displacement = {};

// 2d canvas
displacement.canvas = document.createElement("canvas");
displacement.canvas.width = 128;
displacement.canvas.height = 128;
displacement.canvas.style.position = "fixed";
displacement.canvas.style.width = "0px";
displacement.canvas.style.height = "0px";
displacement.canvas.style.top = 0;
displacement.canvas.style.left = 0;
displacement.canvas.style.zIndex = 0;
document.body.append(displacement.canvas);

// Context
displacement.context = displacement.canvas.getContext("2d");
// displacement.context.fillStyle = 'red'
displacement.context.fillRect(
  0,
  0,
  displacement.canvas.width,
  displacement.canvas.height,
);

// Glow Image
displacement.glowImage = new Image();
displacement.glowImage.src = "./glow.png";

// Interactive Plane
displacement.interactivePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ color: "red", side: THREE.DoubleSide }),
);
scene.add(displacement.interactivePlane);
displacement.interactivePlane.visible = false;

// Raycaster
displacement.raycaster = new THREE.Raycaster();

// coordinates
displacement.screenCursor = new THREE.Vector2(9999, 9999);
displacement.canvasCursor = new THREE.Vector2(9999, 9999);
displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999);

window.addEventListener("pointermove", (event) => {
  displacement.screenCursor.x = (event.clientX / sizes.width) * 2 - 1;
  displacement.screenCursor.y = -(event.clientY / sizes.height) * 2 + 1;
});

displacement.texture = new THREE.CanvasTexture(displacement.canvas);

/**
 * Particles
 */
const particlesGeometry = new THREE.PlaneGeometry(10, 10, 512, 512);
particlesGeometry.setIndex(null);
particlesGeometry.deleteAttribute("normal");

const intensitiesArray = new Float32Array(
  particlesGeometry.attributes.position.count,
);
const anglesArray = new Float32Array(
  particlesGeometry.attributes.position.count,
);

for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
  intensitiesArray[i] = Math.random();
  anglesArray[i] = Math.random() * Math.PI * 2.0;
}

particlesGeometry.setAttribute(
  "aIntensity",
  new THREE.BufferAttribute(intensitiesArray, 1),
);
particlesGeometry.setAttribute(
  "aAngle",
  new THREE.BufferAttribute(anglesArray, 1),
);

const particlesMaterial = new THREE.ShaderMaterial({
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  uniforms: {
    uResolution: new THREE.Uniform(
      new THREE.Vector2(
        sizes.width * sizes.pixelRatio,
        sizes.height * sizes.pixelRatio,
      ),
    ),
    uPictureTexture: new THREE.Uniform(spinWheelTexture),
    uDisplacementTexture: new THREE.Uniform(displacement.texture),
    uTime: new THREE.Uniform(0),
  },
  // blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
});
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(sizes.width, sizes.height),
    0.8, // strength
    0.4, // radius
    0.2, // threshold — only pixels above this luminance bloom
  ),
);

const clock = new THREE.Clock();

/**
 * Starts Particles
 */
const starsCount = 2000;
const starsGeometry = new THREE.BufferGeometry();
const starsPositions = new Float32Array(starsCount * 3);
const starsColor = new Float32Array(starsCount * 3);
const starsSizes = new Float32Array(starsCount);
const starsOpacities = new Float32Array(starsCount);


const mercedesStarTexture = textureLoader.load("./star-mercedes.png")

const mercedesColors =  [
  [0.667, 0.667, 0.667],  // Silver
  [0, 0, 0],              // Black
  [0, 0.824, 0.745],      // Petronas Teal
  [0.784, 0.063, 0.18]    // Deep Red
];

for (let i = 0; i < starsCount; i++) {
  // Spread stars across a wide volume behind the scene
  starsPositions[i * 3 + 0] = (Math.random() - 0.5) * 80; // x
  starsPositions[i * 3 + 1] = (Math.random() - 0.5) * 50; // y
  starsPositions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 15; // z (behind)

  const color = mercedesColors[i % mercedesColors.length]; // cycle through colors

  starsColor[i * 3 + 0] = color[0] // R
  starsColor[i * 3 + 1] = color[1] // G
  starsColor[i * 3 + 2] = color[2] // B

  starsSizes[i] = Math.random() + 1.0;
  starsOpacities[i] = Math.random() * 0.80 + 0.9;
}

starsGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starsPositions, 3),
);
starsGeometry.setAttribute(
  "aColor",
  new THREE.BufferAttribute(starsColor, 3),
);
starsGeometry.setAttribute("aSize", new THREE.BufferAttribute(starsSizes, 1));
starsGeometry.setAttribute(
  "aOpacity",
  new THREE.BufferAttribute(starsOpacities, 1),
);

const starsMaterial = new THREE.ShaderMaterial({
  vertexShader: mercedesStarVertexShader,
  fragmentShader: mercedesStarFragmentShader,
  uniforms: {
    uTime: new THREE.Uniform(0),
    uStarTexture: new THREE.Uniform(mercedesStarTexture),
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update();

  composer.render();

  /**
   * Raycaster
   */

  displacement.raycaster.setFromCamera(displacement.screenCursor, camera);
  const intersections = displacement.raycaster.intersectObject(
    displacement.interactivePlane,
  );

  const elapsedTime = clock.getElapsedTime();
  particlesMaterial.uniforms.uTime.value = elapsedTime;
  starsMaterial.uniforms.uTime.value = elapsedTime;
  
  if (intersections.length) {
    const uv = intersections[0].uv;

    displacement.canvasCursor.x = uv.x * displacement.canvas.width;
    displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height;
  }

  /**
   * Displacement
   */
  // Fade out
  displacement.context.globalCompositeOperation = "source-over";
  displacement.context.globalAlpha = 0.02;
  displacement.context.fillRect(
    0,
    0,
    displacement.canvas.width,
    displacement.canvas.height,
  );

  // Speed Alpha
  const cursorDistance = displacement.canvasCursorPrevious.distanceTo(
    displacement.canvasCursor,
  );
  displacement.canvasCursorPrevious.copy(displacement.canvasCursor);
  const alpha = Math.min(cursorDistance * 0.1, 1);

  // draw glow
  const glowSize = displacement.canvas.width * 0.05;
  displacement.context.globalCompositeOperation = "lighten";
  displacement.context.globalAlpha = alpha;
  displacement.context.drawImage(
    displacement.glowImage,
    displacement.canvasCursor.x - glowSize * 0.5,
    displacement.canvasCursor.y - glowSize * 0.5,
    glowSize,
    glowSize,
  );

  // Texture
  displacement.texture.needsUpdate = true;
  spinWheelTexture.needsUpdate = true;

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
