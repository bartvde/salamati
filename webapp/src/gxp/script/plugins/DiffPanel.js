/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires GeoGitUtil.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = DiffPanel
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: DiffPanel(config)
 *
 *    Plugin for displaying GeoGit History in a grid. Requires a
 *    :class:`gxp.plugins.Tool`.
 */   
gxp.plugins.DiffPanel = Ext.extend(gxp.plugins.Tool, {
    /** api: ptype = gxp_diffpanel */
    ptype: "gxp_diffpanel",
    
    /*i18n*/
    Title_Fid: "fid",
    Title_Change: "Change",
    Title_Conflict: "Conflict",
    Text_Zoom: "Zoom To Extent",
    Text_ConflictPopup: "Conflicts have been detected as a result of this merge. Before you can complete this merge these conflicts must be resolved. Press the cancel button in the GeoGit panel to abort the merge.",
    Text_Diff: "Diff",
    Text_MoreDiffs: "There were more features changed inbetween these commits. To see more scroll down to the bottom of the diff panel.",
    Text_NoCrs: " features didn't have a CRS associated with them, diff layer results may not be accurate.",
    /*end i18n*/
    
    /**
     * Ext.data.Store
     */
    diffStore: null,
    
    mergeStore: null,
    
    /**
     * Ext.grid.GridPanel
     */
    grid: null,
    
    oldCommitId: null,
    
    newCommitId: null,
    
    ancestorCommitId: null,
    
    diffLayer: null,
    
    newStyle: null,
    
    oldStyle: null,
    
    modifiedStyle: null,
    
    conflictStyle: null,
    
    merge: false,
    
    transactionId: null,
    
    pageNumber: 0,
    
    nextPage: false,
    
    layerProjection: null,
    
    zoomButton: null,
    
    constructor: function() {
        this.addEvents(
            /** api: event[commitdiffselected]
             *  Fired when the diff button from the GeoGitHistory plugin is pressed.
             *
             *  Listener arguments:
             *  * store - :class:`Ext.data.Store` The data to be displayed in the diff panel.
             *  * oldCommitId - ``String`` The old commit id to use for the diff.
             *  * newCommitId - ``String`` The new commit id to use for the diff.
             */
            "commitdiffselected"
        );
        this.on({
            commitdiffselected: function(store, oldCommitId, newCommitId, layerProjection) {          
                if(this.grid.view) {
                    this.diffStore.clearData();
                    this.grid.view.refresh();
                }
                this.pageNumber = 0;
                this.diffStore.url = store.url;
                this.diffStore.proxy.conn.url = store.url;
                this.diffStore.proxy.url = store.url;
                this.layerProjection = layerProjection;
                var plugin = this;
                this.diffStore.load({
                    callback: function() {
                        if(plugin.diffStore.reader.jsonData.response.nextPage) {
                            Ext.Msg.show({
                                title: plugin.Text_Diff,
                                msg: plugin.Text_MoreDiffs,
                                buttons: Ext.Msg.OK,
                                scope: this,
                                icon: Ext.MessageBox.INFO,
                                animEl: this.grid.ownerCt.getEl()
                            });
                            plugin.nextPage = true;
                        } else {
                            plugin.nextPage = false;
                        }
                        plugin.addDiffLayer(layerProjection);
                    },
                    scope: this
                });
                this.oldCommitId = oldCommitId;
                this.newCommitId = newCommitId;
                app.portal.doLayout();
            },
            beginMerge: function(store, transactionId, load) {
                this.mergeStore.clearData();
                this.diffStore.clearData();
                this.pageNumber = 0;
                this.nextPage = false;                
                this.merge = true;
                this.transactionId = transactionId;
                var plugin = this;
                if(load === true) {
                    this.grid.reconfigure(this.mergeStore, this.grid.getColumnModel());
                    this.mergeStore.url = store.url;
                    this.mergeStore.proxy.conn.url = store.url;
                    this.mergeStore.proxy.url = store.url;               
                    this.mergeStore.load({
                        callback: function() {
                            var mergeData = this.mergeStore.reader.jsonData.response.Merge;
                            this.oldCommitId = mergeData.ours;
                            this.newCommitId = mergeData.theirs;
                            this.ancestorCommitId = mergeData.ancestor;
                            if(mergeData.conflicts !== undefined) {
                                Ext.Msg.show({
                                    title: plugin.Title_Conflict,
                                    msg: plugin.Text_ConflictPopup,
                                    buttons: Ext.Msg.OK,
                                    fn: function(button) {
                                        plugin.addDiffLayer();
                                        app.fireEvent("conflictsDetected", mergeData.conflicts);
                                    },
                                    scope: plugin,
                                    icon: Ext.MessageBox.WARNING,
                                    animEl: plugin.grid.ownerCt.getEl()
                                });
                            } else {
                                plugin.addDiffLayer();
                            }                        
                        },
                        scope: this
                    });           
                } else {
                    this.mergeStore = store;
                    this.grid.reconfigure(this.mergeStore, this.grid.getColumnModel());
                    var mergeData = this.mergeStore.reader.jsonData.response.Merge;
                    this.oldCommitId = mergeData.ours;
                    this.newCommitId = mergeData.theirs;
                    this.ancestorCommitId = mergeData.ancestor;
                    if(mergeData.conflicts !== undefined) {
                        Ext.Msg.show({
                            title: plugin.Title_Conflict,
                            msg: plugin.Text_ConflictPopup,
                            buttons: Ext.Msg.OK,
                            fn: function(button) {
                                plugin.addDiffLayer();
                                app.fireEvent("conflictsDetected", mergeData.conflicts);
                            },
                            scope: plugin,
                            icon: Ext.MessageBox.WARNING,
                            animEl: plugin.grid.ownerCt.getEl()
                        });
                    } else {
                        plugin.addDiffLayer();
                    }    
                }
                app.portal.doLayout();         
            },
            endMerge: function() {
                if(this.diffLayer) {
                    var layer = app.mapPanel.map.getLayer(this.diffLayer.id);
                    if(layer != null) {
                        app.mapPanel.map.removeLayer(layer);
                    }
                }
                this.grid.reconfigure(this.diffStore, this.grid.getColumnModel());
                this.merge = false;
                this.transactionId = null;
            },
            conflictResolved: function(fid) {
                var recordIndex = this.mergeStore.findExact('fid', fid);
                this.mergeStore.data.items[recordIndex].data.change = "RESOLVED";
                this.grid.view.refresh();
            },
            scope: this
        });
        gxp.plugins.DiffPanel.superclass.constructor.apply(this, arguments);
    },
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {       
        var map = this.target.mapPanel.map;
        var url = "default";
        this.diffStore = new Ext.data.Store({
            url: url,
            reader: gxp.GeoGitUtil.diffReader,
            autoLoad: false
        });
        
        this.mergeStore = new Ext.data.Store({
            url: url,
            reader: gxp.GeoGitUtil.mergeReader,
            autoLoad: false
        })
        
        var addToolTip = function(value, metadata, record, rowIndex, colIndex, store){
            metadata.attr = 'title="' + value + '"';
            return value;
        };
        var plugin = this;
        
        this.zoomButton = new Ext.Button({
            xtype: 'button',
            text: plugin.Text_Zoom,
            disabled: true,
            handler: function() {
                if(diffPanel.getSelectionModel().hasSelection()) {
                    if(plugin.merge) {
                	app.fireEvent("getmergeinfo", plugin.mergeStore, plugin.oldCommitId, plugin.newCommitId, plugin.ancestorCommitId, diffPanel.getSelectionModel().getSelected().data, plugin.transactionId);
                    } else {
                	app.fireEvent("getattributeinfo", plugin.diffStore, plugin.oldCommitId, plugin.newCommitId, diffPanel.getSelectionModel().getSelected().data.fid, plugin.layerProjection);
                    }
                    diffPanel.contextMenu.hide();
                }
            },
            iconCls: 'gxp-icon-zoom-to'
        });
        this.grid = new Ext.grid.GridPanel({
            store: this.diffStore,
            cls: "gxp-grid-font-cls gxp-grid-hd-font-cls",
            border: false,
            columnLines: true,
            hideParent: false,
            flex: 1,
            tbar: [this.zoomButton],
            colModel: new Ext.grid.ColumnModel({
                defaults: {
                    sortable: true,
                    renderer: addToolTip
                },
                columns: [{
                    id: 'fid',
                    header: plugin.Title_Fid,
                    dataIndex: 'fid'
                },{
                    id: 'change',
                    header: plugin.Title_Change,
                    dataIndex: 'change'
                }]
            }),
            viewConfig: {
                forceFit: true,
                // took this stuff from http://www.sencha.com/learn/grid-faq/#Maintain_GridPanel_scroll_position_across_Store_reloads
                // to maintain scroll position as more commits are added to the grid store
                onLoad: Ext.emptyFn,
                listeners: {
                    beforerefresh: function(v) {
                       v.scrollTop = v.scroller.dom.scrollTop;
                       v.scrollHeight = v.scroller.dom.scrollHeight;
                    },
                    refresh: function(v) {
                       v.scroller.dom.scrollTop = v.scrollTop + 
                        (v.scrollTop == 0 ? 0 : v.scroller.dom.scrollHeight - v.scrollHeight);
                    }
                }
            },
            listeners: {
                cellcontextmenu: function(grid, rowIndex, cellIndex, event) {
                    if(diffPanel.getSelectionModel().hasSelection()) {
                        diffPanel.contextMenu.showAt(event.getXY());
                    }
                    event.stopEvent();
                },
                bodyscroll: function(scrollLeft, scrollTop) {
                    if(this.getView().scroller.dom.scrollHeight - this.getView().scroller.dom.offsetHeight <= scrollTop+20 && plugin.nextPage) {
                        if(plugin.merge) {
                            return;
                        }
                        var url = plugin.diffStore.url.replace("page="+plugin.pageNumber, "page="+(plugin.pageNumber+1));
                        plugin.pageNumber += 1;
                        plugin.diffStore.url = url;
                        plugin.diffStore.proxy.conn.url = url;
                        plugin.diffStore.proxy.url = url;
                        plugin.diffStore.load({
                            callback: function() {
                                if(plugin.diffStore.reader.jsonData.response.nextPage) {
                                    Ext.Msg.show({
                                        title: plugin.Text_Diff,
                                        msg: plugin.Text_MoreDiffs,
                                        buttons: Ext.Msg.OK,
                                        scope: plugin,
                                        icon: Ext.MessageBox.INFO,
                                        animEl: plugin.grid.ownerCt.getEl()
                                    });                                   
                                    plugin.nextPage = true;
                                } else {
                                    plugin.nextPage = false;
                                }
                                plugin.addDiffLayer(plugin.layerProjection, true);
                            },
                            scope: this,
                            add: true
                        });
                    }
                }
            },
            contextMenu: new Ext.menu.Menu({
                items: [
                    {
                        xtype: 'button',
                        text: plugin.Text_Zoom,
                        handler: function() {
                            if(plugin.merge) {
                                app.fireEvent("getmergeinfo", plugin.mergeStore, plugin.oldCommitId, plugin.newCommitId, plugin.ancestorCommitId, diffPanel.getSelectionModel().getSelected().data, plugin.transactionId);
                            } else {
                                app.fireEvent("getattributeinfo", plugin.diffStore, plugin.oldCommitId, plugin.newCommitId, diffPanel.getSelectionModel().getSelected().data.fid, plugin.layerProjection);
                            }
                            diffPanel.contextMenu.hide();
                        }
                    }
                ]
            }),
            selModel: new Ext.grid.RowSelectionModel({
                singleSelect: true,
                listeners: {
                    rowselect: function(selection, rowIndex, record) {
                        plugin.zoomButton.enable();
                    },
                    rowdeselect: function(selection, rowIndex, record) {  
                        if(diffPanel.getSelectionModel().getCount() === 0) {
                            plugin.zoomButton.disable();
                        }
                    }
                }
            })
        });

        config = Ext.apply(this.grid, config || {});
        
        var diffPanel = gxp.plugins.DiffPanel.superclass.addOutput.call(this, config);
    },
    
    addDiffLayer: function(layerProjection, append) {        
        if(this.diffLayer === null) {
            this.diffLayer = new OpenLayers.Layer.Vector("Diff");
        } else if (!append) {
            this.diffLayer.removeAllFeatures();
        }
        
        this.zoomButton.disable();
        
        var store = this.merge === true ? this.mergeStore : this.diffStore;

        var length = store.data.items.length;
        var counter = 0;
        for(var index = 0; index < length; index++) {
            var data = store.data.items[index].data;
            var style = OpenLayers.Util.applyDefaults(data.change === "REMOVED" ? this.oldStyle : data.change === "ADDED" ? this.newStyle : data.change === "CONFLICT" ? this.conflictStyle : this.modifiedStyle,
                    OpenLayers.Feature.Vector.style['default']);
            var geom = OpenLayers.Geometry.fromWKT(data.geometry);
            if(layerProjection) {
                var newProj = new OpenLayers.Projection(layerProjection);
                geom.transform(newProj, GoogleMercator);
            } else if(data.crs){
                var newProj = new OpenLayers.Projection(data.crs);
                geom.transform(newProj, GoogleMercator);
            } else {
                counter++;
            }
            var feature = new OpenLayers.Feature.Vector(geom);
            feature.style = style;
            this.diffLayer.addFeatures(feature);
        }
        if(counter > 0) {
            var plugin = this;
            Ext.Msg.show({
                title: plugin.Text_Diff,
                msg: counter + plugin.Text_NoCrs,
                buttons: Ext.Msg.OK,
                scope: plugin,
                icon: Ext.MessageBox.WARNING,
                animEl: plugin.grid.ownerCt.getEl()
            });
        }
        var layer = app.mapPanel.map.getLayer(this.diffLayer.id);
        if(length === 0) {
            if(layer) {
                app.mapPanel.map.removeLayer(layer);
            }
            if(!this.merge) {
                alert("No differences found");
            }
            return;
        } else {
            app.fireEvent("diffstoshow", this.merge);
        }
        if(layer === null) {
            app.mapPanel.map.addLayer(this.diffLayer);
        }
//        app.mapPanel.map.zoomToExtent(this.diffLayer.getDataExtent());
//        if(app.mapPanel.map.zoom > 18) {
//            app.mapPanel.map.zoomTo(18, app.mapPanel.map.center);
//        }
    }
});
Ext.preg(gxp.plugins.DiffPanel.prototype.ptype, gxp.plugins.DiffPanel);
