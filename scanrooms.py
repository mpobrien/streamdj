from pymongo import Connection
import redis
import json
import time
c = Connection()
rooms = c['outloud'].rooms
r = redis.Redis(host='localhost',port=6379,db=0)

def main():
  scanrooms = list(rooms.find({}, {'people':1, 'roomName':1}))
  if scanrooms:
    for room in scanrooms:
      remove = []
      if 'people' in room:
        for person in room['people'].values():
          print person['time'], time.time(), time.time() - (person['time']/1000)
          if time.time() - (person['time']/1000) > 45:
            message = json.dumps({"type":"left",'from':person['uid'],'body':'', 'uid':person['uid'], 'time':time.time() * 1000})
            r.publish("userleft", room['roomName'] + " " + "-1" + " " + message);

          #if person['time'] / 1000 < time.time() - 5000:
            #message = json.dumps({"type":"left",'from':persion['uid'],'body':'', 'uid':uid, 'time':time.time() * 1000})
            #r.publish('userleft', message)

if __name__ == '__main__': main()
