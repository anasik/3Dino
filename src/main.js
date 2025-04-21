import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { AnimationUtils } from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
light.position.set(0, 20, 0);
scene.add(light);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

let dinoMixer;
let dinoModel;
const mixers = [];
const obstacles = [];
const loader = new GLTFLoader();
const cactusList = [];
let pteroModel = null;
let pteroClip = null;

// 🦖 Dinosaur
loader.load("dino.glb", (gltf) => {
    dinoModel = gltf.scene;
    dinoModel.scale.set(0.1, 0.1, 0.1);
    dinoModel.rotation.y = Math.PI;
    dinoModel.position.set(-2, 0, 2);
    scene.add(dinoModel);

    if (gltf.animations.length > 0) {
        dinoMixer = new THREE.AnimationMixer(dinoModel);
        // mixers.push(dinoMixer);
        const runClip = AnimationUtils.subclip(
            gltf.animations[0],
            "RunOnly",
            0,
            125
        );
        const action = dinoMixer.clipAction(runClip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
    }
});

// 🦅 Pterodactyl template (store mesh + animation separately)
loader.load("flying_pterodactyl.glb", (gltf) => {
    console.log("Loaded pterodactyl");
    pteroModel = gltf.scene;
    pteroClip = gltf.animations[0];
});

// 🌵 Cactus library
loader.load("cactus__pack.glb", (gltf) => {
    const cactusRoot = gltf.scene.children[0].children[0].children[0];
    cactusRoot.traverse((child) => {
        if (child.isMesh) cactusList.push(child);
    });
});

function spawnCactus() {
    if (cactusList.length === 0) return;
    const cactus =
        cactusList[Math.floor(Math.random() * cactusList.length)].clone();
    cactus.scale.set(0.2, 0.2, 0.2);
    cactus.rotation.x = Math.PI / -2;
    cactus.position.set(-2, 0, -10);
    cactus.name = "obstacle";
    scene.add(cactus);
    obstacles.push(cactus);
}

function spawnPterodactyl() {
    if (!pteroModel || !pteroClip) return;

    const ptero = SkeletonUtils.clone(pteroModel);
    // ptero.scale.set(0.3, 0.3, 0.3);
    ptero.rotation.y = Math.PI;
    ptero.position.set(-2, 0, -10);
    ptero.name = "obstacle";

    // Force visibility
    ptero.visible = true;
    scene.add(ptero);
    obstacles.push(ptero);

    const mixer = new THREE.AnimationMixer(ptero);
    const action = mixer.clipAction(pteroClip);
    action.reset();
    action.setLoop(THREE.LoopRepeat);
    action.play();
    mixers.push(mixer);
}

let lastSpawn = 0;
const spawnInterval = 2;
const speed = 5;

let isDucking = false;
let isJumping = false;
let jumpVelocity = 0;
let jumpHeight = 0;
const gravity = -20;
const jumpPower = 8;

function duckDino() {
    if (!dinoModel || isJumping) return;
    dinoModel.scale.y = 0.05;
    dinoModel.position.y = -0.05;
    isDucking = true;
}

function resetDinoPose() {
    if (!dinoModel) return;
    dinoModel.scale.y = 0.1;
    dinoModel.position.y = 0;
    isDucking = false;
}

function triggerJump() {
    if (!dinoModel || isJumping) return;
    isJumping = true;
    jumpVelocity = jumpPower;
    dinoModel.scale.y = 0.14; // stretch up for springy effect
}

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") duckDino();
    if (e.key === "ArrowUp") triggerJump();
});

window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowDown") resetDinoPose();
});

let isPaused = false;
let score = 0;
const scoreDisplay = document.createElement("div");
scoreDisplay.style.position = "absolute";
scoreDisplay.style.top = "10px";
scoreDisplay.style.left = "10px";
scoreDisplay.style.color = "white";
scoreDisplay.style.fontSize = "20px";
scoreDisplay.style.fontFamily = "monospace";
scoreDisplay.innerText = "Score: 0";
document.body.appendChild(scoreDisplay);

const pauseOverlay = document.createElement("div");
pauseOverlay.style.position = "absolute";
pauseOverlay.style.top = "0";
pauseOverlay.style.left = "0";
pauseOverlay.style.width = "100%";
pauseOverlay.style.height = "100%";
pauseOverlay.style.display = "none";
pauseOverlay.style.alignItems = "center";
pauseOverlay.style.justifyContent = "center";
pauseOverlay.style.color = "white";
pauseOverlay.style.fontSize = "48px";
pauseOverlay.style.background = "rgba(0, 0, 0, 0.7)";
pauseOverlay.innerText = "Paused";
pauseOverlay.style.fontFamily = "sans-serif";
document.body.appendChild(pauseOverlay);

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        isPaused = !isPaused;
        pauseOverlay.style.display = isPaused ? "flex" : "none";
    }
});

function animate() {
    requestAnimationFrame(animate);
    if (isPaused) return;
    const delta = clock.getDelta();
    if (dinoMixer) dinoMixer.update(delta * 5);

    if (isJumping && dinoModel) {
        jumpVelocity += gravity * delta;
        jumpHeight += jumpVelocity * delta;

        if (jumpHeight <= 0) {
            jumpHeight = 0;
            jumpVelocity = 0;
            isJumping = false;
            dinoModel.position.y = 0;
            dinoModel.scale.y = THREE.MathUtils.lerp(
                dinoModel.scale.y,
                0.1,
                0.3
            );
            dinoModel.scale.y = 0.1; // return to normal
        } else {
            dinoModel.position.y = jumpHeight;
        }
    }
    mixers.forEach((m) => m.update(delta));

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];
        obj.position.z += speed * delta;

        // Game over: simple bounding box collision
        if (dinoModel && obj.name === "obstacle") {
            const dinoBox = new THREE.Box3().setFromObject(dinoModel);
            const objBox = new THREE.Box3().setFromObject(obj);
            if (dinoBox.intersectsBox(objBox)) {
                isPaused = true;
                pauseOverlay.innerText = "Game Over";
                pauseOverlay.style.display = "flex";
                return;
            }
        }

        if (obj.position.z > camera.position.z + 2) {
            scene.remove(obj);
            obstacles.splice(i, 1);
            score++;
            scoreDisplay.innerText = "Score: " + score;
        }
    }

    const time = clock.elapsedTime;
    if (!isPaused && time - lastSpawn > spawnInterval) {
        Math.random() > 0.5 ? spawnCactus() : spawnPterodactyl();
        lastSpawn = time;
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
