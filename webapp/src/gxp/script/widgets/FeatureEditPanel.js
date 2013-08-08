/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/FeatureEditorGrid.js
 * @requires GeoExt/widgets/form/FormPanel.js
 * @requires OpenLayers/Control/ModifyFeature.js
 * @requires Orthogonalization.js
 * @requires widgets/FeatureEditMixin.js
 */

/** api: (define)
 *  module = gxp
 *  class = FeatureEditPanel
 *  extends = GeoExt.form.FormPanel
 */

/** api: constructor
 *  .. class:: FeatureEditPanel(config)
 *
 *      Create a new panel which displays the attributes of a feature and
 *      makes the feature editable,
 *      using an ``OpenLayers.Control.ModifyFeature``.
 */
Ext.namespace("gxp");
gxp.FeatureEditPanel = Ext.extend(GeoExt.form.FormPanel, {
    
    featureManager: null,
    
    /** private: method[initComponent]
     */
    initComponent: function() {
        this.addEvents(

            /** api: events[startedit]
             *  Fires when editing starts.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPanel` This panel.
             */
            "startedit",

            /** api: events[stopedit]
             *  Fires when editing stops.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPanel` This panel.
             */
            "stopedit",

            /** api: events[beforefeaturemodified]
             *  Fires before the feature associated with this panel has been
             *  modified (i.e. when the user clicks "Save" on the panel).
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPanel` This panel.
             *  * feature - ``OpenLayers.Feature`` The modified feature.
             */
            "beforefeaturemodified",

            /** api: events[featuremodified]
             *  Fires when the feature associated with this panel has been
             *  modified (i.e. when the user clicks "Save" on the panel) or
             *  deleted (i.e. when the user clicks "Delete" on the panel).
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPanel` This panel.
             *  * feature - ``OpenLayers.Feature`` The modified feature.
             */
            "featuremodified",
                
            /** api: events[canceledit]
             *  Fires when the user exits the editing mode by pressing the
             *  "Cancel" button.
             *  
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPanel` This panel.
             *  * feature - ``OpenLayers.Feature`` The feature. Will be null
             *    if editing of a feature that was just inserted was cancelled.
             */
            "canceledit"                
        );
        this.initHelper();
        gxp.FeatureEditPanel.superclass.initComponent.call(this);
        this.on({
            "show": function() {
                if(this.editing) {
                    this.editing = null;
                    this.startEditing();
                }
            },
            scope: this
        });
    },
    
    setFeature: function(newFeature) {
        if (newFeature instanceof GeoExt.data.FeatureRecord) {
            this.feature = newFeature.getFeature();
        } else {
        	this.feature = newFeature;
        }
        if(newFeature != null) {
        	this.editing = this.feature.state === OpenLayers.State.INSERT;
        }
    },
    
    reset: function(newPanel) {
    	if(newPanel != null) {
    		this.schema = newPanel.schema;
    		this.fields = newPanel.fields;
    		this.excludeFields = newPanel.excludeFields;
    		var featureManager = app.tools[this.featureManager];
    		this.setTitle(featureManager.layerRecord.data.layer.name);
    	}
    	this.plugins[0].reset(this);
    }
});

/** api: xtype = gxp_featureeditpanel */

Ext.override(gxp.FeatureEditPanel, gxp.FeatureEditMixin);
Ext.reg('gxp_featureeditpanel', gxp.FeatureEditPanel);
