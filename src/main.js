import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { AnimationUtils } from "three";

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
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
light.position.set(0, 20, 0);
scene.add(light);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

let dinoMixer, pteroMixer;

const loader = new GLTFLoader();

// 🦖 Dinosaur
loader.load(
    "dino.glb",
    function (gltf) {
        const model = gltf.scene;
        model.scale.set(0.1, 0.1, 0.1); // shrink dino
        scene.add(model);

        if (gltf.animations.length > 0) {
            dinoMixer = new THREE.AnimationMixer(model);
            const fullClip = gltf.animations[0];
            const runClip = AnimationUtils.subclip(fullClip, "RunOnly", 0, 125);
            const action = dinoMixer.clipAction(runClip);
            action.setLoop(THREE.LoopRepeat);
            action.play();
        }
    },
    undefined,
    function (error) {
        console.error("Error loading dinosaur:", error);
    }
);

// 🦅 Pterodactyl
loader.load(
    "flying_pterodactyl.glb",
    function (gltf) {
        const model = gltf.scene;
        model.scale.set(1.5, 1.5, 1.5); // adjust size to match dino scale
        scene.add(model);

        if (gltf.animations.length > 0) {
            pteroMixer = new THREE.AnimationMixer(model);
            const action = pteroMixer.clipAction(gltf.animations[0]); // full flying loop
            action.setLoop(THREE.LoopRepeat);
            action.play();
        }
    },
    undefined,
    function (error) {
        console.error("Error loading pterodactyl:", error);
    }
);

// 🌵 Cactus (static)
loader.load(
    "cactus__pack.glb",
    function (gltf) {
        const cactusRoot = gltf.scene.children[0].children[0].children[0];
        const cactusList = [];
        cactusRoot.traverse((child) => {
            if (child.isMesh) cactusList.push(child);
        });

        const randomIndex = Math.floor(Math.random() * cactusList.length);
        const cactus = cactusList[randomIndex].clone();
        cactus.scale.set(0.5, 0.5, 0.5); // scale to match scene
        scene.add(cactus);
    },
    undefined,
    function (error) {
        console.error("Error loading cactus pack:", error);
    }
);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (dinoMixer) dinoMixer.update(delta * 5);
    if (pteroMixer) pteroMixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
