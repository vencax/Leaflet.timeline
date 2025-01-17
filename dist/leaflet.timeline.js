(function() {
  var IntervalTree;

  IntervalTree = (function() {
    function IntervalTree() {
      this._root = null;
      this._list = null;
    }

    IntervalTree.prototype.insert = function(begin, end, value, node, parent, parentSide) {
      var new_node;
      if (node === void 0) {
        node = this._root;
      }
      if (!node) {
        new_node = {
          low: begin,
          high: end,
          max: end,
          data: value,
          left: null,
          right: null,
          parent: parent
        };
        if (parent) {
          parent[parentSide] = new_node;
        } else {
          this._root = new_node;
        }
        return new_node;
      } else {
        if (begin < node.low || begin === node.low && end < node.high) {
          new_node = this.insert(begin, end, value, node.left, node, 'left');
        } else {
          new_node = this.insert(begin, end, value, node.right, node, 'right');
        }
        node.max = Math.max(node.max, new_node.max);
      }
      return new_node;
    };

    IntervalTree.prototype.lookup = function(value, node) {
      if (node === void 0) {
        node = this._root;
        this._list = [];
      }
      if (node === null || node.max < value) {
        return [];
      }
      if (node.left !== null) {
        this.lookup(value, node.left);
      }
      if (node.low <= value) {
        if (node.high >= value) {
          this._list.push(node.data);
        }
        this.lookup(value, node.right);
      }
      return this._list;
    };

    return IntervalTree;

  })();

  L.TimelineIntervalTree = IntervalTree;

}).call(this);


/*
Leaflet.timeline

Show any arbitrary GeoJSON objects changing over time

(c) 2014 Jonathan Skeate
https://github.com/skeate/Leaflet.timeline
http://leafletjs.com
 */

(function() {
  L.TimelineVersion = '0.3.2';

  L.Timeline = L.GeoJSON.extend({
    includes: L.Mixin.Events,
    times: [],
    displayedLayers: [],
    ranges: null,
    options: {
      position: "bottomleft",
      formatDate: function(date) {
        return "";
      },
      enablePlayback: true,
      steps: 1000,
      duration: 10000,
      showTicks: true,
      waitToUpdateMap: false
    },
    initialize: function(timedGeoJSON, options) {
      L.GeoJSON.prototype.initialize.call(this, void 0, options);
      L.extend(this.options, options);
      this.ranges = new L.TimelineIntervalTree();
      if (options.intervaFromFeature != null) {
        this.intervaFromFeature = options.intervaFromFeature.bind(this);
      }
      if (options.addData != null) {
        this.addData = options.addData.bind(this);
      }
      if (options.doSetTime != null) {
        this.doSetTime = options.doSetTime.bind(this);
      }
      if (timedGeoJSON != null) {
        return this.process(timedGeoJSON);
      }
    },
    intervaFromFeature: function(feature) {
      var end, start;
      start = (new Date(feature.properties.start)).getTime();
      end = (new Date(feature.properties.end)).getTime();
      return [start, end];
    },
    process: function(data) {
      var earliestStart, latestEnd;
      earliestStart = Infinity;
      latestEnd = -Infinity;
      data.features.forEach((function(_this) {
        return function(feature) {
          var interval;
          interval = _this.intervaFromFeature(feature);
          _this.ranges.insert(interval[0], interval[1], feature);
          _this.times.push(interval[0]);
          _this.times.push(interval[1]);
          if (interval[0] < earliestStart) {
            earliestStart = interval[0];
          }
          if (interval[1] > latestEnd) {
            return latestEnd = interval[1];
          }
        };
      })(this));
      this.times = this.times.sort();
      if (!this.options.start) {
        this.options.start = earliestStart;
      }
      if (!this.options.end) {
        return this.options.end = latestEnd;
      }
    },
    addData: function(geojson) {
      var feature, features, i, len;
      features = L.Util.isArray(geojson) ? geojson : geojson.features;
      if (features) {
        for (i = 0, len = features.length; i < len; i++) {
          feature = features[i];
          if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
            this.addData(feature);
          }
        }
        return this;
      }
      return this._addData(geojson);
    },
    _addData: function(geojson) {
      var layer, options;
      options = this.options;
      if (options.filter && !options.filter(geojson)) {
        return;
      }
      layer = L.GeoJSON.geometryToLayer(geojson, options.pointToLayer);
      this.displayedLayers.push({
        layer: layer,
        geoJSON: geojson
      });
      layer.feature = L.GeoJSON.asFeature(geojson);
      layer.defaultOptions = layer.options;
      this.resetStyle(layer);
      if (options.onEachFeature) {
        options.onEachFeature(geojson, layer);
      }
      return this.addLayer(layer);
    },
    removeLayer: function(layer, removeDisplayed) {
      if (removeDisplayed == null) {
        removeDisplayed = true;
      }
      L.GeoJSON.prototype.removeLayer.call(this, layer);
      if (removeDisplayed) {
        return this.displayedLayers = this.displayedLayers.filter(function(displayedLayer) {
          return displayedLayer.layer !== layer;
        });
      }
    },
    setTime: function(time) {
      this.time = (new Date(time)).getTime();
      this.doSetTime(time);
      return this.fire('change');
    },
    doSetTime: function(time) {
      var i, len, range, ranges, results;
      ranges = this.ranges.lookup(time);
      var i, j, found;
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
    ;
      results = [];
      for (i = 0, len = ranges.length; i < len; i++) {
        range = ranges[i];
        results.push(this.addData(range));
      }
      return results;
    },
    onAdd: function(map) {
      L.GeoJSON.prototype.onAdd.call(this, map);
      this.timeSliderControl = L.Timeline.timeSliderControl(this);
      return this.timeSliderControl.addTo(map);
    },
    getDisplayed: function() {
      return this.ranges.lookup(this.time);
    }
  });

  L.timeline = function(timedGeoJSON, options) {
    return new L.Timeline(timedGeoJSON, options);
  };

}).call(this);

