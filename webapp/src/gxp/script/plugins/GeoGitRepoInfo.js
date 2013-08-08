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
 *  class = GeoGitRepoInfo
 */

/** api: (extends)
 *  plugins/Tool.js
 */

Ext.ns("gxp.plugins");

gxp.plugins.GeoGitRepoInfo = Ext.extend(gxp.plugins.Tool, {
    ptype: "gxp_geogitrepoinfo",
    
    /* i18n */
    Text_Info: "Info",
    Text_Repos: "Repos",
    Text_Branches: "Branches",
    Text_Local: "Local",
    Text_Remote: "Remote",
    Text_Remotes: "Remotes",
    Text_Tags: "Tags",
    Text_Merge: "Merge",
    Text_FinishViewing: "Please finish viewing and/or editing of features before you attempt to merge.",
    Text_Cancel: "Cancel",
    Text_Accept: "Accept",
    Text_Menu: "Menu",
    Text_CancelPopup: "Are you sure you want to cancel this merge?",
    Text_AcceptPopup: "Are you sure you want to complete this merge?",
    Text_MergeStartPopup: "Are you sure you want to start the merge process?",
    Text_Push: "Push",
    Text_Pull: "Pull",
    Text_RemoteAdd: "Add Remote",
    Text_RemoteRemove: "Remove Remote",
    Text_Fetch: "Fetch",
    Text_FetchAll: "Fetch All",
    Text_TransactionCancelFailed: "Couldn't cancel transaction.",
    Text_TransactionEndFailed: "Couldn't finish transaction.",
    Text_Updated: "updated",
    Text_Added: "added",
    Text_Removed: "removed",
    Text_Modified: "modified",
    Text_UpToDate: " is already up to date.",
    Text_RemoteInfo: "Remote Information",
    Text_URL: "URL",
    Text_Name: "Name",
    Text_URLBlank: "The path to the remote repository.",
    Text_NameBlank: "The name to give this remote.",
    Text_URLValidateFail: "Please provide a path to the remote repository.",
    Text_NameValidateFail: "Please provide a name to give the remote.",
    Text_NameVerification: "Are you sure you want to create a remote called ",
    Text_URLVerification: " from a repository at the location ",
    Text_RemoteExists: "A remote by that name already exists, please enter a different name.",
    Text_RemoteAddError: "There was an error creating this remote.",
    Text_RemoteRemoveVerification: "Are you sure you want to remove this remote from the repository?",
    Text_RemoteRemoveError: "There was an error removing this remote.",
    Text_CommitError: "Couldn't commit: ",
    Text_ConflictResolved: "All conflicts have been resolved, please press the accept button to complete the merge.",
    Text_PushComplete: "Push Completed.",
    Text_PullConflicts: "This pull has resulted in merge conflicts, you will be able to complete this pull as you would a merge.",
    Text_FetchComplete: "Fetch Completed.",
    Text_FetchFailed: "Failed to Fetch from the remote, either that remote doesn't exist or you are unable to connect to it.",
    Text_AutoSync: "Auto-Sync",
    Text_Minutes: "minutes",
    Text_Resume: "Resume",
    Text_Stop: "Stop",
    Text_SyncPullFailed: "There was a problem pulling data from the remote.",
    Text_SyncContinue: "Do you wish to continue trying to auto-sync?",
    Text_SyncEndFailed: "There was a problem ending the sync transaction.",
    Text_SyncPushFailed: "There was a problem pushing to the remote.",
    Text_SyncBeginFailed: "Unable to begin a new sync transaction.",
    Text_SyncActive: "Auto-sync is active right now, to perform this command you must first pause auto-syncing. Press ok to pause auto-syncing then attempt the command again.",
    Text_SyncInProgress: "Auto-sync has been paused, however there is still a sync in progress please wait a few minutes to allow this to finish before trying again.",
    Text_SyncAbort: " Would you like to abort auto sync?",
    /* end i18n */
    
    treeRoot: null,
    
    featureManager: null,
    
    geoserverUrl: null,
    
    // These are used to find the specified node, you can search the treeRoot for a type attribute value equal to these strings
    repoRoot: "RepoRoot",
    
    branchRoot: "BranchRoot",
    
    localBranchRoot: "LocalBranchRoot",
    
    remoteBranchRoot: "RemoteBranchRoot",
    
    remoteRoot: "RemoteRoot",
    
    tagRoot: "TagRoot",
    
    acceptButton: null,
    
    cancelButton: null,
    
    menuButton: null,
    
    contextMenu: null,
    
    originalBranch: null,
    
    numConflicts: 0,
    
    username: null,
    
    useremail: null,
    
    syncObjects: [],
    
    autoSync: null,
    
    syncing: false,
    
    syncPaused: false,
    
    autoSyncInterval: 30000,

    constructor: function() {
        this.addEvents(
                /** api: event[conflictsDetected]
                 *  Fired when conflicts in a merge are found.
                 */
                "conflictsDetected",
                /** api: event[conflictsResolved]
                 *  Fired when all conflicts in a merge are resolved.
                 */
                "conflictResolved"
        );
        this.on({
            conflictsDetected: function(numConflicts) {
                this.numConflicts = numConflicts;
                this.acceptButton.disable();
            },
            conflictResolved: function() {
                this.numConflicts -= 1;
                if(this.numConflicts === 0) {
                    var plugin = this;
                    var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                    var repoNode = selectedNode.parentNode.parentNode.parentNode;
                    var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];
                    
                    var authorString = "";
                    if(plugin.username !== undefined && plugin.username !== null) {
                        authorString += '&authorName=' + encodeURIComponent(plugin.username);
                    }
                    if(plugin.useremail !== undefined && plugin.useremail !== null) {
                        authorString += '&authorEmail=' + encodeURIComponent(plugin.useremail);
                    }
                    
                    OpenLayers.Request.GET({
                        url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/commit?transactionId=' + transactionId + authorString + '&all=true&output_format=JSON',
                        success: function(results){
                            var commitInfo = Ext.decode(results.responseText);
                            if(commitInfo.response.error || commitInfo.response.success === false) {
                                alert(plugin.Text_CommitError + commitInfo.response.error);
                            } else {
                                Ext.Msg.show({
                                    title: plugin.Text_Merge,
                                    msg: plugin.Text_ConflictResolved,
                                    buttons: Ext.Msg.OK,
                                    fn: function(button) {
                                        plugin.acceptButton.enable();
                                    },
                                    scope: plugin,
                                    icon: Ext.MessageBox.INFO
                                });    
                                
                            }
                        },
                        failure: plugin.errorFetching
                    }); 
                    
                }
            },
            scope: this
        });
        gxp.plugins.GeoGitRepoInfo.superclass.constructor.apply(this, arguments);
    },

    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];

        this.treeRoot = new Ext.tree.TreeNode({
            text: this.Text_Info,
            expanded: true,
            isTarget: false,
            allowDrop: false
        });
        var repoNode = this.treeRoot.appendChild(new Ext.tree.TreeNode({
            text: this.Text_Repos,
            expanded: true,
            type: this.repoRoot
        }));
        
        var plugin = this;
        
        this.cancelButton = new Ext.Button({
            text: plugin.Text_Cancel,
            hidden: true,
            handler: function() {
                Ext.Msg.show({
                    title: plugin.Text_Cancel,
                    msg: plugin.Text_CancelPopup,
                    buttons: Ext.Msg.YESNO,
                    fn: function(button) {
                        if(button === "yes") {
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];               
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/endTransaction?cancel=true&transactionId=' + transactionId + '&output_format=JSON',
                                success: function(results){
                                    var transactionInfo = Ext.decode(results.responseText);                       
                                    if(transactionInfo.response.Transaction.ID === undefined) {
                                        plugin.numConflicts = 0;
                                        plugin.originalBranch = null;
                                        gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                        plugin.acceptButton.hide();
                                        plugin.cancelButton.hide();
                                        if(plugin.syncing) {
                                            plugin.syncing = false;
                                            plugin.resumeSync();
                                        }
                                        app.fireEvent("endMerge");
                                    } else {
                                        alert(plugin.Text_TransactionCancelFailed);
                                    }                       
                                },
                                failure: plugin.errorFetching
                            });
                        }
                    },
                    scope: this,
                    icon: Ext.MessageBox.QUESTION,
                    animEl: this.ownerCt.getEl()
                });
            }
        });
        
        this.acceptButton = new Ext.Button({
            text: plugin.Text_Accept,
            hidden: true,
            handler: function() {
                Ext.Msg.show({
                    title: plugin.Text_Accept,
                    msg: plugin.Text_AcceptPopup,
                    buttons: Ext.Msg.YESNO,
                    fn: function(button) {
                        if(button === "yes") {
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];
                            var transactionEndSuccess = function(results){
								var transactionInfo = Ext.decode(results.responseText);                       
								if(transactionInfo.response.Transaction.ID === undefined) {
									gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
									plugin.originalBranch = null;
									plugin.acceptButton.hide();
									plugin.cancelButton.hide();
									app.fireEvent("endMerge");
									if(plugin.syncing) {
										plugin.syncing = false;
										plugin.resumeSync();   
									}
								} else {
									alert(plugin.Text_TransactionEndFailed);
								}                       
							};
                            if(plugin.originalBranch) {
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/checkout?branch=' + plugin.originalBranch + '&transactionId=' + transactionId + '&output_format=JSON',
                                    success: function(results){
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                            success: transactionEndSuccess,
                                            failure: plugin.errorFetching
                                        });
                                    },
                                    failure: plugin.errorFetching
                                });
                            } else {
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                    success: transactionEndSuccess,
                                    failure: plugin.errorFetching
                                });
                            }                           
                        }
                    },
                    scope: this,
                    icon: Ext.MessageBox.QUESTION,
                    animEl: this.ownerCt.getEl()
                });
            }
        });
        
        this.contextMenu = new Ext.menu.Menu({
                items: [
                    {
                        text: plugin.Text_Merge,
                        iconCls: 'salamati-icon-merge',
                        hidden: true,
                        handler: function() {
                            if(!plugin.checkIfSyncing()) {
                                if(app.tools.feature_editor.popup && !app.tools.feature_editor.popup.hidden) {
                                    alert(plugin.Text_FinishViewing);
                                    panel.contextMenu.hide();
                                    return;
                                }
                                Ext.Msg.show({
                                    title: plugin.Text_Merge,
                                    msg: plugin.Text_MergeStartPopup,
                                    buttons: Ext.Msg.YESNO,
                                    fn: function(button) {
                                        if(button === "yes") {
                                            var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                                            var node = panel.getSelectionModel().getSelectedNode();
                                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                                            var workspace = repoNode.attributes.workspace;
                                            var dataStore = repoNode.attributes.dataStore;
                                            OpenLayers.Request.GET({
                                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                                success: function(results){
                                                    var transactionInfo = Ext.decode(results.responseText);
                                                    var transactionId = transactionInfo.response.Transaction.ID;
                                                    gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                                    OpenLayers.Request.GET({
                                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/checkout?branch=' + selectedNode.text + '&transactionId=' + transactionId + '&output_format=JSON',
                                                        success: function(results) {
                                                            var checkoutInfo = Ext.decode(results.responseText);        
                                                            plugin.originalBranch = checkoutInfo.response.OldTarget;
                                                            plugin.acceptButton.enable();
                                                            plugin.acceptButton.show();
                                                            plugin.cancelButton.show();
                                                            var authorString = "";
                                                            if(plugin.username !== undefined && plugin.username !== null) {
                                                                authorString += '&authorName=' + encodeURIComponent(plugin.username);
                                                            }
                                                            if(plugin.useremail !== undefined && plugin.useremail !== null) {
                                                                authorString += '&authorEmail=' + encodeURIComponent(plugin.useremail);
                                                            }
                                                            var dryRunStore = new Ext.data.Store({
                                                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/merge?commit=' + node.text + '&transactionId=' + transactionId + '&output_format=JSON',
                                                                reader: gxp.GeoGitUtil.mergeReader,
                                                                autoLoad: false
                                                            });
                                                            app.fireEvent("beginMerge", dryRunStore, transactionId, selectedNode.text, node.text, true);
                                                        },
                                                        failure: plugin.errorFetching
                                                    });                                   
                                                },
                                                failure: plugin.errorFetching
                                            });
                                        }
                                    },
                                    scope: this,
                                    icon: Ext.MessageBox.QUESTION,
                                    animEl: this.ownerCt.getEl()
                                });

                                panel.contextMenu.hide();
                            }
                        }
                    }, {
                        text: plugin.Text_Push,
                        hidden: true,
                        handler: function() {
                            if(!plugin.checkIfSyncing()) {
                                var node = panel.getSelectionModel().getSelectedNode();
                                var repoNode = node.parentNode.parentNode.parentNode;
                                var workspace = repoNode.attributes.workspace;
                                var dataStore = repoNode.attributes.dataStore;
                                var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                                var refSpec = selectedNode.text + ':' + node.text.substring(0,node.text.indexOf(" ("));
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                    success: function(results){
                                        var transactionInfo = Ext.decode(results.responseText);
                                        var transactionId = transactionInfo.response.Transaction.ID;
                                        gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/push?ref=' + refSpec + '&remoteName=' + node.attributes.remoteName + '&transactionId=' + transactionId + '&output_format=JSON',
                                            success: function(results) {
                                                var pushInfo = Ext.decode(results.responseText);
                                                var msg = "";
                                                if(pushInfo.response.error) {
                                                    msg = pushInfo.response.error;
                                                } else {
                                                    msg = plugin.Text_PushComplete;
                                                }
                                                Ext.Msg.show({
                                                    title: plugin.Text_Push,
                                                    msg: msg,
                                                    buttons: Ext.Msg.OK,
                                                    fn: function(button) {
                                                        OpenLayers.Request.GET({
                                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                            success: function(results){
                                                                var transactionInfo = Ext.decode(results.responseText);                       
                                                                if(transactionInfo.response.Transaction.ID === undefined) {
                                                                    gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                                } else {
                                                                    alert(plugin.Text_TransactionEndFailed);
                                                                }                       
                                                            },
                                                            failure: plugin.errorFetching
                                                        });
                                                    },
                                                    scope: plugin,
                                                    icon: Ext.MessageBox.INFO
                                                });                                            
                                            },
                                            failure: plugin.errorFetching
                                        });                                   
                                    },
                                    failure: plugin.errorFetching
                                });
                                panel.contextMenu.hide();
                            }
                        }
                    }, {
                        text: plugin.Text_Pull,
                        hidden: true,
                        handler: function() {              
                            if(!plugin.checkIfSyncing()) {             
                                var node = panel.getSelectionModel().getSelectedNode();
                                var repoNode = node.parentNode.parentNode.parentNode;
                                var workspace = repoNode.attributes.workspace;
                                var dataStore = repoNode.attributes.dataStore;
                                var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                                var refSpec = node.text.substring(0,node.text.indexOf(" (")) + ':' + selectedNode.text;
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                    success: function(results){
                                        var transactionInfo = Ext.decode(results.responseText);
                                        var transactionId = transactionInfo.response.Transaction.ID;
                                        gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                        var authorString = "";
                                        if(plugin.username !== undefined && plugin.username !== null) {
                                            authorString += '&authorName=' + encodeURIComponent(plugin.username);
                                        }
                                        if(plugin.useremail !== undefined && plugin.useremail !== null) {
                                            authorString += '&authorEmail=' + encodeURIComponent(plugin.useremail);
                                        }
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/pull?ref=' + refSpec + '&remoteName=' + node.attributes.remoteName + '&transactionId=' + transactionId + '&output_format=JSON',
                                            success: function(results) {
                                                app.fireEvent("featureEditorUnselectAll");
                                                var pullInfo = Ext.decode(results.responseText);
                                                var msg = "";
                                                var conflicts = false;
                                                var testStore = null;
                                                if(pullInfo.response.error) {
                                                    msg = pullInfo.response.error;
                                                } else if(pullInfo.response.Pull !== undefined && pullInfo.response.Pull.Ref !== undefined) {
                                                    msg = pullInfo.response.Pull.Ref + " " + plugin.Text_Updated + ": " + pullInfo.response.Pull.Added + " " + plugin.Text_Added + ", " + pullInfo.response.Pull.Removed + " " + plugin.Text_Removed + " , " + pullInfo.response.Pull.Modified + " " + plugin.Text_Modified + ".";
                                                } else if(pullInfo.response.Merge !== undefined && pullInfo.response.Merge.conflicts !== undefined) {
                                                    testStore = new Ext.data.Store({
                                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/',
                                                        reader: gxp.GeoGitUtil.mergeReader,
                                                        autoLoad: false
                                                    });
                                                    testStore.loadData(pullInfo);                                                                                            
                                                    msg = plugin.Text_PullConflicts;
                                                    conflicts = true;
                                                } else {
                                                    msg = selectedNode.text + plugin.Text_UpToDate;
                                                }

                                                Ext.Msg.show({
                                                    title: plugin.Text_Pull,
                                                    msg: msg,
                                                    buttons: Ext.Msg.OK,
                                                    fn: function(button) {
                                                        if(!conflicts) {
                                                            OpenLayers.Request.GET({
                                                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                                success: function(results){
                                                                    var transactionInfo = Ext.decode(results.responseText);
                                                                    if(transactionInfo.response.Transaction.ID === undefined) {
                                                                        gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                                    } else {
                                                                        alert(plugin.Text_TransactionEndFailed);
                                                                    }                       
                                                                },
                                                                failure: plugin.errorFetching
                                                            });
                                                        } else {
                                                            plugin.acceptButton.enable();
                                                            plugin.acceptButton.show();
                                                            plugin.cancelButton.show();
                                                            app.fireEvent("beginMerge", testStore, transactionId, selectedNode.text, node.text, false);
                                                        }
                                                    },
                                                    scope: plugin,
                                                    icon: Ext.MessageBox.INFO
                                                });                                                                                    
                                            },
                                            failure: plugin.errorFetching
                                        });                                   
                                    },
                                    failure: plugin.errorFetching
                                });

                                panel.contextMenu.hide();
                            }
                        }
                    }, {
                        text: plugin.Text_Fetch,
                        hidden: true,
                        handler: function() {
                            if(!plugin.checkIfSyncing()) {
                                var node = panel.getSelectionModel().getSelectedNode();
                                var repoNode = node.parentNode.parentNode;
                                var workspace = repoNode.attributes.workspace;
                                var dataStore = repoNode.attributes.dataStore;
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                    success: function(results){
                                        var transactionInfo = Ext.decode(results.responseText);
                                        var transactionId = transactionInfo.response.Transaction.ID;
                                        gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/fetch?prune=true&remote=' + node.text + '&transactionId=' + transactionId + '&output_format=JSON',
                                            success: function(results) {
                                                var fetchInfo = Ext.decode(results.responseText);
                                                var msg = "";
                                                if(fetchInfo.response.error) {
                                                    msg = plugin.Text_FetchFailed;
                                                } else {
                                                    msg = plugin.Text_FetchComplete;
                                                }
                                                Ext.Msg.show({
                                                    title: plugin.Text_Fetch,
                                                    msg: msg,
                                                    buttons: Ext.Msg.OK,
                                                    fn: function(button) {
                                                        return;
                                                    },
                                                    scope: plugin,
                                                    icon: Ext.MessageBox.INFO
                                                });    
                                                OpenLayers.Request.GET({
                                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                    success: function(results){
                                                        var transactionInfo = Ext.decode(results.responseText);                       
                                                        if(transactionInfo.response.Transaction.ID === undefined) {
                                                            gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                            if(fetchInfo.response.Fetch && fetchInfo.response.Fetch.Remote.Branch) {                                                
                                                                repoNode.remove(true);
                                                                plugin.addRepo(repoNode.attributes.repoId, plugin.geoserverUrl, workspace, dataStore);
                                                            }
                                                        } else {
                                                            alert(plugin.Text_TransactionEndFailed);
                                                        }                       
                                                    },
                                                    failure: plugin.errorFetching
                                                });                                           
                                            },
                                            failure: plugin.errorFetching
                                        });                                   
                                    },
                                    failure: plugin.errorFetching
                                });
                                panel.contextMenu.hide();
                            }
                        }
                    }, {
                        text: plugin.Text_FetchAll,
                        hidden: true,
                        handler: function() {
                            if(!plugin.checkIfSyncing()) {
                                var node = panel.getSelectionModel().getSelectedNode();
                                var repoNode = node.parentNode;
                                var workspace = repoNode.attributes.workspace;
                                var dataStore = repoNode.attributes.dataStore;
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                    success: function(results){
                                        var transactionInfo = Ext.decode(results.responseText);
                                        var transactionId = transactionInfo.response.Transaction.ID;
                                        gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/fetch?all=true&prune=true&transactionId=' + transactionId + '&output_format=JSON',
                                            success: function(results) {
                                                var fetchInfo = Ext.decode(results.responseText);
                                                var msg = "";
                                                if(fetchInfo.response.error) {
                                                    msg = plugin.Text_FetchFailed;
                                                } else {
                                                    msg = plugin.Text_FetchComplete;
                                                }
                                                Ext.Msg.show({
                                                    title: plugin.Text_FetchAll,
                                                    msg: msg,
                                                    buttons: Ext.Msg.OK,
                                                    fn: function(button) {
                                                        return;
                                                    },
                                                    scope: plugin,
                                                    icon: Ext.MessageBox.INFO
                                                });    
                                                OpenLayers.Request.GET({
                                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                    success: function(results){
                                                        var transactionInfo = Ext.decode(results.responseText);                       
                                                        if(transactionInfo.response.Transaction.ID === undefined) {
                                                            gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                            if(fetchInfo.response.Fetch.Remote && fetchInfo.response.Fetch.Remote.Branch) {                                                
                                                                repoNode.remove(true);
                                                                plugin.addRepo(repoNode.attributes.repoId, plugin.geoserverUrl, workspace, dataStore);
                                                            }
                                                        } else {
                                                            alert(plugin.Text_TransactionEndFailed);
                                                        }                       
                                                    },
                                                    failure: plugin.errorFetching
                                                });                                           
                                            },
                                            failure: plugin.errorFetching
                                        });                                   
                                    },
                                    failure: plugin.errorFetching
                                });
                                panel.contextMenu.hide();
                            }
                        }
                    }, {
                        text: plugin.Text_RemoteAdd,
                        hidden: true,
                        handler: function() {
                            var window = new Ext.Window({
                                closable: true,
                                modal: true,
                                draggable: false,
                                resizable: false,
                                hidden: false,
                                height: 200,
                                width: 500,
                                title: plugin.Text_RemoteInfo,
                                layout: "absolute",
                                items: [{
                                    xtype: 'textfield',
                                    allowBlank: false,
                                    height: 30,
                                    anchor: '90%',
                                    x: 50,
                                    y: 30,
                                    emptyText: plugin.Text_URL,
                                    minLength: 1,
                                    blankText: plugin.Text_URLBlank
                                },{
                                    xtype: 'textfield',
                                    allowBlank: false,
                                    x: 50,
                                    y: 70,
                                    height: 30,
                                    anchor: '90%',
                                    emptyText: plugin.Text_Name,
                                    minLength: 1,
                                    blankText: plugin.Text_NameBlank
                                },{
                                    xtype: 'button',
                                    text: plugin.Text_RemoteAdd,
                                    y: 130,
                                    x: 25,
                                    height: 30,
                                    anchor: '95%',
                                    handler: function(){
                                        if(!window.items.items[0].validate()) {
                                            alert(plugin.Text_URLValidateFail);
                                            return;
                                        } else if (!window.items.items[1].validate()) {
                                            alert(plugin.Text_NameValidateFail);
                                            return;
                                        }
                                        var name = window.items.items[1].getValue();
                                        var path = window.items.items[0].getValue();
                                        Ext.Msg.show({
                                            title: plugin.Text_RemoteAdd,
                                            msg: plugin.Text_NameVerification + name + plugin.Text_URLVerification + path + "?",
                                            buttons: Ext.Msg.YESNO,
                                            fn: function(button) {
                                                if(button === "yes") {
                                                    var remoteNode = panel.getSelectionModel().getSelectedNode();
                                                    var repoNode = remoteNode.parentNode;
                                                    var workspace = repoNode.attributes.workspace;
                                                    var dataStore = repoNode.attributes.dataStore;
                                                    OpenLayers.Request.GET({
                                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/remote?remoteName=' + name + '&remoteURL=' + path + '&output_format=JSON',
                                                        success: function(results){
                                                            var remoteInfo = Ext.decode(results.responseText);                                                           
                                                            if(remoteInfo.response.name) {
                                                                remoteNode.appendChild(new Ext.tree.TreeNode({
                                                                    text: remoteInfo.response.name
                                                                }));
                                                                window.close();
                                                            } else {
                                                                var msg = "";
                                                                if(remoteInfo.response.error === "REMOTE_ALREADY_EXISTS") {
                                                                    msg = plugin.Text_RemoteExists;
                                                                } else {
                                                                    msg = plugin.Text_RemoteAddError;
                                                                    console.log("error", remoteInfo.response.error);
                                                                }
                                                                Ext.Msg.show({
                                                                    title: plugin.Text_RemoteAdd,
                                                                    msg: msg,
                                                                    buttons: Ext.Msg.OK,
                                                                    fn: function(button) {
                                                                        return;
                                                                    },
                                                                    scope: plugin,
                                                                    icon: Ext.MessageBox.WARNING
                                                                });
                                                            }
                                                        },
                                                        failure: plugin.errorFetching
                                                    });                                                    
                                                }
                                            },
                                            scope: plugin,
                                            icon: Ext.MessageBox.QUESTION,
                                            animEl: this.ownerCt.getEl()
                                        });                                        
                                    }
                                }]
                            });
                            panel.contextMenu.hide();
                        }
                    }, {
                        text: plugin.Text_RemoteRemove,
                        hidden: true,
                        handler: function() {
                            Ext.Msg.show({
                                title: plugin.Text_RemoteRemove,
                                msg: plugin.Text_RemoteRemoveVerification,
                                buttons: Ext.Msg.YESNO,
                                fn: function(button) {
                                    if(button === "yes") {
                                        var remoteNode = panel.getSelectionModel().getSelectedNode();
                                        var name = remoteNode.text;
                                        var repoNode = remoteNode.parentNode.parentNode;
                                        var workspace = repoNode.attributes.workspace;
                                        var dataStore = repoNode.attributes.dataStore;
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/remote?remoteName=' + name + '&remove=true&output_format=JSON',
                                            success: function(results){
                                                var remoteInfo = Ext.decode(results.responseText);                                                           
                                                if(remoteInfo.response.name) {
                                                    remoteNode.remove(true);
                                                } else {
                                                    var msg = plugin.Text_RemoteRemoveError;
                                                    console.log("error", remoteInfo.response.error);
                                                    Ext.Msg.show({
                                                        title: plugin.Text_RemoteRemove,
                                                        msg: msg,
                                                        buttons: Ext.Msg.OK,
                                                        fn: function(button) {
                                                            return;
                                                        },
                                                        scope: plugin,
                                                        icon: Ext.MessageBox.WARNING
                                                    });
                                                }
                                            },
                                            failure: plugin.errorFetching
                                        });      
                                    }
                                },
                                scope: plugin,
                                icon: Ext.MessageBox.QUESTION
                            });
                            panel.contextMenu.hide();
                        }
                    }, {
                        text: plugin.Text_AutoSync,
                        hidden: true,
                        menu: {
                            items: [{
                                text: "5 " + plugin.Text_Minutes,
                                handler: function() {
                                	plugin.addSyncObject(panel,300000);
                                }
                            }, {
                                text: "15 " + plugin.Text_Minutes,
                                handler: function() {
                                	plugin.addSyncObject(panel,900000);
                                }
                            }, {
                                text: "30 " + plugin.Text_Minutes,
                                handler: function() {
                                	plugin.addSyncObject(panel,1800000);
                                }
                            }]
                        }
                    }, {
                        text: plugin.Text_Stop + " " + plugin.Text_AutoSync, 
                        hidden: true,
                        handler: function() {
                            var node = panel.getSelectionModel().getSelectedNode();
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                            for(var index = 0; index < plugin.syncObjects.length; index++) {
                                var object = plugin.syncObjects[index];
                                if(object.localBranch === selectedNode.text && object.remoteBranch === node.text.substring(0,node.text.indexOf(" (")) && object.remoteName === node.attributes.remoteName) {
                                	if(plugin.syncObjects.length === 1) {
                                		clearTimeout(plugin.autoSync);
                               			plugin.autoSync = null;
                            		}
                                    plugin.syncObjects.splice(index, 1);
                                    break;
                                }
                            }    
                        }
                    }, {
                        text: plugin.Text_Resume + " " + plugin.Text_AutoSync, 
                        hidden: true,
                        handler: function() {
                            plugin.resumeSync();
                        }
                    }
                ]
            });
        
        this.menuButton = new Ext.Button({
            text: plugin.Text_Menu,
            hidden: false,
            menu: plugin.contextMenu
        });
        
        var panel = new Ext.tree.TreePanel({
            root: this.treeRoot,
            rootVisible: false,
            border: false,
            autoScroll: true,
            hideHeaders: false,
            fields: ['text', 'menu'],
            tbar: [this.acceptButton, this.cancelButton, this.menuButton],
            columns: [{
                xtype: 'treecolumn', //this is so we know which column will show the tree
                text: 'Branches',
                dataIndex: 'text',
                sortable: false
            },{
        	 xtype: 'actioncolumn',
                 width: 50,
                 items: [{
                     icon: Ext.MessageBox.INFO,
                     // Use a URL in the icon config
                     tooltip: 'Edit',
                     handler: function (grid, rowIndex, colIndex) {
                         var rec = grid.getStore().getAt(rowIndex);
                         alert("Edit " + rec.get('firstname'));
                     }
                 }]
            }],
            listeners: {
                contextmenu: function(node, event) {
                    if(!node.isSelected()) {
                        panel.getSelectionModel().select(node);
                    }
                    
                    for(var i = 0; i < plugin.contextMenu.items.items.length; i++) {
                	plugin.contextMenu.items.items[i].hide();
                    }
                  
                    if(node.attributes.type === plugin.remoteRoot) {
                        var repoNode = node.parentNode;
                        if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                            plugin.contextMenu.items.items[4].show();
                            plugin.contextMenu.items.items[5].show();
                            plugin.contextMenu.showAt(event.getXY());
                            event.stopEvent();
                        }
                    } else if(node.parentNode.attributes.type === plugin.remoteRoot) {  
                        var repoNode = node.parentNode.parentNode;
                        if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                            repoInfo.contextMenu.items.items[3].show();
                            repoInfo.contextMenu.items.items[6].show();
                            repoInfo.contextMenu.showAt(event.getXY());
                            event.stopEvent();
                        }
                    } else {
                        var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                        if(selectedNode) {
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            if(node.parentNode.attributes.type === plugin.localBranchRoot) {                                
                                if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                    if(selectedNode !== node) {
                                        if(repoNode.attributes.repoId === node.parentNode.parentNode.parentNode.attributes.repoId) {                                       
                                            repoInfo.contextMenu.items.items[0].show(); 
                                            repoInfo.contextMenu.showAt(event.getXY());
                                            event.stopEvent();
                                        }
                                    }
                                }
                            }
                            else if(node.parentNode.attributes.type === plugin.remoteBranchRoot) {
                                if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                    if(repoNode.attributes.repoId === node.parentNode.parentNode.parentNode.attributes.repoId) {  
                                        repoInfo.contextMenu.items.items[1].show();
                                        repoInfo.contextMenu.items.items[2].show();
                                        if(plugin.syncPaused) {
                                            repoInfo.contextMenu.items.items[9].show();
                                        } else {
                                            var found = false;
                                            for(var index = 0; index < plugin.syncObjects.length; index++) {
                                                var object = plugin.syncObjects[index];
                                                if(object.localBranch === selectedNode.text && object.remoteBranch === node.text.substring(0,node.text.indexOf(" (")) && object.remoteName === node.attributes.remoteName) {
                                                    found = true;
                                                    break;
                                                }
                                            }    
                                            if(found) {
                                                repoInfo.contextMenu.items.items[8].show();
                                            } else {
                                                repoInfo.contextMenu.items.items[7].show();
                                            }
                                        }
                                        repoInfo.contextMenu.showAt(event.getXY());
                                        event.stopEvent();
                                    }
                                }
                            } 
                        }
                    }                                   
                },
                beforeclick: function(node, event) {
                    if(!node.isSelected()) {
                        panel.getSelectionModel().select(node);
                    }
                    
                    for(var i = 0; i < plugin.contextMenu.items.items.length; i++) {
                	plugin.contextMenu.items.items[i].hide();
                    }
                  
                    if(node.attributes.type === plugin.remoteRoot) {
                        var repoNode = node.parentNode;
                        if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                            plugin.contextMenu.items.items[4].show();
                            plugin.contextMenu.items.items[5].show();
                            event.stopEvent();
                        }
                    } else if(node.parentNode.attributes.type === plugin.remoteRoot) {  
                        var repoNode = node.parentNode.parentNode;
                        if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                            plugin.contextMenu.items.items[3].show();
                            plugin.contextMenu.items.items[6].show();
                            event.stopEvent();
                        }
                    } else {
                        var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                        if(selectedNode) {
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            if(node.parentNode.attributes.type === plugin.localBranchRoot) {                                
                                if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                    if(selectedNode !== node) {
                                        if(repoNode.attributes.repoId === node.parentNode.parentNode.parentNode.attributes.repoId) {                                       
                                            plugin.contextMenu.items.items[0].show(); 
                                            event.stopEvent();
                                        }
                                    }
                                }
                            }
                            else if(node.parentNode.attributes.type === plugin.remoteBranchRoot) {
                                if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                    if(repoNode.attributes.repoId === node.parentNode.parentNode.parentNode.attributes.repoId) {  
                                	plugin.contextMenu.items.items[1].show();
                                	plugin.contextMenu.items.items[2].show();
                                        if(plugin.syncPaused) {
                                            plugin.contextMenu.items.items[9].show();
                                        } else {
                                            var found = false;
                                            for(var index = 0; index < plugin.syncObjects.length; index++) {
                                                var object = plugin.syncObjects[index];
                                                if(object.localBranch === selectedNode.text && object.remoteBranch === node.text.substring(0,node.text.indexOf(" (")) && object.remoteName === node.attributes.remoteName) {
                                                    found = true;
                                                    break;
                                                }
                                            }    
                                            if(found) {
                                        	plugin.contextMenu.items.items[8].show();
                                            } else {
                                        	plugin.contextMenu.items.items[7].show();
                                            }
                                        }
                                        event.stopEvent();
                                    }
                                }
                            } 
                        }
                    }                                   
                },
                beforedblclick: function(node, event) {                  
                    if(node.attributes.selected !== undefined) {
                        var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                        if(selectedNode) {
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            if(gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                return false; 
                            }
                            selectedNode.attributes.selected = false;
                            selectedNode.setCls('');
                            if(selectedNode.text === node.text) {
                                return false;
                            }
                        }
                        
                        node.attributes.selected = true;
                        node.setCls('gxp-selected-branch-cls');
                        return false;
                    }
                }
            },
            contextMenu: plugin.contextMenu
        });

        config = Ext.apply(panel, config || {});

        var repoInfo = gxp.plugins.GeoGitRepoInfo.superclass.addOutput.call(this, config);
        
        var onLayerChange = function(tool, layerRecord, schema) {
            if(schema && schema.url){
                var typeName = schema.reader.raw.featureTypes[0].typeName;
                var workspace = schema.reader.raw.targetPrefix;
                
                if(layerRecord && layerRecord.data && layerRecord.data.layer){
                    var key = workspace + ':' + typeName;
                    
                    //isGeogit
                    var callback = function(layer){
                        if(layer !== false) {
                            var geoserverIndex = layer.url.indexOf('geoserver/');
                            plugin.addRepo(layer.metadata.repoId, layer.url.substring(0, geoserverIndex + 10), workspace, layer.metadata.geogitStore);
                        }
                    };
                    
                    gxp.GeoGitUtil.isGeoGitLayer(layerRecord.data.layer, callback);
                }
            }
        };

        if (featureManager.featureStore) {
            onLayerChange.call(this);
        } 
        featureManager.on("layerchange", onLayerChange, this);
        
        return repoInfo;
    },
    
    addRepo: function(repoId, url, workspace, dataStore) {
        var node = this.treeRoot.findChild("repoId", repoId, true);
        if(node === null) {
            node = this.treeRoot.findChild("type", this.repoRoot);
            var repoName = repoId.substring(repoId.lastIndexOf('/' || '\\') + 1, repoId.length);
            var repoNode = node.appendChild(new Ext.tree.TreeNode({
                text: repoName,
                expanded: true,
                repoId: repoId,
                workspace: workspace,
                dataStore: dataStore
            }));
            
            var branchNode = repoNode.appendChild(new Ext.tree.TreeNode({
                text: this.Text_Branches,
                expanded: true,
                type: this.branchRoot
            }));
            
            var plugin = this;
            if(plugin.geoserverUrl === null) {
                plugin.geoserverUrl = url;
            }
            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/branch?list=true&remotes=true&output_format=JSON',
                success: function(results){
                    var branchInfo = Ext.decode(results.responseText);
                    var localBranchNode = branchNode.appendChild(new Ext.tree.TreeNode({
                        text: plugin.Text_Local,
                        expanded: true,
                        type: plugin.localBranchRoot
                    }));
                    var remoteBranchNode = branchNode.appendChild(new Ext.tree.TreeNode({
                        text: plugin.Text_Remote,
                        expanded: true,
                        type: plugin.remoteBranchRoot
                    }));
                    
                    if(branchInfo.response.Local.Branch !== undefined) {
                        var length = branchInfo.response.Local.Branch.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Local.Branch[index], localBranchNode, workspace, dataStore);
                            }
                        } else {
                            plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Local.Branch, localBranchNode, workspace, dataStore);
                        }
                    }
                    if(branchInfo.response.Remote.Branch !== undefined) {
                        var length = branchInfo.response.Remote.Branch.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Remote.Branch[index], remoteBranchNode, workspace, dataStore);
                            }
                        } else {
                            plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Remote.Branch, remoteBranchNode, workspace, dataStore);
                        }
                    }
                },
                failure: plugin.errorFetching
            });
            
            var remoteNode = repoNode.appendChild(new Ext.tree.TreeNode({
                text: this.Text_Remotes,
                expanded: true,
                type: this.remoteRoot
            }));
            
            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/remote?list=true&output_format=JSON',
                success: function(results){
                    var remoteInfo = Ext.decode(results.responseText);
                    if(remoteInfo.response.Remote !== undefined) {
                        var length = remoteInfo.response.Remote.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                remoteNode.appendChild(new Ext.tree.TreeNode({
                                    text: remoteInfo.response.Remote[index].name
                                }));
                            }
                        } else {
                            remoteNode.appendChild(new Ext.tree.TreeNode({
                                text: remoteInfo.response.Remote.name
                            }));
                        }
                    }
                },
                failure: plugin.errorFetching
            });
            
            var tagNode = repoNode.appendChild(new Ext.tree.TreeNode({
                text: this.Text_Tags,
                expanded: true,
                type: this.tagRoot
            }));
            
            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/tag?list=true&output_format=JSON',
                success: function(results){
                    var tagInfo = Ext.decode(results.responseText);
                    if(tagInfo.response.Tag !== undefined) {
                        var length = tagInfo.response.Tag.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                tagNode.appendChild(new Ext.tree.TreeNode({
                                    text: tagInfo.response.Tag[index].name
                                }));
                            }
                        } else {
                            tagNode.appendChild(new Ext.tree.TreeNode({
                                text: tagInfo.response.Tag.name
                            }));
                        }
                    }
                },
                failure: plugin.errorFetching
            });
        }
    },
    
    addBranchNode: function(url, branchInfo, parentNode, workspace, dataStore) {
        var name = branchInfo.name;
        if(name === "HEAD") {
            return;
        }
        var plugin = this;
        var path = "";
        if(parentNode.attributes.type === this.remoteBranchRoot) {
            path = "refs/remotes/" + branchInfo.remoteName + "/";
            name += " (" + branchInfo.remoteName + ")";
        }
        path += branchInfo.name;      
        
        var branchNode = parentNode.appendChild(new Ext.tree.TreeNode({
            text: name,
            // boolean to determine which branch is 'checked out' for use with merge
            selected: parentNode.attributes.type === this.remoteBranchRoot ? undefined : false,
            remoteName: parentNode.attributes.type === this.remoteBranchRoot ? branchInfo.remoteName : undefined      
        }));
        
        OpenLayers.Request.GET({
            url: url + 'geogit/' + workspace + ':' + dataStore + '/ls-tree?path=' + path + '&output_format=JSON',
            success: function(results){
                var featureTypeInfo = Ext.decode(results.responseText);
                var length = featureTypeInfo.response.node.length;
                if(length !== undefined) {
                    for(var index = 0; index < length; index++) {
                        branchNode.appendChild(new Ext.tree.TreeNode({
                            text: featureTypeInfo.response.node[index].path
                        }));
                    }
                } else {
                    branchNode.appendChild(new Ext.tree.TreeNode({
                        text: featureTypeInfo.response.node.path
                    }));
                }
            },
            failure: plugin.errorFetching
        });
    },

    sync: function() {
        var time = new Date().getTime();
        var plugin = this;
        if(this.syncObjects.length > 0 && this.syncObjects[0].timeStamp <= time && !this.syncing) {
            this.syncing = true;
            var object = this.syncObjects[0];

            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + object.workspace + ':' + object.dataStore + '/beginTransaction?output_format=JSON',
                success: function(results){
                    var transactionInfo = Ext.decode(results.responseText);
                    var transactionId = transactionInfo.response.Transaction.ID;
                    var timeout = setTimeout(function(){
                        OpenLayers.Request.GET({
                            url: plugin.geoserverUrl + 'geogit/' + object.workspace + ':' + object.dataStore + '/endTransaction?cancel=true&transactionId=' + transactionId + '&output_format=JSON',
                            success: function(results){
                                var transactionInfo = Ext.decode(results.responseText);                       
                                if(transactionInfo.response.Transaction.ID !== undefined) {
                                    alert(plugin.Text_TransactionEndFailed);
                                }
                                plugin.syncing = false;
                            },
                            failure: plugin.errorFetching
                        });}, 600000);
                    OpenLayers.Request.GET({
                        url: plugin.geoserverUrl + 'geogit/' + object.workspace + ':' + object.dataStore + '/pull?ref=' + object.remoteBranch + ':' + object.localBranch + '&remoteName=' + object.remoteName + '&transactionId=' + transactionId + '&output_format=JSON',
                        success: function(results) {
                            var pullInfo = Ext.decode(results.responseText);
                            var msg = "";
                            var conflicts = false;
                            var testStore = null;
                            if(pullInfo.response.error) {
                                msg = plugin.Text_SyncPullFailed + pullInfo.response.error;
                            } else if(pullInfo.response.Merge !== undefined && pullInfo.response.Merge.conflicts !== undefined) {
                                testStore = new Ext.data.Store({
                                    url: plugin.geoserverUrl + 'geogit/' + object.workspace + ':' + object.dataStore + '/',
                                    reader: gxp.GeoGitUtil.mergeReader,
                                    autoLoad: false
                                });
                                testStore.loadData(pullInfo);                                                                                            
                                msg = plugin.Text_SyncPullFailed + plugin.Text_PullConflicts;
                                conflicts = true;
                                gxp.GeoGitUtil.addTransactionId(transactionId, object.repoId);                                
                            }
                            if(msg !== "") {
                                clearTimeout(timeout);
                                Ext.Msg.show({
                                    title: plugin.Text_Pull,
                                    msg: msg,
                                    buttons: Ext.Msg.OK,
                                    fn: function(button) {
                                        if(!conflicts) {
                                            Ext.Msg.show({
                                                title: plugin.Text_AutoSync,
                                                msg: plugin.Text_SyncContinue,
                                                buttons: Ext.Msg.YESNO,
                                                fn: function(button) {
                                                    if(button === "yes") {
                                                        OpenLayers.Request.GET({
                                                            url: plugin.geoserverUrl + 'geogit/' + object.workspace + ':' + object.dataStore + '/endTransaction?cancel=true&transactionId=' + transactionId + '&output_format=JSON',
                                                            success: function(results){
                                                                var transactionInfo = Ext.decode(results.responseText);                       
                                                                if(transactionInfo.response.Transaction.ID !== undefined) {
                                                                    alert(plugin.Text_TransactionEndFailed);
                                                                }
                                                                plugin.syncing = false;
                                                                plugin.syncObjects[0].timeStamp = new Date().getTime() + plugin.syncObjects[0].syncInterval;
                                                                plugin.syncObjects.sort(function(a,b){return a.timeStamp-b.timeStamp});  
                                                            },
                                                            failure: plugin.errorFetching
                                                        });
                                                    } else {
                                                        plugin.pauseSync();
                                                    }
                                                },
                                                scope: plugin,
                                                icon: Ext.MessageBox.QUESTION
                                            });                                              
                                        } else {                                            
                                            plugin.pauseSync();
                                            plugin.acceptButton.enable();
                                            plugin.acceptButton.show();
                                            plugin.cancelButton.show();
                                            app.fireEvent("featureEditorUnselectAll");
                                            app.fireEvent("beginMerge", testStore, transactionId, object.remoteBranch+" (" + object.remoteName + ")", object.localBranch, false);
                                        }
                                    },
                                    scope: plugin,
                                    icon: Ext.MessageBox.INFO
                                });  
                            } else {
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + object.workspace + ':' + object.dataStore + '/push?ref=' + object.localBranch + ':' + object.remoteBranch + '&remoteName=' + object.remoteName + '&transactionId=' + transactionId + '&output_format=JSON',
                                    success: function(results) {
                                        var pushInfo = Ext.decode(results.responseText);
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + object.workspace + ':' + object.dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                            success: function(results){
                                                var transactionInfo = Ext.decode(results.responseText);                       
                                                if(transactionInfo.response.Transaction.ID !== undefined) {
                                                    alert(plugin.Text_TransactionEndFailed);
                                                }
                                                clearTimeout(timeout);
                                                plugin.syncObjects[0].timeStamp = new Date().getTime() + plugin.syncObjects[0].syncInterval;
                                                plugin.syncObjects.sort(function(a,b){return a.timeStamp-b.timeStamp});            
                                                plugin.syncing = false;
                                            },
                                            failure: function() {
                                            	plugin.syncError(plugin.Text_SyncEndFailed, object);
                                            }
                                        });                                     
                                    },
                                    failure: function() {
										plugin.syncError(plugin.Text_SyncPushFailed, object);
									}
                                });                                  
                            }
                        },
                        failure: function() {
							plugin.syncError(plugin.Text_SyncPullFailed, object);
						} 
                    });                                   
                },
                failure:  function() {
					plugin.syncError(plugin.Text_SyncBeginFailed, object);
				}
            });          
        }

        if(this.autoSync !== null) {
            this.autoSync = setTimeout(function(){plugin.sync();}, plugin.autoSyncInterval);
        }       
    },
    
    pauseSync: function() {
        clearTimeout(this.autoSync);
        this.autoSync = null;
        this.syncPaused = true;
    },
    
    resumeSync: function() {        
        for(var index = 0; index < this.syncObjects.length; index++) {
            this.syncObjects[index].timeStamp = new Date().getTime() + this.syncObjects[index].syncInterval;
        }
        this.syncObjects.sort(function(a,b){return a.timeStamp-b.timeStamp});
        var plugin = this;
        this.autoSync = setTimeout(function(){plugin.sync();}, plugin.autoSyncInterval);
        this.syncPaused = false;
    },
    
    checkIfSyncing: function() {
        var plugin = this;
        if(this.autoSync !== null) {
            Ext.Msg.show({
                title: plugin.Text_AutoSync,
                msg: plugin.Text_SyncActive,
                buttons: Ext.Msg.OKCANCEL,
                fn: function(button) {
                    if(button === "ok") {
                        plugin.pauseSync();
                        if(plugin.syncing) {
                            alert(plugin.Text_SyncInProgress);
                        }
                    }
                },
                scope: plugin,
                icon: Ext.MessageBox.QUESTION
            }); 
            return true;
        } else {
            return false;
        }
    },
    
    syncError: function(message, syncObject) {
    	if(message === null || message === undefined) {
    		message = "";
    	}
    	var plugin = this;
        Ext.Msg.show({
			title: plugin.Text_AutoSync,
			msg: message + plugin.Text_SyncAbort,
			buttons: Ext.Msg.YESNO,
			fn: function(button) {
				if(button === "yes") {
					if(plugin.syncObjects.length === 1) {
						clearTimeout(plugin.autoSync);
						plugin.autoSync = null;
                    }
					plugin.syncObjects.splice(0, 1);
				} else {
					plugin.syncObjects[0].timeStamp = new Date().getTime() + plugin.syncObjects[0].syncInterval;
                    plugin.syncObjects.sort(function(a,b){return a.timeStamp-b.timeStamp});            
				}
				plugin.syncing = false;
			},
			scope: plugin,
			icon: Ext.MessageBox.QUESTION
		}); 
    },
    
    addSyncObject: function(panel, interval) {
    	var plugin = this;
		var node = panel.getSelectionModel().getSelectedNode();
		var repoNode = node.parentNode.parentNode.parentNode;
		var workspace = repoNode.attributes.workspace;
		var dataStore = repoNode.attributes.dataStore;
		var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
		var syncObject = {
				dataStore: dataStore,
				workspace: workspace,
				localBranch: selectedNode.text,
				remoteBranch: node.text.substring(0,node.text.indexOf(" (")),
				remoteName: node.attributes.remoteName,
				repoId: repoNode.attributes.repoId,
				timeStamp: new Date().getTime() + interval,
				syncInterval: interval
		}
		plugin.syncObjects.push(syncObject);
		plugin.syncObjects.sort(function(a,b){return a.timeStamp-b.timeStamp});
		if(plugin.autoSync === null) {
			plugin.autoSync = setTimeout(function(){plugin.sync();}, plugin.autoSyncInterval);
		}
    },
    
    errorFetching: function(){
        throw "GeoGitRepoInfo: Error fetching info";
    }
    
});



Ext.preg(gxp.plugins.GeoGitRepoInfo.prototype.ptype, gxp.plugins.GeoGitRepoInfo);
