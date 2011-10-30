
exports.MessageGenerator = function MessageGenerator(){
  //var msgId = 0;
  var that = this;

  //////////////////
  this.chat = function(from, body, msgId){
    return {"type":"chat",'from':from,'body':body,'time':new Date().getTime()}
  }


  this.queued = function(from, filename, id, meta, uid){
    return {"type":"enq", 'from':from,'body':filename, 'songId':id, 'time':new Date().getTime(), 'meta':meta, 'uid':uid}
  }

  this.queue_del = function(songId){
    return {"type":"qdel", 'songId':songId};
  }

  this.join = function(who, service, uid, pic, isnew){
    //msgId++;
    var link = service == 'tw' ?  'http://twitter.com/' + uid : 'http://facebook.com/profile.php?id=' + uid;
    return {"type":"join",'from':who, 'uid':uid, 'serv':service, 'isnew':isnew, body:pic, 'time':new Date().getTime()}
  }

  //////////////////
  this.stopped = function(who, filename, id, msgId){
    return {"type":"stopped",'songId':id, 'id':msgId, 'time':new Date().getTime()}
  }


  //////////////////
  this.started = function(who, filename, id, meta, uid, msgId){
    return {"type":"started","id":msgId,'from':who,'body':filename, 'songId':id, 'uid':uid, 'time':new Date().getTime(), 'meta':meta}
  }

  this.left = function(who, uid){
    return {"type":"left",'from':who,'body':'', 'uid':uid, 'time':new Date().getTime()}
  }

  this.liked = function(songId, count){
    return {"type":"liked",'body':count, 'songId':songId, 'time':new Date().getTime()}
  }

}
