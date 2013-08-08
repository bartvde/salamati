/**
 * Copyright (c) 2008-2012 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/FeatureEditorGrid.js
 * @requires GeoGitUtil.js
 */

Ext.namespace("gxp.plugins");

gxp.plugins.VersionedEditor = Ext.extend(Ext.TabPanel, {
    
    /* i18n */
    attributesTitle: "Attributes",
    historyTitle: "History",
    hour: "hour",
    hours: "hours",
    day: "day",
    days: "days",
    ago: "ago",
    authored: "authored",
    geometry: "Geometry",
    was: "was",
    now: "now",
    added: "ADDED",
    removed: "REMOVED",
    modified: "MODIFIED",
    nextCommitText: "Next",    
    nextCommitTooltip: "See what changed in the next commit",    
    prevCommitText: "Prev",    
    prevCommitTooltip: "See what changed in the previous commit",
    Text_NoCrs: "This feature didn't have a CRS associated with it, layer results may not be accurate.",
    /* end i18n */
    
    /** api: config[url]
     *  ``String``
     *  Url of the web-api endpoint of GeoGit.
     */
    url: null,

    /** api: config[historyTpl]
     *  ``String`` Template to use for displaying the commit history.
     *  If not set, a default template will be provided.
     */

    historyTpl: '<ol><div class="info">{[this.formatDate()]}</div><tpl for="."><tpl if="this.checkForGeometry(name, xindex)"><li class="diff"><div class="attr-name">{[this.formatChangeResponse(values.change, values.name, true)]}</div></li></tpl><tpl if="this.checkForGeometry(name, -1) == false"><li class="diff"><div class="attr-name">{[this.formatChangeResponse(values.change, values.name, false)]}</div><tpl if="change == &quot;MODIFIED&quot;"><div class="attr-value">{[this.formatValueResponse(values.oldvalue, values.newvalue)]}</div></tpl><tpl if="change == &quot;ADDED&quot;"><div class="attr-value">{[this.formatValueResponse(null, values.newvalue)]}</div></tpl><tpl if="change == &quot;REMOVED&quot;"><div class="attr-value">{[this.formatValueResponse(values.oldvalue, null)]}</div></tpl></li></tpl></tpl>',

    border: false,
    activeTab: 0,

    /** api: config[editor]
     *  The ptype of the attribute editor to use. One of 'gxp_editorgrid' or
     *  'gxp_editorform'. Defaults to 'gxp_editorgrid'.
     */
    editor: null,

    /** private: property[attributeEditor]
     *  ``gxp.plugins.FeatureEditorGrid`` or ``gxp.plugins.FeatureEditorForm``
     */
    attributeEditor: null,
    
    historyTab: null,
    
    featureManager: null,
    
    commits: null,
    
    workspace: null,
    
    path: null,
    
    dataStore: null,
    
    store: null,
    
    commitIndex: 0,
    
    diffLayer: null,
    
    // style options to add to the old and new features in the attribute diff layer
    oldStyle: null,
    
    newStyle: null,

    /** api: ptype = gxp_versionededitor */
    ptype: "gxp_versionededitor",

    /** private: method[initComponent]
     */
    initComponent: function() {
        gxp.plugins.VersionedEditor.superclass.initComponent.call(this);
        var editorConfig = {
            feature: this.initialConfig.feature,
            schema: this.initialConfig.schema,
            fields: this.initialConfig.fields,
            excludeFields: this.initialConfig.excludeFields,
            propertyNames: this.initialConfig.propertyNames,
            readOnly: this.initialConfig.readOnly
        };
        var config = Ext.apply({
            xtype: this.initialConfig.editor || "gxp_editorgrid",
            title: this.attributesTitle,
            cls: 'gxp-grid-font-cls gxp-grid-hd-font-cls'
        }, editorConfig);
        this.attributeEditor = Ext.ComponentMgr.create(config);
        this.add(this.attributeEditor);
        var plugin = this;
        
        var nextCommitButton = new Ext.Button({
            text: this.nextCommitText,
            tooltip: this.nextCommitTooltip,
            handler: this.nextCommit,
            width: "99",
            scope: this
        });
        
        var prevCommitButton = new Ext.Button({
            text: this.prevCommitText,
            tooltip: this.prevCommitTooltip,
            handler: this.previousCommit,
            width: "99",
            scope: this
        });
        
        var addPanel = function(dataView){
        	plugin.historyTab = Ext.ComponentMgr.create({
                xtype: 'panel',
                border: false,
                plain: true,
                layout: 'fit', 
                autoScroll: true, 
                items: [dataView], 
                title: plugin.historyTitle,
                tbar: [prevCommitButton, nextCommitButton]
            });
        	plugin.add(plugin.historyTab);
        };
        this.createDataView(addPanel);
    },

    /** private: method[createDataView]
     */
    createDataView: function(addPanel) {
    	if(this.schema) {
    	    var typeName = this.schema.reader.raw.featureTypes[0].typeName;
            this.workspace = this.schema.reader.raw.targetPrefix;
            var geoserverIndex = this.schema.url.indexOf('geoserver/');
            this.url = this.schema.url.substring(0, geoserverIndex + 9) + '/';
    	}     

        var plugin = this;        
        var featureManager = app.tools[this.featureManager];
        var isGeoGit = function(layer){
        	if(plugin.feature == null || plugin.feature.fid == null || layer === false) {
        		return;
        	}
        	plugin.dataStore = layer.metadata.geogitStore;
        	plugin.path = layer.metadata.nativeName.split(":").pop() + "/" + 
        			   plugin.feature.fid.replace(typeName.split(":").pop(), layer.metadata.nativeName.split(":").pop());
            if (plugin.url.charAt(plugin.url.length-1) !== '/') {
                plugin.url = plugin.url + "/";
            }
            var command = 'log';
            var url = plugin.url + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/' + command;
            url = Ext.urlAppend(url, 'path=' + plugin.path + '&firstParentOnly=true&output_format=json');
            
            var store = new Ext.data.Store({
            	url: url,
        		reader: gxp.GeoGitUtil.logReader,
        		listeners: {
        			"load": function() {
        				plugin.commits = store.data.items;  
        				if(plugin.commits.length > 1) {
        					plugin.createDiffStore(plugin.commits[0].id, plugin.commits[1].id, addPanel, featureManager.layerRecord.data.layer.metadata.projection);
        				} else {
        					plugin.createDiffStore(plugin.commits[0].id, gxp.GeoGitUtil.objectIdNull, addPanel, featureManager.layerRecord.data.layer.metadata.projection);
        				}
        				
        			}
        		}, 
        		autoLoad: true
        	});
        };
        var featureType = null;
        if(this.schema) {
        	featureType = this.schema.baseParams['TYPENAME'];
        }

        
        gxp.GeoGitUtil.isGeoGitLayer(featureManager.layerRecord.data.layer, isGeoGit);
    },

    createDiffStore: function(newCommitId, oldCommitId, addPanel, layerProjection) {
        var url = this.url + 'geogit/' + this.workspace + ':' + this.dataStore + '/featurediff';
        url = Ext.urlAppend(url, 'path=' + this.path + '&oldCommitId='+ oldCommitId + '&newCommitId=' + newCommitId + '&output_format=json');
        var me = this;
        this.store = new Ext.data.Store({
        	url: url,
    		reader: gxp.GeoGitUtil.featureDiffReader,
        		listeners: {
        		    "load": function() { 
        		        if(me.historyTab) {
        		            var buttons = me.historyTab.getTopToolbar().items.items;
        		            if(me.commitIndex === 0) {
        		                buttons[1].disable();

        		                if(me.commitIndex === me.commits.length-1) {
        		                    buttons[0].disable();
        		                } else if(buttons[0].disabled === true) {
        		                    buttons[0].enable();
        		                }
        		            } else if(me.commitIndex === me.commits.length-1) {
        		                if(buttons[0].disabled != true) {
        		                    buttons[0].disable();
        		                }
        		                if(buttons[1].disabled === true) {
        		                    buttons[1].enable();
        		                }
        		            } else {
        		                if(buttons[0].disabled === true) {
        		                    buttons[0].enable();
        		                }else if(buttons[1].disabled === true) {
        		                    buttons[1].enable();
        		                }
        		            }
        		        }
        		    }
        		},
    			autoLoad: true
    		});
        
        var tpl = new Ext.XTemplate(me.historyTpl, {
            formatDate: function() {
            	var value = me.commits[me.commitIndex].data.date;           	
                var now = new Date(), result = '';
                result += me.commits[me.commitIndex].data.author + ", " + me.authored + " ";
                if (value > now.add(Date.DAY, -1)) {
                    var hours = Math.round((now-value)/(1000*60*60));
                    result += hours + ' ';
                    result += (hours > 1) ? me.hours : me.hour;
                    result += ' ' + me.ago + '.';
                    return result;
                } else if (value > now.add(Date.MONTH, -1)) {
                    var days = Math.round((now-value)/(1000*60*60*24));
                    result += days + ' ';
                    result += (days > 1) ? me.days : me.day;
                    result += ' ' + me.ago + '.';
                    return result;
                }
            },
            formatChangeResponse: function(changeType, name, geometry) {
                var result = "";
                var change = changeType === "ADDED" ? me.added : changeType === "REMOVED" ? me.removed : me.modified;
                if(geometry) {
                    result = me.geometry + ': ' + change + '.';
                    return result;
                }
                result = name + ': ' + change + '.';
                return result;
            },
            formatValueResponse: function(oldValue, newValue) {
                var result = "";
                if(oldValue && newValue) {
                    result = me.was + ' ' + oldValue + ', ' + me.now + ' ' + newValue + '.';
                } else if(oldValue) {
                    result = me.was + ' ' + oldValue + '.';
                } else {
                    result = me.now + ' ' + newValue + '.';
                }
                return result;
            },
            checkForGeometry: function(type, xindex) {
            	var name = gxp.GeoGitUtil.getGeometryAttributeName();
            	if(type === name) {
            		if(xindex === -1) {
            			return true;
            		}
            		if(layerProjection === null || layerProjection === undefined || layerProjection === "") {
                        var plugin = this;
                        Ext.Msg.show({
                            title: historyTitle,
                            msg: plugin.Text_NoCrs,
                            buttons: Ext.Msg.OK,
                            scope: plugin,
                            icon: Ext.MessageBox.WARNING,
                            animEl: plugin.grid.ownerCt.getEl()
                        });
                    }
            		if(me.diffLayer === null) {
            		    me.diffLayer = new OpenLayers.Layer.Vector("Attr_diff");
            		} else {
            		    me.diffLayer.removeAllFeatures();
            		}
            		var newstyle = OpenLayers.Util.applyDefaults(me.newStyle, OpenLayers.Feature.Vector.style['default']);
            		var newvalue = me.store.data.items[xindex-1].data.newvalue;
            		var newGeom = OpenLayers.Geometry.fromWKT(newvalue);
            		if(layerProjection) {
            		   var proj = new OpenLayers.Projection(layerProjection);
            		   newGeom.transform(proj, GoogleMercator); 
            		}           		
            		var newFeature = new OpenLayers.Feature.Vector(newGeom);
            		newFeature.style = newstyle;
            		me.diffLayer.addFeatures(newFeature);
            		
            		var oldvalue = me.store.data.items[xindex-1].data.oldvalue;
            		if(oldvalue !== null && oldvalue !== undefined && oldvalue !== ""){
            			var oldGeom = OpenLayers.Geometry.fromWKT(oldvalue);
            			if(layerProjection) {
            			    var proj = new OpenLayers.Projection(layerProjection);
            			    oldGeom.transform(proj, GoogleMercator);
            			}          			
            			var oldstyle = OpenLayers.Util.applyDefaults(me.oldStyle, OpenLayers.Feature.Vector.style['default']);
            			var oldFeature = new OpenLayers.Feature.Vector(oldGeom);
            			oldFeature.style = oldstyle;
            			me.diffLayer.addFeatures(oldFeature);
            		}
            		app.mapPanel.map.addLayer(me.diffLayer);
            		return true;
            	}
            	return false;
            }
        });
        
        addPanel(new Ext.DataView({
            store: this.store,
            tpl: tpl,
            autoHeight:true,
            listeners: {
            	beforerender: function(dataview){
            		console.log("dataview", dataview);
            	//	dataview.store.load();
            	}
            }
        }));
    },
    
    previousCommit: function() {
    	if(this.commitIndex < this.commits.length-1) {
    		this.commitIndex += 1;
    		var oldCommitId = this.commits.length-1 > this.commitIndex ? this.commits[this.commitIndex+1].id : gxp.GeoGitUtil.objectIdNull;
    		this.updateDiffPanel(this.commits[this.commitIndex].id, oldCommitId);
    	}
    },
    
    nextCommit: function() {
    	if(this.commitIndex > 0) {
    		this.commitIndex -= 1;
    		this.updateDiffPanel(this.commits[this.commitIndex].id, this.commits[this.commitIndex+1].id);
    	}
    },
    
    updateDiffPanel: function(newCommitId, oldCommitId) {
    	var url = this.url + 'geogit/' + this.workspace + ':' + this.dataStore + '/featurediff';
        url = Ext.urlAppend(url, 'path=' + this.path + '&oldCommitId='+ oldCommitId + '&newCommitId=' + newCommitId + '&output_format=json');
        this.store.url = url;
        this.store.proxy.setUrl(url, true);
        this.store.load();
		if(this.diffLayer != null) {
			var layer = app.mapPanel.map.getLayer(this.diffLayer.id);
			if(layer != null) {
				app.mapPanel.map.removeLayer(layer);  
			}
		}	
    },
    
    /** private: method[init]
     *
     *  :arg target: ``gxp.FeatureEditPopup`` The feature edit popup 
     *  initializing this plugin.
     */
    init: function(target) {
        // make sure the editor is not added, we will take care
        // of adding the editor to our container later on
        target.on('beforeadd', OpenLayers.Function.False, this);
        this.attributeEditor.init(target);
        this.target = target;
        target.un('beforeadd', OpenLayers.Function.False, this);
        target.add(this);
        target.doLayout();
    },
    
    reset: function(newPanel) {
    	if(newPanel == null || newPanel.feature == null) {
    		this.remove(this.historyTab);
    		this.remove(this.attributeEditor);
    		this.attributeEditor = null;
    		this.historyTab = null;
    		if(this.diffLayer != null) {
    			var layer = app.mapPanel.map.getLayer(this.diffLayer.id);
                if(layer != null) {
                    app.mapPanel.map.removeLayer(layer);  
                }
    		}
    		return;
    	}
    	
        this.feature = newPanel.feature;
        this.schema = newPanel.schema;
        this.fields = newPanel.fields;
        this.excludeFields = newPanel.excludeFields;

        if(!this.attributeEditor){
        	this.attributeEditor = Ext.ComponentMgr.create({
                xtype: "gxp_editorgrid",
                title: this.attributesTitle,
                feature: this.feature,
                schema: this.schema,
                fields: this.fields,
                excludeFields: this.excludeFields,
                cls: 'gxp-grid-font-cls gxp-grid-hd-font-cls'
            });
            
            this.attributeEditor.init(this.target);
            this.add(this.attributeEditor);
            this.setActiveTab(0); 
        }         

        this.commitIndex = 0;
               
        var nextCommitButton = new Ext.Button({
            text: this.nextCommitText,
            tooltip: this.nextCommitTooltip,
            handler: this.nextCommit,
            width: "99",
            scope: this
        });
        
        var prevCommitButton = new Ext.Button({
            text: this.prevCommitText,
            tooltip: this.prevCommitTooltip,
            handler: this.previousCommit,
            width: "99",
            scope: this
        });
        
        var plugin = this;
        var addPanel = function(dataView){
        	var historyTab = Ext.ComponentMgr.create({
                xtype: 'panel',
                border: false,
                plain: true,
                layout: 'fit', 
                autoScroll: true, 
                items: [dataView], 
                title: plugin.historyTitle,
                tbar: [prevCommitButton, nextCommitButton]
            });
        	if(plugin.historyTab != null) {
        		plugin.remove(plugin.historyTab);
        	}
        	plugin.historyTab = historyTab;
        	plugin.add(plugin.historyTab);
        };
        
        this.createDataView(addPanel);
        this.target.doLayout(false, true);                 
        
    }

});

Ext.preg(gxp.plugins.VersionedEditor.prototype.ptype, gxp.plugins.VersionedEditor);
