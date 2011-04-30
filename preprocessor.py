import redis
import json
import os
import mutagen
import subprocess
r = redis.Redis(host='localhost',port=6379,db=0)

UNKNOWN = '(Unknown)'

def main():
  while True:
    "waiting"
    message = r.blpop("newsongready");
    songInfo = json.loads(message[1])
    # incoming: {"path":fullPath, "room":roomname, "uploader":uploaderInfo.name}
    mutagenInfo = mutagen.File(songInfo['path'], easy=True)

    if not mutagenInfo.tags:
      artist, album, title = UNKNOWN, UNKNOWN, UNKNOWN
    else:
      if mutagenInfo.tags.get('artist'): artist = mutagenInfo.tags.get('artist')[0]
      else: artist = UNKNOWN

      if mutagenInfo.tags.get('album'): album = mutagenInfo.tags.get('album')[0]
      else: album = UNKNOWN

      if mutagenInfo.tags.get('title'): title = mutagenInfo.tags.get('title')[0]
      else: title = UNKNOWN

    if title == UNKNOWN and artist == UNKNOWN:
      title = songInfo.get('fname', UNKNOWN);

    metadata = {'Artist' : artist,
                'Title'  : title,
                'Album'  : album,
                'length' : mutagenInfo.info.length}
    newSongId = r.incr("maxsongid")

    # Do we need to convert?
    mime = mutagenInfo._FileType__get_mime();
    print mime
    if 'audio/mp3' not in mime: #it's not an mp3! convert this bitch
      inputpath = songInfo['path']
      outputpath = songInfo['path'] + ".out.mp3"
      retcode = subprocess.call(["ffmpeg", "-i", inputpath, "-b", "48k", outputpath])
      if retcode == 0:
        os.remove(inputpath)
      print "converted", retcode, outputpath
    else:
      outputpath = songInfo['path']


    outgoingMessage = {'room':songInfo['room'],'uploader':songInfo['uploader'], 'path':outputpath, 'meta':metadata, 'songId':newSongId}
    print json.dumps(outgoingMessage)
    streamMessage = json.dumps( {'path':outputpath, 'name':songInfo['fname'], 'uploader':songInfo['uploader'], 'songId':newSongId, 'meta':metadata});
    r.rpush("roomqueue_" + songInfo['room'], streamMessage);
    r.publish('file-queued', json.dumps(outgoingMessage));
    r.publish("newQueueReady",songInfo['room']);

    r.set("s_" + str(newSongId), metadata); #TODO make this a hash instead?



if __name__ == '__main__': main()
