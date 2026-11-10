import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

const locations: [number, number, number][] = [
  [-1.6, 0.7, 0.4],
  [1.65, 1.05, 0.45],
  [0.7, -1.5, 0.5],
  [-0.45, 1.6, 0.5],
]

export default function GlobeScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5.2], fov: 48 }} dpr={[1, 1.25]} frameloop="demand">
      <ambientLight intensity={1.4} />
      <directionalLight position={[2, 2, 2]} intensity={1.3} />
      <mesh>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color="#b9c3aa" wireframe opacity={0.75} transparent />
      </mesh>
      {locations.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? '#b86f3b' : '#4e1c1d'}
            emissive={index % 2 === 0 ? '#b86f3b' : '#4e1c1d'}
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}
      <OrbitControls enableZoom={false} autoRotate={false} />
    </Canvas>
  )
}
