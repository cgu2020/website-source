import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

class VoxelWorld {
    constructor(options) {
        this.cellSize = options.cellSize;
        this.tileSize = options.tileSize;
        this.tileTextureWidth = options.tileTextureWidth;
        this.tileTextureHeight = options.tileTextureHeight;
        const { cellSize } = this;
        this.cellSliceSize = cellSize * cellSize;
        this.cell = new Uint8Array(cellSize * cellSize * cellSize);
    }
    computeVoxelOffset(x, y, z) {
        const { cellSize, cellSliceSize } = this;
        const voxelX = THREE.MathUtils.euclideanModulo(x, cellSize) | 0;
        const voxelY = THREE.MathUtils.euclideanModulo(y, cellSize) | 0;
        const voxelZ = THREE.MathUtils.euclideanModulo(z, cellSize) | 0;
        return voxelY * cellSliceSize +
            voxelZ * cellSize +
            voxelX;
    }
    getCellForVoxel(x, y, z) {
        const { cellSize } = this;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const cellZ = Math.floor(z / cellSize);
        if (cellX !== 0 || cellY !== 0 || cellZ !== 0) {
            return null;
        }
        return this.cell;
    }
    setVoxel(x, y, z, v) {
        const cell = this.getCellForVoxel(x, y, z);
        if (!cell) {
            return;  // TODO: add a new cell?
        }
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        cell[voxelOffset] = v;
    }
    getVoxel(x, y, z) {
        const cell = this.getCellForVoxel(x, y, z);
        if (!cell) {
            return 0;
        }
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        return cell[voxelOffset];
    }
    generateGeometryDataForCell(cellX, cellY, cellZ) {
        const { cellSize, tileSize, tileTextureWidth, tileTextureHeight } = this;
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const startX = cellX * cellSize;
        const startY = cellY * cellSize;
        const startZ = cellZ * cellSize;

        for (let y = 0; y < cellSize; ++y) {
            const voxelY = startY + y;
            for (let z = 0; z < cellSize; ++z) {
                const voxelZ = startZ + z;
                for (let x = 0; x < cellSize; ++x) {
                    const voxelX = startX + x;
                    const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
                    if (voxel) {
                        // voxel 0 is sky (empty) so for UVs we start at 0
                        const uvVoxel = voxel - 1;
                        // There is a voxel here but do we need faces for it?
                        for (const { dir, corners, uvRow } of VoxelWorld.faces) {
                            const neighbor = this.getVoxel(
                                voxelX + dir[0],
                                voxelY + dir[1],
                                voxelZ + dir[2]);
                            if (!neighbor) {
                                // this voxel has no neighbor in this direction so we need a face.
                                const ndx = positions.length / 3;
                                for (const { pos, uv } of corners) {
                                    positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                                    normals.push(...dir);
                                    uvs.push(
                                        (uvVoxel + uv[0]) * tileSize / tileTextureWidth,
                                        1 - (uvRow + 1 - uv[1]) * tileSize / tileTextureHeight);
                                }
                                indices.push(
                                    ndx, ndx + 1, ndx + 2,
                                    ndx + 2, ndx + 1, ndx + 3,
                                );
                            }
                        }
                    }
                }
            }
        }

        return {
            positions,
            normals,
            uvs,
            indices,
        };
    }
}

VoxelWorld.faces = [
    { // left
        uvRow: 0,
        dir: [-1, 0, 0,],
        corners: [
            { pos: [0, 1, 0], uv: [0, 1], },
            { pos: [0, 0, 0], uv: [0, 0], },
            { pos: [0, 1, 1], uv: [1, 1], },
            { pos: [0, 0, 1], uv: [1, 0], },
        ],
    },
    { // right
        uvRow: 0,
        dir: [1, 0, 0,],
        corners: [
            { pos: [1, 1, 1], uv: [0, 1], },
            { pos: [1, 0, 1], uv: [0, 0], },
            { pos: [1, 1, 0], uv: [1, 1], },
            { pos: [1, 0, 0], uv: [1, 0], },
        ],
    },
    { // bottom
        uvRow: 1,
        dir: [0, -1, 0,],
        corners: [
            { pos: [1, 0, 1], uv: [1, 0], },
            { pos: [0, 0, 1], uv: [0, 0], },
            { pos: [1, 0, 0], uv: [1, 1], },
            { pos: [0, 0, 0], uv: [0, 1], },
        ],
    },
    { // top
        uvRow: 2,
        dir: [0, 1, 0,],
        corners: [
            { pos: [0, 1, 1], uv: [1, 1], },
            { pos: [1, 1, 1], uv: [0, 1], },
            { pos: [0, 1, 0], uv: [1, 0], },
            { pos: [1, 1, 0], uv: [0, 0], },
        ],
    },
    { // back
        uvRow: 0,
        dir: [0, 0, -1,],
        corners: [
            { pos: [1, 0, 0], uv: [0, 0], },
            { pos: [0, 0, 0], uv: [1, 0], },
            { pos: [1, 1, 0], uv: [0, 1], },
            { pos: [0, 1, 0], uv: [1, 1], },
        ],
    },
    { // front
        uvRow: 0,
        dir: [0, 0, 1,],
        corners: [
            { pos: [0, 0, 1], uv: [0, 0], },
            { pos: [1, 0, 1], uv: [1, 0], },
            { pos: [0, 1, 1], uv: [0, 1], },
            { pos: [1, 1, 1], uv: [1, 1], },
        ],
    },
];

