
exports.MessageGenerator = function MessageGenerator(){
  var msgId = 0;
  var that = this;

  this.chat = function(from, body){
    msgId++;
    return {"type":"chat", "id":msgId,'from':from,'body':body, 'time':new Date().getTime()}
  }


  this.queued = function(from, filename, id, meta){
    msgId++;
    return {"type":"enq", "id":msgId,'from':from,'body':filename, 'songId':id, 'time':new Date().getTime(), 'meta':meta}
  }

  this.join = function(who, service, uid, pic){
    msgId++;
    var link = service == 'tw' ?  'http://twitter.com/' + uid : 'http://facebook.com/profile.php?id=' + uid;
    return {"type":"join","id":msgId,'from':who, 'uid':service + '_' + uid, 'serv':service, body:pic, 'time':new Date().getTime()}
  }

  this.stopped = function(who, filename, id, meta){
    msgId++;
    return {"type":"stopped",'songId':id, 'time':new Date().getTime()}
  }

  this.started = function(who, filename, id, meta){
    msgId++;
    return {"type":"started","id":msgId,'from':who,'body':filename, 'songId':id, 'time':new Date().getTime(), 'meta':meta}
  }

  this.left = function(who, uid){
    msgId++;
    return {"type":"left","id":msgId,'from':who,'body':'', 'uid':uid, 'time':new Date().getTime()}
  }

}
