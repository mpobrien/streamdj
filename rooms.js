var HistoryBuffer = require('./buf3').HistoryBuffer;

Array.prototype.remove = function(e) {//{{{
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};//}}}

var ChatRoom = function(){//{{{
  this.history = new HistoryBuffer(30);
  this.listeners = [];
  var that = this;

  this.getMax = function(){
    return that.history.getMax();
  };

  this.broadcast = function(message, messageId){
    that.history.push(message, messageId);
    while(that.listeners.length > 0 ){
      var listenerItem = that.listeners.shift();
      listenerItem.end(JSON.stringify({'m':message, 'c':messageId}));
    }
  }

  this.getMessages = function(req, res, cursor){
    console.log("max:",that.getMax());
    if(cursor>=0 && cursor<that.getMax()){
      var messages = that.history.getFrom(cursor);
      res.end(JSON.stringify({'m':messages, 'id':that.getMax()}));
    }else{
      var errorFunc = function(exception){
        console.log("ERROR - ", exception);
        that.listeners.remove(res);
        res.end();
      }
      var cleanup = function(){
        that.listeners.remove(res);
        res.end();
      }
      req.on("clientError",errorFunc).on("error",errorFunc).on("close",cleanup);
      req.connection.setTimeout(0);
      that.listeners.push(res);
    }
  }
}//}}}

exports.ChatRoom = ChatRoom;
