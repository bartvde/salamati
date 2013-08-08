/**
 * Add all your dependencies here.
 *
 * @require widgets/Viewer.js
 * @require plugins/LayerManager.js
 * @require plugins/OLSource.js
 * @require plugins/MapQuestSource.js
 * @require plugins/MapBoxSource.js
 * @require plugins/BingSource.js
 * @require plugins/GoogleSource.js
 * @require plugins/OSMSource.js
 * @require plugins/WMSCSource.js
 * @require plugins/ZoomToExtent.js
 * @require plugins/NavigationHistory.js
 * @require plugins/Zoom.js
 * @require plugins/AddLayers.js
 * @require plugins/RemoveLayer.js
 * @require salamati/plugins/DistanceBearing.js
 * @require RowExpander.js
 * @require widgets/NewSourceDialog.js
 * @require widgets/EmbedMapDialog.js
 * @require plugins/FeatureManager.js
 * @require plugins/FeatureGrid.js
 * @require plugins/FeatureEditor.js
 * @require plugins/Navigation.js
 * @require plugins/SnappingAgent.js
 * @require GeoGitUtil.js
 * @require plugins/VersionedEditor.js
 * @require plugins/Playback.js
 * @require plugins/Measure.js
 * @require plugins/FeedGetFeatureInfo.js
 * @require OpenLayers/Format/WKT.js
 * @require OpenLayers/Control/MousePosition.js
 * @require OpenLayers/Control/ScaleLine.js
 * @require salamati/plugins/Settings.js
 * @require locale/en.js
 * @require locale/es.js
 * @require salamati/locale/en.js
 * @require salamati/locale/es.js
 * @require salamati/plugins/SalamatiTools.js
 * @require plugins/GeoGitHistory.js
 * @require plugins/GeoGitHistoryButton.js
 * @require plugins/LayerMenuButton.js
 * @require plugins/GeoGitRepoInfo.js
 * @require plugins/DiffPanel.js
 * @require plugins/GeoGitFeatureAttributeGrid.js
 * @require plugins/Styler.js
 */

(function() {
    // backwards compatibility for reading saved maps
    // these source plugins were renamed after 2.3.2
    Ext.preg("gx_wmssource", gxp.plugins.WMSSource);
    Ext.preg("gx_olsource", gxp.plugins.OLSource);
    Ext.preg("gx_googlesource", gxp.plugins.GoogleSource);
    Ext.preg("gx_bingsource", gxp.plugins.BingSource);
    Ext.preg("gx_osmsource", gxp.plugins.OSMSource);
})();

