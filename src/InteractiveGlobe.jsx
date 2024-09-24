import React, { useRef, useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three/src/loaders/TextureLoader'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import earthTexture from './fullmapb.jpg' // You'll need to provide this texture

const Globe = ({ rotate }) => {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const texture = useLoader(TextureLoader, earthTexture)

  useFrame((state, delta) => {
    if (!hovered) {
      rotate(delta)
    }
  })

  const onPointerOver = useCallback(() => setHovered(true), [])
  const onPointerOut = useCallback(() => setHovered(false), [])

  return (
    <mesh
      ref={meshRef}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
const TechyGrid = ({ rotate }) => {
  const gridRef = useRef()
  const [time, setTime] = useState(0)

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2.1, 4) // ?????????
    const pos = geo.attributes.position
    const vec = new THREE.Vector3()

    for (let i = 0; i < pos.count; i++) {
      vec.fromBufferAttribute(pos, i)
      const noise = (Math.random() - 0.5) * 0.25
      vec.normalize().multiplyScalar(2.1 + noise)
      pos.setXYZ(i, vec.x, vec.y, vec.z)
    }

    return geo
  }, [])

  useFrame((state, delta) => {
    rotate(delta)
    setTime((prevTime) => prevTime + delta)
  })

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color('purple') },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;  // ?????????????
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec3 vPosition;
        void main() {
          // ???????????
          float modTime = mod(time, 5.0); // ?????????? 5 ?
          
          // ???????linearly ??? y = -2.1 ??? y = 2.1
          float wavePosition = mix(-2.1, 2.1, modTime / 5.0);

          // ????? y ?????????
          float distance = abs(vPosition.y - wavePosition);

          // ????????
          float wave = smoothstep(0.1, 0.3, 0.3 - distance);

          // ?????????????
          vec3 finalColor = mix(color, vec3(1.0), wave);

          gl_FragColor = vec4(finalColor, 0.7);
        }
      `,
      transparent: true,
      wireframe: true,
    })
  }, [])

  useFrame(() => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.time.value = time
    }
  })

  return (
    <mesh ref={gridRef} geometry={geometry} material={shaderMaterial} />
  )
}

const OrbitingLine = ({ radius, speed, color, initialRotation }) => {
  const lineRef = useRef()
  const progressRef = useRef(0)

  const curve = useMemo(() => {
    const points = []
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = 0 // All lines are now flat in the XY plane
      points.push(new THREE.Vector3(x, y, z))
    }
    return new THREE.CatmullRomCurve3(points, true)
  }, [radius])

  useFrame((state, delta) => {
    progressRef.current = (progressRef.current + delta * speed) % 1
    const point = curve.getPoint(progressRef.current)
    
    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position.array
      for (let i = positions.length - 3; i >= 3; i -= 3) {
        positions[i] = positions[i - 3]
        positions[i + 1] = positions[i - 2]
        positions[i + 2] = positions[i - 1]
      }
      positions[0] = point.x
      positions[1] = point.y
      positions[2] = point.z
      lineRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

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
        <lineBasicMaterial color={color} linewidth={3}/>
      </line>
    </group>
  )
}

const OrbitingLines = () => {
  return (
    <>
      <OrbitingLine radius={2.5} speed={0.2} color="purple" initialRotation={0} />
      <OrbitingLine radius={2.5} speed={0.2} color="purple" initialRotation={Math.PI / 3} />
      <OrbitingLine radius={2.5} speed={0.2} color="purple" initialRotation={-Math.PI / 3} />
    </>
  )
}

export const InteractiveGlobe = () => {
  const globeRef = useRef()
  const gridRef = useRef()

  const rotate = useCallback((delta) => {
    if (globeRef.current && gridRef.current) {
      globeRef.current.rotation.y += delta * 0.1
      gridRef.current.rotation.y += delta * 0.1
    }
  }, [])

  return (
    <div style={{ flex: '1' }}>
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Globe ref={globeRef} rotate={rotate} />
        <TechyGrid rotate={rotate} />
        <OrbitingLines />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  )
}