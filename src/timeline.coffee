###
Leaflet.timeline

Show any arbitrary GeoJSON objects changing over time

(c) 2014 Jonathan Skeate
https://github.com/skeate/Leaflet.timeline
http://leafletjs.com
###

L.TimelineVersion = '0.3.2'

L.Timeline = L.GeoJSON.extend
  includes: L.Mixin.Events
  times: []
  displayedLayers: []
  ranges: null
  options:
    position: "bottomleft"
    formatDate: (date) -> ""
    enablePlayback: true
    steps: 1000
    duration: 10000
    showTicks: true
    waitToUpdateMap: false
  initialize: (timedGeoJSON, options) ->
    L.GeoJSON.prototype.initialize.call this, undefined, options
    L.extend @options, options
    @ranges = new L.TimelineIntervalTree()
    if options.intervaFromFeature?
      @intervaFromFeature = options.intervaFromFeature.bind(this)
    if options.addData?
      @addData = options.addData.bind(this)
    if options.doSetTime?
      @doSetTime = options.doSetTime.bind(this)
    @process timedGeoJSON if timedGeoJSON?

  intervaFromFeature: (feature) ->
    start = ( new Date feature.properties.start ).getTime()
    end = ( new Date feature.properties.end ).getTime()
    return [start, end]

  process: (data) ->
    earliestStart = Infinity
    latestEnd = -Infinity
    data.features.forEach (feature) =>
      interval = @intervaFromFeature(feature)
      @ranges.insert interval[0], interval[1], feature
      @times.push interval[0]
      @times.push interval[1]
      if interval[0] < earliestStart then earliestStart = interval[0]
      if interval[1] > latestEnd then latestEnd = interval[1]
    @times = @times.sort()
    if not @options.start then @options.start = earliestStart
    if not @options.end then @options.end = latestEnd

  addData: (geojson) ->
    # mostly just copied from Leaflet source, because there's no way to get
    # the ID of an added layer. :(
    features = if L.Util.isArray geojson then geojson else geojson.features
    if features
      for feature in features
        # only add this if geometry or geometries are set and not null
        if feature.geometries or feature.geometry or \
            feature.features or feature.coordinates
          @addData feature
      return @
    @_addData(geojson)

  _addData: (geojson) ->
    options = @options
    if options.filter and !options.filter(geojson) then return
    layer = L.GeoJSON.geometryToLayer geojson, options.pointToLayer
    # timeline custom bit here
    @displayedLayers.push
      layer: layer
      geoJSON: geojson
    layer.feature = L.GeoJSON.asFeature geojson
    layer.defaultOptions = layer.options
    @resetStyle layer
    if options.onEachFeature
      options.onEachFeature geojson, layer
    @addLayer layer

  removeLayer: (layer, removeDisplayed = true) ->
    L.GeoJSON.prototype.removeLayer.call this, layer
    if removeDisplayed
      @displayedLayers = @displayedLayers.filter (displayedLayer) ->
        displayedLayer.layer != layer


  setTime: (time) ->
    @time = (new Date time).getTime()
    @doSetTime(time)
    @fire 'change'

  doSetTime: (time) ->
    ranges = @ranges.lookup time
    # inline the JS below because messing with indices
    # and that's ugly in CS
    # seems like a terrible algorithm but I did test it:
    # http://jsperf.com/array-in-place-replace
    # sorted would probably be better if not for the splice insertion
    # maybe using linked lists would be better?
    `var i, j, found;
    for( i = 0; i < this.displayedLayers.length; i++ ){
      found = false;
      for( j = 0; j < ranges.length; j++ ){
        if( this.displayedLayers[i].geoJSON === ranges[j] ){
          found = true;
          ranges.splice(j, 1);
          break;
        }
      }
      if( !found ){
        var to_remove = this.displayedLayers.splice(i--,1);
        this.removeLayer(to_remove[0].layer, false);
      }
    }
    `
    for range in ranges
      @addData range

  onAdd: (map) ->
    L.GeoJSON.prototype.onAdd.call this, map
    @timeSliderControl = L.Timeline.timeSliderControl this
    @timeSliderControl.addTo map

  getDisplayed: -> @ranges.lookup @time


L.timeline = (timedGeoJSON, options) -> new L.Timeline timedGeoJSON, options
