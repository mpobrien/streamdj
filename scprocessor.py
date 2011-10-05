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
import pymongo
from pymongo import Connection
import datetime
import time
#print os.path.abspath(__file__)
r = redis.Redis(host='localhost',port=6379,db=0)
c = Connection('localhost', port=27017)
songs = c['outloud'].songs
CLIENT_ID = '07b794af61fdce4a25c9eadce40dda83'

def fetchJSON(url):#{{{
  fromsoundcloud = urllib2.urlopen(url).read();
  return json.loads(fromsoundcloud)#}}}

def getTrackInfo(trackId):#{{{
  infoUrl = 'http://api.soundcloud.com/tracks/' + trackId + '.json?client_id=' + CLIENT_ID;
  trackInfoJson = fetchJSON(infoUrl);
  return trackInfoJson#}}}

def main(argv):
  settingsdata = open(argv[0], 'r').read()
  settings = json.loads(settingsdata)
  while True:
    message = r.blpop("sctracks");
    try:
      print "got: ", message
      songInfo = json.loads(message[1])
      print "track id is", songInfo['trackId']
      trackInfo = getTrackInfo(songInfo['trackId'])
      trackLength = float(trackInfo['duration']) / 1000.;
      metadata = {'Artist' : trackInfo['user']['username'],
                  'Title'  : trackInfo['title'],
                  'scid'   : songInfo['trackId'],
                  'length' : trackLength}
      metadata['room']= songInfo['room']
      metadata['uid'] = songInfo['uid']
      if( 'artwork_url' in trackInfo and trackInfo['artwork_url'] ):
        metadata['picurl'] = trackInfo['artwork_url']


      if trackInfo:
        print "ok here"
        #newSongId = r.incr("maxsongid")


        newsongdocument = {'title':metadata['Title'],
                           'artist':metadata['Artist'], 
                           'scid':songInfo['trackId'],
                           'url':trackInfo['permalink_url'],
                           'purchase_url':trackInfo['purchase_url'], 
                           'tracklength':float(trackLength),
                           'ctime':datetime.datetime.now(), } 

        if( 'artwork_url' in trackInfo and trackInfo['artwork_url'] ):
          newsongdocument['picurl'] = trackInfo['artwork_url']
        print "inserting"
        newObjectId = songs.insert(newsongdocument);
        newSongId = str(newObjectId)
        print "new doc:",str(newObjectId)
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
        r.zadd("roomqueue_" + songInfo['room'], streamMessage, time.mktime(datetime.datetime.now().timetuple()) ) #key, score, member 
        #roomMsgId = r.incr("roommsg_" + songInfo['room'])
        roomMsgId = -1
        #r.set("s_" + str(newSongId), json.dumps(metadata)); #TODO make this a hash instead?#}}}
        

        outgoingMessage = {'room':songInfo['room'],'uploader':songInfo['uploader'], 'uid':songInfo['uid'], 'fromSoundcloud':True, 'meta':metadata, 'songId':newSongId}
        r.publish('file-queued', songInfo['room'] + ' ' + str(roomMsgId) + " " + json.dumps(outgoingMessage));
        r.publish("newQueueReady",songInfo['room']);
      print trackInfo
      print metadata
    except Exception, e: 
      print "Error occurred getting track info from soundcloud!!!", e
      traceback.print_exc(file=sys.stdout)


if __name__ == '__main__': main(sys.argv[1:])





  #{u'attachments_uri': u'http://api.soundcloud.com/tracks/13829963/attachments', u'video_url': u'http://friendlyfirerecordings.com/Bands/Asobi/thursday.html', u'track_type': u'', u'release_month': 5, u'original_format': u'mp3', u'label_name': u'Friendly Fire Recordings', u'duration': 257377, u'id': 13829963, u'streamable': True, u'user_id': 1502704, u'title': u'Asobi Seksu - Thursday (Friendly Fire Recordings)', u'favoritings_count': 3, u'commentable': True, u'label_id': None, u'download_url': u'http://api.soundcloud.com/tracks/13829963/download', u'state': u'finished', u'downloadable': True, u'waveform_url': u'http://w1.sndcdn.com/4dSUODmetgP4_m.png', u'sharing': u'public', u'description': u'', u'release_day': 30, u'purchase_url': u'http://friendlyfirerecordings.com/Order/order.html', u'stream_url': u'http://api.soundcloud.com/tracks/13829963/stream', u'key_signature': u'', u'user': {u'username': u'FriendlyFireRecordings', u'permalink': u'friendlyfirerecordings', u'uri': u'http://api.soundcloud.com/users/1502704', u'avatar_url': u'http://i1.sndcdn.com/avatars-000003602447-pqa239-large.jpg?9243f37', u'permalink_url': u'http://soundcloud.com/friendlyfirerecordings', u'id': 1502704}, u'genre': u'Indie', u'isrc': u'', u'download_count': 21, u'permalink_url': u'http://soundcloud.com/friendlyfirerecordings/asobi-seksu-thursday-friendly', u'playback_count': 160, u'permalink': u'asobi-seksu-thursday-friendly', u'release_year': 2006, u'license': u'all-rights-reserved', u'artwork_url': u'http://i1.sndcdn.com/artworks-000006518026-qr3q7n-large.jpg?9243f37', u'created_at': u'2011/04/19 03:22:33 +0000', u'bpm': None, u'uri': u'http://api.soundcloud.com/tracks/13829963', u'comment_count': 0, u'release': u'FFR-004', u'tag_list': u'"asobi seksu" citrus thursday "friendly fire recordings"'}

