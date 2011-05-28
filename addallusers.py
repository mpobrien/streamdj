import redis
r = redis.Redis(host='localhost',port=6379,db=0)
rooms = r.keys("uniqlisteners_*")
users = set([])
for rn in rooms:
    users = users.union(users,r.smembers(rn))
    rusers =  r.smembers(rn)
    for uname in rusers:
      r.sadd("allusers", uname);
print users
print len(users)