Ext.ns("salamati");
salamati.Viewer = Ext.extend(gxp.Viewer, {
	Map: "Default Map",
	Title_Tools: "Default Tools",
	Title_Search: "Default Search",
    Title_Layers: "Layers",
    Title_GeoGit: "GeoGit",
    Title_Diff: "Diff",
    Title_Feature_Diff: "Feature Diff",
    Title_Old: "Old",
    Title_New: "New",
    Title_Merged: "Merged",
    Title_Done: "Done",
	Search_Submit: "Default Go",
	ActionTip_Default: "Distance/Bearing of features from click location",
	ActionTip_Edit: "Get feature info",
	NominatimStore: new Ext.data.Store({
		storeId: 'searchStore',
		reader: new Ext.data.JsonReader({
			fields: [
			   {
				   name: 'display_name',
				   mapping: 'display_name'
			   },{
				   name: 'boundingBox',
				   mapping: 'boundingbox'
			   },{
				   name: 'lon',
				   mapping: 'lon'
			   },{
				   name: 'lat',
				   mapping: 'lat'
			   }
			]
		})
	}),
	
    constructor: function(config) {
        config = config || {};
        // Starting with this.authorizedRoles being undefined, which means no
        // authentication service is available
        if (config.authStatus === 401) {
            // user has not authenticated or is not authorized
            this.authorizedRoles = [];
        } else if (config.authStatus !== 404) {
            // user has authenticated
            this.authorizedRoles = ["ROLE_ADMINISTRATOR"];
        }
        // should not be persisted or accessed again
        delete config.authStatus;

        config.listeners = {
            "ready": function(){

            	// Hide the southPanel - needed it to display at first
            	// in order to size the columns correctly
            	var southPanel = app.portal.southPanel;
            	southPanel.hide();
            	app.portal.doLayout();
            	
                /*Ext.Ajax.on('beforerequest', showSpinner, this);
                Ext.Ajax.on('requestcomplete', hideSpinner, this);
                Ext.Ajax.on('requestexception', hideSpinner, this);*/

            	win.animateTarget = app.tools.salamati_tools.actions[0].items[0];

                // load toolsWindowShow from cookie if available
                var toolsWindowShow = "true";
                var cookieStart;
                var toolsWindowShow2;
                
                if (document.cookie.length > 0) {
                    cookieStart = document.cookie.indexOf("toolsWindowShow=");

                    if (cookieStart != -1) {
                        cookieStart += "toolsWindowShow".length + 1;
                        cookieEnd = document.cookie.indexOf(";", cookieStart);

                        if (cookieEnd == -1) {
                            cookieEnd = document.cookie.length;
                        }
                        toolsWindowShow2 = document.cookie.substring(cookieStart, cookieEnd);

                        if (toolsWindowShow2) {
                            toolsWindowShow = toolsWindowShow2;
                        }
                        console.log("---- App.onReady toolsWindowShow found: ", toolsWindowShow);
                    }
                }

                if (toolsWindowShow === "false") {
                    win.hide();
                    //toolContainer.show();
                } else {
                    win.show();
                }

                // load toolsWindowXY from cookie if available
                var toolsWindowX = 60;
                var toolsWindowY = 60;
                if (document.cookie.length > 0) {
                    cookieStart = document.cookie.indexOf("toolsWindowXY=");

                    if (cookieStart != -1) {
                        cookieStart += "toolsWindowXY".length + 1;
                        cookieEnd = document.cookie.indexOf(";", cookieStart);

                        if (cookieEnd == -1) {
                            cookieEnd = document.cookie.length;
                        }
                        var toolsWindowXY = document.cookie.substring(cookieStart, cookieEnd);

                        if (typeof toolsWindowXY != 'undefined' && toolsWindowXY) {
                            values = toolsWindowXY.split("|");
                            var x = parseFloat(values[0]);
                            var y = parseFloat(values[1]);

                            if (x && y) {
                                toolsWindowX = x;
                                toolsWindowY = y;
                            }
                        }
                        console.log("---- App.onReady toolsWindowXY found: ", toolsWindowX, toolsWindowY);
                    }
                }

                win.setPosition(toolsWindowX, toolsWindowY);
                
                var map = app.mapPanel.map;
                map.displayProjection = "EPSG:4326";
                map.addControl(new OpenLayers.Control.ScaleLine());
                map.addControl(new OpenLayers.Control.MousePosition({
                    displayClass: 'mymouseposition'
                }));


                // look for cookie
                if (document.cookie.length > 0) {
                    cookieStart = document.cookie.indexOf("mapCenter=");

                    if (cookieStart != -1) {
                        cookieStart += "mapCenter".length + 1;
                        cookieEnd = document.cookie.indexOf(";", cookieStart);

                        if (cookieEnd == -1) {
                            cookieEnd = document.cookie.length;
                        }

                        cookietext = document.cookie.substring(cookieStart, cookieEnd);

                        values = cookietext.split("|");
                        lat = parseFloat(values[0]);
                        lon = parseFloat(values[1]);
                        zoom = parseInt(values[2], 10);

                        console.log("---- App.onReady mapCenter found lat: ", lat, ", lon: ", lon, ", zoom: ", zoom);

                        if (lat && lon && zoom) {
                            map.setCenter(new OpenLayers.LonLat(lon, lat), zoom);
                        }
                    }
                }


                var setMapCenterCookie = function(expiredays) {

                    mapCenter = new OpenLayers.LonLat(map.getCenter().lon, map.getCenter().lat);
                    var cookietext = "mapCenter=" + mapCenter.lat + "|" + mapCenter.lon + "|" + map.getZoom();

                    if (typeof expiredays != 'undefined' && expiredays) {
                        var exdate = new Date();
                        exdate.setDate( exdate.getDate() + expiredays);
                        cookietext += ";expires=" + exdate.toGMTString();
                    }

                    // write cookie
                    document.cookie = cookietext;
                };
                //TODO: implement but we also need to cache the sources as by default it only tries to parse out local host geoserver
                var setMapLayersCookie = function(expiredays) {
                };

                // This is what the UI does to add the layer 
//              function addLayers() {
//                  var key = sourceComboBox.getValue(); //local
//                  var source = this.target.layerSources[key]; //
//                  var records = capGridPanel.getSelectionModel().getSelections();
//                  this.addLayers(records, source);
//              }



                // TODO: is this the best place to insert this?
                map.events.on({
                    "moveend" : function(e) {
                        setMapCenterCookie();
                    },
                    "zoomend" : function(e) {
                        setMapCenterCookie();
                    },
                    "addlayer" : function(e) {
                        setMapLayersCookie();
                        //console.log("map.events.addlayer: ", e);
                        gxp.GeoGitUtil.isGeoGitLayer(e.layer);
                        gxp.GeoGitUtil.getGeometryAttributeName(true);
                    },
                    "removelayer" : function(e) {
                        setMapLayersCookie();
                        //console.log("map.events.removelayer: ", e);
                        if(e.layer.metadata.isGeoGit) {
                            app.fireEvent("togglesouthpanel");
                        }
                    },
                    "changelayer" : function(e) {
                        setMapLayersCookie();
                        //console.log("map.events.changelayer: ", e);
                        gxp.GeoGitUtil.getGeometryAttributeName(true);
                    },
                    scope : map
                });
                /** 
                 * Hack to make snapping more dynamic
                 * Whenever a layer is added to the map, it gets added to the snapping targets
                 */
                nameIndex = [];
                snappingAgent = app.tools.snapping_agent;

                map.events.register("addlayer", null, function(layer){
                    var layerParams = layer.layer.params;

                    if(layerParams && (nameIndex.indexOf(layerParams.LAYERS) == -1))
                    {
                        var target = {
                            source:  "local",
                            name: layerParams.LAYERS
                        };
                        // this breaks in GeoNode, TODO fix
                        if (snappingAgent) {
                            var index = snappingAgent.targets.push(target);
                            snappingAgent.addSnappingTarget(target);
                            nameIndex.push(target.name);
                            app.selectLayer(app.getLayerRecordFromMap(target));
                        }
                    }
                });
            },
            "togglesouthpanel" : function() { 
                console.log("toggle south panel")
                var southPanel = app.portal.southPanel;
                if(southPanel.hidden) {
                    southPanel.show();
                    southPanel.expand();
                } else {
                    southPanel.hide();
                }
                app.portal.doLayout();
            },
            "commitdiffselected" : function(store, oldCommitId, newCommitId, layerProjection) {
                var westPanel = app.portal.westpanel;
                this.tools['diffpanel'].fireEvent("commitdiffselected", store, oldCommitId, newCommitId, layerProjection);
            },
            "diffstoshow" : function(merging) {
                var westPanel = app.portal.westpanel;
                var southPanel = app.portal.southPanel;
                if(westPanel.hidden) {
                    westPanel.show();
                    westPanel.expand();
                }
                
                if(!southPanel.hidden){
                    southPanel.hide();
                }

                if(!merging) {
                    app.portal.westpanel.diffDoneButton.show();
                }
                
                app.portal.featureDiffPanel.hide();
                app.portal.doLayout();
            },
            "getattributeinfo" : function(store, oldCommitId, newCommitId, path, layerProjection) {
                var featureDiffPanel = app.portal.featureDiffPanel;
                var diffLayersWindow = app.portal.diffLayersWindow;
                this.tools['attribute_grid'].fireEvent("getattributeinfo", store, oldCommitId, newCommitId, path, layerProjection);
                if(featureDiffPanel.hidden) {
                    featureDiffPanel.show();
                    diffLayersWindow.show();
                    diffLayersWindow.items.items[0].items.items[1].disable();
                    diffLayersWindow.setPosition(app.mapPanel.getWidth() / 2 - diffLayersWindow.getWidth() / 2, app.mapPanel.tbar.getHeight());
                    app.portal.featureDiffPanel.setPosition(app.mapPanel.getWidth() / 2 - app.portal.featureDiffPanel.getWidth() / 2, 
                            app.mapPanel.getHeight() - app.portal.featureDiffPanel.getHeight());
                }
                app.portal.doLayout();
            },
            "getmergeinfo": function(store, oldCommitId, newCommitId, ancestorCommitId, data, transactionId) {
                var featureDiffPanel = app.portal.featureDiffPanel;
                var diffLayersWindow = app.portal.diffLayersWindow;
                this.tools['attribute_grid'].fireEvent("getmergeinfo", store, oldCommitId, newCommitId, ancestorCommitId, data, transactionId);
                if(featureDiffPanel.hidden) {
                    featureDiffPanel.show();
                    diffLayersWindow.show();
                    diffLayersWindow.items.items[0].items.items[1].enable();
                    diffLayersWindow.setPosition(app.mapPanel.getWidth() / 2 - diffLayersWindow.getWidth() / 2, app.mapPanel.tbar.getHeight());
                    app.portal.featureDiffPanel.setPosition(app.mapPanel.getWidth() / 2 - app.portal.featureDiffPanel.getWidth() / 2, 
                            app.mapPanel.getHeight() - app.portal.featureDiffPanel.getHeight());
                }
                
                app.portal.doLayout();
            },
            "beginMerge": function(store, transactionId, ours, theirs, load) {
                var westPanel = app.portal.westpanel;
                this.tools['diffpanel'].fireEvent("beginMerge", store, transactionId, load);
                this.tools['feature_editor'].fireEvent("beginMerge");
                this.tools['geogithistory'].fireEvent("beginMerge"); 
                this.tools['attribute_grid'].fireEvent("beginMerge", store, transactionId, ours, theirs);
                if(westPanel.hidden) {
                    westPanel.show();
                    westPanel.expand();
                }
                app.portal.featureDiffPanel.hide();
                app.portal.westpanel.diffDoneButton.hide();
                app.portal.diffLayersWindow.hide();
                app.portal.doLayout();
            },
            "conflictsDetected": function(numConflicts) {
                this.tools['repo_info'].fireEvent("conflictsDetected", numConflicts);
            },
            "conflictResolved": function(fid) {
                this.tools['repo_info'].fireEvent("conflictResolved");
                this.tools['diffpanel'].fireEvent("conflictResolved", fid);
                app.portal.featureDiffPanel.hide();
                app.portal.diffLayersWindow.hide();
            },
            "endMerge": function() {        
                this.tools['diffpanel'].fireEvent("endMerge");
                this.tools['feature_editor'].fireEvent("endMerge");
                this.tools['geogithistory'].fireEvent("endMerge");
                this.tools['attribute_grid'].fireEvent("endMerge");
                app.portal.westpanel.hide();
                app.portal.featureDiffPanel.hide();
                app.portal.diffLayersWindow.hide();
                app.portal.doLayout();
            },
            "featureEditorUnselectAll": function() {
                this.tools['feature_editor'].fireEvent("featureEditorUnselectAll");
            }
        };

        config.defaultSourceType = "gxp_wmscsource";
        if (!config.sources) {
            config.sources = Ext.apply(config.sources || {}, {
                local: {
                    ptype: "gxp_wmscsource",
                    url: "/geoserver/wms",
                    version: "1.1.1"
                },
                osm: {
                    ptype: "gxp_osmsource"
                }
            });
        }
        if (!config.map) {
            config.map = {
                id: "mymap", // id needed to reference map in portalConfig above
                title: this.Map,
                projection: "EPSG:900913",
                center: [-10764594.758211, 4523072.3184791],
                cls: "mymapclass",
                zoom: 3,
                maxExtent: [-20037508, -20037508, 20037508, 20037508],
                restrictedExtent: [-20037508, -20037508, 20037508, 20037508],
                numZoomLevels: 20,
                layers: [{
                    source: "osm",
                    name: "mapnik",
                    group: "background"
                }],
                items: [{
                    xtype: "gx_zoomslider",
                    vertical: true,
                    height: 100
                }],
                tbar: [{
                    xtype: 'tbfill'
                }]
            };
        } else {
            config.map.id = "mymap";
            config.map.items = config.map.items || [];
            config.map.items.push({
                xtype: "gx_zoomslider",
                vertical: true,
                height: 100
            });
        }
        this.portalConfig = Ext.apply(config.portalConfig || {}, {
            layout: "border",

            // by configuring items here, we don't need to configure portalItems
            // and save a wrapping container
            items: [{
                ref: "centerpanel",
                xtype: "panel",
                layout: "fit",
                style: "top:81px",
                region: "center",
                border: false,
                items: ["mymap",
                    win, {
                    ref: "../featureDiffPanel",
                    xtype: "window",
                    hidden: true,
                    closable: true,
                    layout: "fit",
                    height: 200,
                    width: 600,
                    constrainHeader: true,
                    title: this.Title_Feature_Diff,
                    listeners: {
                        "beforeclose": function(panel) {
                            panel.hide();
                            app.portal.diffLayersWindow.hide();
                            app.tools['attribute_grid'].clearLayers();
                            return false;
                        }
                    }
                }, {
                    title: salamati.Viewer.prototype.Title_Geometry_Diff,
                    ref: "../diffLayersWindow",
                    closeAction: "hide",
                    xtype: "window",
                    resizable: false,
                    closable: false,
                    layout: "fit",
                    items: [
                        {
                            xtype: "panel",
                            id: "idDiffLayersWindowPanel",
                            cls: "mydifflayerwindowclass",
                            layout: "hbox",
                            layoutConfig: {
                                align: 'center',
                                padding: '5'
                            },
                            items: [
                                {
                                    xtype: 'button',
                                    tooltip: salamati.Viewer.prototype.Title_Old,
                                    iconCls: "salamati-icon-oldgeometry",
                                    handler: function() {
                                        app.tools['attribute_grid'].fireEvent("showOldGeometry");
                                    }
                                },{
                                    xtype: 'button',
                                    tooltip: salamati.Viewer.prototype.Title_Merged,
                                    iconCls: "salamati-icon-mergedgeometry",                       
                                    handler: function() {
                                        app.tools['attribute_grid'].fireEvent("showMergeGeometry");
                                    }
                                },{
                                    xtype: 'button',
                                    tooltip: salamati.Viewer.prototype.Title_New,
                                    iconCls: "salamati-icon-newgeometry",
                                    handler: function() {
                                        app.tools['attribute_grid'].fireEvent("showCurrentGeometry");
                                    }
                                }
                            ]
                        }
                    ]
                }]
            }, {
            	ref: "westpanel",
            	layout: "vbox",
            	region: "west",
            	collapsible: false,
            	title: this.Title_Diff,
            	hidden: true,
            	split: true,
            	minSize: 200,
            	maxSize: 300,
            	width: 200,
            	items: [{
                    xtype: 'button',
                    text: this.Title_Done,
                    ref: 'diffDoneButton',
                    cls: 'diffDoneButtonClass diffDoneButtonTextClass',
                    hidden: true,
                    width: 200,
                    handler: function() {
                        app.portal.westpanel.hide();
                        app.portal.westpanel.diffDoneButton.hide();

                        app.portal.featureDiffPanel.hide();
                        app.portal.diffLayersWindow.hide();
                        if(app.tools.diffpanel.diffLayer) {
                            var layer = app.mapPanel.map.getLayer(app.tools.diffpanel.diffLayer.id);
                            if(layer !== null) {
                                app.mapPanel.map.removeLayer(layer);
                            }
                        }

                        if(app.tools.attribute_grid.oldGeomLayer) {
                            var layer = app.mapPanel.map.getLayer(app.tools.attribute_grid.oldGeomLayer.id);
                            if(layer !== null) {
                                app.mapPanel.map.removeLayer(layer);
                            }
                        }

                        if(app.tools.attribute_grid.mergeGeomLayer) {
                            var layer = app.mapPanel.map.getLayer(app.tools.attribute_grid.mergeGeomLayer.id);
                            if(layer !== null) {
                                app.mapPanel.map.removeLayer(layer);
                            }
                        }

                        if(app.tools.attribute_grid.currentGeomLayer) {
                            var layer = app.mapPanel.map.getLayer(app.tools.attribute_grid.currentGeomLayer.id);
                            if(layer !== null) {
                                app.mapPanel.map.removeLayer(layer);
                            }
                        }
                        app.portal.doLayout();
                    }
                }]
            }, {
            	ref: "eastpanel",
            	layout: "vbox",
            	region: "east",
            	collapsible: true,
            	style: "top:81px",
            	split: true,
            	minSize: 200,
            	maxSize: 300,
            	width: 200,
            	items: [{
            		ref: "../tabs",
            		xtype: "tabpanel",
            		flex: 0.50,
            		enableTabScroll: true,
            		activeTab: 1,
            		items: [{
            			title: this.Title_Search,
            			ref: "../../searchtab",
            			items: [{
            				xtype: "textfield",
            		    	id: "searchField",
            		    	cls: "searchFieldClass",
            		    	emptyText:  this.Title_Search,
            		    	enableKeyEvents: true,
            		    	listeners: {
            		    		'keyup' : function(element, event){
            		    			if(event.button == 12){
            		    				submitSearch(element.getValue());
            		   		 		}
            		   	 		}
            		    	}
            			}, {
            				xtype: "grid",
                			store: this.NominatimStore,
                			cls: "nominatimGridClass",
                			hideHeaders: true,
                			border: false,
                			columns: [{
                				id: 'place',
                				//header: 'Address',
                				width: 200,
                				//sortable: true,
                				dataIndex: 'display_name'
                			}],
                			listeners: {
                				'cellclick': function(grid, rowIndex, columnIndex, e){
                					var record = grid.getStore().getAt(rowIndex);
                					console.log("data", record.data);
                				
                					zoomToPlace(record.data.lon, record.data.lat, record.data.boundingBox[2], 
                						record.data.boundingBox[0], record.data.boundingBox[3], record.data.boundingBox[1]);
                				}
                			}
            			}]
            		}, {
            			title: this.Title_Layers,
            			ref: "../../layerpanel",
            			autoScroll: true,
            			width: 200
            		}, {
            			title: this.Title_GeoGit,
            			ref: "../../repopanel",
            			autoScroll: true,
            			width: 200
            		}]
            	}, {
            		ref: "../attributespanel",
            		layout: "vbox",
            		autoScroll: true,
            		width: 200,
            		flex: 0.50,
                    listeners: {
                        'resize': function(win, width, height) {
                            // this is to keep the panel the same size as the window if it resizes
                            win.width = width;
                            if(win.items !== undefined && win.items.items[0] !== undefined) {
                                win.items.items[0].width = width;
                            }
                        }
                    }
            	}],
            	listeners: {
            	    'resize': function(win, width, height) {
                        // this is to keep the panels the same size as the window if it resizes
                        win.items.items[0].width = width;
                        win.items.items[1].setWidth(width);
                    }
            	}
            },{
            	ref: "southPanel",
            	xtype: "panel",
            	layout: "fit",
            	region: "south",
            	collapsible: true,
            	hidden: true,
            	border: "false",
            	split: true,
            	minSize: 150,
            	maxSize: 500,
            	height: 200
            }],
            bbar: {id: "mybbar"}
        });
        if (config.portalItems) {
            this.portalConfig.items = this.portalConfig.items.concat(config.portalItems);
        }
        var tools = [];
        if (config.tools) {
            tools = tools.concat(config.tools);
        }
        if(!config.userprofilename) {
            config.userprofilename = config.username;
        } else {
            if(config.username) {
        	config.userprofilename = config.userprofilename + " (" + config.username + ")";
            }
        }
        tools.push({
            ptype: 'gn_xhrtrouble'
        }, {
            ptype: 'gn_save'
        }, {
            ptype: "gxp_layermanager",
            id: "layermanager",
            outputConfig: {
                id: "tree",
                border: false,
                tbar: [] // we will add buttons to "tree.bbar" later
            },
            outputTarget: "layerpanel"
        }, {
            ptype: "gn_layerinfo",
            actionTarget: ["tree.contextMenu"]
        }, {
        	ptype: "gxp_playback",
        	outputTarget: "map.tbar"
        }, {
        	ptype: "gxp_styler",
        	actionTarget: ["tree.tbar", "tree.contextMenu"],
        	rasterStyling: true
        }, {
        	ptype: "salamati_tools",
        	outputTarget: "map.tbar",
        	id: "salamati_tools"
        }, {
            ptype: "gxp_addlayers",
            actionTarget: "tree.tbar"
        }, {
            ptype: "gxp_removelayer",
            actionTarget: ["tree.tbar", "tree.contextMenu"]
        }, {
            ptype: "gxp_geogithistorybutton",
            actionTarget: "tree.contextMenu"
        }, {
            ptype: "app_settings",
            actionTarget: "tree.tbar"
        }, {
            ptype: "gxp_layermenubutton",
            actionTarget: "tree.tbar",
            layer_manager: "layermanager"
        }, {
        	ptype: "gxp_measure",
        	actionTarget: "map.tbar"
        }, {
            ptype: "gxp_zoomtoextent",
            actionTarget: "mymap.tbar"
        }, {
            ptype: "gxp_zoom",
            actionTarget: "mymap.tbar"
        }, {
            ptype: "gxp_navigationhistory",
            actionTarget: "mymap.tbar"
        }, {
        	ptype: "gxp_geogitrepoinfo",
        	id: "repo_info",
        	outputTarget: "repopanel",
            featureManager: "feature_manager",
            username: config.userprofilename,
            useremail: config.userprofileemail
        }, {
            ptype: "gxp_featuremanager",
            id: "feature_manager",
            paging: false,
            autoSetLayer: true
        },{
            ptype: "gxp_snappingagent",
            id: "snapping_agent",
            targets: []
        },{
            ptype: "gxp_featureeditor",
            featureManager: "feature_manager",
            id: "feature_editor",
            autoLoadFeature: true,
            snappingAgent: "snapping_agent",
            iconClsAdd: "salamati-icon-addfeature",
            iconClsEdit: "salamati-icon-getfeatureinfo",
            editFeatureActionTip: this.ActionTip_Edit,
            actionTarget: "toolsPanel",
            popupType: "gxp_featureeditpanel",
            outputConfig: {
                editorPluginConfig: {
                    ptype: "gxp_versionededitor",
                    /* assume we will proxy the geogit web api*/ 
                    url: "/geoserver/",
                    featureManager: "feature_manager",
                    newStyle: {fillColor: "#00FF00", strokeColor: "#00FF00"},
                    oldStyle: {fillColor: "#FF0000", strokeColor: "#FF0000"}
                }
            },
            outputTarget: "attributespanel"
        },{
        	ptype: "gxp_geogithistory",
        	id: "geogithistory",
        	featureManager: "feature_manager",
        	outputTarget: "southPanel"
        },{
        	ptype: "gxp_diffpanel",
        	id: "diffpanel",
        	outputTarget: "westpanel",
        	newStyle: {fillColor: "#00FF00", fillOpacity: 0.1, strokeColor: "#00FF00", strokeWidth: 5},
            oldStyle: {fillColor: "#FF0000", fillOpacity: 0.1, strokeColor: "#FF0000", strokeWidth: 5},
            modifiedStyle: {fillColor: "#FFFF00", fillOpacity: 0.1, strokeColor: "#FFFF00", strokeWidth: 5},
            conflictStyle: {fillColor: "#FFA500", fillOpacity: 0.1, strokeColor: "#FFA500", strokeWidth: 5}
        },{
            ptype: "gxp_geogitattributegrid",
            id: "attribute_grid",
            outputTarget: "featureDiffPanel",
            newStyle: {fillColor: "#00FF00", fillOpacity: 0.1, strokeColor: "#00FF00", strokeWidth: 5},
            oldStyle: {fillColor: "#FF0000", fillOpacity: 0.1, strokeColor: "#FF0000", strokeWidth: 5},
            modifiedStyle: {fillColor: "#FFFF00", fillOpacity: 0.1, strokeColor: "#FFFF00", strokeWidth: 5},
            conflictStyle: {fillColor: "#FFA500", fillOpacity: 0.1, strokeColor: "#FFA500", strokeWidth: 5},
            ourStyle: {fillColor: "#0000FF", fillOpacity: 0.1, strokeColor: "#0000FF", strokeWidth: 5},
            theirStyle: {fillColor: "#FF00FF", fillOpacity: 0.1, strokeColor: "#FF00FF", strokeWidth: 5}
        },/*{
            ptype: "app_distancebearing",
            actionTarget: "toolsPanel",
            toggleGroup: "distanceBearing",
            baseUrl: "http://192.168.10.125/",
            wpsType: "generic",
            infoActionTip: this.ActionTip_Default,
           // iconCls: "gxp-icon-distance-bearing-generic"
            iconCls: "gxp-icon-distance-bearing"
        },*/ {
            actions: ['->']
        }, {
            ptype: 'gn_savehyperlink'
        }/*, {
            ptype: "app_distancebearing",
            actionTarget: "toolsPanel",
            toggleGroup: "distanceBearing",
            wpsType: "pointhospitals",
            baseUrl: "http://192.168.10.125/",
            infoActionTip: this.ActionTip_Default,
           // iconCls: "gxp-icon-distance-bearing-hospitals"
            iconCls: "gxp-icon-dbhospitals"
        }, {
            ptype: "app_distancebearing",
            actionTarget: "toolsPanel",
            toggleGroup: "distanceBearing",
            wpsType: "pointhazzards",
            baseUrl: "http://192.168.10.125/",
            infoActionTip: this.ActionTip_Default,
            //iconCls: "gxp-icon-distance-bearing-schools"
            iconCls: "gxp-icon-dbhazzards"
        }*/);
        config.tools = tools;
        salamati.Viewer.superclass.constructor.apply(this, [config]);
    }
});

