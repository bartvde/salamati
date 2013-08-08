Ext.namespace("gxp");

gxp.FeatureEditMixin = {
    
        /** i18n **/
        closeMsgTitle: 'Save Changes?',
        closeMsg: 'This feature has unsaved changes. Would you like to save your changes?',
        deleteMsgTitle: 'Delete Feature?',
        deleteMsg: 'Are you sure you want to delete this feature?',
        editButtonText: 'Edit',
        editButtonTooltip: 'Make this feature editable',
        deleteButtonText: 'Delete',
        deleteButtonTooltip: 'Delete this feature',
        cancelButtonText: 'Cancel',
        cancelButtonTooltip: 'Stop editing, discard changes',
        saveButtonText: 'Save',
        saveButtonTooltip: 'Save changes',
        orthoButtonText: 'Right Angle',
        orthoButtonTooltip: 'Make a polygon orthogonalized',
        /** private config overrides **/
        layout: "fit",
        
        /** api: config[feature]
         *  ``OpenLayers.Feature.Vector``|``GeoExt.data.FeatureRecord`` The feature
         *  to edit and display.
         */
        
        /** api: config[vertexRenderIntent]
         *  ``String`` renderIntent for feature vertices when modifying. Undefined
         *  by default.
         */
        
        /** api: property[feature]
         *  ``OpenLayers.Feature.Vector`` The feature being edited/displayed.
         */
        feature: null,
        
        /** api: config[schema]
         *  ``GeoExt.data.AttributeStore`` Optional. If provided, available
         *  feature attributes will be determined from the schema instead of using
         *  the attributes that the feature has currently set.
         */
        schema: null,
        
        /** api: config[fields]
         *  ``Array``
         *  List of field config names corresponding to feature attributes.  If
         *  not provided, fields will be derived from attributes. If provided,
         *  the field order from this list will be used, and fields missing in the
         *  list will be excluded.
         */

        /** api: config[excludeFields]
         *  ``Array`` Optional list of field names (case sensitive) that are to be
         *  excluded from the editor plugin.
         */
        
        /** private: property[excludeFields]
         */
        
        /** api: config[propertyNames]
         *  ``Object`` Property name/display name pairs. If specified, the display
         *  name will be shown in the name column instead of the property name.
         */

        /** api: config[readOnly]
         *  ``Boolean`` Set to true to disable editing. Default is false.
         */
        readOnly: false,
        
        /** api: config[allowDelete]
         *  ``Boolean`` Set to true to provide a Delete button for deleting the
         *  feature. Default is false.
         */
        allowDelete: false,
        
        /** api: config[editing]
         *  ``Boolean`` Set to true to open the panel in editing mode.
         *  Default is false.
         */
        
        /** api: config[dateFormat]
         *  ``String`` Date format. Default is the value of
         *  ``Ext.form.DateField.prototype.format``.
         */
            
        /** api: config[timeFormat]
         *  ``String`` Time format. Default is the value of
         *  ``Ext.form.TimeField.prototype.format``.
         */

        /** private: property[editing]
         *  ``Boolean`` If we are in editing mode, this will be true.
         */
        editing: false,

        /** api: editorPluginConfig
         *  ``Object`` The config for the plugin to use as the editor, its ptype
         *  property can be one of "gxp_editorgrid" (default) or "gxp_editorform" 
         *  for form-based editing.
         */
        editorPluginConfig: {
            ptype: "gxp_editorgrid"
        },

        /** private: property[modifyControl]
         *  ``OpenLayers.Control.ModifyFeature`` If in editing mode, we will have
         *  this control for editing the geometry.
         */
        modifyControl: null,
        
        /** private: property[geometry]
         *  ``OpenLayers.Geometry`` The original geometry of the feature we are
         *  editing.
         */
        geometry: null,
        
        /** private: property[attributes]
         *  ``Object`` The original attributes of the feature we are editing.
         */
        attributes: null,
        
        /** private: property[cancelButton]
         *  ``Ext.Button``
         */
        cancelButton: null,
        
        /** private: property[saveButton]
         *  ``Ext.Button``
         */
        saveButton: null,
        
        /** private: property[editButton]
         *  ``Ext.Button``
         */
        editButton: null,
        
        /** private: property[deleteButton]
         *  ``Ext.Button``
         */
        deleteButton: null,

        orthoButton: null,

        map: null,
        
        /** private: method[getDirtyState]
         *  Get the appropriate OpenLayers.State value to indicate a dirty feature.
         *  We don't cache this value because the panel may remain open through
         *  several state changes.
         */
        getDirtyState: function() {
            return this.feature.state === OpenLayers.State.INSERT ?
                    this.feature.state : OpenLayers.State.UPDATE;
        },
    
        /** private: method[setFeatureState]
         *  Set the state of this popup's feature and trigger a featuremodified
         *  event on the feature's layer.
         */
        setFeatureState: function(state) {
            this.feature.state = state;
            var layer = this.feature.layer;
            layer && layer.events.triggerEvent("featuremodified", {
            feature: this.feature
            });
        },
        

        
        initHelper: function() {                
            var feature = this.feature;
            if (feature instanceof GeoExt.data.FeatureRecord) {
                feature = this.feature = feature.getFeature();
            }
            if (!this.location) {
                this.location = feature;
            }
                
            this.editButton = new Ext.Button({
                text: this.editButtonText,
                tooltip: this.editButtonTooltip,
                iconCls: "edit",
                handler: this.startEditing,
                scope: this
            });
                
            this.deleteButton = new Ext.Button({
                text: this.deleteButtonText,
                tooltip: this.deleteButtonTooltip,
                iconCls: "delete",
                hidden: !this.allowDelete,
                handler: this.deleteFeature,
                scope: this
            });
                
            this.cancelButton = new Ext.Button({
                text: this.cancelButtonText,
                tooltip: this.cancelButtonTooltip,
                iconCls: "cancel",
                hidden: true,
                handler: function() {
                    this.stopEditing(false);
                },
                scope: this
            });
                
            this.saveButton = new Ext.Button({
                text: this.saveButtonText,
                tooltip: this.saveButtonTooltip,
                iconCls: "save",
                hidden: true,
                handler: function() {
                    this.stopEditing(true);
                },
                scope: this
            });
                
            this.orthoButton = new Ext.Button({
                text: this.orthoButtonText,
                tooltip: this.orthoButtonTooltip,
                hidden: true,
                iconCls: 'salamati-icon-rightangles',
                handler: function() {
                    var point;
                    var dragControl = this.modifyControl.dragControl;
                    var geometry = this.feature.geometry;

                    var success = gxp.Orthogonalization.orthogonalize(this.feature, this.map);
                    if(success === true) {
                        this.feature.layer.redraw();

                        for(var i = 0; i < geometry.components.length; i++){
                            for(var j = 0; j < geometry.components[i].components.length; j++){
                                for(var y = 0; y < geometry.components[i].components[j].components.length;y++){
                                    point = geometry.components[i].components[j].components[y];
                                    dragControl.feature = this.feature;
                                    pixel = new OpenLayers.Pixel(point.x, point.y);
                                    dragControl.downFeature(pixel);
                                    dragControl.moveFeature(pixel);
                                    dragControl.upFeature(pixel);
                                    dragControl.doneDragging(pixel);
                                }
                            }
                        }
                    }
                },
                scope: this
            });
                
            this.plugins = [Ext.apply({
                feature: feature,
                schema: this.schema,
                fields: this.fields,
                excludeFields: this.excludeFields,
                propertyNames: this.propertyNames,
                readOnly: this.readOnly
            }, this.editorPluginConfig)];
                
            this.bbar = new Ext.Toolbar({
                hidden: this.readOnly,
                items: [
                    this.editButton,
                    this.deleteButton,
                    this.saveButton,
                    this.cancelButton,
                    this.orthoButton
                ]
            });
        },
        
        /** private: method[startEditing]
         */
        startEditing: function() {
            if(!this.editing) {
                this.fireEvent("startedit", this);
                this.editing = true;
                if(this.anchored) {
                    this.anc && this.unanchorPopup();
                }
            
                this.editButton.hide();
                this.deleteButton.hide();
                this.saveButton.show();
                this.cancelButton.show();
                if(this.feature.geometry.CLASS_NAME === "OpenLayers.Geometry.MultiPolygon") {
                    this.orthoButton.show();
                }
            
                this.geometry = this.feature.geometry && this.feature.geometry.clone();
                this.attributes = Ext.apply({}, this.feature.attributes);

                this.modifyControl = new OpenLayers.Control.ModifyFeature(
                        this.feature.layer,
                        {standalone: true, vertexRenderIntent: this.vertexRenderIntent}
                );
                this.feature.layer.map.addControl(this.modifyControl);
                this.modifyControl.activate();
                if (this.feature.geometry) {
                    this.modifyControl.selectFeature(this.feature);
                }
            }
        },
        
        /** private: method[stopEditing]
         *  :arg save: ``Boolean`` If set to true, changes will be saved and the
         *      ``featuremodified`` event will be fired.
         */
        stopEditing: function(save) {
            if(this.editing) {
                this.fireEvent("stopedit", this);
                //TODO remove the line below when
                // http://trac.openlayers.org/ticket/2210 is fixed.
                this.modifyControl.deactivate();
                this.modifyControl.destroy();
                
                var feature = this.feature;
                if (feature.state === this.getDirtyState()) {
                    if (save === true) {
                        this.fireEvent("beforefeaturemodified", this, feature);
                        //TODO When http://trac.osgeo.org/openlayers/ticket/3131
                        // is resolved, remove the if clause below
                        if (this.schema) {
                            var attribute, rec;
                            for (var i in feature.attributes) {
                                rec = this.schema.getAt(this.schema.findExact("name", i));
                                attribute = feature.attributes[i];
                                if (attribute instanceof Date) {
                                    var type = rec.get("type").split(":").pop();
                                    feature.attributes[i] = attribute.format(
                                        type == "date" ? "Y-m-d" : "c"
                                    );
                                }
                            }
                        }
                        this.fireEvent("featuremodified", this, feature);
                    } else if(feature.state === OpenLayers.State.INSERT) {
                        this.editing = false;
                        feature.layer && feature.layer.destroyFeatures([feature]);
                        this.fireEvent("canceledit", this, null);
                        if(this.closable) {
                            this.close();
                        }
                    } else {
                        var layer = feature.layer;
                        layer.drawFeature(feature, {display: "none"});
                        feature.geometry = this.geometry;
                        feature.attributes = this.attributes;
                        this.setFeatureState(null);
                        layer.drawFeature(feature);
                        this.fireEvent("canceledit", this, feature);
                    }
                }

                if (!this.isDestroyed) {
                    this.cancelButton.hide();               
                    this.saveButton.hide();
                    if(!this.orthoButton.hidden) {
                        this.orthoButton.hide();
                    }
                    this.editButton.show();
                    this.allowDelete && this.deleteButton.show();
                }
                
                this.editing = false;
            }
        },
        
        deleteFeature: function() {
            Ext.Msg.show({
                title: this.deleteMsgTitle,
                msg: this.deleteMsg,
                buttons: Ext.Msg.YESNO,
                fn: function(button) {
                    if(button === "yes") {
                        this.setFeatureState(OpenLayers.State.DELETE);
                        this.fireEvent("featuremodified", this, this.feature);
                        if(this.closable) {
                            this.close();
                        }
                    }
                },
                scope: this,
                icon: Ext.MessageBox.QUESTION,
                animEl: this.getEl()
            });
        }
};