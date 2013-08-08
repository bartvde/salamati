/* This class was adapted from openstreetmap's Quadrilateralise.as file located on GitHub at
 * https://github.com/openstreetmap/potlatch2/blob/master/net/systemeD/potlatch2/tools/Quadrilateralise.as
 * 
 * The purpose of this class is to provide a way to take an existing polygon and modify it so that its corners
 * consist of only right angles.
 */

Ext.namespace("gxp");

gxp.Orthogonalization = {
		
		points: null,
		
		// get the sum of the scores of the polygon
		totalScore: function() {
			var total = 0.0;
			
			// total all of the corners, except the first and last which are taken care of later
			for(var index = 1; index < this.points.length - 1; index++) {
				var score = this.scoreOf(this.points[index-1], this.points[index], this.points[index+1]);
				total += score;
			}
			
			// the first corner of the polygon
			var startScore = this.scoreOf(this.points[this.points.length-1], this.points[0], this.points[1]);
			// the last corner of the polygon
			var endScore = this.scoreOf(this.points[this.points.length-2], this.points[this.points.length-1], this.points[0]);
			total += startScore;
			total += endScore;
			
			return total;
		},
		
		/* returns the score of a corner, this is constructed in a way so that
		 * corners that are straight lines or 90 degree angles score closer to
		 * zero than other angles. The goal is to minimize the total score of the polygon.
		 */
		scoreOf: function(a,b,c) {
			var p = new OpenLayers.Geometry.Point(a.x - b.x, a.y - b.y);
			var q = new OpenLayers.Geometry.Point(c.x - b.x, c.y - b.y);
			
			p = this.normalize(p);
			q = this.normalize(q);
			
			var dotp = p.x * q.x + p.y * q.y;
			
			var score = 2.0 * Math.min(Math.abs(dotp-1.0), Math.min(Math.abs(dotp), Math.abs(dotp + 1)));
			return score;
		},
		
		// helper function to normalize a Point passed in, returns the new normalized point
		normalize: function(point) {
			var magnitude = this.magnitude(point);
			return new OpenLayers.Geometry.Point(point.x/magnitude, point.y/magnitude);
		},
		
		// helper function to find the magnitude or length of the point
		magnitude: function(point) {
			var magnitude = Math.sqrt((point.x * point.x) + (point.y * point.y));
			return magnitude;
		},
		
		// Moves points towards their adjacent points or away from them depending on the angle of that corner
		step: function() {
			var me = this;
			var funct = function (b, i, array){
				  var a = array[(i-1+array.length) % array.length];
				  var c = array[(i+1) % array.length];
				  var p = new OpenLayers.Geometry.Point(a.x - b.x, a.y - b.y);
				  var q = new OpenLayers.Geometry.Point(c.x - b.x, c.y - b.y);
				  var scale = me.magnitude(p) + me.magnitude(q);
				  p = me.normalize(p);
				  q = me.normalize(q);
				  var dotp = p.x*q.x + p.y*q.y;
				  // Copied from Quadrilateralise.as, not sure if there is a better way to handle this
				  // nasty hack to deal with almost-straight segments (angle is closer to 180 than to 90/270).
				  if (dotp < -0.707106781186547) {
				    dotp += 1.0;
				  }
				  var v = new OpenLayers.Geometry.Point(p.x + q.x, p.y + q.y);
				  v = me.normalize(v);
				  v.x = v.x * (0.1 * dotp * scale);
				  v.y = v.y * (0.1 * dotp * scale);
				  return v;
				};
			
			var motions = this.points.map(funct);
			for (var index = 0; index < motions.length; ++index) {
				this.points[index].move(motions[index].x, motions[index].y);
			}
		},
		
		// Updates the polygon with the new points
		updatePolygon: function(feature) {			
		    var newRing = new OpenLayers.Geometry.LinearRing(this.points);
		    feature.geometry.removeComponent(feature.geometry.components[0]);
            feature.geometry.addComponent(newRing);
		},
		
		updateMultiPolygon: function(feature) {
		    var newRing = new OpenLayers.Geometry.LinearRing(this.points);
		    feature.geometry.components[0].removeComponent(feature.geometry.components[0].components[0]);
            feature.geometry.components[0].addComponent(newRing);
		}
};

gxp.Orthogonalization.orthogonalize = function(feature, map) {
	// check for multipolygon or polygon
    if(feature.geometry.CLASS_NAME === "OpenLayers.Geometry.MultiPolygon") {
        this.points = feature.geometry.components[0].components[0].getVertices();        
    } else if(feature.geometry.CLASS_NAME === "OpenLayers.Geometry.Polygon") {
        this.points = feature.geometry.components[0].getVertices();        
    } else {
        alert("wrong type");
        return false;
    }

    // number of steps that it will try to get close to orthogonal
	var steps = 1000;
	// threshold for being considered close enough
	var tolerance = 1.0e-8;
	// the inital score of the polygon
	var score = this.totalScore();
	
	for(var index = 0; index < steps; index++) {
		this.step();
		var newScore = this.totalScore();
		// if the newScore is greater than the old score then we failed
		if(newScore > score) {
			alert("failed");
			return false;
		}
		score = newScore;
		// if the score is less than the tolerance then we succeeded
		if(score < tolerance) {
			break;
		}
	}
	if(feature.geometry.CLASS_NAME === "OpenLayers.Geometry.MultiPolygon") {
	    this.updateMultiPolygon(feature);
	} else {
	    this.updatePolygon(feature);
	}
	
	return true;
}