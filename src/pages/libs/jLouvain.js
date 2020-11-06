// https://github.com/upphiminn/jLouvain/blob/master/src/jLouvain.js
const jLouvain = () => {
  //Constants
  var __PASS_MAX = -1
  var __MIN = 0.0000001

  //Local vars
  var original_graph_nodes
  var original_graph_edges
  var original_graph = {}
  var partition_init

  //Helpers
  const make_set = array => {
    var set = {}
    array.forEach(d => {
      set[d] = true
    })
    return Object.keys(set)
  }

  const obj_values = obj => {
    var vals = []
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        vals.push(obj[key])
      }
    }
    return vals
  }

  const get_degree_for_node = (graph, node) => {
    var neighbours = graph._assoc_mat[node]
      ? Object.keys(graph._assoc_mat[node])
      : []
    var weight = 0
    neighbours.forEach(neighbour => {
      var value = graph._assoc_mat[node][neighbour] || 1
      if (node === neighbour) value *= 2
      weight += value
    })
    return weight
  }

  const get_neighbours_of_node = (graph, node) => {
    if (typeof graph._assoc_mat[node] === 'undefined') return []

    var neighbours = Object.keys(graph._assoc_mat[node])
    return neighbours
  }

  const get_edge_weight = (graph, node1, node2) => {
    return graph._assoc_mat[node1] ? graph._assoc_mat[node1][node2] : undefined
  }

  const get_graph_size = graph => {
    var size = 0
    graph.edges.forEach(edge => {
      size += edge.weight
    })
    return size
  }

  const add_edge_to_graph = (graph, edge) => {
    update_assoc_mat(graph, edge)

    var edge_index = graph.edges
      .map(d => {
        return d.source + '_' + d.target
      })
      .indexOf(edge.source + '_' + edge.target)

    if (edge_index !== -1) graph.edges[edge_index].weight = edge.weight
    else graph.edges.push(edge)
  }

  const make_assoc_mat = edge_list => {
    var mat = {}
    edge_list.forEach(edge => {
      mat[edge.source] = mat[edge.source] || {}
      mat[edge.source][edge.target] = edge.weight
      mat[edge.target] = mat[edge.target] || {}
      mat[edge.target][edge.source] = edge.weight
    })

    return mat
  }

  const update_assoc_mat = (graph, edge) => {
    graph._assoc_mat[edge.source] = graph._assoc_mat[edge.source] || {}
    graph._assoc_mat[edge.source][edge.target] = edge.weight
    graph._assoc_mat[edge.target] = graph._assoc_mat[edge.target] || {}
    graph._assoc_mat[edge.target][edge.source] = edge.weight
  }

  const clone = obj => {
    if (obj === null || typeof obj !== 'object') return obj

    var temp = obj.constructor()

    for (var key in obj) temp[key] = clone(obj[key])
    return temp
  }

  //Core-Algorithm Related
  const init_status = (graph, status, part) => {
    status['nodes_to_com'] = {}
    status['total_weight'] = 0
    status['internals'] = {}
    status['degrees'] = {}
    status['gdegrees'] = {}
    status['loops'] = {}
    status['total_weight'] = get_graph_size(graph)

    if (typeof part === 'undefined') {
      graph.nodes.forEach((node, i) => {
        status.nodes_to_com[node] = i
        var deg = get_degree_for_node(graph, node)
        if (deg < 0) throw new Error('Bad graph type, use positive weights!')
        status.degrees[i] = deg
        status.gdegrees[node] = deg
        status.loops[node] = get_edge_weight(graph, node, node) || 0
        status.internals[i] = status.loops[node]
      })
    } else {
      graph.nodes.forEach(node => {
        var com = part[node]
        status.nodes_to_com[node] = com
        var deg = get_degree_for_node(graph, node)
        status.degrees[com] = (status.degrees[com] || 0) + deg
        status.gdegrees[node] = deg
        var inc = 0.0

        var neighbours = get_neighbours_of_node(graph, node)
        neighbours.forEach(neighbour => {
          var weight = graph._assoc_mat[node][neighbour]
          if (weight <= 0) {
            throw new Error('Bad graph type, use positive weights')
          }

          if (part[neighbour] === com) {
            if (neighbour === node) {
              inc += weight
            } else {
              inc += weight / 2.0
            }
          }
        })
        status.internals[com] = (status.internals[com] || 0) + inc
      })
    }
  }

  const __modularity = status => {
    var links = status.total_weight
    var result = 0.0
    var communities = make_set(obj_values(status.nodes_to_com))

    communities.forEach(com => {
      var in_degree = status.internals[com] || 0
      var degree = status.degrees[com] || 0
      if (links > 0) {
        result =
          result + in_degree / links - Math.pow(degree / (2.0 * links), 2)
      }
    })
    return result
  }

  const __neighcom = (node, graph, status) => {
    // compute the communities in the neighb. of the node, with the graph given by
    // node_to_com

    var weights = {}
    var neighboorhood = get_neighbours_of_node(graph, node) //make iterable;

    neighboorhood.forEach(neighbour => {
      if (neighbour !== node) {
        var weight = graph._assoc_mat[node][neighbour] || 1
        var neighbourcom = status.nodes_to_com[neighbour]
        weights[neighbourcom] = (weights[neighbourcom] || 0) + weight
      }
    })

    return weights
  }

  const __insert = (node, com, weight, status) => {
    //insert node into com and modify status
    status.nodes_to_com[node] = +com
    status.degrees[com] =
      (status.degrees[com] || 0) + (status.gdegrees[node] || 0)
    status.internals[com] =
      (status.internals[com] || 0) + weight + (status.loops[node] || 0)
  }

  const __remove = (node, com, weight, status) => {
    //remove node from com and modify status
    status.degrees[com] =
      (status.degrees[com] || 0) - (status.gdegrees[node] || 0)
    status.internals[com] =
      (status.internals[com] || 0) - weight - (status.loops[node] || 0)
    status.nodes_to_com[node] = -1
  }

  const __renumber = dict => {
    var count = 0
    var ret = clone(dict) //deep copy :)
    var new_values = {}
    var dict_keys = Object.keys(dict)
    dict_keys.forEach(key => {
      var value = dict[key]
      var new_value =
        typeof new_values[value] === 'undefined' ? -1 : new_values[value]
      if (new_value === -1) {
        new_values[value] = count
        new_value = count
        count = count + 1
      }
      ret[key] = new_value
    })
    return ret
  }

  const __one_level = (graph, status) => {
    //Compute one level of the Communities Dendogram.
    let modif = true,
      nb_pass_done = 0,
      cur_mod = __modularity(status),
      new_mod = cur_mod

    while (modif && nb_pass_done !== __PASS_MAX) {
      cur_mod = new_mod
      modif = false
      nb_pass_done += 1

      for (let i = 0; i < graph.nodes.length; i++) {
        let node = graph.nodes[i]
        var com_node = status.nodes_to_com[node]
        var degc_totw =
          (status.gdegrees[node] || 0) / (status.total_weight * 2.0)
        var neigh_communities = __neighcom(node, graph, status)
        __remove(node, com_node, neigh_communities[com_node] || 0.0, status)
        var best_com = com_node
        var best_increase = 0
        var neigh_communities_entries = Object.keys(neigh_communities) //make iterable;

        for (let j = 0; j < neigh_communities_entries.length; j++) {
          let com = neigh_communities_entries[j]
          var incr =
            neigh_communities[com] - (status.degrees[com] || 0.0) * degc_totw
          if (incr > best_increase) {
            best_increase = incr
            best_com = com
          }
        }

        __insert(node, best_com, neigh_communities[best_com] || 0, status)

        if (best_com !== com_node) modif = true
      }
      new_mod = __modularity(status)
      if (new_mod - cur_mod < __MIN) break
    }
  }

  const induced_graph = (partition, graph) => {
    var ret = { nodes: [], edges: [], _assoc_mat: {} }
    var w_prec, weight
    //add nodes from partition values
    var partition_values = obj_values(partition)
    ret.nodes = ret.nodes.concat(make_set(partition_values)) //make set
    graph.edges.forEach(edge => {
      weight = edge.weight || 1
      var com1 = partition[edge.source]
      var com2 = partition[edge.target]
      w_prec = get_edge_weight(ret, com1, com2) || 0
      var new_weight = w_prec + weight
      add_edge_to_graph(ret, { source: com1, target: com2, weight: new_weight })
    })
    return ret
  }

  const partition_at_level = (dendogram, level) => {
    var partition = clone(dendogram[0])
    for (let i = 1; i < level + 1; i++)
      Object.keys(partition).forEach(key => {
        var node = key
        var com = partition[key]
        partition[node] = dendogram[i][com]
      })
    return partition
  }

  const generate_dendogram = (graph, part_init) => {
    if (graph.edges.length === 0) {
      var part = {}
      graph.nodes.forEach(node => {
        part[node] = node
      })
      return part
    }
    var status = {}

    init_status(original_graph, status, part_init)
    var mod = __modularity(status)
    var status_list = []
    __one_level(original_graph, status)
    var new_mod = __modularity(status)
    var partition = __renumber(status.nodes_to_com)
    status_list.push(partition)
    mod = new_mod
    var current_graph = induced_graph(partition, original_graph)
    init_status(current_graph, status)

    while (true) {
      __one_level(current_graph, status)
      new_mod = __modularity(status)
      if (new_mod - mod < __MIN) break

      partition = __renumber(status.nodes_to_com)
      status_list.push(partition)

      mod = new_mod
      current_graph = induced_graph(partition, current_graph)
      init_status(current_graph, status)
    }

    return status_list
  }

  var core = () => {
    var dendogram = generate_dendogram(original_graph, partition_init)
    console.log('original_graph', original_graph)
    return partition_at_level(dendogram, dendogram.length - 1)
  }

  core.nodes = nds => {
    original_graph_nodes = nds
    return core
  }

  core.edges = edgs => {
    if (typeof original_graph_nodes === 'undefined')
      throw new Error('Please provide the graph nodes first!')

    original_graph_edges = edgs
    var assoc_mat = make_assoc_mat(edgs)
    original_graph = {
      nodes: original_graph_nodes,
      edges: original_graph_edges,
      _assoc_mat: assoc_mat
    }
    return core
  }

  core.partition_init = prttn => {
    partition_init = prttn
    return core
  }

  return core
}

export default jLouvain
