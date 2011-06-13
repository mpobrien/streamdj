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
#print os.path.abspath(__file__)
r = redis.Redis(host='localhost',port=6379,db=0)

THUMBNAIL_SIZE = 256;

UNKNOWN = '(Unknown)'

BUCKET_NAME = 'albumart-outloud'
AWS_ACCESS_KEY_ID = 'AKIAIEM3AHGAP3CC6U5A'
AWS_SECRET_ACCESS_KEY = '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'
conn = S3.AWSAuthConnection(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

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
  r.publish('file-queued', json.dumps(outgoingMessage));
  r.publish("newQueueReady",songInfo['room']);
  metadata['room']= songInfo['room']
  metadata['uid'] = songInfo['uid']
  r.set("s_" + str(newSongId), json.dumps(metadata)); #TODO make this a hash instead?#}}}

#def send_to_s3

def main(argv):
  settingsdata = open(argv[0], 'r').read()
  settings = json.loads(settingsdata)
  picoutputdir = os.path.dirname(os.path.abspath(__file__)) + '/' + settings['albumart_dir']
  while True:
    "waiting"
    message = r.blpop("newsongready");
    songInfo = json.loads(message[1])
    # incoming: {"path":fullPath, "room":roomname, "uploader":uploaderInfo.name}
    try:
      parsedFile = mutagen.File(songInfo['path'], easy=True)
      processFile(parsedFile, songInfo, picoutputdir)
    except Exception, e: 
      print "Couldn't parse audio information, skipping:", e
      traceback.print_exc(file=sys.stdout)

def get_image_info(filename):#{{{
  args = ["identify","-format",'%w %h %C',filename]
  #imginfo = call()
  imginfo,error = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
  print "imginfo:", imginfo
  if not imginfo: return None
  imginfoparts = re.match("(\d*) (\d*) (\w*)",imginfo.strip())
  print 'imginfoparts:',imginfoparts
  if not imginfoparts:
    return None
  width = int(imginfoparts.group(1))
  height = int(imginfoparts.group(2))
  fileformat = imginfoparts.group(3)
  return (width, height, fileformat)#}}}


if __name__ == '__main__': main(sys.argv[1:])
