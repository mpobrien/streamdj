var mongoose = require('mongoose')
mongoose.connect('mongodb://localhost/outloud')
var prebuiltArray = ["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]

var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId;

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

var UserSchema = new Schema({ displayName : String, uid : String, avatarUrl : String})
UserSchema.statics.getByUid = function(uid){
  return this.findOne({uid:uid});
}
var User = mongoose.model('User',UserSchema);
exports.User = User;

var UserFavoriteSchema = new Schema({uid:String, scid:Number, songId: {type: ObjectId, ref:'Song'}, ctime:Date});

UserFavoriteSchema.statics.addScFavorite = function(uid, scid, callback){
  //TODO make sure scid exists?
  console.log("sc favoriting");

  UserFavorite.update({uid:uid, scid:scid}, {uid:uid, scid:scid, ctime:new Date()}, {upsert:true}, function(err, docs){console.log(err, docs)});
  Song.update({soundcloudId:scid}, {"$addToSet":{likers:uid}});
}

UserFavoriteSchema.statics.addFavorite = function(uid, songId, callback){
  //TODO make sure scid exists?
  console.log("doin it!");
  UserFavorite.update({uid:uid, songId:songId}, {uid:uid, songId:songId, ctime:new Date()}, {upsert:true}, function(e,d){console.log(e,d)});
  Song.update({_id:songId}, {"$addToSet":{likers:uid}});
}
var UserFavorite = mongoose.model('UserFavorite', UserFavoriteSchema);
exports.UserFavorite = UserFavorite;

var RoomSchema = new Schema({
    roomName : String,
    ctime : Date,
    log : [String],
    nowPlaying : String,
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
