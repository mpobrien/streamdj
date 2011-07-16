import redis
from subprocess import call
import re
import S3
import traceback
import json
import mutagen
import subprocess
import os, sys, base64
import md5
import urllib2
#print os.path.abspath(__file__)
r = redis.Redis(host='localhost',port=6379,db=0)
CLIENT_ID = '07b794af61fdce4a25c9eadce40dda83'

def processFile(mutagenInfo, songInfo, picoutputdir):#{{{
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

  if mutagenInfo.tags and hasattr(mutagenInfo.tags, '_EasyID3__id3'):
    pics = mutagenInfo.tags._EasyID3__id3.getall("APIC")
    if pics:
      #TODO check max length of pic data?
      picdata = pics[0].data
      picdatahash = md5.new();
      picdatahash.update(picdata)
      picfilename = base64.b64encode(picdatahash.digest()).replace("/","_")
      metadata['pic'] = picfilename
      setstatus = r.sismember("thumbnails", picfilename)
      if setstatus == 0:
        print "Extracting album art"
        picpath = picoutputdir + '/' + picfilename;
        #TODO extension? mime type?
        fout = open(picpath, 'w')
        fout.write(picdata)
        fout.close();
        picinfo = get_image_info(picpath)
        print picinfo
        if picinfo:
          width, height, fileformat = picinfo
          print width, height, fileformat
          if width > 128 or height > 128:
            print "converting"
            formatString = '%sx%s+50+50' % (THUMBNAIL_SIZE, THUMBNAIL_SIZE);
            result = call(["convert","-resize", formatString, picpath, picpath])
          try:
            f = open(picpath,'r')
            imgdata = f.read();
            f.close();
            conn.put( BUCKET_NAME, 'art/' + picfilename, S3.S3Object(imgdata, {'title': 'title'}), {'Content-Type':'image/png', 'x-amz-acl':'public-read'})
            r.sadd("thumbnails", picfilename)
          except Exception, e: 
            print "Error occurred sending thumbnail data to s3", e
            traceback.print_exc(file=sys.stdout)
      else:
        print "album already in there"


       #print os.path.abspath(__file__)

      #print os.path.abspath(__file__)

  # Do we need to convert?
  mime = mutagenInfo._FileType__get_mime();
  print mime
  if 'audio/mp3' not in mime: #it's not an mp3! convert this bitch
    inputpath = songInfo['path']
    outputpath = songInfo['path'] + ".out.mp3"
    retcode = subprocess.call(["ffmpeg", "-i", inputpath, "-ab", "96k", "-ar","44100", outputpath])
    if retcode == 0:
      os.remove(inputpath)
    print "converted", retcode, outputpath
  else:
    if isinstance(mutagenInfo, mutagen.mp3.MP3) and mutagenInfo.info.sample_rate != 44100:
      inputpath = songInfo['path']
      outputpath = songInfo['path'] + ".out.mp3"
      retcode = subprocess.call(["ffmpeg", "-i", inputpath, "-ab", "128k", "-ar","44100", outputpath])
      if retcode == 0:
        os.remove(inputpath)
      print "converted", retcode, outputpath
    else:
      outputpath = songInfo['path']
  


  outgoingMessage = {'room':songInfo['room'],'uploader':songInfo['uploader'], 'uid':songInfo['uid'], 'path':outputpath, 'meta':metadata, 'songId':newSongId}
  print json.dumps(outgoingMessage)
  if 'fname' not in songInfo:
      songInfo['fname'] = "(Unknown)"
  streamMessage = json.dumps( {'path':outputpath, 'name':songInfo['fname'], 'uid':songInfo['uid'], 'uploader':songInfo['uploader'], 'songId':newSongId, 'meta':metadata});
  #r.rpush("roomqueue_" + songInfo['room'], streamMessage);
  r.zadd("roomqueue_" + songInfo['room'], streamMessage, newSongId ) #key, score, member 
  #r.zadd("fave_" + uidkey, new Date().getTime(), songId ) //key, score, member 
  roomMsgId = r.incr("roommsg_" + songInfo['room'])
  print "msg id", roomMsgId
  r.publish('file-queued', songInfo['room'] + ' ' + str(roomMsgId) + " " + json.dumps(outgoingMessage));
  r.publish("newQueueReady",songInfo['room']);
  metadata['room']= songInfo['room']
  metadata['uid'] = songInfo['uid']
  r.set("s_" + str(newSongId), json.dumps(metadata)); #TODO make this a hash instead?#}}}

def fetchJSON(url):
  fromsoundcloud = urllib2.urlopen(url).read();
  return json.loads(fromsoundcloud)

