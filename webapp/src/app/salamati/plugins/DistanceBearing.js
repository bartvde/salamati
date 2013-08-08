/**
 * @requires plugins/Tool.js
 * @requires GeoExt/widgets/Popup.js
 * @requires OpenLayers/Control/WMSGetFeatureInfo.js
 * @requires OpenLayers/Format/WMSGetFeatureInfo.js
 * @requires OpenLayers/StyleMap.js
 * @requires OpenLayers/Rule.js
 * @requires OpenLayers/Layer/Vector.js
 * @requires OpenLayers/Renderer/SVG.js
 * @requires OpenLayers/Renderer/VML.js
 * @requires OpenLayers/Renderer/Canvas.js
 * @requires OpenLayers/Feature/Vector.js
 * @requires OpenLayers/Geometry/LineString.js
 * @requires OpenLayers/Geometry/Point.js
 * @requires OpenLayers/Symbolizer/Point.js
 * @requires OpenLayers/Projection.js
 * @requires OpenLayers/Format/JSON.js
 * @requires OpenLayers/Request.js
 */

//var baseUrl = "http://192.168.10.126:8081/";

OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
    defaultHandlerOptions: {
        'single': true,
        'double': false,
        'pixelTolerance': 0,
        'stopSingle': false,
        'stopDouble': false
    },

    initialize: function(options) {
        this.handlerOptions = OpenLayers.Util.extend(
            {}, this.defaultHandlerOptions
        );
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
        ); 
        this.handler = new OpenLayers.Handler.Click(
            this, {
                'click': this.trigger
            }, this.handlerOptions
        );
    }, 

    trigger: function(evt) {
            if(this.plugin.popupVisible){
                if(this.plugin.win)
                    this.plugin.win.destroy();
                this.plugin.displayPopup(evt);
            }else{
                this.plugin.popupVisible = true;
                this.plugin.displayPopup(evt);
            }
    }

});

/** api: (define)
 *  module = salamati.plugins
 *  class = DistanceBearing
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("salamati.plugins");

/** api: constructor
 *  .. class:: DistanceBearing(config)
 *
 *    This plugins provides an action which, when active, will issue a
 *    GetFeatureInfo request to the WMS of all layers on the map. The output
 *    will be displayed in a popup.
 */   
