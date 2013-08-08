#Salamati

Salamati is a web client based on OpenLayers that provides capabilities for editing features and interacting with GeoGit repositories

##Features
 * Add/Remove/Re-order WMS, WFS, and GeoGit layers
 * Edit geometries for 2D point, line, and polygon features
 * Edit attributes for point, line, and polygon features
 * View the edit history of a feature in a GeoGit data store
 * Basic merge capabilities for GeoGit data stores
 * Temporal playback for temporal layers
 * Intergration with GeoNode

##Build Instructions
**Example**

```ant -f suitesdk/build.xml -Dapp.path=../webapp/ -Dsdk.build=../build -Dapp.name=salamati package```

 * suitesdk/build.xml = path/to/OpenGeoClientSDK/ant/script
 * app.path = path/to/webapp/source/code
 * sdk.build = path/to/output/build/directory
 * app.name = name of packaged war file
 * package = ant target to build and package war file

**N.B.** The ant script does not contain a clean step so you may have to add one for local builds.

See [here](http://suite.opengeo.org/opengeo-docs/usermanual/tutorials/clientsdk.html) for more information about the OpenGeo ClientSDK.

##Deploying the war
Here are some ways to deploy the generated war file (there are probably others):
 * Copy the war file to your J2EE container's webapps folder, i.e. .../tomcat7/webapps
 * Use the Tomcat Manager web app, or equivalent for other J2EE container, to deploy an uploaded war
 * Use the *deploy* target in the suitesdk/build.xml ant script to deploy using [Cargo](http://cargo.codehaus.org/)
 * Set up a custom [Cargo](http://cargo.codehaus.org/) deployment
 
##Deploying through GeoServer
 **Example**
 
 * Run GeoServer.
 * In Terminal, navigate to the Salamati folder and run the following:
 
 ```ant -f suitesdk/build.xml -Dapp.path=../webapp/ -Dsdk.build=../build -Dapp.name=salamati -Dapp.proxy.geoserver=http://localhost:8080/geoserver debug```
 
 * This should deploy to port 9080 by default (the console will output the port number)
 * This will also allow you to update the files without having to remake the war file. Just save and refresh the webpage.

##License

Salamati is licensed under [GNU GPL 2.0] (http://www.gnu.org/licenses/gpl.html)

Copyright (c) 2013, LMN Solutions LLC.
All rights reserved.

Salamati is free software: you can redistribute it and/or
modify it under the terms of the GNU General Public License as published by the
Free Software Foundation, either version 3 of the License, or (at your option)
any later version.

Salamati is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
details.
