function CircularBuffer(n) {
    this._array= new Array(n);
    this.length= 0;
    this._maxMessageId = null;
}
CircularBuffer.prototype.toString= function() {
    return '[object CircularBuffer('+this._array.length+') length '+this.length+']';
};
CircularBuffer.prototype.get= function(i) {
    if (i<0 || i<=this.length-this._array.length)
        return undefined;
    return this._array[i%this._array.length];
};


CircularBuffer.prototype.set= function(i, v) {
    if (i<0 || i<=this.length-this._array.length)
        throw CircularBuffer.IndexError;
    if( this._maxMessageId == null || (i > this._maxMessageId) ){
      this._maxMessageId = i;
    }
    while (i>this.length) {
        this._array[this.length%this._array.length]= undefined;
        this.length++;
    }
    this._array[i%this._array.length]= v;
    if (i==this.length)
        this.length++;
};

/*CircularBuffer.prototype.push= function(v) {*/
/*if(this._maxMessageId!=null){*/
/*this.set(this._maxMessageId+1, v);*/
/*}else{*/
/*this.set(0, v);*/
/*}*/
/*}*/

CircularBuffer.prototype.getSince = function(cursor){
  if( cursor > this._maxMessageId ){
    return null;
  }else{
    var result = [];
    console.log("getting since", cursor);
    for(var i=cursor;i<=this._maxMessageId;i++){
      var item = this.get(i);
      if(item!=null){
        result.push(item);
      }
    }
    return result;
  }
}

CircularBuffer.IndexError= {};

exports.CircularBuffer = CircularBuffer;