//var app;
//var baseUrl = "http://192.168.10.125/";

var WGS84;
var GoogleMercator;

var nameIndex;
var snappingAgent;

var toolWindowSavedPosition = null;

//the tool dock
var toolContainer = new Ext.Container({
    xtype: "container",
    id: "toolcont",
    hidden: true,
    cls: "toolContainer"
});

var win = null;

var showSpinner = function(conn, options){
	console.log("showspinner");
};

var hideSpinner = function(conn, response, options){
	console.log("hidespinner");
};

var zoomToPlace = function(lon, lat, left, bottom, right, top){
	var bounds = new OpenLayers.Bounds([left, bottom, right, top]);
	
	bounds.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
	console.log("zoomtobounds: ", bounds);
	app.mapPanel.map.zoomToExtent(bounds);
	
//	var lonlat = new OpenLayers.LonLat(lon, lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
//	app.mapPanel.map.panTo(lonlat);
	
	while(app.mapPanel.map.getZoom() > 17){
		app.mapPanel.map.zoomOut();
	}
};

var submitSearch = function(params){
	var urlParams = {
		format: 'json',
		q: params,
		callback: 'JSON_CALLBACK'
	};
	
	nominatimUrl = '';
	
	var slash = '';
	console.log('last char: ' + nominatimUrl.charAt(nominatimUrl.length - 1));
	
	if(nominatimUrl.charAt(nominatimUrl.length - 1) != '/'){
		slash = '/';
	}
		
	var searchUrl = nominatimUrl + slash + 'search.php';
	
	/*var spinnerHTML = '<p id="searchSpinner">Please wait while we search.</p>';
	
	var searchPanel = Ext.get("searchPanel");
	searchPanel.createChild(spinnerHTML);*/
	
	$.ajax({
		url: searchUrl,
		data: urlParams,
		success: function(results){
			/*var oldResults = document.getElementsByClassName('searchResults');
			
			if(oldResults.length){
				oldResults[0].parentNode.removeChild(oldResults[0]);
			}
			
			var spinner = document.getElementById("searchSpinner");
			spinner.parentNode.removeChild(spinner);*/
			console.log('results', results);
			app.NominatimStore.loadData(results, false);
			/*if(results && results.length){
				var resultsHTML = '<div class="searchResults">';
				
				for(var i = 0; i < results.length; i++){
					console.log(results[i]);
					resultsHTML += '<div class="searchResult" ' + 
										'onclick="zoomToPlace(' + results[i].lon + ', ' +
										results[i].lat + ', ' + results[i].boundingbox[2] +
										', ' + results[i].boundingbox[0] + ', ' +
										results[i].boundingbox[3] + ', ' +
										results[i].boundingbox[1] + ')">' +
										'<span class="searchResultPlaceName">' +
											
											results[i].display_name + '</span>' +
									'</div>';
				}
				
				resultsHTML += '</div>';
				
				var searchPanel = Ext.get("searchPanel");
				searchPanel.createChild(resultsHTML);
			}*/
		},
		error: function(error){
			console.log("error", error);
			/*var oldResults = document.getElementsByClassName('searchResults');
			
			if(oldResults.length){
				oldResults[0].parentNode.removeChild(oldResults[0]);
			}
			
			var spinner = document.getElementById("searchSpinner");
			spinner.parentNode.removeChild(spinner);
			
			var errorHTML = '<div class="searchResults">' +
								'<span class="searchResultsError">Error sending request</span>' +
								'<span class="searchResultsError">Check that your url is valid</span>' +
								'<span class="searchResultsError">ex. http://nominatim.openstreetmap.org</span>' +
							'</div>';
			
			var searchPanel = Ext.get("searchPanel");
			searchPanel.createChild(errorHTML);*/
		}
	});
};

