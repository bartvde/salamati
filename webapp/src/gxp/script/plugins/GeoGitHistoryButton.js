/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = GeoGitHistoryButton
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: GeoGitHistoryButton(config)
 *
 *    Plugin to hide or show the geogit 
 *    history panel for a layer.
 */
gxp.plugins.GeoGitHistoryButton = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_geogithistorybutton */
    ptype: "gxp_geogithistorybutton",
    
    /** api: config[historyButtonText]
     *  ``String``
     *  Text for history button item (i18n).
     */
    historyButtonText: "Show/Hide History",
    
    /** api: method[addActions]
     */
    addActions: function() {
        var selectedLayer;
        var actions = gxp.plugins.GeoGitHistoryButton.superclass.addActions.apply(this, [{
            menuText: this.historyButtonText,
            iconCls: "gxp-icon-legend",
            disabled: true,
            tooltip: this.historyButtonTip,
            handler: function() {
                app.fireEvent("togglesouthpanel");
            },
            scope: this
        }]);
        var historyButtonAction = actions[0];

        this.target.on("layerselectionchange", function(record) {
            selectedLayer = record;
            
            var isGeoGit = false;
            
            if(record && record.data && record.data.layer){
            	gxp.GeoGitUtil.isGeoGitLayer(record.data.layer, function(layerInQuestion){
            		if(layerInQuestion !== false && layerInQuestion.metadata.isGeogit){
            			historyButtonAction.setDisabled(false);
            		}else{
            			historyButtonAction.setDisabled(true);
            		}
            	});
            }
        }, this);
        var enforceOne = function(store) {
        	historyButtonAction.setDisabled(
                !selectedLayer || store.getCount() <= 1 
            );
        };
        this.target.mapPanel.layers.on({
            "add": enforceOne,
            "remove": enforceOne
        });
        
        return actions;
    }
        
});

Ext.preg(gxp.plugins.GeoGitHistoryButton.prototype.ptype, gxp.plugins.GeoGitHistoryButton);
