import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { AnimationUtils } from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { depth } from "three/tsl";

const spawnInterval = 2;
const speed = 5;
const gravity = -20;
const jumpPower = 8;
const mixers = [];
const obstacles = [];
const loader = new GLTFLoader();
const cactusList = [];
const clock = new THREE.Clock();
const scene = new THREE.Scene();
const skyLight = new THREE.HemisphereLight(0x88ccff, 0x222233, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 100),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const controls = new OrbitControls(camera, renderer.domElement);
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let dinoMixer;
let dinoModel;
let pteroModel = null;
let pteroClip = null;
let lastSpawn = 0;
let isDucking = false;
let isJumping = false;
let jumpVelocity = 0;
let jumpHeight = 0;
let isPaused = false;
let gameStarted = false;
let score = 0;

camera.position.set(5, 0, 0); // start side view
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.display = "block";
renderer.domElement.style.margin = "0 auto";
renderer.domElement.style.maxWidth = "100vw";
renderer.domElement.style.maxHeight = "100vh";
renderer.domElement.style.objectFit = "contain";
document.body.appendChild(renderer.domElement);
controls.enableDamping = true;
light.position.set(0, 20, 0);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.position.x = 0;
ground.receiveShadow = true;
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = true;
scene.background = new THREE.Color(0x202020);
scene.add(skyLight);
scene.add(light);
scene.add(ground);
scene.add(dirLight);

// 🦖 Dinosaur
loader.load("dino.glb", (gltf) => {
    dinoModel = gltf.scene;
    dinoModel.scale.set(0.1, 0.1, 0.1);
    dinoModel.rotation.y = Math.PI;
    dinoModel.position.set(0, 0, 2);
    dinoModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
        }
    });

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

const scoreDisplay = document.createElement("div");
scoreDisplay.style.position = "absolute";
scoreDisplay.style.top = "10px";
scoreDisplay.style.left = "10px";
scoreDisplay.style.color = "white";
scoreDisplay.style.fontSize = "20px";
scoreDisplay.style.fontFamily = "Orbitron, system-ui, sans-serif";
scoreDisplay.style.textShadow = "0 0 5px #00ff99";
scoreDisplay.innerText = `Score: 0`;
document.body.appendChild(scoreDisplay);

const highScoreDisplay = document.createElement("div");
highScoreDisplay.style.position = "absolute";
highScoreDisplay.style.top = "10px";
highScoreDisplay.style.right = "10px";
highScoreDisplay.style.color = "white";
highScoreDisplay.style.fontSize = "20px";
highScoreDisplay.style.fontFamily = "Orbitron, system-ui, sans-serif";
highScoreDisplay.style.textShadow = "0 0 5px #00ff99";
highScoreDisplay.innerText = `High Score: ${highScore}`;
document.body.appendChild(highScoreDisplay);

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

let cameraBobTime = 0;
let textGroup = new THREE.Group();
const fontLoader = new FontLoader();
fontLoader.load("/helvetiker_regular.typeface.json", (font) => {
    const textMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
    });

    const lines = [
        { text: "No Internet", size: 0.3, y: 2.5 },
        { text: "Try:", size: 0.15, y: 1.8 },
        {
            text: "• Checking the network cables, modem and router",
            size: 0.12,
            y: 1.5,
        },
        { text: "• Reconnecting to Wi-Fi", size: 0.12, y: 1.2 },
        { text: "ERR_INTERNET_DISCONNECTED", size: 0.12, y: 0.8 },
        { text: "Press any key to start", size: 0.1, y: 0.3, opacity: 0.5 },
    ];
    lines.forEach((line) => {
        const geometry = new TextGeometry(line.text, {
            font,
            size: line.size,
            height: 1,
            width: 1,
            depth: 0.01,
            bevelEnabled: true,
            bevelSize: 0.005,
            bevelThickness: 0.01,
            curveSegments: 4,
        });
        geometry.computeBoundingBox();
        geometry.center();
        const mesh = new THREE.Mesh(geometry, textMaterial);
        mesh.position.set(-2.5, line.y, -1);
        mesh.rotation.y = Math.PI / 2;
        textGroup.add(mesh);
    });
});
textGroup.position.set(2, -3, 1);
scene.add(textGroup);

