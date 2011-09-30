var async = require('async')

var Router = function(routings){

  this.routingtable = []

  for(var i=0;i<routings.length;i++){
    var routingTableItem = [new RegExp(routings[i][0]), routings[i][1]]
    if(routings[i][2]) routingTableItem.push(routings[i][2])
    this.routingtable.push(routingTableItem) //[regex, function, processors]
  }

  var that = this;
  this.getRoutingFunction = function(uri){
    for(var i=0;i<that.routingtable.length;i++){
      var matches = that.routingtable[i][0].exec(uri);
      if(matches){ 
        return [that.routingtable[i], matches] //[[regex, function, processors], matches]
      }
    }
    return null;
  }

  this.route = function(req, res){
    console.log(req.url);
    var qs = require('url').parse(req.url, true)
    var routingResult = that.getRoutingFunction(qs.pathname);
    if(!routingResult){
      res.end("404");
      return;
    }
    var tableItem = routingResult[0]
    var matches = routingResult[1]
    var routeFunction = tableItem[1]
    if(tableItem){
      var processors = tableItem[2]
      if(processors){
        var seriesExecute = function(funcs){
          var getNextCallback = function(index){
            if(funcs.length > index){
              var nextFunc = funcs[index]
              nextFunc(req, res, function(){getNextCallback(index+1)})
            }else{
              routeFunction(req,res,qs, matches);
            }
          }
          getNextCallback(0)
        }
        seriesExecute(processors)
      }else{
        routeFunction(req,res,qs, matches);
      }
    }else{
      res.end("404.");
    }
  }

}
exports.Router = Router;