(function() {
  L.Timeline.TimeSliderControl = L.Control.extend({
    initialize: function(timeline1) {
      this.timeline = timeline1;
      this.options.position = this.timeline.options.position;
      this.start = this.timeline.options.start;
      this.end = this.timeline.options.end;
      this.showTicks = this.timeline.options.showTicks;
      this.stepDuration = this.timeline.options.duration / this.timeline.options.steps;
      this.stepSize = (this.end - this.start) / this.timeline.options.steps;
      this.smallStepSize = this.timeline.options.smallstepsize || this.stepSize / 10;
      this.time = this.timeline.options.time;
      return this.playing = false;
    },
    _buildDataList: function(container, times) {
      var datalistSelect, used_times;
      this._datalist = L.DomUtil.create('datalist', '', container);
      datalistSelect = L.DomUtil.create('select', '', this._datalist);
      used_times = [];
      times.forEach(function(time) {
        var datalistOption;
        if (used_times[time]) {
          return;
        }
        datalistOption = L.DomUtil.create('option', '', datalistSelect);
        datalistOption.value = time;
        return used_times[time] = true;
      });
      this._datalist.id = "timeline-datalist-" + Math.floor(Math.random() * 1000000);
      return this._timeSlider.setAttribute('list', this._datalist.id);
    },
    _makePlayButtons: function(container) {
      this._playFFButton = L.DomUtil.create('button', 'playff', container);
      this._playFFButton.innerHTML = '<<';
      this._playFFButton.addEventListener('click', (function(_this) {
        return function() {
          return _this._fastRev();
        };
      })(this));
      L.DomEvent.disableClickPropagation(this._playFFButton);
      this._playButton = L.DomUtil.create('button', 'play', container);
      this._playButton.addEventListener('click', (function(_this) {
        return function() {
          return _this._play();
        };
      })(this));
      return L.DomEvent.disableClickPropagation(this._playButton);
    },
    _makePrevNext: function(container) {
      this._prevButton = L.DomUtil.create('button', 'prev', container);
      this._prevButton.addEventListener('click', this._prev.bind(this));
      L.DomEvent.disableClickPropagation(this._prevButton);
      this._nextButton = L.DomUtil.create('button', 'next', container);
      this._nextButton.addEventListener('click', this._next.bind(this));
      return L.DomEvent.disableClickPropagation(this._nextButton);
    },
    _makeRevff: function(container) {
      this._revButton = L.DomUtil.create('button', 'rev', container);
      this._ffButton = L.DomUtil.create('button', 'ff', container);
      this._revButton.innerHTML = '<';
      this._ffButton.innerHTML = '>';
      L.DomEvent.disableClickPropagation(this._revButton);
      L.DomEvent.disableClickPropagation(this._ffButton);
      this._revButton.addEventListener('mousedown', this._rev.bind(this));
      return this._ffButton.addEventListener('mousedown', this._ff.bind(this));
    },
    _makeSlider: function(container) {
      this._timeSlider = L.DomUtil.create('input', 'time-slider', container);
      this._timeSlider.type = "range";
      this._timeSlider.min = this.start;
      this._timeSlider.max = this.end;
      this._timeSlider.value = this.start;
      if (this.timeline.options.disabled != null) {
        this._timeSlider.disabled = true;
      }
      this._timeSlider.addEventListener('mousedown', (function(_this) {
        return function() {
          return _this.map.dragging.disable();
        };
      })(this));
      document.addEventListener('mouseup', (function(_this) {
        return function() {
          return _this.map.dragging.enable();
        };
      })(this));
      this._timeSlider.addEventListener('input', this._sliderChanged.bind(this));
      return this._timeSlider.addEventListener('change', this._sliderChanged.bind(this));
    },
    _makeOutput: function(container) {
      this._output = L.DomUtil.create('output', 'time-text', container);
      return this._output.innerHTML = this.timeline.options.formatDate(new Date(this.start));
    },
    _nearestEventTime: function(findTime, mode) {
      var i, lastTime, len, nextDiff, prevDiff, ref, retNext, time;
      if (mode == null) {
        mode = 0;
      }
      retNext = false;
      lastTime = this.timeline.times[0];
      ref = this.timeline.times.slice(1);
      for (i = 0, len = ref.length; i < len; i++) {
        time = ref[i];
        if (retNext) {
          return time;
        }
        if (time >= findTime) {
          if (mode === -1) {
            return lastTime;
          } else if (mode === 1) {
            if (time === findTime) {
              retNext = true;
            } else {
              return time;
            }
          } else {
            prevDiff = Math.abs(findTime - lastTime);
            nextDiff = Math.abs(time - findTime);
            if (prevDiff < nextDiff) {
              return prevDiff;
            } else {
              return nextDiff;
            }
          }
        }
        lastTime = time;
      }
      return lastTime;
    },
    _do_play: function(step, edgeValue, methodToSched) {
      clearTimeout(this._timer);
      this._timeSlider.value = +this._timeSlider.value + step;
      this._sliderChanged({
        type: 'change',
        target: {
          value: this._timeSlider.value
        }
      });
      if (+this._timeSlider.value !== edgeValue) {
        return this._timer = setTimeout(methodToSched, this.stepDuration);
      } else {
        return this._stop();
      }
    },
    _rev: function() {
      if (!this.playing) {
        this._do_rev();
        return this.playing = true;
      } else {
        return this._stop();
      }
    },
    _do_rev: function() {
      return this._do_play(-this.smallStepSize, this.begin, this._do_rev.bind(this));
    },
    _fastRev: function() {
      if (!this.playing) {
        this._do_fastrev();
        return this.playing = true;
      } else {
        return this._stop();
      }
    },
    _do_fastrev: function() {
      return this._do_play(-this.stepSize, this.begin, this._do_fastrev.bind(this));
    },
    _ff: function() {
      if (!this.playing) {
        this._do_ff();
        return this.playing = true;
      } else {
        return this._stop();
      }
    },
    _do_ff: function() {
      return this._do_play(this.smallStepSize, this.end, this._do_ff.bind(this));
    },
    _play: function() {
      if (!this.playing) {
        this._do_playforward();
        return this.playing = true;
      } else {
        return this._stop();
      }
    },
    _do_playforward: function() {
      return this._do_play(this.stepSize, this.end, this._do_playforward.bind(this));
    },
    _stop: function() {
      clearTimeout(this._timer);
      this.container.classList.remove('playing');
      return this.playing = false;
    },
    _next: function() {
      var nextTime;
      this._stop();
      nextTime = this._nearestEventTime(this.timeline.time, 1);
      this._timeSlider.value = nextTime;
      return this.timeline.setTime(nextTime);
    },
    _prev: function() {
      var prevTime;
      this._stop();
      prevTime = this._nearestEventTime(this.timeline.time, -1);
      this._timeSlider.value = prevTime;
      return this.timeline.setTime(prevTime);
    },
    _sliderChanged: function(e) {
      var time;
      time = +e.target.value;
      if (!this.timeline.options.waitToUpdateMap || e.type === 'change') {
        this.timeline.setTime(time);
      }
      return this._output.innerHTML = this.timeline.options.formatDate(new Date(time));
    },
    onAdd: function(map) {
      var buttonContainer, sliderCtrlC;
      this.map = map;
      this.container = L.DomUtil.create('div', 'leaflet-control-layers-expanded ' + 'leaflet-timeline-controls');
      this._makeSlider(this.container);
      if (this.showTicks) {
        this._buildDataList(this.container, this.timeline.times);
      }
      if (this.timeline.options.enablePlayback) {
        sliderCtrlC = L.DomUtil.create('div', 'sldr-ctrl-container', this.container);
        buttonContainer = L.DomUtil.create('div', 'button-container', sliderCtrlC);
        this._makePlayButtons(buttonContainer);
        this._makePrevNext(buttonContainer);
        this._makeRevff(buttonContainer);
        this._makeOutput(buttonContainer);
      }
      this._timeSlider.value = this.time;
      this._sliderChanged({
        type: 'change',
        target: {
          value: this._timeSlider.value
        }
      });
      return this.container;
    }
  });

  L.Timeline.timeSliderControl = function(timeline, start, end, timelist) {
    return new L.Timeline.TimeSliderControl(timeline, start, end, timelist);
  };

}).call(this);
