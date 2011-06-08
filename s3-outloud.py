from subprocess import call
import unittest
import S3
import httplib
import sys

BUCKET_NAME = 'albumart-outloud'
AWS_ACCESS_KEY_ID = 'AKIAIEM3AHGAP3CC6U5A'
AWS_SECRET_ACCESS_KEY = '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'
conn = S3.AWSAuthConnection(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

def main():
  conn = S3.AWSAuthConnection(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  print conn.list_bucket(BUCKET_NAME)

if __name__ == '__main__': main();

conn = S3.AWSAuthConnection(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
x = conn.list_bucket(BUCKET_NAME) 
f = open('/home/mike/albumart/zZYEz4yL5KEGfqk4GhJ8MA==','r')
imgdata = f.read();
f.close()
imginfo = call(["identify","-format",'"%w %h %C"', '/home/mike/albumart/zZYEz4yL5KEGfqk4GhJ8MA=='])
imginfoparts = None
if imginfo:
   imginfoparts = re.match("(\d+) (\d+) (\w+)",imginfo.strip())

if not imginfoparts:
  "doesn't look like a valid image"
else:
  width = int(imginfoparts.group()[0])
  height = int(imginfoparts.group()[1])
  if( width > 128 || height > 128 ):
    result = call(["convert","-resize",'"%w %h %C"', '/home/mike/albumart/zZYEz4yL5KEGfqk4GhJ8MA=='])
  else:
  ~/albumart $ convert -resize 128x128+50+50 ./hb_ypPsxtlg+nKj8nCgSdQ== ~/output.jpg


#conn.put( BUCKET_NAME, 'art/zZYEz4yL5KEGfqk4GhJ8MA==', S3.S3Object(imgdata, {'title': 'title'}), {'Content-Type':'image/png', 'x-amz-acl':'public-read'})
def uploadImage(keypart, filename):

