/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 * @requires GeoGitUtil.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = GeoGitFeatureAttributeGrid
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: GeoGitFeatureAttributeGrid(config)
 *
 *    Plugin for displaying GeoGit Feature Attributes in a grid. Requires a
 *    :class:`gxp.plugins.Tool`.
 */ 

gxp.plugins.GeoGitFeatureAttributeGrid = Ext.extend(gxp.plugins.Tool, {
    /** api: ptype = gxp_geogitattributegrid */
    ptype: "gxp_geogitattributegrid",
    
    store: null,
    
    grid: null,
    
    valueIndex: null,
    
    /* i18n */
    Text_Name: "Name",
    Text_Value: "Value",
    Text_ButtonTooltip: "Resolve conflict using this version of the feature.",
    Text_CheckoutError: "Something went wrong with checkout",
    Text_AddError: "Something went wrong with add",
    Text_RemoveError: "Something went wrong with remove",
    Text_FeatureDiff: "Feature Diff",
    Text_NoCrs: "This feature didn't have a CRS associated with it, layer results may not be accurate.",
    /* end i18n */
    
    oldGeomLayer: null,
    mergeGeomLayer: null,
    currentGeomLayer: null,
    
    newStyle: null,
    
    oldStyle: null,
    
    modifiedStyle: null,
    
    conflictStyle: null,
    
    ourStyle: null,
    
    theirStyle: null,
    
    url: null,
    
    fid: null,
    
    transactionId: null,
    
    theirsRemoved: false,
    
    oursRemoved: false,
    
    constructor: function() {
        this.addEvents(
            /** api: event[getattributeinfo]
             *  Fired when a feature from the diff is zoomed in on.
             *
             *  Listener arguments:
             *  * store - :class:`Ext.data.Store` The data to be displayed in the diff panel.
             *  * oldCommitId - ``String`` The old commit id to use for the diff.
             *  * newCommitId - ``String`` The new commit id to use for the diff.
             *  * path - ``String`` The path to the feature
             *  
             */
            "getattributeinfo",
            "showCurrentGeometry",
            "showOldGeometry",
            "showMergeGeometry"
        );
        this.on({
            getattributeinfo: function(store, oldCommitId, newCommitId, path, layerProjection) { 
                if(this.grid.view) {
                    this.store.clearData();
                    this.grid.view.refresh();
                }
                this.clearLayers();
                var index = store.url.indexOf('diff?');
                var url = store.url.substring(0, index) + "featurediff?all=true&oldCommitId=" + oldCommitId + "&newCommitId="+ newCommitId + "&path=" + path + "&output_format=JSON";
                this.store.url = url;
                this.store.proxy.conn.url = url;
                this.store.proxy.url = url;
                this.store.load({callback: function() {this.addGeometryLayers(this.store, layerProjection);}, scope: this});
                app.portal.doLayout();
            },
            showOldGeometry: function() {
                if(this.oldGeomLayer) {
                    var layer = app.mapPanel.map.getLayer(this.oldGeomLayer.id);
                    if(layer != null) {
                        app.mapPanel.map.removeLayer(layer);
                    } else {
                        app.mapPanel.map.addLayer(this.oldGeomLayer);
                        app.mapPanel.map.zoomToExtent(this.oldGeomLayer.getDataExtent());
                        if(app.mapPanel.map.zoom > 18) {
                            app.mapPanel.map.zoomTo(18, app.mapPanel.map.center);
                        }
                    }                    
                }
            },
            showMergeGeometry: function() {
                if(this.mergeGeomLayer) {
                    var layer = app.mapPanel.map.getLayer(this.mergeGeomLayer.id);
                    if(layer != null) {
                        app.mapPanel.map.removeLayer(layer);
                    } else {
                        if(this.mergeGeomLayer.features.length > 0) {
                            app.mapPanel.map.addLayer(this.mergeGeomLayer);
                            app.mapPanel.map.zoomToExtent(this.mergeGeomLayer.getDataExtent());
                            if(app.mapPanel.map.zoom > 18) {
                                app.mapPanel.map.zoomTo(18, app.mapPanel.map.center);
                            }
                        }
                    }
                }
            },
            showCurrentGeometry: function() {
                if(this.currentGeomLayer) {
                    var layer = app.mapPanel.map.getLayer(this.currentGeomLayer.id);
                    if(layer != null) {
                        app.mapPanel.map.removeLayer(layer);
                    } else {
                        app.mapPanel.map.addLayer(this.currentGeomLayer);
                        app.mapPanel.map.zoomToExtent(this.currentGeomLayer.getDataExtent());
                        if(app.mapPanel.map.zoom > 18) {
                            app.mapPanel.map.zoomTo(18, app.mapPanel.map.center);
                        }
                    }
                }
            },
            getmergeinfo: function(store, oldCommitId, newCommitId, ancestorCommitId, data, transactionId) {
                if(this.grid.view) {
                    this.store.clearData();
                    this.grid.view.refresh();
                }
                var plugin = this;
                plugin.clearLayers();
                index = store.url.indexOf('merge?');
                if(data.change === "CONFLICT") {
                    if(data.ourvalue === gxp.GeoGitUtil.objectIdNull) {
                        plugin.oursRemoved = true;
                    } else if(data.theirvalue === gxp.GeoGitUtil.objectIdNull) {
                        plugin.theirsRemoved = true;
                    }
                    this.grid.buttons[0].show();
                    this.grid.buttons[1].show();
                } else {
                    this.grid.buttons[0].hide();
                    this.grid.buttons[1].hide();
                }
                if(index === -1) {
                    plugin.url = store.url;
                } else {
                    plugin.url = store.url.substring(0, index);
                }                
                plugin.fid = data.fid;
                plugin.transactionId = transactionId;
                OpenLayers.Request.GET({
                    url: plugin.url + "featurediff?all=true&oldCommitId=" + ancestorCommitId + "&newCommitId="+ newCommitId + "&path=" + data.fid + "&transactionId=" + transactionId + "&output_format=JSON",
                    success: function(results){
                        var theirInfo = Ext.decode(results.responseText);
                        OpenLayers.Request.GET({
                            url: plugin.url + "featurediff?all=true&oldCommitId=" + ancestorCommitId + "&newCommitId="+ oldCommitId + "&path=" + data.fid + "&transactionId=" + transactionId + "&output_format=JSON",
                            success: function(results){
                                var ourInfo = Ext.decode(results.responseText);
                                var array = [];
                                for(var index = 0; index < theirInfo.response.diff.length; index++) {
                                    var ourvalue;
                                    var theirvalue;
                                    var ourchangetype;
                                    if(data.change === "ADDED"){
                                        ourvalue = "";
                                        ourchangetype = "NO_CHANGE";
                                    } else if(ourInfo.response.diff[index].changetype === "NO_CHANGE" || ourInfo.response.diff[index].changetype === "REMOVED"){
                                        ourvalue = ourInfo.response.diff[index].oldvalue;
                                        ourchangetype = ourInfo.response.diff[index].changetype;
                                    } else {
                                        ourvalue = ourInfo.response.diff[index].newvalue;
                                        ourchangetype = ourInfo.response.diff[index].changetype;
                                    }
                                    if(theirInfo.response.diff[index].changetype === "NO_CHANGE" || theirInfo.response.diff[index].changetype === "REMOVED"){
                                        theirvalue = theirInfo.response.diff[index].oldvalue;
                                    } else {
                                        theirvalue = theirInfo.response.diff[index].newvalue;
                                    }
                                    array[index] = [
                                            theirInfo.response.diff[index].attributename,
                                            ourchangetype,
                                            ourvalue,
                                            theirInfo.response.diff[index].changetype,
                                            theirvalue
                                            ]
                                }
                                var arrayStore = new Ext.data.ArrayStore({
                                    idIndex: 0,  
                                    fields: [
                                       'name',
                                       'ourchangetype',
                                       'ourvalue',
                                       'theirchangetype',
                                       'theirvalue'
                                    ]
                                });
                                arrayStore.loadData(array);
                                var recordIndex = store.findExact('fid', data.fid);
                                plugin.addGeometryLayers(arrayStore, data.crs, true, store.getAt(recordIndex));
                                plugin.grid.reconfigure(arrayStore, plugin.grid.getColumnModel());
                            },
                            failure: this.errorFetching
                        });
                    },
                    failure: this.errorFetching
                });
            },
            beginMerge: function(store, transactionId, ours, theirs) {
                this.grid.buttons[0].setText(ours);
                this.grid.buttons[1].setText(theirs);
                this.grid.getColumnModel().setColumnHeader(1,ours);
                this.grid.getColumnModel().columns[1].dataIndex = "ourvalue";
                this.grid.getColumnModel().setHidden(2,false);
                this.grid.getColumnModel().setColumnHeader(3,theirs);
                this.grid.getColumnModel().columns[3].dataIndex = "theirvalue";
                this.grid.view.refresh();
                this.clearLayers();
            },
            endMerge: function() {
                this.grid.buttons[0].hide();
                this.grid.buttons[1].hide();
                this.grid.getColumnModel().setColumnHeader(1,app.Title_Old);
                this.grid.getColumnModel().columns[1].dataIndex = "oldvalue";
                this.grid.getColumnModel().setHidden(2,true);
                this.grid.getColumnModel().setColumnHeader(3,app.Title_New);
                this.grid.getColumnModel().columns[3].dataIndex = "newvalue";
                this.grid.reconfigure(this.store, this.grid.getColumnModel());
                this.grid.view.refresh();
                this.clearLayers();
            },
            scope: this
        });
        gxp.plugins.GeoGitFeatureAttributeGrid.superclass.constructor.apply(this, arguments);
    },
    
    addOutput: function(config) {
        
        var url = "default";
        this.store = new Ext.data.Store({
            url: url,
            reader: gxp.GeoGitUtil.featureDiffReader,
            autoLoad: false
        });
        
        var plugin = this;
        
        this.grid = new Ext.grid.GridPanel({
            store: this.store,
            cls: 'gxp-grid-font-cls gxp-grid-hd-font-cls',
            columnLines: true,
            flex: 1.0,
            colModel: new Ext.grid.ColumnModel({
                defaults: {
                    sortable: false
                },
                columns: [{
                    id: 'name',
                    header: plugin.Text_Name,
                    dataIndex: 'name'
                },{
                    id: 'leftvalue',
                    header: app.Title_Old,
                    dataIndex: "oldvalue",
                    renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                        if(record.data.change !== undefined) {
                            metaData.css = plugin.determineCellCss(record.data.change);
                        } else {
                            metaData.css = plugin.determineCellCss(record.data.ourchangetype);
                        }
                        return value;                   
                    }
                },{
                    id: 'mergevalue',
                    header: app.Title_Merged,
                    dataIndex: "theirvalue",
                    hidden: true,
                    renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                        if(record.data.ourchangetype !== "NO_CHANGE") {
                            if(record.data.theirchangetype === "NO_CHANGE") {
                                metaData.css = plugin.determineCellCss(record.data.ourchangetype);
                                if(record.data.ourchangetype === "REMOVED") {
                                    value = null;
                                } else {
                                    value = record.data.ourvalue;
                                }                                
                            } else {
                                metaData.css = 'gxp-conflicted-cls';
                                value = null;
                            }
                        } else {
                            metaData.css = plugin.determineCellCss(record.data.theirchangetype);
                            if(record.data.theirchangetype === "REMOVED") {
                                value = null;
                            }
                        }
                        return value;                   
                    }
                },{
                    id: 'rightvalue',
                    header: app.Title_New,
                    dataIndex: "newvalue",
                    renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                        if(record.data.change !== undefined) {
                            if(record.data.change === "NO_CHANGE") {
                                value = record.data.oldvalue;                            
                            }
                            metaData.css = plugin.determineCellCss(record.data.change);
                        } else {
                            metaData.css = plugin.determineCellCss(record.data.theirchangetype);
                        }
                        return value;                   
                    }
                }]
            }),
            viewConfig: {
                forceFit: true,
                getRowClass : function(record, index, rowParams, store) {
                    var name = gxp.GeoGitUtil.getGeometryAttributeName();
                    if (name === record.get("name")) {
                        return "x-hide-nosize";
                    }
                }
            },
            buttons: [
                {
                    xtype: 'button',
                    text: "ours",
                    hidden: true,
                    tooltip:plugin.Text_ButtonTooltip,
                    handler: function() {
                        if(!plugin.oursRemoved) {
                            OpenLayers.Request.GET({
                                url: plugin.url + 'checkout?transactionId=' + plugin.transactionId + '&path=' + plugin.fid + '&ours=true&output_format=JSON',
                                success: function(results){
                                    var checkoutInfo = Ext.decode(results.responseText);
                                    if(checkoutInfo.response.error) {
                                        alert(plugin.Text_CheckoutError);
                                    } else {
                                        OpenLayers.Request.GET({
                                            url: plugin.url + 'add?transactionId=' + plugin.transactionId + '&path=' + plugin.fid + '&output_format=JSON',
                                            success: function(results){
                                                var addInfo = Ext.decode(results.responseText);
                                                if(addInfo.response.error) {
                                                    alert(plugin.Text_AddError);
                                                } else {
                                                    app.fireEvent("conflictResolved", plugin.fid);
                                                    plugin.grid.buttons[0].hide();
                                                    plugin.grid.buttons[1].hide();
                                                }
                                            },
                                            failure: plugin.errorFetching
                                        }); 
                                    }
                                },
                                failure: plugin.errorFetching
                            });  
                        } else {
                            OpenLayers.Request.GET({
                                url: plugin.url + 'remove?transactionId=' + plugin.transactionId + '&path=' + plugin.fid + '&output_format=JSON',
                                success: function(results){
                                    var removeInfo = Ext.decode(results.responseText);
                                    if(removeInfo.response.error) {
                                        alert(plugin.Text_RemoveError);
                                    } else {
                                        app.fireEvent("conflictResolved", plugin.fid);
                                        plugin.grid.buttons[0].hide();
                                        plugin.grid.buttons[1].hide();
                                    }
                                },
                                failure: plugin.errorFetching
                            }); 
                        }
                    }
                },{
                    xtype: 'button',
                    text: "theirs",     
                    hidden: true,
                    tooltip: plugin.Text_ButtonTooltip,
                    handler: function() {
                        if(!plugin.theirsRemoved) {
                            OpenLayers.Request.GET({
                                url: plugin.url + 'checkout?transactionId=' + plugin.transactionId + '&path=' + plugin.fid + '&theirs=true&output_format=JSON',
                                success: function(results){
                                    var checkoutInfo = Ext.decode(results.responseText);
                                    if(checkoutInfo.response.error) {
                                        alert(plugin.Text_CheckoutError);
                                    } else {
                                        OpenLayers.Request.GET({
                                            url: plugin.url + 'add?transactionId=' + plugin.transactionId + '&path=' + plugin.fid + '&output_format=JSON',
                                            success: function(results){
                                                var addInfo = Ext.decode(results.responseText);
                                                if(addInfo.response.error) {
                                                    alert(plugin.Text_AddError);
                                                } else {
                                                    app.fireEvent("conflictResolved", plugin.fid);
                                                    plugin.grid.buttons[0].hide();
                                                    plugin.grid.buttons[1].hide();
                                                }
                                            },
                                            failure: plugin.errorFetching
                                        }); 
                                    }
                                },
                                failure: plugin.errorFetching
                            }); 
                        } else {
                            OpenLayers.Request.GET({
                                url: plugin.url + 'remove?transactionId=' + plugin.transactionId + '&path=' + plugin.fid + '&output_format=JSON',
                                success: function(results){
                                    var removeInfo = Ext.decode(results.responseText);
                                    if(removeInfo.response.error) {
                                        alert(plugin.Text_RemoveError);
                                    } else {
                                        app.fireEvent("conflictResolved", plugin.fid);
                                        plugin.grid.buttons[0].hide();
                                        plugin.grid.buttons[1].hide();
                                    }
                                },
                                failure: plugin.errorFetching
                            }); 
                        }
                    }
                }
                ]
        });
        
        config = Ext.apply(this.grid, config || {});
        
        var geogitFeatureAttributeGrid = gxp.plugins.GeoGitFeatureAttributeGrid.superclass.addOutput.call(this, config);
        
        return geogitFeatureAttributeGrid;  
    },
    
    errorFetching: function(){
        throw "GeoGitFeatureAttributeGrid: Error fetching info";
    },
    
    determineCellCss: function(changeType) {
        if(changeType === "ADDED") {
            return 'gxp-added-cls';
        } else if(changeType === "REMOVED") {
            return 'gxp-removed-cls';
        } else if(changeType === "MODIFIED") {
            return 'gxp-modified-cls';
        }
    },
    
    addGeometryLayers: function(geomStore, layerProjection, merge, featureInfo) {
        if(layerProjection === null || layerProjection === undefined || layerProjection === "") {
            var plugin = this;
            Ext.Msg.show({
                title: plugin.Text_FeatureDiff,
                msg: plugin.Text_NoCrs,
                buttons: Ext.Msg.OK,
                scope: plugin,
                icon: Ext.MessageBox.WARNING,
                animEl: plugin.grid.ownerCt.getEl()
            });
        }
        var name = gxp.GeoGitUtil.getGeometryAttributeName();
        var geomDiff = null;
        var map = app.mapPanel.map;
        for(storeIndex = 0; storeIndex < geomStore.data.items.length; storeIndex++) {
            if(name === geomStore.data.items[storeIndex].data.name) {
                geomDiff = geomStore.data.items[storeIndex].data;
            }
        }

        if(geomDiff) {
            var oldGeomText = merge === true ? geomDiff.ourvalue : geomDiff.oldvalue;
            var newGeomText = merge === true ? geomDiff.theirvalue : geomDiff.newvalue;
            var bounds = null;
            if(geomDiff.change === "NO_CHANGE") {
                newGeomText = oldGeomText;
                //should add something to indicate to the user that there was no change
            }
            
            if(oldGeomText) {
                var oldGeometry = OpenLayers.Geometry.fromWKT(oldGeomText);
                if(layerProjection) {
                    var newProj = new OpenLayers.Projection(layerProjection);
                    oldGeometry.transform(newProj, GoogleMercator);
                }
                var oldFeature = new OpenLayers.Feature.Vector(oldGeometry);
                bounds = oldGeometry.getBounds();
                if(this.oldGeomLayer === null) {
                    this.oldGeomLayer = new OpenLayers.Layer.Vector("old_Geometry");
                } else {
                    this.oldGeomLayer.removeAllFeatures();
                }
                var styleType;
                if(merge) {
                    styleType = this.ourStyle;
                } else {
                    styleType = geomDiff.change === "REMOVED" ? this.oldStyle : geomDiff.change === "ADDED" ? this.newStyle : this.modifiedStyle;
                }
                var style = OpenLayers.Util.applyDefaults(styleType,
                        OpenLayers.Feature.Vector.style['default']);
                oldFeature.style = style;                
                this.oldGeomLayer.addFeatures(oldFeature);
            } else {
                this.oldGeomLayer = null;
            }
            if(newGeomText) {
                var newGeometry = OpenLayers.Geometry.fromWKT(newGeomText);
                if(layerProjection) {
                    var newProj = new OpenLayers.Projection(layerProjection);
                    newGeometry.transform(newProj, GoogleMercator);
                }
                var newFeature = new OpenLayers.Feature.Vector(newGeometry);
                bounds = newGeometry.getBounds();
                if(this.currentGeomLayer === null) {
                    this.currentGeomLayer = new OpenLayers.Layer.Vector("new_Geometry");
                } else {
                    this.currentGeomLayer.removeAllFeatures();
                }
                var styleType;
                if(merge) {
                    styleType = this.theirStyle;
                } else {
                    styleType = geomDiff.change === "REMOVED" ? this.oldStyle : geomDiff.change === "ADDED" ? this.newStyle : this.modifiedStyle;
                }
                var style = OpenLayers.Util.applyDefaults(styleType,
                        OpenLayers.Feature.Vector.style['default']);
                newFeature.style = style;               
                this.currentGeomLayer.addFeatures(newFeature);
            } else {
                this.currentGeomLayer = null;
            }
            if(merge) {
                if(featureInfo.data.change !== "REMOVED") {
                    var mergeGeomText = featureInfo.data.geometry;
                    var mergeGeometry = OpenLayers.Geometry.fromWKT(mergeGeomText);
                    if(layerProjection) {
                        var newProj = new OpenLayers.Projection(layerProjection);
                        mergeGeometry.transform(newProj, GoogleMercator);
                    }
                    var mergeFeature = new OpenLayers.Feature.Vector(mergeGeometry);
                    bounds = mergeGeometry.getBounds();
                    if(this.mergeGeomLayer === null) {
                        this.mergeGeomLayer = new OpenLayers.Layer.Vector("merge_Geometry");
                    } else {
                        this.mergeGeomLayer.removeAllFeatures();
                    }
                    var styleType;
                    if(featureInfo.data.change === "CONFLICT") {
                        if(geomDiff.ourchangetype !== "NO_CHANGE" && geomDiff.theirchangetype !== "NO_CHANGE") {
                            styleType = this.conflictStyle;
                        } else {
                            styleType = this.newStyle;
                        }
                    } else {
                        styleType = this.newStyle;
                    }
                    var style = OpenLayers.Util.applyDefaults(styleType,
                            OpenLayers.Feature.Vector.style['default']);
                    mergeFeature.style = style;                    
                    this.mergeGeomLayer.addFeatures(mergeFeature);
                } else {
                    if(this.mergeGeomLayer) {
                        this.mergeGeomLayer.removeAllFeatures();
                    }
                }                
            }
            map.zoomToExtent(bounds);
            //TODO: rather than clamping to a hard-coded zoom level, it should clamp to a scale
            if(map.zoom > 18) {
                map.zoomTo(18, map.center);
            }
        }
    },
    
    clearLayers: function() {
        if(this.currentGeomLayer) {
            var layer = app.mapPanel.map.getLayer(this.currentGeomLayer.id);
            if(layer != null) {
                app.mapPanel.map.removeLayer(layer);
            }
        }
        if(this.mergeGeomLayer) {
            var layer = app.mapPanel.map.getLayer(this.mergeGeomLayer.id);
            if(layer != null) {
                app.mapPanel.map.removeLayer(layer);
            }
        }
        if(this.oldGeomLayer) {
            var layer = app.mapPanel.map.getLayer(this.oldGeomLayer.id);
            if(layer != null) {
                app.mapPanel.map.removeLayer(layer);
            }
        }
    }
});

Ext.preg(gxp.plugins.GeoGitFeatureAttributeGrid.prototype.ptype, gxp.plugins.GeoGitFeatureAttributeGrid);