/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/** api: (define)
 *  module = gxp
 *  class = GeoGitUtil
 */

Ext.namespace("gxp");

gxp.GeoGitUtil = {
    
    merging: false,
    
    geometryAttributeName: null,
    
    transactionIds: {},
    
    objectIdNull: "0000000000000000000000000000000000000000",
        
    /**
     * JSON reader for the log operation in GeoGit
     */
    logReader: new Ext.data.JsonReader({
        root: 'response.commit',
        fields: [
           {
               name: 'message',
               mapping: 'message'
           },{
               name: 'commit',
               mapping: 'id'
           },{
               name: 'author',
               mapping: 'author.name'
           },{
               name: 'email',
               mapping: 'author.email'
           }, {
               name: 'date',
               mapping: 'author.timestamp'
           }
        ]
    }),
    
    /**
     * JSON reader for the diff operation in GeoGit
     */
    diffReader: new Ext.data.JsonReader({
        root: 'response.Feature',
        fields: [
           {
               name: 'fid',
               mapping: 'id'
           },{
               name: 'change',
               mapping: 'change'
           },{
               name: 'geometry',
               mapping: 'geometry'
           },{
               name: 'crs',
               mapping: 'crs'
           }
        ]
    }),
    
    /**
     * JSON reader for the merge dry-run operation in GeoGit
     */
    mergeReader: new Ext.data.JsonReader({
        root: 'response.Merge.Feature',
        fields: [
           {
               name: 'fid',
               mapping: 'id'
           },{
               name: 'change',
               mapping: 'change'
           },{
               name: 'geometry',
               mapping: 'geometry'
           },{
               name: 'crs',
               mapping: 'crs'
           },{
               name: 'theirvalue',
               mapping: 'theirvalue'
           },{
               name: 'ourvalue',
               mapping: 'ourvalue'
           }
        ]
    }),
    
    /**
     * JSON reader for the featureDiff operation in GeoGit
     */
    featureDiffReader: new Ext.data.JsonReader({
        root: 'response.diff',
        fields: [
               {
                   name: 'name',
                   mapping: 'attributename'
               },{
                   name: 'change',
                   mapping: 'changetype'
               },{
                   name: 'newvalue',
                   mapping: 'newvalue'
               },{
                   name: 'oldvalue',
                   mapping: 'oldvalue'
               }
            ],
        idProperty: 'attributename'
        }),
        
    /**
     * Parse the featureType for the workspace and typename
     */
    parseFeatureType: function(featureType){
    	if(featureType){
    		var split = featureType.split(":");
    		return {
    			workspace: split[0],
    			typeName: split[1]
    		};
    		
    	}
    },
    
    /** public: method[isGeoGitLayer]
     * 
     *  callback should expect either false for it's not a geogit layer or the layer object itself
     */
    isGeoGitLayer: function(layer, callback){
    	if(layer && layer.params && layer.params.LAYERS && !(layer.params.LAYERS instanceof Array)){
			var featureType = layer.params.LAYERS;
			var parsedFeatureType = this.parseFeatureType(featureType);
			
			var geoserverIndex = layer.url.indexOf('geoserver/');
			var geoserverUrl = layer.url.substring(0, geoserverIndex + 10);
			
			// Check to see if the layer has already been checked
			if(layer.metadata.isGeogit === undefined){
				var isGeoGit = function(dataStore){
					var plugin = this;
					OpenLayers.Request.GET({
						url: geoserverUrl + 'rest/workspaces/' + parsedFeatureType.workspace + '/datastores/' +
							 dataStore.name + '/featuretypes/' + parsedFeatureType.typeName + '.json',
						success: function(results){
							var jsonFormatter = new OpenLayers.Format.JSON();
							var featureTypeInfo = jsonFormatter.read(results.responseText);
							layer.metadata.projection = featureTypeInfo.featureType.srs;
							layer.metadata.isGeogit = true;
							layer.metadata.geogitStore = dataStore.name;
							layer.metadata.nativeName = featureTypeInfo.featureType.nativeName;
							// this is to get the repository name
	                         if(layer.metadata.repoId === undefined) {
	                             layer.metadata.repoId = layer.url.substring(0, geoserverIndex-1);
	                             layer.metadata.repoId += dataStore.connectionParameters.entry[0].$;
	                             layer.metadata.branch = dataStore.connectionParameters.entry[1].$;
	                         }
							
							if(callback !== undefined){
								callback(layer);
							}
						},
						failure: plugin.errorFetching
					});
				};
				
				var isNotGeoGit = function(){
					layer.metadata.isGeogit = false;
					if(callback != undefined){
						callback(false);
					}
				};
				
				//check to see if the layer is a geogit layer
				this.fetchIsGeoGitLayer(geoserverUrl, parsedFeatureType.workspace, featureType, isGeoGit, isNotGeoGit);
				
			}else if(layer.metadata.isGeogit){
				// It is a geogit layer so execute the callback, passing in the name of the store
				if(callback !== undefined){
					callback(layer);
				}
			}else{  
				// It is not a geogit layer so execute the callback, passing in false
				if(callback !== undefined){
					callback(false);
				}
			}
    	}
    },
    
    errorFetching: function(){
    	throw "GeoGitUtil: Error fetching data store info";
    },
    
    isLayerGroup: function(url, featureType, callback){
    	var requestUrl = url + 'wms?service=WMS&version=1.1.1&request=DescribeLayer&layers=' + featureType;
    
    	OpenLayers.Request.GET({
    		url: requestUrl,
    		success: function(response){
    			var describeLayer = new OpenLayers.Format.WMSDescribeLayer();
    			var results = describeLayer.read(response.responseText);
    			//console.log("describe layer results: ", results);
    			if((results.length == 1) && (results[0].layerName === featureType)){
    				callback(true);
    			}
    		}
    	});
    },
    
    /**
     * Query the rest api to get the type of datastore for this layer
     */
    fetchIsGeoGitLayer: function(url, workspace, featureType, isGeoGit, isNotGeoGit){
    	var plugin = this;
    	
    	// Only perform the request if the layer is not actually a layer group 
    	this.isLayerGroup(url, featureType, function(_isLayerGroup){
    		if(_isLayerGroup){
    			OpenLayers.Request.GET({
        			url: url + 'rest/layers/' + featureType + '.json',
        			success: function(results){
        				var jsonFormatter = new OpenLayers.Format.JSON();
        				var layerinfo = jsonFormatter.read(results.responseText);
        				var resourceUrl = layerinfo.layer.resource.href;
        				
        				var datastoreStartIndex = resourceUrl.indexOf(workspace + '/datastores');
                        datastoreStartIndex = datastoreStartIndex + workspace.length + 12;
                        
                        var datastoreEnd = resourceUrl.substr(datastoreStartIndex);
                        var datastoreEndIndex = datastoreEnd.indexOf('/');
        				var datastore = datastoreEnd.substring(0, datastoreEndIndex);
        				
        				OpenLayers.Request.GET({
        					url: url + 'rest/workspaces/' + workspace + '/datastores/' + datastore + '.json',
        					success: function(results){
        						var storeInfo = jsonFormatter.read(results.responseText);
        						if(storeInfo){
        							if(storeInfo.dataStore && storeInfo.dataStore.type){
        								if(isGeoGit && (storeInfo.dataStore.type === "GeoGIT")){
        									isGeoGit(storeInfo.dataStore);
        								}else{
        									if(isNotGeoGit){
        										isNotGeoGit(storeInfo.dataStore);
        									}
        								}
        							}else{
        								plugin.errorFetching();
        							}
        						}else{
        							plugin.errorFetching();
        						}
        					},
        					failure: plugin.errorFetching
        				});
        			},
        			failure: plugin.errorFetching
    			});
    		}
    	});
    },
    addTransactionId: function(transactionId, repoName) {
        if(this.transactionIds[repoName] === undefined) {
            this.transactionIds[repoName] = transactionId;
        } else {
            this.transactionIds[repoName] = undefined;
        }
    },

    checkForTransaction: function(repoName) {
        if(this.transactionIds[repoName] === undefined) {
            return false;
        }
        return true;
    },

    getGeometryAttributeName: function(overwrite) {
        if(this.geometryAttibuteName === null || overwrite) {
            var geomRegex = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/;
            if(app.tools['feature_manager'].schema && app.tools['feature_manager'].schema.reader) {
                var properties = app.tools['feature_manager'].schema.reader.raw.featureTypes[0].properties;
                for(var propIndex=0; propIndex < properties.length; propIndex++) {
                    var match = geomRegex.exec(properties[propIndex].type);
                    if(match) {
                        this.geometryAttributeName = properties[propIndex].name;
                        break;
                    }
                }
            }
        }
        return this.geometryAttributeName;
    }
};
