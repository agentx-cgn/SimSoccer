
var IFCX = (function(){

  var MARGINTOP = 32;
  var i, self, debug = false, config, status, ticker;

  var container, canvas, width, height, ctx, winWidth, winHeight, stats, pics;
  var overRenderer;

  var mouse  = {x: 0, y: 0, cx: 1, cy: 1, isDown: false, down: {x:0, y:0}};
  var origin = {x: 0, y: 0};

  var bDraw = true, bStep = true, scale = 1, fullscreen = false;
  var frame = {}, sim = {};
   //  var steps, fps, speed, time, fpd, days, curDay, piDay;
  var msecTick, msecDraw;

  var tarBlackLevel = 0.5, curBlackLevel = 1;
  var font = "12px Sans Serif", debFont = "10px Sans Serif", msgFont = "10px Sans Serif";
  var margin, margin2, padding, w2, h2, w2, p2, m2;

  //  var energy = 0;

  var statsBuffer;

  var Panels = {};

  return {
    init: function(conf, cont, onready){

      self = this;
      config = conf;
      pics = config.pics;
      container = cont;

      msecDraw = null;
      msecTick = null;
      PITime   = null;

      margin   = config.system.margin,
      margin2  = config.system.margin2,
      padding  = config.system.padding,
      p2       = padding/2,
      m2       = margin/2;

      if(location.search.indexOf("DEBUG") > -1){debug = true;}

      canvas = document.createElement('canvas');
      ctx = canvas.getContext("2d");
      container.appendChild(canvas);
      self.initRenderer();
      self.initPanels();
      ctx.font = font;

      statsBuffer  = new ringBuffer(config.system.statsLength);

      new imageLoader(config.pics, pics, "images/", function(){
        config.sprites.back = self.createSprite(pics.Dollars, winWidth, winHeight);
        config.sprites.back.drawImage(pics.Dollars, 0, 0, pics.Dollars.width, pics.Dollars.height, 0, 0, winWidth, winHeight);
        self.activate();
        self.resetDisplay();
        onready();
      });

    },
    width: function(){return width;},
    height: function(){return height;},
    resetSim: function(f, m){
      sim.start     = Date.now();
      sim.mpd       = m || config.simulation.simmperday;
      sim.fps       = f || config.simulation.fps;
      sim.interval  = 1000 / sim.fps;
      sim.timescale = (60*24) / sim.mpd;
      sim.lenDay    = (60*60*24) / sim.timescale;     // seconds
      sim.runtime   = 0; //msec
      sim.days      = 0;
      sim.curDay    = 0;
      sim.piDay     = 0;
      sim.frames    = 0;
      SIM.sim.scale = sim.timescale;
      SIM.start     = sim.start;
    },
    toggleDebug: function(){debug++;if (debug > 2) {debug = 0;}},
    show: function(what){},
    get:  function(what){return eval(what);},
    set:  function(obj){
      var cmd, key, tmp;
      for (key in obj) {
        switch (typeof obj[key]){
          case "string":cmd = key + "='" + obj[key] + "'";break;
          case "number":cmd = key + "="  + obj[key];break;
          case "object":tmp = obj[key];cmd = key + "=tmp";break;
          case "boolean":cmd = key + "="  + obj[key];break;
          default:console.log("Globe.set: type", typeof(obj[key]), "missing");
        }
        eval(cmd);  //        console.log(JSON.stringify(obj), cmd);
      }
    },
    initPanels: function(){

      Panels.Info = new panel("Info", ctx, scale,
        width  - p2 - config.panels.infoWidth,
        height - p2 - config.panels.height,
        config.panels.infoWidth, config.panels.height, null
      );
      Panels.Info.ctx.font = "12px Sans Serif";
      Panels.Info.visible = true;

      Panels.Messages = new panel("Messages", ctx, scale,
      //        p2, p2, 248, h2 - padding, null // PICS.TransPanel
        p2, p2, 248, height - p2, null // PICS.TransPanel
      );
      Panels.Messages.ctx.font = "11px Sans Serif";
      Panels.Messages.visible = true;

      Panels.Stats = new panel("Stats", ctx, scale,
        p2, height - p2 - config.panels.height, 248,
        config.panels.height, null
      );
      Panels.Stats.visible = false;
    },
    pushMsg: function (s, p, o) {
      try {
        s = (s && s.deb) ? s.deb() : s;
        p = p ? p + " " : " ";
        o = (o && o.deb) ? o.deb() : o ? o : "";
        Panels.Messages.pushLine(s + " " + p + o);
      } catch(e){console.log("pushMsg", s, p, o);}
    },
    initRenderer: function(){
      winWidth  = container.offsetWidth  || window.innerWidth;
      winHeight = container.offsetHeight || window.innerHeight;
      width  = winWidth;
      height = winHeight- MARGINTOP;
      w2     = width/2,
      h2     = height/2,
      container.style.width = width + "px";
      container.style.height = height + "px";
      container.style.top = MARGINTOP + "px";
      canvas.setAttribute("width",  width);
      canvas.setAttribute("height", height);
      canvas.style.position = "absolute";
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvas.style.overflow = "hidden";
      canvas.focus();
      
    },
    test:   function(){},
    load:   function(){},
    stop:   function(){bDraw = false;bStep = false;self.run("stop");},
    play:   function(){bDraw = true;bStep = true;self.run("play");},
    pause:  function(){bDraw = true;bStep = false;self.run("pause");},
    single: function(){bDraw = false;bStep = false;self.run("single");},
    run:    function (state, fps, mpd) {
      switch(state){
        case "AllStop" :
          bStep = false; bDraw = false; ticker.stop();
          break;
        case "Stop" :
          bStep = false; bDraw = true; self.resetSim(fps, mpd); ECON.reset();
          if (ticker) {ticker.stop();}
          ticker = createTicker(sim.interval, self.tick);
          self.pushMsg("");
          self.pushMsg("Screen", "has", width + "x" + height + " pixels");
          self.pushMsg("You are welcome!");
          break;
        case "Pause" : bDraw = true; bStep = false; break;
        case "Play"  : bDraw = true; bStep = true;  break;
        case "Step"  : bDraw = true; bStep = true;  self.tick(ticker); bStep = false; break;
      }
      console.log("run: ", state, "fps:" + sim.fps, "mpd:" + sim.mpd);
    },
    tick: function (ticker) {

      var tim0 = Date.now(), tim1, tim2;

      frame.step  = ticker.counter;
      frame.lag   = ticker.lag;
      frame.duration = ticker.duration;

      if (overRenderer || true){

        tim1 = Date.now();
        if (bStep) {self.step();}
        msecTick = Date.now() - tim1;

        tim2 = Date.now();
        if (bDraw) {self.draw();}
        msecDraw = Date.now() - tim2;

      }

    },
    step: function () {
      if (sim.frames === 0) {self.resetSim();}
      self.calcTime();
      ECON.step(sim.days, sim.timescale);
      if (ECON.hasCollapsed()) {status = "lost"; escape();}
    },
    calcTime: function () {
      sim.frames  += 1;
      sim.runtime += ticker.elapsed;
      sim.secs    = (sim.runtime * sim.timescale) / 1000;
      sim.days    = sim.secs / (60*60*24);
      sim.piDay   = sim.days * Math.PI * 2;
      if (Math.floor(sim.days) != sim.curDay) {
        sim.curDay = Math.floor(sim.days);
      }
    },
    drawTest: function(f){
      ctx.save();
      ctx.translate(f, f);
      ctx.fillStyle = "rgba(240, 128, 128, 0.95)";
      ctx.fillRect(Math.random()*10, Math.random()*10, 90, 90);
      ctx.restore();
    },
    draw: function () {

      var p;

      if (scale < 1) {
        if (debug == 0) {debug = 1;}
        ctx.clearRect(origin.x, origin.y, winWidth / scale, winHeight / scale);
      } else {
        ctx.drawImage(config.sprites.back.canvas, 0, 0, winWidth, winHeight);
      }
      
      //      FLD.draw(ctx);
      ECON.draw(ctx);
      //      if (debug) {debDrawAll();}

      if (Panels.Info.visible) {
        Panels.Info.showInfo({
          mouse:  mouse.x + "/" + mouse.y,
          msec:   msecDraw + "/" + pad(msecTick, 2),
          fps:    r(frame.lag) + "/" + sim.fps,
          dur:    frame.duration,
          day:    r(sim.days),
          steps:  sim.frames,
          run:    Tools.fmtTime(sim.frames, "hmsf")
        });
      }

      if (curBlackLevel != tarBlackLevel) {
        curBlackLevel = dampTo(curBlackLevel, tarBlackLevel, 1.07);
        if (Math.abs(curBlackLevel - tarBlackLevel) < 0.02) {
          curBlackLevel = tarBlackLevel;
        }
      }

      if (curBlackLevel > 0) {
        ctx.globalAlpha = curBlackLevel;
        ctx.fillStyle   = "rgb(100, 0, 0, 1.0)";
        ctx.fillRect(origin.x, origin.y, winWidth / scale, winHeight / scale);
        ctx.globalAlpha = 1;
      }

      for (p in Panels){
        if (Panels[p].visible) {
         Panels[p].blit(scale);
        }
      }

    },

    toggleFullscreen: function(){
      if (fullScreenApi){
        fullscreen ? fullScreenApi.cancelFullScreen() : fullScreenApi.requestFullScreen(canvas);
        fullscreen = !fullscreen;
      }
    },
    escape: function(){

      switch (status){
        case "intro" :
        case "running" :
          pause();
          status = "paused";
          tarBlackLevel = 0.5;
          Panels.Info.visible = true;
          Panels.Stats.plotStats(statsBuffer.copy());
          Panels.Stats.visible = true;
        break;
        case "paused" :
          tarBlackLevel = 0;
          resetViewport();
          play();
          Panels.Stats.visible = false;
          status = "running";
        break;
        case "lost" :
          pause();
          tarBlackLevel = 0.5;
        break;
      }

    },
    resetViewport: function() {
      ctx.translate(origin.x, origin.y);
      origin.x = 0;
      origin.y = 0;
      ctx.scale(1/scale, 1/scale);
      scale = 1;
      self.zoomFonts();
    },
    resetDisplay: function() {
      self.resetViewport();
      //      bDraw   = true;
      //      bStep   = true;
      Panels.Info.visible = true;
      Panels.Stats.visible = false;
      Panels.Messages.visible = true;
      tarBlackLevel = 0;
    },
    zoomFonts: function() {
      font    = 12 / scale + "px Sans Serif";
      debFont = 10 / scale + "px Sans Serif";
      msgFont = "Bold " + 10 / scale + "px Sans Serif";
    },
    togglePanels: function (b) {
      for (var p in Panels) {
        (typeof b === "undefined") ? Panels[p].visible = !Panels[p].visible : Panels[p].visible = b;
      }
    },
    activate: function(){

      window.addEventListener('resize', function(){
        self.initRenderer();
      }, false);

      container.addEventListener('mousedown', function(event){
        event.preventDefault();
        mouse.isDown = true;
        mouse.down.x = - event.clientX;
        mouse.down.y = event.clientY;
      }, false);

      container.addEventListener('mouseup', function(event){
        mouse.isDown = false;
      }, false);

      container.addEventListener('mousemove', function(event){
        mouse.x  = event.clientX;
        mouse.y  = event.clientY - MARGINTOP;
        if (scale == 1) {
    //      BIOS.mouse.x = AQUA.mouseX;
    //      BIOS.mouse.y = AQUA.mouseY;
        } else {
    //      BIOS.mouse.x = AQUA.mouseX - (AQUA.mouseX - AQUA.originX/(1-1/AQUA.scale) ) * (1-1/AQUA.scale);
    //      BIOS.mouse.y = AQUA.mouseY - (AQUA.mouseY - AQUA.originY/(1-1/AQUA.scale) ) * (1-1/AQUA.scale);
        }

      }, false);

      $(window).mouseenter(function(){
        overRenderer = true;
        DAT.GUI.open();
      //        self.play();
      });

      $(window).mouseleave(function(){
        overRenderer = false;
        DAT.GUI.close();
       //        self.stop();
      });

      $('#container').bind('mousewheel', function(event, delta, deltaX, deltaY) {

        var wheel, zoom, newS, newX, newY, factor = config.system.zoom;

        if (deltaY > 0){zoom = factor;} else {zoom = 1/factor;}

        newX = -( mouse.x / scale + origin.x - mouse.x / ( scale * zoom ) );
        newY = -( mouse.y / scale + origin.y - mouse.y / ( scale * zoom ) );

        newS = scale * zoom;

        if (newS <= 1.0001 ) { // && !GAME.debT) {
          ctx.translate(origin.x, origin.y);
          ctx.scale(1/scale, 1/scale);
          origin.x = 0;
          origin.y = 0;
          scale   = 1;
          //      console.log("inetrcepted", newS, AQUA.scale);
        } else {

          ctx.translate(origin.x, origin.y);
          ctx.scale(zoom, zoom);
          ctx.translate(newX, newY);

          origin.x = -newX;
          origin.y = -newY;
          scale  *= zoom;
        }

        self.zoomFonts();
        //        msgRect = null;

        if (event.preventDefault) {event.preventDefault();}
        event.returnValue = false;
        return false;

      });

      $(document).keydown(function( event ) {

        var i, s, k = String.fromCharCode(event.which);
        if (event.which == 27) {k = "ESC";}
        if (event.which == 32) {k = "SPACE";}
    //    console.log(e, k);

        function killEvent(){
          if (event.preventDefault) {event.preventDefault();}
          event.returnValue = false;
          return false;
        }

        switch (k) {
          case "ESC":self.escape(); return true;

          // disable rest
          case "SPACE":self.resetDisplay(); return killEvent();
          case "Q"  :self.run("AllStop"); return killEvent();
          case "W"  :self.run("Stop"); return killEvent();
          case "E"  :self.run("Pause"); return killEvent();
          case "R"  :self.run("Play"); return killEvent();
          case "T"  :self.run("Step"); return killEvent();

          case "P"  :
            Panels.Info.visible = true;
            Panels.Stats.visible = true;
            Panels.Messages.visible = true;
            return killEvent();
          break;

          case "F"  :self.toggleFullscreen(); return killEvent();
          case "N"  :self.test(); exit(); return killEvent();
          case "D"  :self.toggleDebug(); return killEvent();
          case "1"  :Panels.Info.visible     = !Panels.Info.visible; return killEvent();
          case "2"  :Panels.Stats.visible    = !Panels.Stats.visible; return killEvent();
          case "3"  :Panels.Messages.visible = !Panels.Messages.visible; return killEvent();
        }

      });

    },
    createCanvas: function(w, h){
      var cav = document.createElement('CANVAS');
      cav.setAttribute('width',  w);
      cav.setAttribute('height', h);
      return cav.getContext("2d");
    },
    createSprite: function(img, w, h){

      var cav, width, height;

      width  = w || img.width;
      height = h || img.height;

      cav = document.createElement('CANVAS');
      cav.setAttribute('width',  width);
      cav.setAttribute('height', height);
      cav.setAttribute('file',   img.src);
      cav.file = img.src;
      cav.getContext("2d").drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height);
      return cav.getContext("2d");
    },
    convCoords: function (p){

      var newP = {}, f;

      if (scale == 1) {
        newP.x = p.x;newP.y = p.y;
      } else {
        f = 1-1/scale;
        newP.x = p.x - (p.x - origin.x/f ) * f;
        newP.y = p.y - (p.y - origin.y/f ) * f;
      }
      return newP;
    }




  }


})();

