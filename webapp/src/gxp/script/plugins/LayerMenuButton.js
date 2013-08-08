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
 *  class = LayerMenuButton
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: LayerMenuButton(config)
 *
 *    Plugin to hide or show the layer menu
 */
gxp.plugins.LayerMenuButton = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_layermenubutton */
    ptype: "gxp_layermenubutton",
    
    /** api: config[menuButtonText]
     *  ``String``
     *  Text for layer menu button (i18n).
     */
    historyButtonText: "Menu",
    
    /** api: config[contextMenu]
     *  Context menu to display.
     */
    contextMenu: null,
    
    layer_manager: null,
    
    /** api: method[addActions]
     */
    addActions: function() {
    	var plugin = this;
    	layer_manager = this.target.tools[this.layer_manager];
    	this.contextMenu = layer_manager.output[0].contextMenu;
        var actions = gxp.plugins.LayerMenuButton.superclass.addActions.apply(this, [{
        	xtype: 'tbsplit',
        	menuText: this.historyButtonText,
        	text: this.historyButtonText,
        	menu: plugin.contextMenu,
            hidden: false,
            scope: this
        }]);
        
        return actions;
    }
        
});

Ext.preg(gxp.plugins.LayerMenuButton.prototype.ptype, gxp.plugins.LayerMenuButton);
