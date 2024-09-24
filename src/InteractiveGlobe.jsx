import { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three/src/loaders/TextureLoader";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import earthTexture from "./fullmapb.png";
import { Group } from "three/examples/jsm/libs/tween.module.js";
const Globe = ({ rotate }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const texture = useLoader(TextureLoader, earthTexture);

  useFrame((state, delta) => {
    if (!hovered) {
      rotate(delta);
    }
  });

  const onPointerOver = useCallback(() => setHovered(true), []);
  const onPointerOut = useCallback(() => setHovered(false), []);

  return (
    <mesh
      ref={meshRef}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};
const TechyGrid = ({ rotate }) => {
  const gridRef = useRef();
  const [time, setTime] = useState(0);
  const numInstances = useRef(0);
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2.1, 7);
    const pos = geo.attributes.position;
    const vec = new THREE.Vector3();

    // Create a map to store unique positions
    const uniquePositions = new Map();
    const mergeThreshold = 0.6; // Approximately 1/3 of vertices will be merged

    for (let i = 0; i < pos.count; i++) {
      vec.fromBufferAttribute(pos, i);
      const noiseX = (Math.random() - 0.5) * 0.45;
      const noiseY = (Math.random() - 0.5) * 0.45;
      const noiseZ = (Math.random() - 0.5) * 0.45;
      vec.add(new THREE.Vector3(noiseX, noiseY, noiseZ));
      vec.normalize().multiplyScalar(2.1 + (Math.random() - 0.8) * 0.2);

      // Decide whether to merge this vertex
      if (Math.random() < mergeThreshold) {
        // Round the position to merge nearby vertices
        const key = `${Math.round(vec.x * 1.9)},${Math.round(
          vec.y * 1.9
        )},${Math.round(vec.z * 1.9)}`;

        if (!uniquePositions.has(key)) {
          uniquePositions.set(key, vec.clone());
        }

        const mergedPos = uniquePositions.get(key);
        pos.setXYZ(i, mergedPos.x, mergedPos.y, mergedPos.z);
      } else {
        // Keep the original position
        pos.setXYZ(i, vec.x, vec.y, vec.z);

        vec.normalize().multiplyScalar(2.1);
      }
    }

    numInstances.current = pos.count;
    return geo;
  }, []);

  useFrame((state, delta) => {
    rotate(delta);
    setTime((prevTime) => prevTime + delta);
  });

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color("#ee82ee") },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec3 vPosition;
        void main() {
          float modTime = mod(time, 5.0);
          float wavePosition = mix(-2.1, 2.1, modTime / 5.0);
          float distance = abs(vPosition.y - wavePosition);
          float wave = smoothstep(0.1, 0.3, 0.3 - distance);
          vec3 finalColor = mix(color, vec3(1.0), wave);
          gl_FragColor = vec4(finalColor, 0.7);
        }
      `,
      transparent: true,
      wireframe: true,
    });
  }, []);

  useFrame(() => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.time.value = time;
    }
  });

  const instancedSpheres = useMemo(() => {
    const instancedGeo = new THREE.SphereGeometry(0.01, 16, 16);
    const instancedMesh = new THREE.InstancedMesh(
      instancedGeo,
      new THREE.MeshBasicMaterial({ color: "#fb75fb" }),
      numInstances.current
    );
    const pos = geometry.attributes.position;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < pos.count; i++) {
      const vec = new THREE.Vector3().fromBufferAttribute(pos, i);
      dummy.position.copy(vec);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    return instancedMesh;
  }, [geometry]);

  return (
    <group ref={gridRef}>
      <mesh geometry={geometry} material={shaderMaterial} />
      <primitive object={instancedSpheres} />
    </group>
  );
};

const OrbitingLine = ({ radius, speed, color, initialRotation }) => {
  const lineRef = useRef();
  const progressRef = useRef(0);

  const curve = useMemo(() => {
    const points = [];
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = 0; // All lines are now flat in the XY plane
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points, true);
  }, [radius]);

  useFrame((state, delta) => {
    progressRef.current = (progressRef.current + delta * speed) % 1;
    const point = curve.getPoint(progressRef.current);

    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position.array;
      for (let i = positions.length - 3; i >= 3; i -= 3) {
        positions[i] = positions[i - 3];
        positions[i + 1] = positions[i - 2];
        positions[i + 2] = positions[i - 1];
      }
      positions[0] = point.x;
      positions[1] = point.y;
      positions[2] = point.z;
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group rotation={[0, initialRotation, 0]}>
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={50}
            array={new Float32Array(150)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={3} />
      </line>
    </group>
  );
};

const OrbitingLines = () => {
  return (
    <>
      <OrbitingLine
        radius={2.5}
        speed={0.2}
        color="purple"
        initialRotation={0}
      />
      <OrbitingLine
        radius={2.5}
        speed={0.2}
        color="purple"
        initialRotation={Math.PI / 3}
      />
      <OrbitingLine
        radius={2.5}
        speed={0.2}
        color="purple"
        initialRotation={-Math.PI / 3}
      />
    </>
  );
};

export const InteractiveGlobe = () => {
  const globeGroupRef = useRef();

  // Function to handle rotation based on mouse movement
  const rotate = useCallback((delta) => {
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += delta * 0.1;
    }
  }, []);
  const light = useMemo(() => {
    const light = new THREE.RectAreaLight(0xffffff, 1, 10, 10);

    light.position.set(-5, 5, -5);
    light.lookAt(0, 0, 0);
    return light;
  }, []);
  return (
    <div style={{ flex: "1" }}>
      <Canvas
        camera={{ position: [0, 0, 8] }}
        onCreated={({ camera, scene }) => {
          camera.add(light);
          scene.add(camera);
        }}
      >
        <ambientLight intensity={0.1} />

        <Globe rotate={rotate} />
        <TechyGrid rotate={rotate} />
        <OrbitingLines />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={true}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};
