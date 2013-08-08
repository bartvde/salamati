/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/FeatureEditorGrid.js
 * @requires GeoExt/widgets/Popup.js
 * @requires OpenLayers/Control/ModifyFeature.js
 * @requires Orthogonalization.js
 * @requires widgets/FeatureEditMixin.js
 */

/** api: (define)
 *  module = gxp
 *  class = FeatureEditPopup
 *  extends = GeoExt.Popup
 */

/** api: constructor
 *  .. class:: FeatureEditPopup(config)
 *
 *      Create a new popup which displays the attributes of a feature and
 *      makes the feature editable,
 *      using an ``OpenLayers.Control.ModifyFeature``.
 */
Ext.namespace("gxp");
gxp.FeatureEditPopup = Ext.extend(GeoExt.Popup, {
    
    /** private: method[initComponent]
     */
    initComponent: function() {
        this.addEvents(

            /** api: events[startedit]
             *  Fires when editing starts.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             */
            "startedit",

            /** api: events[stopedit]
             *  Fires when editing stops.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             */
            "stopedit",

            /** api: events[beforefeaturemodified]
             *  Fires before the feature associated with this popup has been
             *  modified (i.e. when the user clicks "Save" on the popup).
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The modified feature.
             */
            "beforefeaturemodified",

            /** api: events[featuremodified]
             *  Fires when the feature associated with this popup has been
             *  modified (i.e. when the user clicks "Save" on the popup) or
             *  deleted (i.e. when the user clicks "Delete" on the popup).
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The modified feature.
             */
            "featuremodified",
            
            /** api: events[canceledit]
             *  Fires when the user exits the editing mode by pressing the
             *  "Cancel" button or selecting "No" in the popup's close dialog.
             *  
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The feature. Will be null
             *    if editing of a feature that was just inserted was cancelled.
             */
            "canceledit",
            
            /** api: events[cancelclose]
             *  Fires when the user answers "Cancel" to the dialog that
             *  appears when a popup with unsaved changes is closed.
             *  
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             */
            "cancelclose"
        );
        
        this.initHelper();
        
        this.anchored = !this.editing;
        
        if(!this.title && feature.fid) {
            this.title = feature.fid;
        }
        
        gxp.FeatureEditPopup.superclass.initComponent.call(this);
        
        this.on({
            "show": function() {
                if(this.editing) {
                    this.editing = null;
                    this.startEditing();
                }
            },
            "beforeclose": function() {
                this.plugins[0].reset(null);
                if(!this.editing) {
                    return;
                }
                if(this.feature.state === this.getDirtyState()) {
                    Ext.Msg.show({
                        title: this.closeMsgTitle,
                        msg: this.closeMsg,
                        buttons: Ext.Msg.YESNOCANCEL,
                        fn: function(button) {
                            if(button && button !== "cancel") {
                                this.stopEditing(button === "yes");
                                this.close();
                            } else {
                                this.fireEvent("cancelclose", this);
                            }
                        },
                        scope: this,
                        icon: Ext.MessageBox.QUESTION,
                        animEl: this.getEl()
                    });
                    return false;
                } else {
                    this.stopEditing(false);
                }
            },
            scope: this
        });
    }
});

/** api: xtype = gxp_featureeditpopup */

Ext.override(gxp.FeatureEditPopup, gxp.FeatureEditMixin);
Ext.reg('gxp_featureeditpopup', gxp.FeatureEditPopup);
