/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals T, H */

'use strict';

T = (function () {
  
  return {

    getRandomColor : function (){
      return '#'+(Math.random()*0xFFFFFF<<0).toString(16);
    },
    formatDateTime : function (dat){

      var d = (dat) ? (typeof dat === 'object') ? dat : new Date(dat) : new Date();
      var out = '', pad2 = T.pad2;

      out += d.getUTCFullYear() + '-' + pad2((d.getUTCMonth()+1)) + '-' + pad2(d.getUTCDate()) + ' ';
      out += pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds());
      out += ':' + d.getUTCMilliseconds();
      return out;
    },
    formatTime : function (dat){

      var d = (dat) ? (typeof dat === 'object') ? dat : new Date(dat) : new Date();
      var out = '', pad2 = T.pad2;

      out += pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds());
      out += ':' + T.pad3(d.getUTCMilliseconds());
      return out;
    },
    pad2 : function (num){return (num < 10) ? '0' + num : num;},
    pad3 : function (num){
      return (num <  10) ? '00' + num :
             (num < 100) ?  '0' + num :
             num;
    },
    fmtTimeX : function(time, fmt){
      fmt = fmt || 'hmsf';
      var f = this.pad2(time % 60);
      var s = this.pad2(Math.floor((time/60) % 60));
      var m = this.pad2(Math.floor((time/(60*60)) % 60));
      var h = this.pad2(Math.floor((time/(60*60*60)) % 24));
      var d = Math.floor((time/(60*60*60*24)));
      switch(fmt){
        case 'dhms' : return d + ':' + h + ':' + m + 'DHM'; 
        case 'hmsf' : return h + ':' + m + ':' + s + ':' + f; 
      }

    },
    fmtTime : function(secs){
      var 
        s = this.pad2(Math.floor((secs)         % 60)),
        m = this.pad2(Math.floor((secs/(60))    % 60)),
        h = this.pad2(Math.floor((secs/(60*60)) % 24));
      return h + ':' + m + ':' + s;

    },
    resizeElement: function  (element, left, top, width, height) {

      element.style.width  = width  + 'px';
      element.style.height = height + 'px';
      element.style.top    = top    + 'px';
      element.style.left   = left   + 'px';
      
    }

  };

} ());