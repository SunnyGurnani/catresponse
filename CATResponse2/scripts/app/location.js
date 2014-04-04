(function (global) {
    var map,
        geocoder,
        LocationViewModel,
        activityUid,
        activity,
        app = global.app = global.app || {};
    var drawingManager;
    var selectedShape;
    var colors = ['#1E90FF', '#FF1493', '#32CD32', '#FF8C00', '#4B0082'];
    var selectedColor;
    var colorButtons = {};

    function clearSelection() {
        if (selectedShape) {
            selectedShape.setEditable(false);
            selectedShape = null;
        }
    }

    function setSelection(shape) {
        clearSelection();
        selectedShape = shape;
        shape.setEditable(true);
        selectColor(shape.get('fillColor') || shape.get('strokeColor'));
    }

    function deleteSelectedShape() {
        if (selectedShape) {
            selectedShape.setMap(null);
        }
    }

    function selectColor(color) {
        selectedColor = color;
        for (var i = 0; i < colors.length; ++i) {
            var currColor = colors[i];
            //colorButtons[currColor].style.border = currColor == color ? '2px solid #789' : '2px solid #fff';
        }

        // Retrieves the current options from the drawing manager and replaces the
        // stroke or fill color as appropriate.
        var polylineOptions = drawingManager.get('polylineOptions');
        polylineOptions.strokeColor = color;
        drawingManager.set('polylineOptions', polylineOptions);

        var rectangleOptions = drawingManager.get('rectangleOptions');
        rectangleOptions.fillColor = color;
        drawingManager.set('rectangleOptions', rectangleOptions);

        var circleOptions = drawingManager.get('circleOptions');
        circleOptions.fillColor = color;
        drawingManager.set('circleOptions', circleOptions);

        var polygonOptions = drawingManager.get('polygonOptions');
        polygonOptions.fillColor = color;
        drawingManager.set('polygonOptions', polygonOptions);
    }

    function setSelectedShapeColor(color) {
        if (selectedShape) {
            if (selectedShape.type == google.maps.drawing.OverlayType.POLYLINE) {
                selectedShape.set('strokeColor', color);
            } else {
                selectedShape.set('fillColor', color);
            }
        }
    }

    function makeColorButton(color) {
        var button = document.createElement('span');
        button.className = 'color-button';
        button.style.backgroundColor = color;
        google.maps.event.addDomListener(button, 'click', function () {
            selectColor(color);
            setSelectedShapeColor(color);
        });

        return button;
    }

    function buildColorPalette() {
        //var colorPalette = document.getElementById('color-palette');
        //for (var i = 0; i < colors.length; ++i) {
        //    var currColor = colors[i];
        //    var colorButton = makeColorButton(currColor);
        //    colorPalette.appendChild(colorButton);
        //    colorButtons[currColor] = colorButton;
        //}
        selectColor(colors[0]);
    }


    LocationViewModel = kendo.data.ObservableObject.extend({
        _lastMarker: null,
        _isLoading: false,

        address: "",
        isGoogleMapsInitialized: false,

  
        showLoading: function () {
            if (this._isLoading) {
                app.mobileApp.showLoading();
            }
        },

        hideLoading: function () {
            app.mobileApp.hideLoading();
        },

        _putMarker: function (position) {
            var that = this;

            if (that._lastMarker !== null && that._lastMarker !== undefined) {
                that._lastMarker.setMap(null);
            }

            that._lastMarker = new google.maps.Marker({
                map: map,
                position: position
            });
        }
    });

    app.locationService = {
        initLocation: function () {
            var mapOptions;

            if (typeof google === "undefined") {
                return;
            }

            app.locationService.viewModel.set("isGoogleMapsInitialized", true);

          
            //app.locationService.viewModel.onNavigateHome.apply(app.locationService.viewModel, []);
        },

        show: function (e) {
            if (!app.locationService.viewModel.get("isGoogleMapsInitialized")) {
                return;
            }
            activityUid = e.view.params.uid;
            // Get current activity (based on item uid) from Activities model
            activity = app.Activities.activities.getByUid(activityUid);

            mapOptions = {
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.LEFT_BOTTOM
                },
               // disableDefaultUI: true,

                mapTypeControl: true,
                streetViewControl: true
            };

            map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
            geocoder = new google.maps.Geocoder();


            var polyOptions = {
                strokeWeight: 0,
                fillOpacity: 0.45,
                editable: true
            };
            // Creates a drawing manager attached to the map that allows the user to draw
            // markers, lines, and shapes.
            drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: google.maps.drawing.OverlayType.POLYGON,
                markerOptions: {
                    draggable: true
                },
                polylineOptions: {
                    editable: true
                },
                rectangleOptions: polyOptions,
                circleOptions: polyOptions,
                polygonOptions: polyOptions,
                map: map
            });

            google.maps.event.addListener(drawingManager, 'overlaycomplete', function (e) {
                if (e.type != google.maps.drawing.OverlayType.MARKER) {
                    // Switch back to non-drawing mode after drawing a shape.
                    drawingManager.setDrawingMode(null);

                    // Add an event listener that selects the newly-drawn shape when the user
                    // mouses down on it.
                    var newShape = e.overlay;
                    newShape.type = e.type;
                    google.maps.event.addListener(newShape, 'click', function () {
                        setSelection(newShape);
                    });
                    setSelection(newShape);
                }
            });
            google.maps.event.addListener(drawingManager, 'drawingmode_changed', clearSelection);
            google.maps.event.addListener(map, 'click', clearSelection);
            //google.maps.event.addDomListener(document.getElementById('delete-button'), 'click', deleteSelectedShape);

            buildColorPalette();

            //var ctaLayer = new google.maps.KmlLayer({
            //    url: 'http://geocommons.com/maps/587257.kml'
            //});
            var kmlUrl = "http://display-kml.appspot.com/get_kml/07/17302473-b9d6-11e3-ac95-85b69b36754a.kml";

            if (activity && activity.KMLUrl) {
                kmlUrl = activity.KMLUrl;
            }

            var ctaLayer = new google.maps.KmlLayer({
                url: kmlUrl
            });
            ctaLayer.setMap(map);


            //show loading mask in case the location is not loaded yet 
            //and the user returns to the same tab
            app.locationService.viewModel.showLoading();

            //resize the map in case the orientation has been changed while showing other tab
            google.maps.event.trigger(map, "resize");
        },

        hide: function () {
            //hide loading mask if user changed the tab as it is only relevant to location tab
            app.locationService.viewModel.hideLoading();
        },

        viewModel: new LocationViewModel()
    };
}
)(window);