import os.path
import sys
from struct import unpack
stderr = sys.stderr

MPEG1, MPEG2, MPEG25 = 3,2,0
LAYER1, LAYERII, LAYERIII = 3,2,1
bitrates = ((0,0,0,0,0,0),            (32,32,32,32,8,8),\
            (64,48,40,48,16,16),      (96,56,48,56,24,24),
            (128,64,56,64,32,32),     (160,80,64,80,40,40),
            (192,96,80,96,48,48),     (224,112,96,112,56,56),
            (256,128,112,128,64,64),  (288,160,128,144,80,80),
            (320,192,160,160,96,96),  (352,224,192,176,112,112),
            (384,256,224,192,128,128),(416,320,256,224,144,144),
            (448,384,320,256,160,160),(-1,-1,-1,-1,-1,-1) )
frequencies = ((44100,22050,11025), (48000, 24000, 12000),
               (32000,16000, 8000), (-1,-1,-1))
samples = ((384,384,384),(1152,1152,1152),(1152,576,576));
framesync, headerLength, headerDelim = 2047, 4, chr(255)

BITRATE1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
BITRATE2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
SAMPLERATE1 = [44100, 48000, 32000]
SAMPLERATE2 = [22050, 24000, 16000]
SAMPLERATE25 = [11025, 12000, 8000]

def read_frames( fp, verbose=False):
  while 1:
    x = fp.read(4)
    if not x:
      break
    elif x.startswith('TAG'):
      # TAG - ignored
      data = x[3]+fp.read(128-4)
      if verbose:
        print >>stderr, 'TAG', repr(data)
    elif x.startswith('ID3'):
      # ID3 - ignored
      version = x[3]+fp.read(1)
      flags = ord(fp.read(1))
      s = [ ord(c) & 127 for c in fp.read(4) ]
      size = (s[0]<<21) | (s[1]<<14) | (s[2]<<7) | s[3]
      data = fp.read(size)
      #print "s:",s
      #print "size:",size
      #print "data:",data
      #if verbose:
        #print >> stderr, 'ID3', repr(data)
    else:
      h = unpack('>L', x)[0]
      #print "h:",h
      #print "here:", (h & 0xffe00000)

      version1 = (h >> 19) & 0x3
      version2 = (h & 0x00180000) >> 19

      layer = (h >> 17) & 0x3
      protection = (h >> 16) & 0x1
      bitrate = (h >> 12) & 0xF
      sample_rate = (h >> 10) & 0x3
      padding = (h >> 9) & 0x1
      private = (h >> 8) & 0x1
      mode = (h >> 6) & 0x3
      mode_extension = (h >> 4) & 0x3
      copyright = (h >> 3) & 0x1
      original = (h >> 2) & 0x1
      emphasis = (h >> 0) & 0x3
      print "layer", layer, "protection", protection,"bitrate", bitrate,"sample_rate", sample_rate,"padding",padding,"private", private,"mode",mode,"mode_extension", mode_extension,"copyright", copyright,"original",original,"emphasis", emphasis

      assert (h & 0xffe00000) == 0xffe00000, '!Frame Sync: %r' % x
      version = (h & 0x00180000) >> 19
      assert version != 1
      assert (h & 0x00060000) == 0x00020000, '!Layer3'
      protected = not (h & 0x00010000)
      b = (h & 0xf000) >> 12
      assert b != 0 and b != 15, '!Bitrate'
      #print version, b
      if version == 3:                      # V1
        bitrate = BITRATE1[b]
      else:                                 # V2 or V2.5
        bitrate = BITRATE2[b]
      s = (h & 0x0c00) >> 10
      assert s != 3, '!SampleRate'
      if version == 3:                      # V1
        samplerate = SAMPLERATE1[s]
      elif version == 2:                    # V2
        samplerate = SAMPLERATE2[s]
      elif version == 0:                    # V2.5
        samplerate = SAMPLERATE25[s]
      nsamples = 1152
      if samplerate <= 24000:
        nsamples = 576
      print samplerate
      pad = (h & 0x0200) >> 9
      channel = (h & 0xc0) >> 6
      joint = (h & 0x30) >> 4
      copyright = bool(h & 8)
      original = bool(h & 4)
      emphasis = h & 3
      if version == 3:
        framesize = 144000 * bitrate / samplerate + pad
      else:
        framesize = 72000 * bitrate / samplerate + pad
      #print framesize;
      data = x+fp.read(framesize-4)
      #if verbose:
        #print >>stderr, 'Frame%d: bitrate=%dk, samplerate=%d, framesize=%d' % \
              #(len(frames), bitrate, samplerate, framesize)
      yield (framesize, bitrate, data)
      #frames.append(data)
  #return

def main(args):
    x = 0
    f = open(args[0], 'r')
    for s, r, d in read_frames(f, False):
      pass
        #print str(s)+",",r
        #x = x +1
        #if x > 10: break;
        #print s, r
        
if __name__=='__main__': main(sys.argv[1:])