salamati.plugins.DistanceBearing = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = app_distancebearing */
    ptype: "app_distancebearing",
    
    /** api: config[outputTarget]
     *  ``String`` Popups created by this tool are added to the map by default.
     */
    outputTarget: "map",

    /** private: property[popupCache]
     *  ``Object``
     */
    popupCache: null,

    /** api: config[infoActionTip]
     *  ``String``
     *  Text for feature info action tooltip (i18n).
     */
    infoActionTip: "Distance/Bearing of features from click location",

    baseUrl: "",

    // start i18n
    Text_Start: "Start",
    Text_ChooseWPS: "Choose WPS",
    Text_Ok: "OK",
    Text_Cancel: "Cancel",
    Text_Hospitals: "Hospitals",
    Text_Hazards: "Hazards",
    Text_DistanceLines: "Distance Lines",
    Text_Distance: "Distance",
    Text_Bearing: "Bearing",
    Text_Latitude: "Latitude",
    Text_Longitude: "Longitude",
    Text_Radius: "Radius",
    // end i18n

    /** api: config[popupTitle]
     *  ``String``
     *  Title for info popup (i18n).
     */
    popupTitle: "Distance/Bearing",
    
    /** api: config[format]
     *  ``String`` Either "html" or "grid". If set to "grid", GML will be
     *  requested from the server and displayed in an Ext.PropertyGrid.
     *  Otherwise, the html output from the server will be displayed as-is.
     *  Default is "html".
     */
    format: "html",
    
    /** api: config[vendorParams]
     *  ``Object``
     *  Optional object with properties to be serialized as vendor specific
     *  parameters in the requests (e.g. {buffer: 10}).
     */
    
    /** api: config[layerParams]
     *  ``Array`` List of param names that should be taken from the layer and
     *  added to the GetFeatureInfo request (e.g. ["CQL_FILTER"]).
     */
     
    /** api: config[itemConfig]
     *  ``Object`` A configuration object overriding options for the items that
     *  get added to the popup for each server response or feature. By default,
     *  each item will be configured with the following options:
     *
     *  .. code-block:: javascript
     *
     *      xtype: "propertygrid", // only for "grid" format
     *      title: feature.fid ? feature.fid : title, // just title for "html" format
     *      source: feature.attributes, // only for "grid" format
     *      html: text, // responseText from server - only for "html" format
     */

    /**
     * Is the popup visible?
     */
    popupVisible: false,
    
    wpsType: null,
    
    iconCls: null,
    
    /**
     * Popup Window
     */
    win: null,
    
    /** api: method[addActions]
     */
    addActions: function() {
        this.popupCache = {};
        
        var plugin = this;
        var map = this.target.mapPanel.map;
        var actions = salamati.plugins.DistanceBearing.superclass.addActions.call(this, [{
            tooltip: this.infoActionTip,
            iconCls: this.iconCls,
            toggleGroup: this.toggleGroup,
            enableToggle: true,
            allowDepress: true,
            toggleHandler: function(button, pressed) {
                for (var i = 0, len = info.controls.length; i < len; i++){
                    if (pressed) {
                        info.controls[i].activate();
                    } else {
                        info.controls[i].deactivate();
                        if(plugin.popupVisible && plugin.win)
                            plugin.win.destroy();
                        plugin.popupVisible = false;
                    }
                }
             }
        }]);
        
        var infoButton = this.actions[0].items[0];

        var info = {controls: []};
        var updateInfo = function() {
            var queryableLayers = this.target.mapPanel.layers.queryBy(function(x){
                return x.get("queryable");
            });

            
            var control;
            for (var i = 0, len = info.controls.length; i < len; i++){
                control = info.controls[i];
                control.deactivate();  // TODO: remove when http://trac.openlayers.org/ticket/2130 is closed
                control.destroy();
            }
            
            info.controls = [];
            
            var clickControl = new OpenLayers.Control.Click({
                    plugin: plugin
                });
            
                map.addControl(clickControl);
                info.controls.push(clickControl);
                
                if(infoButton.pressed) {
                    clickControl.activate();
                }
        };
            
        this.target.mapPanel.layers.on("update", updateInfo, this);
        this.target.mapPanel.layers.on("add", updateInfo, this);
        this.target.mapPanel.layers.on("remove", updateInfo, this);
        
        return actions;
    }, 

    addJsonFeatures: function(map, center, jsonFeatures, type) {
		
        var prefix;
        
        if(type == "pointhospitals")
                prefix = this.Text_Hospitals;
        else
                prefix = this.Text_Hazards;
                
		//Create a new layer to store all the features.
		var LineLayer = new OpenLayers.Layer.Vector(prefix + " " + this.Text_DistanceLines, {
			projection: new OpenLayers.Projection(map.getProjection()),
			styleMap: new OpenLayers.StyleMap(OpenLayers.Util.applyDefaults( {
					graphicName:"arrow",
					rotation : "${angle}",
					strokeColor: "black",
                    strokeOpacity: 1,
                    strokeWidth: 3,
                    fillColor: "black",
                    fillOpacity: 1,
                    pointerEvents: "visiblePainted"
				},
				OpenLayers.Feature.Vector.style["default"]
			))
		});
		
		var PointLayer = new OpenLayers.Layer.Vector(prefix + "Markers", {
			projection: new OpenLayers.Projection(map.getProjection()),
			styleMap: new OpenLayers.StyleMap({'default':{
                    strokeColor: "${markerColor}",
                    strokeOpacity: 1,
                    strokeWidth: 2,
                    fillColor: "${markerColor}",
                    fillOpacity: 0.5,
                    pointRadius: 8,
                    pointerEvents: "visiblePainted",
                    // label with \n linebreaks
                    label : "${label}",
                    
                    fontColor: "${fontColor}",
                    fontSize: "14px",
                    fontFamily: "Courier New, monospace",
                    fontWeight: "bold",
                    labelAlign: "${align}",
                    labelXOffset: "${xOffset}",
                    labelYOffset: "${yOffset}",
                    labelOutlineColor: "black",
                    labelOutlineWidth: 4
                }})
		});
		
		//Create an array of features
		var features = [];
		var pointFeatures = [];
		
		var centerPoint = new OpenLayers.Geometry.Point(center.lon, center.lat).transform(
				new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection(map.getProjection()));
				
		var startPoint = new OpenLayers.Feature.Vector(centerPoint);
			startPoint.attributes = {
                label: this.Text_Start,
                markerColor: "green",
                fontColor: 'white',
                align: "cm",
                xOffset: 0,
                yOffset: 15
            };
		pointFeatures.push(startPoint);
		
		//Loop through the json object and parse the data.
		// - TODO: Base the loop on the json data
		for(var i = 0; i < jsonFeatures.length; i++) {		
			
			var feature = jsonFeatures[i];
			
			//Given the center point, calculate the point based on the distance and bearing
			var endPoint = new OpenLayers.Geometry.Point(feature.endPoint.x, feature.endPoint.y).transform(
				new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection(map.getProjection()));
			
			line = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([centerPoint, endPoint]));
			line.attributes = {
				bearing: feature.bearing.toFixed(1)
			};
										 
			features.push(line);
			
			var point = new OpenLayers.Feature.Vector(endPoint);
			point.attributes = {
                label: this.Text_Distance + ": " + (feature.distance / 1000.0).toFixed(3) + " km\n" + this.Text_Bearing + ": " + feature.bearing + "\u00B0",
                markerColor: "red",
                fontColor: 'white',
                align: "cm",
                xOffset: 0,
                yOffset: 30,
                fid: feature.fid,
                group: "testgroup"
            };
			
			//Create a feature based on the new point.
			pointFeatures.push(point);
		}
	
		//Finally add all the features to the new layer...
		LineLayer.addFeatures(features);
		PointLayer.addFeatures(pointFeatures);
		
		//and add the layer to the map!
		map.addLayer(LineLayer);
        map.addLayer(PointLayer);
		
		//Add arrow
		OpenLayers.Renderer.symbol.arrow = [0,2, 1,0, 2,2, 1,0, 0,2];
		
		var arrowHead = [];
		for (var i = 0; i < features.length; i++) {
			var linePoints = this.createDirection(features[i].geometry, features[i].attributes.bearing);
			for (var j=0; j < linePoints.length; j++ ) {
				linePoints[j].attributes.lineFid = features[i].fid;
			}
			arrowHead = arrowHead.concat(linePoints);
		}
		LineLayer.addFeatures(arrowHead);
		//map.addLayer(ArrowLayer);	
    },
    
    createDirection: function(line,bearing) {
		if(line instanceof OpenLayers.Geometry.MultiLineString) {
			//TODO
		} else if(line instanceof OpenLayers.Geometry.LineString) {
			return this.createLineStringDirection(line,bearing);
		} else {
			return [];
		}
	},

	createLineStringDirection: function(line,bearing) {
		var points = [];
		var allSegs = this.getSegments(line);
		var segs = [];

		segs.push(allSegs[allSegs.length-1]);
			
		for (var i = 0; i < segs.length; i++) {
			points = points.concat(this.createSegDirection(segs[i],bearing));
		}
		return points;
	},

	createSegDirection: function(seg,bearing) {
		//var segBearing = this.bearing(seg);
		var positions = [];
		var points = [];
		
		positions.push([seg.x2,seg.y2]);
										 
		for (var i=0;i<positions.length;i++ ) {
			var pt = new OpenLayers.Geometry.Point(positions[i][0],positions[i][1]);
			var ptFeature = new OpenLayers.Feature.Vector(pt,{angle:bearing}); 
			points.push(ptFeature);
		}
		return points;	
	},

	getSegmentLength: function(seg) {
	    return Math.sqrt( Math.pow((seg.x2 -seg.x1),2) + Math.pow((seg.y2 -seg.y1),2) );
	},

	getSegments: function(line) {	
		var numSeg = line.components.length - 1;
		var segments = new Array(numSeg), point1, point2;
		for(var i=0; i<numSeg; ++i) {
	    	point1 = line.components[i];
	    	point2 = line.components[i + 1];
	    	segments[i] = {
	        	x1: point1.x,
	        	y1: point1.y,
	        	x2: point2.x,
	        	y2: point2.y
	    	};
		}
		return segments;
	},

	validateLon: function(lon){
		if(isNaN(lon) || (radius == ""))
			return false;
	 
		if((lon >= -180) && (lon <= 180))
			return true;
	 
			return false;
	},
	 
	validateLat: function(lat){
		if(isNaN(lat) || (radius == ""))
			return false;
	 
		if((lat >= -90) && (lat <= 90))
			return true;
	 
			return false;
	},
	 
	validateRadius: function(radius){
		if(isNaN(radius) || (radius == ""))
			return false;
	 
		if(radius >= 0)
			return true;
	 
			return false;
	},
	
    /** private: method[displayPopup]
     * :arg evt: the event object from a 
     *     :class:`OpenLayers.Control.GetFeatureInfo` control
     * :arg title: a String to use for the title of the results section 
     *     reporting the info to the user
     * :arg text: ``String`` Body text.
     */
    displayPopup: function(evt) {
        var wps;
        var combo;
        var mapLayers;
        
        if(this.wpsType == "generic"){
        	
        	mapLayers = [];
        	wps = [];
        	
        	var activeLayers = app.mapPanel.map.layers;
        	var j = 0;
        	for(var i = 0; i < activeLayers.length; i++){
        		if(activeLayers[i] instanceof OpenLayers.Layer.WMS){
        			if(activeLayers[i].url.indexOf("geoserver") > -1){
	        			mapLayers.push({
	        				url: activeLayers[i].url,
	        				name: activeLayers[i].name,
	        				params: activeLayers[i].params
	        			});
	        			
	        			wps.push([j++, activeLayers[i].name]);
        			}
        		}
        	}
        	
           // wps = [["pointhazzards", "Point Hazzards"], 
           // ["pointhospitals", "Point Hospitals"]];
        
            /*queryableLayers.each(function(x){
                var layer = x.getLayer();
                layers.push([layer.url, x.get("name")]);
            });*/
            
            // Create the combo box, attached to the states data store
        	console.log("wps store: ", wps);
            combo = new Ext.form.ComboBox({
                editable:		false,
                id:             "wpsCombo",
                mode:			"local",
                lazyRender:		true,
                fieldLabel:		this.Text_ChooseWPS,
                store:			wps,
                autoSelect:		true, // BUG: "true to select the first result gathered by the data store (defaults to true)." - From docs - doesn't seem to work
                triggerAction: "all",
                lastQuery: "" 
            });
            console.log("combo", combo);
        }
        
        //Project the mouse XY coordinates to WGS84 LatLon
        var map = this.target.mapPanel.map;
        var geographic = new OpenLayers.Projection("EPSG:4326");
        var clickLocation = map.getLonLatFromPixel(evt.xy);
        clickLocation = clickLocation.transform(new OpenLayers.Projection(map.getProjection()), geographic);
        
        var plugin = this;
        
        var cancelButton = new Ext.Button({
            text: 		this.Text_Cancel,
            handler:	function(b, e) {
                plugin.win.destroy();
                plugin.popupVisible = false;
            }
        });
            
                
        var okButton = new Ext.Button({
            text: 		this.Text_Ok,
            handler:	function(b, e) {
                /**
                 * Post the request and expect success.
                 */
                var jsonFormat = new OpenLayers.Format.JSON();
                       
                var lon = Ext.getCmp("lon").getValue();
                var lat = Ext.getCmp("lat").getValue();
                var radius = Ext.getCmp("radius").getValue();
                       
                if(!plugin.validateLon(lon))
                       return;
                if(!plugin.validateLat(lat))
                       return;
                if(!plugin.validateRadius(radius))
                       return;
                
                radius = radius * 1000;
                var selectedWPS;
                
                if(plugin.wpsType == "generic"){
                    selectedWPS = combo.getValue();
                    if(selectedWPS === ""){
                        return;
                    }
                }else{
                    selectedWPS = plugin.wpsType;
                }
                
               /* if(mapLayers[selectedWPS].params["SRS"] != "EPSG:4326"){
                	alert("\tThe layer must be projected in WGS84.\n\tPlease choose another layer");
                	return;
                }*/
                
                var requestData = jsonFormat.write({ 
                	x: lon,
                	y: lat,
                	radius: radius,
                	typeName: mapLayers[selectedWPS].params["LAYERS"],
                	url: mapLayers[selectedWPS].url
                });
                
                console.log(requestData);
                
                var responseDataJson = null;
                
              //  Ext.getCmp("mymap").addClass("loading");
                OpenLayers.Request.POST({
                    url: plugin.baseUrl + "distanceandbearing",
                    proxy: null,
                    data: requestData,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    success: function(response) {
                        console.log("success: ", response);
                        responseDataJson = eval(response.responseText);
                        //console.log("responseDataJson: ", responseDataJson);
                        
                        //----------------------------
                        //Once you have your json, pass it to addJsonFeatures
                        var lonlat = new OpenLayers.LonLat(lon, lat);
                        plugin.addJsonFeatures(plugin.target.mapPanel.map, lonlat, responseDataJson, mapLayers[selectedWPS].name); //responseData);
                       // Ext.getCmp("mymap").removeClass("loading");                
                    }
                });
            }
        });
          
        var buttonGroup = new Ext.Panel({
            tbar: [{
                xtype: 'buttongroup',
                columns: 2,
                buttonAlign: 'center',
                items: [
                    cancelButton,
                    okButton
                ]
            }]
        });
        
        if(this.wpsType == "generic"){
            this.win = new Ext.Window({
                title:			this.Text_Distance + "/" + this.Text_Bearing,
                closable:		true,
                closeAction:	"destroy",
                width:			"365px",
                height:			"251px",
                layout:			"form",
                bodyStyle:		"padding: 5px;",
                items: [
                    combo,
                    new Ext.form.Field({
                        fieldLabel:	this.Text_Longitude,
                        id: "lon",
                        value:		clickLocation.lon
                    }),
                    new Ext.form.Field({
                        fieldLabel:	this.Text_Latitude,
                        id: "lat",
                        value:		clickLocation.lat
                    }),
                    new Ext.form.Field({
                        fieldLabel:	this.Text_Radius + " (km)",	// TODO: Needs validation event handler to prevent empty radius being submitted
                        id: "radius",
                        value: 10
                    }),
                    buttonGroup
                ]
            });
        }else{
            var wpsName;
            
            if(this.wpsType == "pointhospitals")
                wpsName = "Point " + this.Text_Hospitals;
            else
                wpsName = "Point " + this.Text_Hazards;
                
            this.win = new Ext.Window({
                title:			this.Text_Distance + "/" + this.Text_Bearing + " of " + wpsName,
                closable:		true,
                closeAction:	"destroy",
                width:			300,
                height:			160,
                layout:			"form",
                bodyStyle:		"padding: 5px;",
                items: [
                    new Ext.form.Field({
                        fieldLabel:	this.Text_Longitude,
                        id: "lon",
                        value:		clickLocation.lon
                    }),
                    new Ext.form.Field({
                        fieldLabel:	this.Text_Latitude,
                        id: "lat",
                        value:		clickLocation.lat
                    }),
                    new Ext.form.Field({
                        fieldLabel:	this.Text_Radius + " (km)",	// TODO: Needs validation event handler to prevent empty radius being submitted
                        id: "radius",
                        value: 10
                    }),
                    buttonGroup
                ]
            });
        }
        
        this.win.show();
    }
});

Ext.preg(salamati.plugins.DistanceBearing.prototype.ptype, salamati.plugins.DistanceBearing);