def getTrackInfo(trackId):
  infoUrl = 'http://api.soundcloud.com/tracks/' + trackId + '.json?client_id=' + CLIENT_ID;
  trackInfoJson = fetchJSON(infoUrl);
  return trackInfoJson

def main(argv):
  settingsdata = open(argv[0], 'r').read()
  settings = json.loads(settingsdata)
  while True:
    message = r.blpop("sctracks");
    songInfo = json.loads(message[1])
    trackInfo = getTrackInfo(songInfo['trackId'])
    metadata = {'Artist' : trackInfo['user']['username'],
                'Title'  : trackInfo['title'],
                'scid'   : songInfo['trackId'],
                'length' : trackInfo['duration']}
    metadata['room']= songInfo['room']
    metadata['uid'] = songInfo['uid']
    if( 'artwork_url' in trackInfo and trackInfo['artwork_url'] ):
      metadata['picurl'] = trackInfo['artwork_url']


    if trackInfo:
      newSongId = r.incr("maxsongid")
      streamMessage = json.dumps({
                        'fromSoundcloud':True,
                        'room':songInfo['room'],
                        'url':trackInfo['permalink_url'],
                        'purchase_url':trackInfo['purchase_url'], 
                        'songId':newSongId,
                        'meta':metadata,
                        'uploader':songInfo['uploader'],
                        'uid':songInfo['uid'],
                      })
      #streamMessage = json.dumps( {'name':songInfo['fname'], 'uid':songInfo['uid'], 'uploader':songInfo['uploader'], 'songId':newSongId, 'meta':metadata});
      r.zadd("roomqueue_" + songInfo['room'], streamMessage, newSongId ) #key, score, member 
      roomMsgId = r.incr("roommsg_" + songInfo['room'])
      r.set("s_" + str(newSongId), json.dumps(metadata)); #TODO make this a hash instead?#}}}
      

      outgoingMessage = {'room':songInfo['room'],'uploader':songInfo['uploader'], 'uid':songInfo['uid'], 'fromSoundcloud':True, 'meta':metadata, 'songId':newSongId}
      r.publish('file-queued', songInfo['room'] + ' ' + str(roomMsgId) + " " + json.dumps(outgoingMessage));
      r.publish("newQueueReady",songInfo['room']);
    print trackInfo
    print metadata


if __name__ == '__main__': main(sys.argv[1:])





  #{u'attachments_uri': u'http://api.soundcloud.com/tracks/13829963/attachments', u'video_url': u'http://friendlyfirerecordings.com/Bands/Asobi/thursday.html', u'track_type': u'', u'release_month': 5, u'original_format': u'mp3', u'label_name': u'Friendly Fire Recordings', u'duration': 257377, u'id': 13829963, u'streamable': True, u'user_id': 1502704, u'title': u'Asobi Seksu - Thursday (Friendly Fire Recordings)', u'favoritings_count': 3, u'commentable': True, u'label_id': None, u'download_url': u'http://api.soundcloud.com/tracks/13829963/download', u'state': u'finished', u'downloadable': True, u'waveform_url': u'http://w1.sndcdn.com/4dSUODmetgP4_m.png', u'sharing': u'public', u'description': u'', u'release_day': 30, u'purchase_url': u'http://friendlyfirerecordings.com/Order/order.html', u'stream_url': u'http://api.soundcloud.com/tracks/13829963/stream', u'key_signature': u'', u'user': {u'username': u'FriendlyFireRecordings', u'permalink': u'friendlyfirerecordings', u'uri': u'http://api.soundcloud.com/users/1502704', u'avatar_url': u'http://i1.sndcdn.com/avatars-000003602447-pqa239-large.jpg?9243f37', u'permalink_url': u'http://soundcloud.com/friendlyfirerecordings', u'id': 1502704}, u'genre': u'Indie', u'isrc': u'', u'download_count': 21, u'permalink_url': u'http://soundcloud.com/friendlyfirerecordings/asobi-seksu-thursday-friendly', u'playback_count': 160, u'permalink': u'asobi-seksu-thursday-friendly', u'release_year': 2006, u'license': u'all-rights-reserved', u'artwork_url': u'http://i1.sndcdn.com/artworks-000006518026-qr3q7n-large.jpg?9243f37', u'created_at': u'2011/04/19 03:22:33 +0000', u'bpm': None, u'uri': u'http://api.soundcloud.com/tracks/13829963', u'comment_count': 0, u'release': u'FFR-004', u'tag_list': u'"asobi seksu" citrus thursday "friendly fire recordings"'}