animate();

function animate() {
    requestAnimationFrame(animate);
    if (!gameStarted || isPaused) {
        controls.update();
        renderer.render(scene, camera);
        return;
    }

    const delta = clock.getDelta();
    score += delta * 10;
    scoreDisplay.innerText = `Score: ${Math.floor(score)}`;
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
        const speedo = speed + Math.min(Math.floor(score / 700), 15);
        if (obj.name === "ptero") obj.position.z += 2 * speedo * delta;
        if (obj.name === "cactus") obj.position.z += speedo * delta;

        // Game over: simple bounding box collision
        if (dinoModel) {
            const dinoBox = new THREE.Box3()
                .setFromObject(dinoModel)
                .expandByScalar(-0.05);
            const objBox = new THREE.Box3()
                .setFromObject(obj)
                .expandByScalar(-0.05);
            if (dinoBox.intersectsBox(objBox)) {
                isPaused = true;
                pauseOverlay.innerText = "Game Over";
                pauseOverlay.style.display = "flex";
                if (score > highScore) {
                    highScore = Math.floor(score);
                    localStorage.setItem("highScore", highScore);
                }
                score = 0;
                scoreDisplay.innerText = `Score: 0`;
                highScoreDisplay.innerText = `High Score: ${highScore}`;
                return;
            }
        }

        if (obj.position.z > 5) {
            scene.remove(obj);
            obstacles.splice(i, 1);
        }
    }

    const time = clock.elapsedTime;
    if (!isPaused && time - lastSpawn > spawnInterval) {
        Math.random() > 0.5 ? spawnCactus() : spawnPterodactyl();
        lastSpawn = time;
    }

    cameraBobTime += delta * 6;
    camera.position.y = 2 + Math.sin(cameraBobTime) * 0.03;
    controls.update();
    renderer.render(scene, camera);
}

function spawnCactus() {
    if (cactusList.length === 0) return;
    const cactus =
        cactusList[Math.floor(Math.random() * cactusList.length)].clone();
    cactus.scale.set(0.2, 0.2, 0.2);
    cactus.rotation.x = Math.PI / -2;
    cactus.position.set(0, 0, -30);
    cactus.name = "cactus";
    cactus.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
    });
    scene.add(cactus);
    obstacles.push(cactus);
}

function spawnPterodactyl() {
    if (!pteroModel || !pteroClip) return;

    const ptero = SkeletonUtils.clone(pteroModel);
    ptero.position.set(0, 0, -30);
    ptero.name = "ptero";
    ptero.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
    });
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

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    document.head.insertAdjacentHTML(
        "beforeend",
        `<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500&display=swap" rel="stylesheet">`
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("online", () => {
    console.log("Back online — closing tab");
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem("highScore", highScore);
    }
    window.close();
});

window.addEventListener("keydown", (e) => {
    if (isPaused || !clock.running) return;
    if (e.key === "ArrowDown") duckDino();
    if (e.key === "ArrowUp") triggerJump();
});

window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowDown") resetDinoPose();
});

window.addEventListener("keydown", (e) => {
    if (!gameStarted) {
        const panStart = camera.position.clone();
        const panEnd = new THREE.Vector3(0, 2, 5);
        let panProgress = 0;
        const panDuration = 1.5; // seconds
        const panInterval = setInterval(() => {
            panProgress += 0.02;
            const t = Math.min(panProgress / panDuration, 1);
            camera.position.lerpVectors(panStart, panEnd, t);
            if (t === 1) {
                clearInterval(panInterval);
                gameStarted = true;
            }
        }, 1000 / 60); // rotate to gameplay view
    } else if (isPaused && pauseOverlay.innerText === "Game Over") {
        location.reload();
    } else if (e.key === "Escape") {
        isPaused = !isPaused;
        clock.running ? clock.stop() : clock.start();
        pauseOverlay.innerText = "Paused";
        pauseOverlay.style.display = isPaused ? "flex" : "none";
    }
});