var searchField = new Ext.form.TextField({
    xtype: "textfield",
    id: "searchField",
 //   cls: "searchFieldClass",
    height: "40",
    width: "93%",
    emptyText: "Search",
    enableKeyEvents: true,
    listeners: {
   	 'keyup' : function(element, event){
   		 if(event.button == 12){
   			 submitSearch(element.getValue());
   		 }
   	 }
    }
});

Ext.onReady(function() {
	
	WGS84 = new OpenLayers.Projection("EPSG:4326");
	GoogleMercator = new OpenLayers.Projection("EPSG:900913");
	

	
    // load language setting from cookie if available
	var lang = "en";
	if (document.cookie.length > 0) {
		var cookieStart = document.cookie.indexOf("language=");
		
		if (cookieStart != -1) {
			cookieStart += "language".length + 1;
			cookieEnd = document.cookie.indexOf(";", cookieStart);
			
			if (cookieEnd == -1) {
				cookieEnd = document.cookie.length;
			}

			var lang2 = document.cookie.substring(cookieStart, cookieEnd);
			
			if (lang2) {
				lang = lang2;
			}
			console.log("---- App.onReady language setting found: ", lang);
		}
	}
	GeoExt.Lang.set(lang);
	
	win = new Ext.Window({
    	title: salamati.Viewer.prototype.Title_Tools,
    	id: "toolsWindow",
    	closeAction: "hide",
    	xtype: "window",
    	resizable: false,
    	layout: "fit",
    	items: [
        	{
            	xtype: "panel",
            	id: "toolsPanel",
            	cls: "mytoolwindowclass",
            	layout: "hbox",
            	layoutConfig: {
                	align: 'center',
                	padding: '5'
            	}
        	}
    	],
		listeners : {
			"beforehide" : function(element) {
				//toolContainer.show();
			},
			"hide" : function(element) {
				document.cookie = "toolsWindowShow=false";
			},
			"show" : function(element) {
				document.cookie = "toolsWindowShow=true";
			},
			"move" : function(element) {
				document.cookie = "toolsWindowXY=" + element.x + "|" + element.y;
			}
		}
	});
});

// mixin
Ext.override(salamati.Viewer, GeoNode.ComposerMixin);
