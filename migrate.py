import redis
import json
r = redis.Redis(host='localhost',port=6379,db=0)
rooms = r.smembers("rooms")
errorcount = 0;
messagetypes = set([])
for roomname in rooms:
  print roomname
  #if roomname != 'dirtybeaches': continue;
  messages = r.zrange("roomlog_" + roomname, 0, -1)
  for m in messages:
    try:
      mjson = json.loads(m)
      #print mjson
      message = mjson['messages'][0]
      outmsgjson = json.dumps(message)
      if message['type'] == 'started':
        r.zadd("songs_" +roomname, outmsgjson, message['id'])
      elif message['type'] == 'chat':
        r.zadd("chats_" +roomname, outmsgjson, message['id'])
    except Exception, ez:
      print "Bad json",  ez
      errorcount += 1
  print roomname

print errorcount
print messagetypes
#{\"messages\":[{\"type\":\"chat\",\"id\":7863,\"from\":\"Justin Yu\",\"body\":\"lol\",\"time\":1306262599422}]}
#{\"messages\":[{\"type\":\"started\",\"id\":7865,\"from\":\"dashcho\",\"body\":\"Cantaloop.mp3\",\"songId\":5360,\"time\":1306262675457,\"meta\":{\"Album\":\"Hand On The Torch\",\"length\":269.1511508117624,\"Title\":\"Cantaloop\",\"Artist\":\"Us3\"}}]}

