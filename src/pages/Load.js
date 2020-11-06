import React from 'react'
// import aframe from 'aframe'

const Nodes = (props) => {
  const { nodes } = props

  return nodes.map((node, i) => {
    const position = `${node.x} ${node.y} ${node.z}`

    return (
      <a-sphere
        key={i}
        position={position}
        radius={node.radius}
        color={node.color}
      ></a-sphere>
    )
  })
}

const Feedbacks = (props) => {
  const { feedbacks } = props

  return feedbacks.map((feedback, i) => {
    const start = `start: ${feedback.x1} ${feedback.y1} ${feedback.z1}`
    const end = `end: ${feedback.x2} ${feedback.y2} ${feedback.z2}`
    const color = `color: ${feedback.color}`

    const def = `${start}; ${end}; ${color}`

    //console.log('line', `${start}; ${end}; ${color}`)
    return <a-entity key={i} line={def}></a-entity>
  })
}

const Load = (props) => {
  // a-scene allow this:
  // fog="type: linear; color: #000; near: 1; far: 5"
  // device-orientation-permission-ui="enabled: false"  vr-mode-ui="enabled: false"

  const sizeX = 15
  const sizeY = 15
  const sizeZ = 15
  const n = 100
  const maxRandomLinks = 15

  const build = ({ n, sizeX, sizeY, sizeZ, maxRandomLinks }) => {
    const array = Array(n).fill({})

    const nodes = array.map((c, i) => {
      const x = (Math.random() - 0.5) * 2 * sizeX
      const y = (Math.random() - 0.5) * 2 * sizeY
      const z = (Math.random() - 0.5) * 2 * sizeZ

      const radius = Math.random() / 4 + 0.2

      let color = '#'
      for (let x = 0; x < 6; x++) {
        color += Math.floor(Math.random() * 16).toString(16)
      }

      return {
        x,
        y,
        z,
        radius,
        color,
      }
    })

    const feedbacks = []

    nodes.forEach((node) => {
      const links = Math.random() * maxRandomLinks
      for (let _i = 0; _i < links; _i++) {
        const nodeId2 = Math.floor(Math.random() * n)
        const node2 = nodes[nodeId2]

        feedbacks.push({
          x1: node.x,
          y1: node.y,
          z1: node.z,
          x2: node2.x,
          y2: node2.y,
          z2: node2.z,
          color: node.color,
        })
      }
    })
    return {
      nodes,
      feedbacks,
    }
  }

  const map = build({ n, sizeX, sizeY, sizeZ, maxRandomLinks })

  console.log('map', map)
  return (
    <a-scene background="color: #000">
      <a-entity camera look-controls position="2 1.6 0"></a-entity>

      <a-entity gearvr-controls></a-entity>
      <a-entity
        id="leftHand"
        hand-controls="hand: left; handModelStyle: lowPoly; color: #ffcccc"
      ></a-entity>
      <a-entity
        id="rightHand"
        hand-controls="hand: right; handModelStyle: lowPoly; color: #ffcccc"
      ></a-entity>

      <a-entity laser-controls="hand: left"></a-entity>
      <a-entity laser-controls="hand: right"></a-entity>
      <a-entity laser-controls raycaster="objects: .links; far: 5"></a-entity>
      <a-entity laser-controls line="color: red; opacity: 0.75"></a-entity>

      <Nodes nodes={map.nodes} />
      <Feedbacks feedbacks={map.feedbacks} />
    </a-scene>
  )
}

export default Load
