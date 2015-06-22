
# better range lookup performance.
# http://jsperf.com/range-lookup-algorithm-comparison
# not sure if my RB tree implementation was flawed in some way but
# for some reason a plain, non-self-balancing interval tree worked better
class IntervalTree
  constructor: ->
    @_root = null
    @_list = null
  insert: (begin, end, value, node, parent, parentSide) ->
    if node == undefined then node = @_root
    if !node
      new_node =
        low: begin
        high: end
        max: end
        data: value
        left: null
        right: null
        parent: parent
      if parent
        parent[parentSide] = new_node
      else
        @_root = new_node
      return new_node
    else
      if begin < node.low or begin == node.low and end < node.high
        new_node = @insert begin, end, value, node.left, node, 'left'
      else
        new_node = @insert begin, end, value, node.right, node, 'right'
      node.max = Math.max node.max, new_node.max
    return new_node

  lookup: (value, node) ->
    if node == undefined
      node = @_root
      @_list = []
    if node == null or node.max < value then return []
    if node.left != null then @lookup value, node.left
    if node.low <= value
      if node.high >= value then @_list.push node.data
      @lookup value, node.right
    return @_list

L.TimelineIntervalTree = IntervalTree
