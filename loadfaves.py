import redis
import json
r = redis.Redis(host='localhost',port=6379,db=0)
fave_keys = r.keys("fave_*")

songs = set([])
for faveset in fave_keys:
  username =  '_'.join(faveset.split("_")[1:])
  songids = r.zrange(faveset, 0, -1)
  for sid in songids:
    songs.add(sid)
    r.sadd("favers_" + sid, username);

for song in songs:
  numfavers = r.scard("favers_" + sid);
  r.set("favecount_" + str(song), numfavers);
  print song
    
