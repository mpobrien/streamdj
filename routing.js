var Router = function(routings){

  this.routingtable = []

  for(var i=0;i<routings.length;i++){
    this.routingtable.push([new RegExp(routings[i][0]), routings[i][1]])
  }

  var that = this;
  this.route = function(uri){
    for(var i=0;i<that.routingtable.length;i++){
      var matches = that.routingtable[i][0].exec(uri);
      if(matches){ 
        return [that.routingtable[i][1], matches];
      }
    }
    return null;
  }

}

exports.Router = Router;
