var Cookies   = require('cookies')
var Session   = require('./models').Session

var lookupUser = function(req, res, callback){
  var cookies = new Cookies(req, res)
  if( !cookies.get("session") ){
    req.user = null;
    callback();
  }else{
    var sessionId = cookies.get("session");
    Session.findById(sessionId, function(err, doc){
      if(doc){
        req.user = doc;
      }else{
        req.user = null;
      }
      callback();
    });
  }
}
exports.lookupUser = lookupUser

