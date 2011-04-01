
exports.MessageGenerator = function MessageGenerator(){
  var msgId = 0;
  var that = this;

  this.chat = function(from, body){
    msgId++;
    return {"type":"chat", "id":msgId,'from':from,'body':body, 'time':new Date().getTime()}
  }


  this.queued = function(from, filename, id){
    msgId++;
    return {"type":"enq", "id":msgId,'from':from,'body':filename, 'songId':id, 'time':new Date().getTime()}
  }

  this.join = function(who){
    msgId++;
    return {"type":"join","id":msgId,'from':who,'body':'', 'time':new Date().getTime()}
  }

  this.stopped = function(who, filename, id){
    msgId++;
    return {"type":"stopped","id":msgId,'from':who,'body':filename, 'songId':id, 'time':new Date().getTime()}
  }

  this.started = function(who, filename, id){
    msgId++;
    return {"type":"started","id":msgId,'from':who,'body':filename, 'songId':id, 'time':new Date().getTime()}
  }

  this.left = function(who){
    msgId++;
    return {"type":"left","id":msgId,'from':who,'body':'', 'time':new Date().getTime()}
  }

}