function main() {
    const canvas = document.querySelector('canvas.webgl');
    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


    const cellSize = 8;

    const fov = 75;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(-cellSize, cellSize * 1., -cellSize *1.2);

    const controls = new OrbitControls(camera, canvas);
    //controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2);
    controls.update();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#82BEF4');

    function addLight(x, y, z) {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(x, y, z);
        scene.add(light);
    }
    addLight(-1, 2, 4);
    addLight(1, -1, -2);

    const loader = new THREE.TextureLoader();
    const texture = loader.load("textures/minecraft.png", render);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;

    const tileSize = 16;
    const tileTextureWidth = 80;
    const tileTextureHeight = 48;
    const world = new VoxelWorld({
        cellSize,
        tileSize,
        tileTextureWidth,
        tileTextureHeight,
    });

    for (let y = 0; y < cellSize; ++y) {
        for (let z = 0; z < cellSize; ++z) {
            for (let x = 0; x < cellSize; ++x) {
                const height = (Math.sin(x / cellSize * Math.PI * 2) + Math.sin(z / cellSize * Math.PI * 3)) * (cellSize / 6) + (cellSize / 2);
                if (y < height) {
                    world.setVoxel(x, y, z, randInt(1, 5));
                }
            }
        }
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    const { positions, normals, uvs, indices } = world.generateGeometryDataForCell(0, 0, 0);
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        transparent: true,
    });

    const positionNumComponents = 3;
    const normalNumComponents = 3;
    const uvNumComponents = 2;
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents));
    geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));
    geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents));
    geometry.setIndex(indices);
    geometry.center();
    const mesh = new THREE.Mesh(geometry, material);
    

    scene.add(mesh);

    const cloudMaterial = new THREE.MeshPhongMaterial();
    cloudMaterial.color = new THREE.Color('white')
    cloudMaterial.opacity = 0.5   
    cloudMaterial.transparent = true
    // scene.add(cloud)

    const clouds = new THREE.Group()

    for (let x = 0; x<30; x++){
        const length = Math.random() *15 + 10
        const width = Math.random() *15 + 10
        const height = Math.random() + 3.5
        const positionX = Math.random()*200 -25
        const positionZ = Math.random()*200 -25
        const positionY = Math.random()*5 + 15
        const cloudGeometry = new THREE.BoxGeometry(length,height,width)
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial)
        cloud.position.x = positionX
        cloud.position.y = positionY
        cloud.position.z = positionZ
        clouds.add(cloud)
    }
    scene.add(clouds)
  

    const css = getComputedStyle(canvas)
    console.log(css)
    const sizes = {
        width: 250,
        height: 400
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = sizes.width;
        const height = sizes.height;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            // Update camera
            camera.aspect = sizes.width / sizes.height
            camera.updateProjectionMatrix()

            // Update renderer
            renderer.setSize(sizes.width, sizes.height)
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        }
        return needResize;

    }

    let renderRequested = false;

    function render() {
        renderRequested = undefined;

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        controls.update();
        renderer.render(scene, camera);
    }
    render();

    function requestRenderIfNotRequested() {
        if (!renderRequested) {
            renderRequested = true;
            requestAnimationFrame(render);
        }
    }

    controls.addEventListener('change', requestRenderIfNotRequested);
    window.addEventListener('resize', requestRenderIfNotRequested);

    const clock = new THREE.Clock()
    let i = 0

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()
        // Update controls
        controls.update()

        mesh.rotation.y = 0.02 * elapsedTime
        clouds.position.x += 0.005 * elapsedTime

        if(++i % 120 == 0){
            const length = Math.random() *15 + 10
            const width = Math.random() *15 + 10
            const height = Math.random() + 3.5
            const positionZ = Math.random()*200 -25
            const positionY = Math.random()*5 + 15
            const cloudGeometry = new THREE.BoxGeometry(length,height,width)
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial)
            cloud.position.y = positionY
            cloud.position.z = positionZ
            clouds.add(cloud)
        }

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()
}

main();


