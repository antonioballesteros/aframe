import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import {
  ForceGraph2D,
  ForceGraph3D,
  ForceGraphVR,
  ForceGraphAR,
} from 'react-force-graph'
import jLouvain from './libs/jLouvain'
import forceInABox from './libs/forceInABox'

import { demo, rh, cervello, tmobile } from './json/'

const MIN = 10
const MAX = 100

const Vr = (props) => {
  const { match } = props
  const fgRef = useRef()
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [maxTotal, setMaxTotal] = useState(0)

  const param = match.params.file

  const rScale = useCallback(
    (value) => {
      const scale = (value * (MAX - MIN)) / maxTotal + MIN
      return scale
    },
    [maxTotal]
  )

  useEffect(() => {
    const loadData = (data) => {
      let _maxTotal = { total: 0 }
      const links = []
      data.feedbacks.forEach((feedback) => {
        const weight = logicToCreateCluster(feedback)
        const from = data.users.find((node) => node.id === feedback.fromUserID)
        const to = data.users.find((node) => node.id === feedback.toUserID)
        if (from) {
          from.sent =
            typeof from.sent === 'undefined' ? weight : from.sent + weight
          from.total =
            typeof from.total === 'undefined' ? weight : from.total + weight

          if (from.total > _maxTotal.total) {
            _maxTotal = from
          }
        }
        if (to) {
          to.received =
            typeof to.received === 'undefined' ? weight : to.received + weight
          to.total =
            typeof to.total === 'undefined' ? weight : to.total + weight
          if (to.total > _maxTotal.total) {
            _maxTotal = to
          }
        }

        const id = `${feedback.fromUserID}_${feedback.toUserID}`

        const link = links.find((l) => l.id === id)

        if (link) {
          link.weight += weight
        } else {
          links.push({
            id,
            source: feedback.fromUserID,
            target: feedback.toUserID,
            weight,
          })
        }
      })

      const node_ids = data.users.map((n) => n.id)

      var communities = jLouvain().nodes(node_ids).edges(links)()

      var maxCluster = 0
      const _communities = []
      Object.keys(communities).forEach((key) => {
        const cluster = communities[key]
        maxCluster = Math.max(maxCluster, cluster)

        if (typeof _communities[cluster] !== 'undefined') {
          _communities[cluster]++
        } else {
          _communities[cluster] = 1
        }

        data.users = data.users.map((n) => {
          return n.id !== key
            ? n
            : {
                ...n,
                cluster,
              }
        })

        setGraphData({
          links,
          nodes: data.users,
        })
      })
      console.log('max node', _maxTotal)
      setMaxTotal(_maxTotal.total)

      console.log('clusters found', _communities)
      console.log('data', {
        links,
        nodes: data.users,
      })
    }

    switch (param) {
      case 'rh':
        loadData(rh)
        break
      case 'cervello':
        loadData(cervello)
        break
      case 'tmobile':
        loadData(tmobile)
        break
      default:
        loadData(demo)
        break
    }
  }, [param])

  useEffect(() => {
    const fg = fgRef.current

    // // Deactivate existing forces
    // fg.d3Force('center', null)
    // fg.d3Force('charge', null)

    // // Add collision and bounding box forces
    fg.d3Force(
      'collide',
      d3.forceCollide((d) => {
        //console.log('forceCollide', rScale(d.total))
        return rScale(d.total) / 2
      })
    )
    // fg.d3Force('box', () => {
    //   const SQUARE_HALF_SIDE = data.users.length * 2

    //   data.users.forEach((node) => {
    //     const x = node.x || 0,
    //       y = node.y || 0

    //     // bounce on box walls
    //     if (Math.abs(x) > SQUARE_HALF_SIDE) {
    //       node.vx *= -1
    //     }
    //     if (Math.abs(y) > SQUARE_HALF_SIDE) {
    //       node.vy *= -1
    //     }
    //   })
    // })
  }, [rScale])

  const logicToCreateCluster = (link) => {
    /*
    1
    link.numFeedbacks 
    link.amount
    link.amount * link.numFeedbacks
    */
    return link.amount
  }
  const getColor = (color) => {
    const range = [
      '#4f92ff',
      '#4fffc1',
      '#4ff0ff',
      '#ff3021',
      '#84ff3d',
      '#4f90ff',
      '#ff3021',
      '#3dff71',
      '#84ff3d',
      '#00eeff',
      '#f2ff3d',
      '#38ffc3',
      '#ff69d7',
      '#f5bb3d',
      '#fcff4f',
      '#ea4fff',
      '#ff4fa1',
      '#fa2828',
      '#c7c7c7',
      '#a8925b',
      '#58ad6f',
      '#00ff45',
      '#00c8ff',
      'slateblue',
    ]

    const _color = color % 25

    return range[_color]
  }

  const onNodeClick = (node, event) => {
    console.log('onNodeClick', { node, event })
  }
  const onNodeRightClick = (node, event) => {
    console.log('onNodeRightClick', { node, event })
  }
  const onNodeHover = (node, prevNode) => {
    console.log('onNodeHover', { node, prevNode })
  }

  return (
    <ForceGraphVR
      ref={fgRef}
      graphData={graphData}
      showNavInfo={false}
      controlType="orbit"
      enableNavigationControls={true}
      onNodeClick={onNodeClick}
      onNodeRightClick={onNodeRightClick}
      onNodeHover={onNodeHover}
      nodeVal={(d) => {
        return rScale(d.total)
      }}
      nodeLabel={(d) => d.name}
      nodeDesc={(d) => {
        const rec = d.received ? d.received : 0
        const sent = d.sent ? d.sent : 0
        const total = d.total ? d.total : 0
        return `Rec: ${rec}, Sent: ${sent}, Total: ${total}`
      }}
      nodeColor={(d) => getColor(d.cluster)}
      linkColor={(d) => {
        const from = graphData.nodes.find((node) => node.id === d.source)
        const to = graphData.nodes.find((node) => node.id === d.target)
        if (from && to && from.cluster === to.cluster) {
          return getColor(from.cluster)
        } else {
          return 'gray'
        }
      }}
    />
  )
}

export default Vr
