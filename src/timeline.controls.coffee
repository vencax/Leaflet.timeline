
L.Timeline.TimeSliderControl = L.Control.extend
  initialize: (@timeline) ->
    @options.position = @timeline.options.position
    @start = @timeline.options.start
    @end = @timeline.options.end
    @showTicks = @timeline.options.showTicks
    @stepDuration = @timeline.options.duration / @timeline.options.steps
    @stepSize = ( @end - @start ) / @timeline.options.steps
    @smallStepSize = @timeline.options.smallstepsize or @stepSize / 10
    @time = @timeline.options.time
    @playing = false

  _buildDataList: (container, times) ->
    @_datalist = L.DomUtil.create 'datalist', '', container
    datalistSelect = L.DomUtil.create 'select', '', @_datalist
    used_times = []
    times.forEach (time) ->
      if used_times[time] then return
      datalistOption = L.DomUtil.create 'option', '', datalistSelect
      datalistOption.value = time
      used_times[time] = true
    @_datalist.id = "timeline-datalist-" + Math.floor( Math.random() * 1000000 )
    @_timeSlider.setAttribute 'list', @_datalist.id

  _makePlayButtons: (container) ->
    @_playFFButton = L.DomUtil.create 'button', 'playff', container
    @_playFFButton.innerHTML = '<<'
    @_playFFButton.addEventListener 'click', => @_fastRev()
    L.DomEvent.disableClickPropagation @_playFFButton
    @_playButton = L.DomUtil.create 'button', 'play', container
    @_playButton.addEventListener 'click', => @_play()
    L.DomEvent.disableClickPropagation @_playButton

  _makePrevNext: (container) ->
    @_prevButton = L.DomUtil.create 'button', 'prev', container
    @_prevButton.addEventListener 'click', @_prev.bind @
    L.DomEvent.disableClickPropagation @_prevButton

    @_nextButton = L.DomUtil.create 'button', 'next', container
    @_nextButton.addEventListener 'click', @_next.bind @
    L.DomEvent.disableClickPropagation @_nextButton

  _makeRevff: (container) ->
    @_revButton = L.DomUtil.create 'button', 'rev', container
    @_ffButton = L.DomUtil.create 'button', 'ff', container
    @_revButton.innerHTML = '<'
    @_ffButton.innerHTML = '>'
    L.DomEvent.disableClickPropagation @_revButton
    L.DomEvent.disableClickPropagation @_ffButton
    @_revButton.addEventListener 'mousedown', @_rev.bind @
    @_ffButton.addEventListener 'mousedown', @_ff.bind @

  _makeSlider: (container) ->
    @_timeSlider = L.DomUtil.create 'input', 'time-slider', container
    @_timeSlider.type = "range"
    @_timeSlider.min = @start
    @_timeSlider.max = @end
    @_timeSlider.value = @start
    @_timeSlider.disabled = true if @timeline.options.disabled?
    @_timeSlider.addEventListener 'mousedown', => @map.dragging.disable()
    document.addEventListener     'mouseup',   => @map.dragging.enable()
    @_timeSlider.addEventListener 'input', @_sliderChanged.bind @
    @_timeSlider.addEventListener 'change', @_sliderChanged.bind @

  _makeOutput: (container) ->
    @_output = L.DomUtil.create 'output', 'time-text', container
    @_output.innerHTML = @timeline.options.formatDate new Date @start

  _nearestEventTime: (findTime, mode=0) ->
    retNext = false
    lastTime = @timeline.times[0]
    for time in @timeline.times[1..]
      if retNext then return time
      if time >= findTime
        if mode == -1
          return lastTime
        else if mode == 1
          if time == findTime then retNext = true
          else return time
        else
          prevDiff = Math.abs findTime - lastTime
          nextDiff = Math.abs time - findTime
          return if prevDiff < nextDiff then prevDiff else nextDiff
      lastTime = time
    lastTime

  _do_play: (step, edgeValue, methodToSched) ->
    clearTimeout @_timer
    @_timeSlider.value = +@_timeSlider.value + step
    @_sliderChanged
      type: 'change'
      target: value: @_timeSlider.value
    unless +@_timeSlider.value == edgeValue
      @_timer = setTimeout methodToSched, @stepDuration
    else
      @_stop()

  _rev: ->
    if not @playing
      @_do_rev()
      @playing = true
    else
      @_stop()

  _do_rev: ->
    @_do_play -@smallStepSize, @begin, @_do_rev.bind @

  _fastRev: ->
    if not @playing
      @_do_fastrev()
      @playing = true
    else
      @_stop()

  _do_fastrev: ->
    @_do_play -@stepSize, @begin, @_do_fastrev.bind @

  _ff: ->
    if not @playing
      @_do_ff()
      @playing = true
    else
      @_stop()

  _do_ff: ->
    @_do_play @smallStepSize, @end, @_do_ff.bind @

  _play: ->
    if not @playing
      @_do_playforward()
      @playing = true
    else
      @_stop()

  _do_playforward: ->
    @_do_play @stepSize, @end, @_do_playforward.bind @

  _stop: ->
    clearTimeout @_timer
    @container.classList.remove 'playing'
    @playing = false

  _next: ->
    @_stop()
    nextTime = @_nearestEventTime @timeline.time, 1
    @_timeSlider.value = nextTime
    @timeline.setTime nextTime

  _prev: ->
    @_stop()
    prevTime = @_nearestEventTime @timeline.time, -1
    @_timeSlider.value = prevTime
    @timeline.setTime prevTime

  _sliderChanged: (e) ->
    time = +e.target.value
    if not @timeline.options.waitToUpdateMap or e.type == 'change'
      @timeline.setTime time
    @_output.innerHTML = @timeline.options.formatDate new Date time

  onAdd: (@map) ->
    @container = L.DomUtil.create 'div',
                    'leaflet-control-layers-expanded ' +
                    'leaflet-timeline-controls'
    @_makeSlider @container
    if @showTicks
      @_buildDataList @container, @timeline.times

    if @timeline.options.enablePlayback
      sliderCtrlC = L.DomUtil.create 'div', 'sldr-ctrl-container', @container
      buttonContainer = L.DomUtil.create 'div', 'button-container', sliderCtrlC
      @_makePlayButtons buttonContainer
      @_makePrevNext buttonContainer
      @_makeRevff buttonContainer
      @_makeOutput buttonContainer

    @_timeSlider.value = @time
    @_sliderChanged  # simulate slide (go to current time)
      type: 'change'
      target: value: @_timeSlider.value

    return @container


L.Timeline.timeSliderControl = (timeline, start, end, timelist) ->
  new L.Timeline.TimeSliderControl timeline, start, end, timelist
