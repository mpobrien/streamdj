var fs        = require('fs');

var TemplateManager = function(rootDir, templatenames){
  var that = this;
  this.templates = {};
  this.initializeTemplates = function(){
    for(var i=0;i<templatenames.length;i++){
      var templateName = templatenames[i];
      this.templates[templateName] = fs.readFileSync(rootDir + "/" + templateName).toString();
    }
  }

  this.getTemplate = function(templateName){
    if(that.templates[templateName]){
      return that.templates[templateName];
    }else{
      return "template not found :(";
    }

  }

}


exports.TemplateManager = TemplateManager;
