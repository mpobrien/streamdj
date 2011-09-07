
function HistoryBuffer(n){
  this._array = new Array(n);
  this.maxKey = null;
  this.oldestIndex = null;
  this.nextIndex = 0;
  this.size = n;
  this.numItems = 0;
  this.topScore = null;
}

HistoryBuffer.prototype.getMax = function(){
  return this.topScore;
}

HistoryBuffer.prototype.push = function(message, messageId){
  if(this.topScore == null || messageId > this.topScore){
    this.topScore = messageId;
  }

  this._array[this.nextIndex] = [message, messageId];
  this.nextIndex = (this.nextIndex + 1) % this._array.length;
  if(this.oldestIndex == null ){
    this.oldestIndex = 0;
  }else{
    if(this.numItems >= this._array.length){
      this.oldestIndex = (this.oldestIndex + 1) % this._array.length;
    }
  }
  this.numItems++;

}

HistoryBuffer.prototype.getFrom = function(minKey, includeEqual){
  var result = [];
  var i=0;
  var checkIndex = this.oldestIndex; //TODO check null here
  while(i<this._array.length){
    var item = this._array[checkIndex];
    if(item && (item[1] > minKey || (includeEqual && item[1] == minKey))){
      result.push(item[0])
    }
    checkIndex = (checkIndex+1) % this._array.length;
    i++;
  }
  return result;

};
exports.HistoryBuffer = HistoryBuffer;

//var hb = new HistoryBuffer(5);
//hb.push("a", 1);
//hb.push("b", 2);
//hb.push("c", 3);
//hb.push("d", 4);
//hb.push("e", 5);
//hb.push("f", 6);
//console.log(hb._array);
//console.log(hb.oldestIndex);
//console.log(hb._array[hb.oldestIndex]);
//console.log(hb.getFrom(3));
