var CircularBuffer = require('./cbuf').CircularBuffer;
Array.prototype.remove = function(e) {//{{{
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};//}}}

var ChatRoom = function(){//{{{
  this.history = new CircularBuffer(30);
  this.listeners = [];
  var that = this;

  this.broadcast = function(message, maxId){
    //that.history.push(message);
    that.history.set(maxId, message);
    while(that.listeners.length > 0 ){
      var listenerItem = that.listeners.shift();
      listenerItem.end(message);
    }
  }

  /*this.broadcast = function(message, maxId){*/
  /*//that.history.push(message);*/
  /*that.history.set(maxId, message);*/
  /*var messagestr = JSON.stringify({'m':[message], 'id':that.history._maxMessageId});*/
  /*while(that.listeners.length > 0 ){*/
  /*var listenerItem = that.listeners.shift();*/
  /*listenerItem.end(messagestr);*/
  /*}*/
  /*}*/

  this.getMessages = function(req, res, cursor){
    if(cursor>=0 && cursor<=that.history._maxMessageId){
      var messages = that.history.getSince(cursor);
      res.end(JSON.stringify({'m':messages, 'id':that.history._maxMessageId}));
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
