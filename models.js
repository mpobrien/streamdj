var mongoose = require('mongoose')
mongoose.connect('mongodb://localhost/outloud')
var prebuiltArray = ["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]

var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId;
//var ObjectID = require('mongo').BSONPure.ObjectID

var SongSchema = new Schema({
  title : String,
  artist : String,
  album : String,
  ctime : Date,
  image : String,
  tracklength : Number,
  soundcloudId: Number,
  songId: Number,
});

SongSchema.statics.getById = function(id, callback){
  try{
    var oid = new ObjectID(id)
    this.findOne({_id:new ObjectID(id)}, callback);
  }catch(err){
    callback(null, null);
  }
}

SongSchema.statics.getById = function(id, callback){
  try{
    var oid = new ObjectID(id)
    this.findOne({_id:new ObjectID(id)}, callback);
  }catch(err){
    callback(null, null);
  }
}


var Song =  mongoose.model('Song',SongSchema);
exports.Song = Song;

var Session = mongoose.model('Session',
  new Schema({
    user : {type: ObjectId, ref:'User'},
    displayName : String,
    avatarUrl : String,
    uid : String,
    ctime : Date,
}));
exports.Session = Session;

var UserSchema = new Schema({ displayName : String, uid : String, avatarUrl : String, settings:String})
UserSchema.statics.getByUid = function(uid){
  return this.findOne({uid:uid});
}
var User = mongoose.model('User',UserSchema);
exports.User = User;

var UserFavoriteSchema = new Schema(
  {uid:String,
   title:String,
   artist:String,
   album:String,
   player:String,
   puid:String,
   scid:Number,
   pic:String,
   songId: {type: ObjectId, ref:'User'},
   mtime:Date
});

UserFavoriteSchema.statics.addFavorite = function(uid, songId, scid, title, artist, album, player, pic, player_uid, callback){
  if(scid){
    updatedoc = {title:title,
                 artist:artist,
                 album:album,
                 player:player,
                 mtime:new Date(),
                 player_uid:player_uid}
    if(pic) updatedoc.pic = pic
    UserFavorite.update({uid:uid, scid:scid}, {$set:updatedoc}, {upsert:true},callback);
  }else{
    updatedoc = {uid:uid,
                 songId:songId,
                 title:title,
                 artist:artist,
                 album:album,
                 player:player,
                 mtime:new Date(),
                 player_uid:player_uid}
    if(pic) updatedoc.pic = pic
    UserFavorite.insert(updatedoc, callback);
  }
}
//var UserFavorite = mongoose.model(UserFavoriteSchema, 'UserFavorite');


/*
 *var UserFavoriteSchema = new Schema({faves:[{}], uid:String, numfaves: Number});
 *
 *UserFavoriteSchema.statics.addFavorite = function(uid, scid, title, artist, album, player, pic, player_uid, callback){
 *  var faveItem = { time: new Date(),
 *                    title:title,
 *                    artist:artist,
 *                    album:album,
 *                    player:player,
 *                    puid:player_uid }
 *  if(scid) updateDoc['scid'] = scid;
 *  if(pic) updateDoc['pic']   = pic;
 *
 *  if(scid){
 *    if(scid){
 *      UserFavorite.findOne({uid:uid, "faves":{$elemMatch:{ scid:scid }}}, function(err, result){
 *        if(!result){
 *          UserFavorite.update({uid:uid}, {$push:updateDoc})
 *        }else{
 *          UserFavorite.update({uid:uid, "faves":{$elemMatch:{ scid:scid }}}, function(err, result){
 *        }
 *      })
 *    }
 *  }
 *
 *
 *
 *  UserFavorite.update({uid:uid}, {$push:{"faves":faveItem}, {$inc:{ "numfaves" : 1 } }, {upsert:true}, function(err,docs){
 *    callback();
 *  }
 *}
 */

/*UserFavoriteSchema.statics.addFavorite = function(uid, songId, callback){
  //TODO make sure scid exists?
  console.log("doin it!");
  UserFavorite.update({uid:uid, songId:songId}, {uid:uid, songId:songId, ctime:new Date()}, {upsert:true}, function(e,d){console.log(e,d)});
  Song.update({_id:songId}, {"$addToSet":{likers:uid}});
}*/
var UserFavorite = mongoose.model('UserFavorite', UserFavoriteSchema);
exports.UserFavorite = UserFavorite;

var RoomSchema = new Schema({
    roomName : String,
    ctime : Date,
    log : [String],
    nowPlaying : String,
    people: {},
    creator: {type: ObjectId, ref:'User'},
})
RoomSchema.statics.getByRoomName = function(name, callback){
  this.findOne({roomName:name}, callback);
}

RoomSchema.statics.getCurrentSongByRoomName = function(name, callback){
 this.findOne({roomName:name}, ['nowPlaying'], callback);
}

RoomSchema.statics.getByRoomNameSparse = function(name, callback){
 this.findOne({roomName:name},['roomName'], callback);
}

RoomSchema.statics.addNew = function(name, creatorId, callback){
 var newRoom = new Room();
 newRoom.roomName = name;
 //newRoom.ctime = new Date();
 //newRoom.log = prebuiltArray;
 newRoom.creator = creatorId;
 console.log(newRoom)
 newRoom.save(callback)
}

RoomSchema.statics.addMessageByName = function(roomName,messageText, callback){
   // some day do both in 1 query?
  Room.update({roomName:roomName}, {"$push":{log:messageText}}, function(err, docs){
     Room.update({roomName:roomName}, {"$pop":{log:-1}}, callback)
   })
}

RoomSchema.methods.addMessage = function(messageText, callback){
 // some day do both in 1 query?
 Room.update({_id:this._id}, {"$push":{log:messageText}}, function(err, docs){
   Room.update({_id:this._id}, {"$pop":{log:-1}}, callback)
 })
}

var Room = mongoose.model('Room', RoomSchema);
exports.Room = Room;
