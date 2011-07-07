import redis
import sys
import time
import json
r = redis.Redis(host='localhost',port=6379,db=0)

#chatmessage ILXORS 41247 {"type":"chat","id":41247,"from":"mpobrien","body":"TEST","time":1310067925731}

def main(args):
  if len(args) != 3:
    print "usage:"
    print "say.py <roomname> <sendername> 'here is the message'"
    return
  roomname = args[0]
  fromwho = args[1]
  message = args[2]
  msgId = r.incr("roommsg_" + roomname)
  print "new messageid", msgId
  msgJSON = json.dumps({"type":"chat","id":msgId,"from":fromwho,"body":message, "time": int(time.time() * 1000)})
  r.zadd("chats_" + roomname, msgJSON, msgId  )
  r.publish("chatmessage", roomname + " " + str(msgId) + " " + msgJSON);


if __name__ == '__main__' : main(sys.argv[1:])
