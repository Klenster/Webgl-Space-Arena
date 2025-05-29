import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

function main() {
  const scene = new THREE.Scene();
  const fov = 75;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  const laserReactiveObjects = [];
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const canvas = renderer.domElement;
  document.body.appendChild(canvas);

  // GUI setup
  const gui = new GUI();
  function updateCamera() {
    camera.updateProjectionMatrix();
  }

  gui.add(camera, "fov", 1, 180).onChange(updateCamera);

  class MinMaxGUIHelper {
    constructor(obj, minprop, maxprop, mindif) {
      this.obj = obj;
      this.minprop = minprop;
      this.maxprop = maxprop;
      this.mindif = mindif;
    }
    get min() {
      return this.obj[this.minprop];
    }
    set min(v) {
      this.obj[this.minprop] = v;
      // Ensure max is always greater than min + mindif
      this.obj[this.maxprop] = Math.max(
        this.obj[this.maxprop],
        v + this.mindif
      );
    }
    get max() {
      return this.obj[this.maxprop];
    }
    set max(v) {
      this.obj[this.maxprop] = v;
      this.min = this.min;
    }
  }

  const minMaxGUIHelper = new MinMaxGUIHelper(camera, "near", "far", 0.1);
  gui
    .add(minMaxGUIHelper, "min", 0.1, 50, 0.1)
    .name("near")
    .onChange(updateCamera);
  gui
    .add(minMaxGUIHelper, "max", 0.1, 1000, 0.1)
    .name("far")
    .onChange(updateCamera);

  //   brightness control for the sun
  const settings = {
    brightness: 500,
  };

  gui.add(settings, "brightness", 0, 10000, 0.1).name("Brightness");

  // Textures applied to the space objects
  const loader = new THREE.TextureLoader();
  const texture = loader.load("/Textures/painted_metal_shutter_diff_4k.jpg");
  //colorspace for proper color rendering
  texture.colorSpace = THREE.SRGBColorSpace;
  const texture1 = loader.load("/Textures/worn_shutter_diff_1k.jpg");
  texture1.colorSpace = THREE.SRGBColorSpace;
  const texture2 = loader.load("/Textures/corrugated_iron_03_diff_1k.jpg");
  texture2.colorSpace = THREE.SRGBColorSpace;
  const texture3 = loader.load("/Textures/Rock026_4K-JPG_Color.jpg");
  texture3.colorSpace = THREE.SRGBColorSpace;
  const skymap = loader.load("/Skybox/Skybox4.jpg");
  skymap.colorSpace = THREE.SRGBColorSpace;
  //create a skybox where texture is applied to the inside of a sphere
  const skybox = new THREE.Mesh(
    new THREE.SphereGeometry(100, 100, 100),
    new THREE.MeshBasicMaterial({ map: skymap, side: THREE.BackSide })
  );
  scene.add(skybox);

  scene.add(new THREE.AmbientLight(0xffffff, 1));
  // Geometry
  const cubegeo = new THREE.BoxGeometry(2, 2, 2);
  const cubemat = new THREE.MeshStandardMaterial({ map: texture2 });
  const cube = new THREE.Mesh(cubegeo, cubemat);
  cube.position.x = -5;
  scene.add(cube);
  laserReactiveObjects.push(cube);

  const rectanglegeo = new THREE.BoxGeometry(2, 4, 2);
  const rectanglemat = new THREE.MeshStandardMaterial({ map: texture });
  const rectangle = new THREE.Mesh(rectanglegeo, rectanglemat);
  rectangle.position.x = -1;
  scene.add(rectangle);
  laserReactiveObjects.push(rectangle);

  const spheregeo = new THREE.SphereGeometry(2, 32, 16);
  const spheremat = new THREE.MeshStandardMaterial({ map: texture1 });
  const sphere = new THREE.Mesh(spheregeo, spheremat);
  sphere.position.x = 3;
  scene.add(sphere);
  laserReactiveObjects.push(sphere);

  const suntexture = loader.load("/Textures/2k_sun.jpg");
  suntexture.colorSpace = THREE.SRGBColorSpace;
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 32),
    new THREE.MeshStandardMaterial({
      map: suntexture,
      color: new THREE.Color(3, 3, 3),
    })
  );
  star.position.set(0, -20, -25);
  scene.add(star);

  // Attach both light and target to the star

  const pointlight = new THREE.PointLight(0xffffff, settings.brightness, 100);
  pointlight.position.set(0, 0, 0);
  star.add(pointlight);
  const pointlighthelper = new THREE.PointLightHelper(pointlight, 1);
  scene.add(pointlighthelper);

  //randomly placed meteors

  const meteorObjects = []; // Array to hold meteor mesh + velocity

  for (let i = 0; i < 50; i++) {
    const meteorMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshStandardMaterial({ map: texture3 })
    );

    meteorMesh.position.set(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );

    // Assign a small random velocity vector
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01
    );

    scene.add(meteorMesh);
    laserReactiveObjects.push(meteorMesh);

    meteorObjects.push({ mesh: meteorMesh, velocity }); // Store velocity with mesh
  }

  function updateMeteors() {
    for (const { mesh, velocity } of meteorObjects) {
      mesh.position.add(velocity);
    }
  }

  // Setup camera rig (yaw and pitch)
  const yawObject = new THREE.Object3D();
  const pitchObject = new THREE.Object3D();
  pitchObject.add(camera);
  yawObject.add(pitchObject);
  scene.add(yawObject);
  yawObject.position.set(0, 0, 5);

  // Pointer lock + mouse look
  let isPointerLocked = false;
  const sensitivity = 0.002;

  document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    isPointerLocked = !!document.pointerLockElement;
  });

  document.addEventListener("mousemove", (e) => {
    if (isPointerLocked) {
      yawObject.rotation.y -= e.movementX * sensitivity;
      pitchObject.rotation.x -= e.movementY * sensitivity;
      pitchObject.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, pitchObject.rotation.x)
      );
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      shootLaser();
    }
  });

  // WASD movement
  const keysPressed = {};
  window.addEventListener("keydown", (e) => (keysPressed[e.code] = true));
  window.addEventListener("keyup", (e) => (keysPressed[e.code] = false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") {
      // Brightnessh controls
      settings.brightness += 1000;
    } else if (event.key === "-") {
      settings.brightness -= 1000;
    }
  });
  function updateCameraPosition() {
    const speed = 0.1;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    if (keysPressed["KeyW"])
      yawObject.position.add(direction.clone().multiplyScalar(speed));
    if (keysPressed["KeyS"])
      yawObject.position.add(direction.clone().multiplyScalar(-speed));

    const right = new THREE.Vector3()
      .crossVectors(direction, camera.up)
      .normalize();
    if (keysPressed["KeyD"])
      yawObject.position.add(right.clone().multiplyScalar(speed));
    if (keysPressed["KeyA"])
      yawObject.position.add(right.clone().multiplyScalar(-speed));
  }

  // Picking setup
  let selectedObject = null;
  let movementMode = "normal";
  const objectVelocity = new THREE.Vector3();
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyM") {
      movementMode = movementMode === "normal" ? "momentum" : "normal";
    }
  });

  const pickPosition = { x: 0, y: 0 };
  clearPickPosition();

  class PickHelper {
    constructor() {
      this.raycaster = new THREE.Raycaster();
      this.pickedObject = null;
      this.pickedObjectSavedColor = null;
    }

    pick(normalizedPosition, scene, camera) {
      if (this.pickedObject) {
        if (this.pickedObject.material?.emissive) {
          this.pickedObject.material.emissive.setHex(
            this.pickedObjectSavedColor
          );
        }
        this.pickedObject = null;
      }

      this.raycaster.setFromCamera(normalizedPosition, camera);
      const intersects = this.raycaster.intersectObjects(scene.children, true);

      for (const intersect of intersects) {
        const obj = intersect.object;
        if (obj.material?.emissive) {
          this.pickedObject = obj;
          selectedObject = obj; //store for movement
          this.pickedObjectSavedColor = obj.material.emissive.getHex();
          obj.material.emissive.setHex(0xff0000);
          break;
        }
      }
    }
  }

  function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function setPickPosition(event) {
    const pos = getCanvasRelativePosition(event);
    pickPosition.x = (pos.x / canvas.width) * 2 - 1;
    pickPosition.y = (pos.y / canvas.height) * -2 + 1;
  }

  function clearPickPosition() {
    pickPosition.x = -100000;
    pickPosition.y = -100000;
  }

  window.addEventListener("mousemove", setPickPosition);
  window.addEventListener("mouseout", clearPickPosition);
  window.addEventListener("mouseleave", clearPickPosition);

  const pickHelper = new PickHelper();

  //Movement Logic
  const rotationVelocity = new THREE.Vector3(); // Global or higher scope like objectVelocity

  function updateObjectMovement() {
    if (!selectedObject) return;

    const maxSpeed = 0.01;
    const rotationMaxSpeed = 0.01;
    const damping = 1;
    const accelerationRate = 0.1;
    const rotationAccelerationRate = 0.02;

    const acceleration = new THREE.Vector3(); // for movement acceleration
    const rotationAcceleration = new THREE.Vector3();

    if (movementMode === "normal") {
      // Rotation
      if (keysPressed["KeyJ"]) selectedObject.rotation.y += 0.05;
      if (keysPressed["KeyL"]) selectedObject.rotation.y -= 0.05;
      if (keysPressed["KeyI"]) selectedObject.rotation.x += 0.05;
      if (keysPressed["KeyK"]) selectedObject.rotation.x -= 0.05;
      if (keysPressed["KeyU"]) selectedObject.rotation.z += 0.05;
      if (keysPressed["KeyO"]) selectedObject.rotation.z -= 0.05;

      // Translation
      if (keysPressed["ArrowUp"]) selectedObject.position.z -= accelerationRate;
      if (keysPressed["ArrowDown"])
        selectedObject.position.z += accelerationRate;
      if (keysPressed["ArrowLeft"])
        selectedObject.position.x -= accelerationRate;
      if (keysPressed["ArrowRight"])
        selectedObject.position.x += accelerationRate;
      if (keysPressed["KeyE"]) selectedObject.position.y += accelerationRate;
      if (keysPressed["KeyQ"]) selectedObject.position.y -= accelerationRate;

      // Reset velocities
      objectVelocity.set(0, 0, 0);
      rotationVelocity.set(0, 0, 0);
    } else if (movementMode === "momentum") {
      // Movement acceleration
      if (keysPressed["ArrowUp"]) acceleration.z -= accelerationRate;
      if (keysPressed["ArrowDown"]) acceleration.z += accelerationRate;
      if (keysPressed["ArrowLeft"]) acceleration.x -= accelerationRate;
      if (keysPressed["ArrowRight"]) acceleration.x += accelerationRate;
      if (keysPressed["KeyE"]) acceleration.y += accelerationRate;
      if (keysPressed["KeyQ"]) acceleration.y -= accelerationRate;

      objectVelocity.add(acceleration);
      objectVelocity.clampLength(0, maxSpeed);
      selectedObject.position.add(objectVelocity);
      objectVelocity.multiplyScalar(damping);
      if (objectVelocity.lengthSq() < 0.000001) objectVelocity.set(0, 0, 0);

      // Rotation acceleration
      if (keysPressed["KeyJ"])
        rotationAcceleration.y += rotationAccelerationRate;
      if (keysPressed["KeyL"])
        rotationAcceleration.y -= rotationAccelerationRate;
      if (keysPressed["KeyI"])
        rotationAcceleration.x += rotationAccelerationRate;
      if (keysPressed["KeyK"])
        rotationAcceleration.x -= rotationAccelerationRate;
      if (keysPressed["KeyU"])
        rotationAcceleration.z += rotationAccelerationRate;
      if (keysPressed["KeyO"])
        rotationAcceleration.z -= rotationAccelerationRate;

      rotationVelocity.add(rotationAcceleration);
      rotationVelocity.clampLength(0, rotationMaxSpeed);
      selectedObject.rotation.x += rotationVelocity.x;
      selectedObject.rotation.y += rotationVelocity.y;
      selectedObject.rotation.z += rotationVelocity.z;
      rotationVelocity.multiplyScalar(damping);
      if (rotationVelocity.lengthSq() < 0.000001) rotationVelocity.set(0, 0, 0);
    }
  }
  // Shooting Lasers
  const lasers = [];
  const laserSpeed = 0.2;
  const laserLifetime = 1000; // milliseconds

  function shootLaser() {
    if (!selectedObject) return;

    const geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const laser = new THREE.Mesh(geometry, material);

    // Align laser direction with object
    laser.quaternion.copy(selectedObject.quaternion);

    // Position laser in front of the object
    const forward = new THREE.Vector3(0, 1, 0).applyQuaternion(
      selectedObject.quaternion
    );
    laser.position
      .copy(selectedObject.position)
      .add(forward.clone().multiplyScalar(1)); // 1 unit ahead

    // Store direction and spawn time
    lasers.push({
      mesh: laser,
      direction: forward,
      spawnTime: performance.now(),
    });

    scene.add(laser);
  }

  function updateLasers() {
    const now = performance.now();

    for (let i = lasers.length - 1; i >= 0; i--) {
      const { mesh, direction, spawnTime } = lasers[i];
      mesh.position.add(direction.clone().multiplyScalar(laserSpeed));

      // Check collision Objects
      for (let j = 0; j < laserReactiveObjects.length; j++) {
        const obj = laserReactiveObjects[j];
        const distance = mesh.position.distanceTo(obj.position);
        const hitRadius = 0.5;

        if (distance < hitRadius) {
          flashObject(obj); // Flash before removing

          // Remove laser immediately
          scene.remove(mesh);
          lasers.splice(i, 1);

          // Delay object removal so flash is visible
          setTimeout(() => {
            if (scene && obj) scene.remove(obj);
            const index = laserReactiveObjects.indexOf(obj);
            if (index !== -1) laserReactiveObjects.splice(index, 1);
          }, 150); // Match or slightly exceed flash duration

          break;
        }
      }

      // Lifetime expiration
      if (now - spawnTime > laserLifetime) {
        scene.remove(mesh);
        lasers.splice(i, 1);
      }
    }
  }

  function flashObject(obj, color = 0xff0000, duration = 100) {
    if (!obj.material || !obj.material.color) return;

    const originalColor = obj.material.color.clone();
    obj.material.color.set(color);

    // Create explosion sphere
    const explosionGeometry = new THREE.SphereGeometry(1, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);

    // Position explosion at the object’s position
    explosion.position.copy(obj.position);
    obj.parent.add(explosion);

    // Animate explosion scale and fade out
    const startTime = performance.now();

    function animateExplosion() {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        explosion.scale.setScalar(1 + progress * 2); // grow from 1 to 3 times
        explosion.material.opacity = 0.8 * (1 - progress); // fade out

        requestAnimationFrame(animateExplosion);
      } else {
        obj.material.color.copy(originalColor);
        obj.parent.remove(explosion);
        explosion.geometry.dispose();
        explosion.material.dispose();
      }
    }

    animateExplosion();
  }

  function animate() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    requestAnimationFrame(animate);
    pointlight.intensity = settings.brightness;
    pickHelper.pick(pickPosition, scene, camera);
    updateObjectMovement();
    updateMeteors();
    updateLasers();
    updateCameraPosition();

    renderer.render(scene, camera);
  }

  animate();
}
main();
