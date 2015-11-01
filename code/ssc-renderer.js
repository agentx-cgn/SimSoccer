/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*globals REN, TWEEN, CFG, GAM, SIM, PHY, IFC, T, H */

'use strict';

REN = (function(){

  const 
    PI  = Math.PI,
    TAU = Math.PI * 2,
    PI2 = Math.PI / 2;

  var 
    self,
    cvs, ctx, width = 0, height = 0,

    $ = document.querySelector.bind(document),
    
    info = {}, meta = {fps: 0, ipf: 0},

    point = {},

    infobody = null,

    draw = {
      info:       CFG.Debug.draw.info,
      list:       CFG.Debug.draw.list,
      speed:      CFG.Debug.draw.speed,
      mouse:      CFG.Debug.draw.mouse,
      sandbox:    CFG.Debug.draw.sandbox,
      messages:   CFG.Debug.draw.messages,
      collisions: CFG.Debug.draw.collisions,
      corner:     false,
      spotkick:   false,
    },

    list = [],

    transX, transY, transA,
    transform = {field: [0, 0, 0, 0], scale: 1},

    strokeCircles, strokeRecs, fillRecs,

    tweenWhistle = null, imgWhistle;

    function bodyShort (infobody){
      return ( !infobody ? 'none' :
        infobody.name === 'player' ? H.format('%s, %s [%s]', infobody.name, infobody.sign, infobody.team) :
        infobody.name === 'ball'   ? 'ball' :
        infobody.name === 'post'   ? 'post' :
          'wtf'
      );
    }

  return {

    info,
    draw,
    // list,

    boot: function(){return (self = this);

    }, reset:     function(){

      cvs = IFC.cvs; 
      ctx = IFC.ctx;

      list = [];

      imgWhistle = $('.img-whistle');


    }, resize: function(winWidth, winHeight){

      width  = winWidth; 
      height = winHeight;

      self.calcTransform();
      self.calcField();
      PHY.resize(transform);


    }, setMouse : function (mouse) {

      mouse.fx = (mouse.x - transform.field[0]) / transform.scale, 
      mouse.fy = (mouse.y - transform.field[1]) / transform.scale


    }, toField : function (point) {

      return {
        x: (point.x - transform.field[0]) / transform.scale, 
        y: (point.y - transform.field[1]) / transform.scale
      };


    }, toFieldInt : function (p) {

      point.x = ~~((p.x - transform.field[0]) / transform.scale);
      point.y = ~~((p.y - transform.field[1]) / transform.scale);

      return point;

    }, push: function(task){

      list.push(task);


    }, whistle:  function(data){

      if (tweenWhistle){tweenWhistle.stop();}

      tweenWhistle = new TWEEN
        .Tween({alpha: 1.0})
        .to(   {alpha: 0.0}, 600)
        .easing(TWEEN.Easing.Quadratic.In)
        .onUpdate( () => self.drawWhistle(this.alpha, data.team) )
        .start()
      ;


    }, alpha: function(newAlpha, action){

      var oldAlpha = ctx.globalAlpha;

      ctx.globalAlpha = newAlpha;
      action();
      ctx.globalAlpha = oldAlpha;


    }, tween: function(from, to, msecs, easing, onUpdate){

      var updater = onUpdate(); 

      return (new TWEEN
        .Tween({delta: from})
        .to(   {delta: to}, msecs)
        .easing(easing)
        .onUpdate(function(){updater(this.delta);})
        .start()
      );


    }, render: function(bodies, worldmeta){

      var i, body;

      PHY.world.emit('beforeRender', {
        renderer: this,
        bodies:   bodies,
        meta:     worldmeta
      });

      meta = worldmeta;
      meta.interpolateTime = worldmeta.interpolateTime || 0;

      ctx.fillStyle = CFG.Screen.backcolor;
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      // draw on canvas, no transform
      draw.info        && self.drawDebug();
      draw.speed       && self.drawSpeed();
      draw.mouse       && self.drawMouse(IFC.mouse);
      draw.messages    && self.drawMessages(GAM.messages);

      ctx.save();
      self.translate();

      self.drawField();

      // draw on field, transformed
      draw.corner      && self.drawCorner();
      draw.spotkick    && self.drawSpotkick();
      draw.sandbox     && self.drawSandbox();
      draw.collisions  && self.drawCollisions(PHY.collisions);

      TWEEN.update();  // whistle
      draw.list        && H.consume(list, task => task());

      self.drawTeamsResult(0.4);
      self.drawSimState(0.3);

      for (i = 0; (body = bodies[i]); i++){
        (body.name === 'ball')   && self.drawBall(body);
        (body.name === 'player') && self.drawPlayer(body);
        (body.name === 'post')   && self.drawPost(body);
      }

      ctx.restore();


    }, translate: function(x, y, angle){

      if (x !== undefined){
        ctx.rotate(-transA);
        ctx.translate(-transX, -transY);
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        transX = x;
        transY = y;
        transA = angle || 0;

      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(transform.field[0], transform.field[1]);
        ctx.scale(transform.scale, transform.scale);
        transX = 0;
        transY = 0;
        transA = 0;

      }


    }, calcTransform: function(){

      var 
        scale, x, y, w, h,               // pixel per meter, describes field w/o goals and margin
        margin      = CFG.Field.margin,  // min space around field + goals, meter
        spaceWidth  = CFG.Field.length + 2 * CFG.Goal.width + 2 * margin,
        spaceHeight = CFG.Field.width + 2 * margin,
        ratioScreen = width / height,
        ratioSpace  = spaceWidth  / spaceHeight;

      if (ratioScreen < ratioSpace) {
        scale = width / spaceWidth;
        x = scale * (margin + CFG.Goal.width);
        y = (height - CFG.Field.width * scale) / 2 ;

      } else {
        scale = height / spaceHeight;
        y = scale * margin;
        x = (width - CFG.Field.length * scale) / 2;

      }

      w = scale * CFG.Field.length;
      h = scale * CFG.Field.width;
      transform.scale = scale;
      transform.field = [x, y, w, h];


    }, calcField: function(){

        var 
          w  = CFG.Field.length,
          h  = CFG.Field.width,
          lw = CFG.Field.lineWidth,
          h2 = h  / 2,
          w2 = w  / 2,
          l2 = lw / 2,
          rc = CFG.Field.cornerRadius  - l2,
          rb = CFG.Field.radiuscircle  - l2,
          sb = CFG.Field.strafraum,
          ss = sb + sb,
          tb = CFG.Field.torraum,
          tt = tb + tb,
          gw = CFG.Goal.width,
          gl = CFG.Goal.length,
          pr = lw * 0.6,
          el = 11,
          pe = 0.92;        

        strokeCircles = [
          
          // corners
          [l2,     l2,      rc, 0,        PI2],
          [w - l2, l2,      rc, PI2,      PI],
          [w - l2, h - l2,  rc, PI,       PI + PI2],
          [l2,     h - l2,  rc, PI + PI2, TAU],
          
          // center
          [w2,     h2,      rb, 0,        TAU],
          [w2,     h2,      pr, 0,        TAU],
          
          // elfer klein
          [el,     h2,      pr, 0,        TAU],
          [w - el, h2,      pr, 0,        TAU],
          
          // elfer groß
          [el,     h2,      rb, -pe,      pe],
          [w - el, h2,      rb, PI - pe,  PI + pe],

        ];

        strokeRecs = [

          // outer, middle
          [l2,            l2,           w - lw,  h - lw],
          [w2,            lw,           0,       h - lw - lw],

          // strafraum
          [l2,            h2 - sb + l2, sb - lw, ss - lw],
          [w - sb + l2,   h2 - sb + l2, sb - lw, ss - lw],

          // torraum
          [l2,            h2 - tb + l2, tb - lw, tt - lw],
          [w - tb + l2,   h2 - tb + l2, tb - lw, tt - lw],

          // tore
          [-gw + lw + l2, h2 - gw + l2, gw - lw, gl - lw],
          [w - l2,        h2 - gw + l2, gw - lw, gl - lw],

        ];

        fillRecs = [

          // tor stroke
          [-gw + lw + l2, h2 - gw + l2, gw - lw + l2, gl - lw],
          [w - lw,        h2 - gw + l2, gw - lw + l2, gl - lw]

        ];


    }, strokeVector:  function(v1, v2, color, linewidth){

      // self.strokeLine(v1._[0], v1._[1], v2._[0], v2._[1], color, linewidth);

      self.translate(v1._[0], v1._[1]);
      ctx.lineWidth = (linewidth || 1) / transform.scale;
      ctx.strokeStyle = color || 'yellow';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(v2._[0], v2._[1]);
      ctx.stroke();


    }, strokeLine:  function(x1, y1, x2, y2, color, linewidth){

      self.translate(0, 0);
      ctx.lineWidth = (linewidth || 1) / transform.scale;
      ctx.strokeStyle = color || 'yellow';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();


    }, fillCircle:  function(x, y, radius, fillStyle, start, end){

      ctx.beginPath();
      ctx.fillStyle = fillStyle;
      ctx.arc(x, y, radius, start || 0, end || TAU, false);
      ctx.fill();
      

    }, strokeCircle:  function(x, y, radius, style, start, end){

      start = start || 0;
      end   = end   || TAU;

      ctx.beginPath();
      ctx.strokeStyle = style;
      ctx.arc(x, y, radius, start, end, false);
      ctx.stroke();


    }, drawWhistle: function(alpha, team){

      var 
        size = 5,
        top  = 4,
        keep = ctx.globalAlpha,
        w2   = CFG.Field.length / 2,
        left = team === 0 ? w2 - size/2 : w2 + size/2;

      self.translate(left, top, 0);

      ctx.globalAlpha = alpha;
      ctx.drawImage(imgWhistle, 0, 0, size, size);
      ctx.globalAlpha = keep;


    }, drawSandbox: function(){

      var edges = PHY.sandbox._edges;

      self.translate(0, 0);
      ctx.lineWidth = 1 / transform.scale;
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.5)';
      
      ctx.strokeRect(edges.min.x, edges.min.y, edges.max.x - edges.min.x, edges.max.y - edges.min.y);


    }, drawSpotkick: function(){

      var 
        x = draw.spotkick.x,
        y = draw.spotkick.y,
        l = 0.5;

      ctx.lineWidth = 3 / transform.scale;
      ctx.strokeStyle = 'rgba(250, 250, 250, 0.9)';

      ctx.beginPath();
      ctx.moveTo(x-l, y);
      ctx.lineTo(x+l, y);
      ctx.moveTo(x, y-l);
      ctx.lineTo(x, y+l);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
      ctx.setLineDash([0.4, 0.8]);
      self.strokeCircle(x, y, 9.15, 'rgba(200, 200, 200, 0.8)');
      ctx.setLineDash([]);


    }, drawCorner: function(){

      var 
        start, end,
        w = CFG.Field.length,
        h = CFG.Field.width,
        x = draw.corner.x,
        y = draw.corner.y;

      if (x === 0 && y === 0){ start = 0;        end = PI2; }
      if (x === w && y === 0){ start = PI2;      end = PI; }
      if (x === w && y === h){ start = PI;       end = PI + PI2; }
      if (x === 0 && y === h){ start = PI + PI2; end = TAU; }

      ctx.lineWidth = 3 / transform.scale;

      ctx.setLineDash([0.4, 0.8]);
      self.strokeCircle(x, y, 9.15, 'rgba(220, 220, 220, 0.8)', start, end);
      ctx.setLineDash([]);
      

    }, drawSimState: function(alpha){

      var 
        fill = 'rgba(0, 0, 0, ' + alpha + ')',
        font = '4px Cantarell',
        w2   = CFG.Field.length / 2, 
        top  = 0,
        topState = 64,
        diff = 2;

      self.translate(w2, top, 0);

      ctx.textBaseline = 'top';
      ctx.fillStyle = fill;

      ctx.font = font;
      ctx.textAlign = 'right';
      ctx.fillText(GAM.stage, -diff, topState);

      ctx.textAlign = 'left';
      ctx.fillText(H.format('%s (%s)', T.fmtTime(GAM.time), GAM.current), diff, topState);


    }, drawTeamsResult: function(alpha){

      var 
        cards,
        cardsLeft,
        cardsSize = 1.5,
        w2 = CFG.Field.length / 2, // meter
        top = 0,              // top absolut
        diff = 3,
        topNames = 3,              // top absolut
        topResults = 10,            // top diff
        fill = 'rgba(250, 250, 250, ' + alpha + ')',
        fontTeams   = '6px Cantarell',
        fontResults = '4px Cantarell';

      self.translate(w2, top, 0);

      ctx.textBaseline = 'top';
      ctx.fillStyle = fill;

      ctx.font = fontTeams;
      ctx.textAlign = 'right';
      ctx.fillText(CFG.Teams[0].name, -diff, topNames);
      ctx.textAlign = 'left';
      ctx.fillText(CFG.Teams[1].name, diff, topNames);

      ctx.font = fontResults;
      ctx.textAlign = 'right';
      ctx.fillText(GAM.goals[0], -diff, topResults);
      ctx.textAlign = 'left';
      ctx.fillText(GAM.goals[1], diff, topResults);

      cardsLeft = - 3* diff - cardsSize;
      ctx.fillStyle = 'rgba(250, 250, 0, 0.4)',
      cards = GAM.yellows[0];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft -= diff;
      }
      ctx.fillStyle = 'rgba(250, 0, 0, 0.4)',
      cards = GAM.reds[0];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft -= diff;
      }

      cardsLeft = 3* diff;
      ctx.fillStyle = 'rgba(250, 250, 0, 0.4)',
      cards = GAM.yellows[1];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft += diff;
      }
      ctx.fillStyle = 'rgba(250, 0, 0, 0.4)',
      cards = GAM.reds[1];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft += diff;
      }


    }, drawMessages: function(msgs){

      var 
        len  = msgs.length,
        i    = len,
        lh   = 22, 
        top  = IFC.cvs.height -20 - lh * CFG.Debug.maxMessages,
        left = 30;

      ctx.font      = '20px Courier New';
      ctx.fillStyle = 'rgba(33, 33, 33, 0.4)';
      ctx.textAlign = 'left';

      while(i--){
        ctx.fillText(H.format('> %s %s', msgs[i].time.toFixed(1), msgs[i].msg), left, top + (len - i) * lh);
      }


    }, drawMouse: function(mouse){

      self.strokeCircle(mouse.x, mouse.y, 20, 'rgba(0, 0, 0, 0.5)');
    

    }, drawSpeed: function(){

      var left = cvs.width -260;

      ctx.font      = '16px Courier New';
      ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
      ctx.textAlign = 'left';

      ctx.fillText('fps/ipf    :  ' + ~~(meta.fps)              + '/' + meta.ipf                 , left,  20);
      ctx.fillText('frame/secs :  ' + GAM.frame                 + '/' + GAM.time.toFixed(1)      , left,  40);
      ctx.fillText('tick/rend  :  ' + IFC.msecTick.toFixed(2)   + '/' + IFC.msecRend.toFixed(2)  , left,  60);
      ctx.fillText('simulation :  ' + SIM.current                                                , left,  80);
      ctx.fillText('game       :  ' + GAM.current                                                , left, 100);
      ctx.fillText('team0      :  ' + GAM.team0.current                                          , left, 120);
      ctx.fillText('team1      :  ' + GAM.team1.current                                          , left, 140);
      ctx.fillText('tasks      :  ' + SIM.tasks.length                                           , left, 160);

   

    }, drawDebug: function(){

      infobody = PHY.findAt(self.toField(IFC.mouse));

      ctx.font      = '24px Courier New';
      ctx.fillStyle = 'rgba(33, 33, 33, 0.2)';
      ctx.textAlign = 'left';

      ctx.fillText('meter :  ' + JSON.stringify(self.toFieldInt(IFC.mouse)) , 30,  40);
      ctx.fillText('mouse :  ' + JSON.stringify(IFC.mouse)                  , 30,  70);
      ctx.fillText('body  :  ' + bodyShort(infobody)                        , 30, 100);
      ctx.fillText('info  :  ' + JSON.stringify(info)                       , 30, 210);
    

    }, drawCollisions: function(colls){

      var 
        coll, 
        i = colls.length,
        alpha = 1.0,
        alphaDiff = 1 / CFG.Debug.maxCollisions,
        size = 0.5;

      while((coll = colls[--i])){
        ctx.fillStyle = H.format('rgba(250, 0, 0, %s)', alpha -= alphaDiff);
        ctx.fillRect(coll.x - size/2, coll.y - size/2, size, size);
      }


    }, drawField: function(){

      var r, c, i;

      ctx.lineWidth   = CFG.Field.lineWidth;
      ctx.strokeStyle = CFG.Field.lineColor;
      ctx.fillStyle   = CFG.Goal.fillColor;

      for (i=0; (c = strokeCircles[i]); i++){
        ctx.beginPath();
        ctx.arc(c[0], c[1], c[2], c[3], c[4]);
        ctx.stroke();
      }

      for (i=0; (r = strokeRecs[i]); i++){
        ctx.strokeRect(r[0], r[1], r[2], r[3]);
      }

      for (i=0; (r = fillRecs[i]); i++){
        ctx.fillRect(r[0], r[1], r[2], r[3]);
      }

 
    }, drawPlayer:  function(body){

      var
        t      = meta.interpolateTime,
        x      = body.state.pos._[0]    + t * body.state.vel._[0], 
        y      = body.state.pos._[1]    + t * body.state.vel._[1],
        angle  = body.state.angular.pos + t * body.state.angular.vel;

      self.translate(x, y, angle);

      ctx.lineWidth = 3 / transform.scale;

      body.selected && self.strokeCircle(0, 0, body.width + 1.5, body.styles.mark);
      body.marked   && self.fillCircle(0, 0, body.width + 1.5, body.styles.select);
      body.hover    && self.fillCircle(0, 0, body.width + 1.5, body.styles.hover);

      ctx.fillStyle   = body.styles.fill;
      ctx.strokeStyle = body.styles.stroke;

      ctx.lineWidth = 1 / transform.scale;
      ctx.fillRect(-body.width/2, -body.height/2, body.width, body.height);
      ctx.strokeRect(-body.width/2, -body.height/2, body.width, body.height);

      ctx.beginPath();
      ctx.strokeStyle = body.styles.angleIndicator;
      ctx.moveTo(0, 0);
      ctx.lineTo(body.width * 2, 0);
      ctx.stroke();


    }, drawPost:  function(body){

      var
        x = body.state.pos._[0], 
        y = body.state.pos._[1];

      self.translate(x, y, 0);
      
      ctx.fillStyle   = body.styles.fill;
      ctx.strokeStyle = body.styles.stroke;

      ctx.lineWidth = 1 / transform.scale;
      ctx.fillRect(0, 0, body.width, body.height);
      ctx.strokeRect(0, 0, body.width, body.height);


    }, drawBall:  function(body){

      var
        t      = meta.interpolateTime,
        x      = body.state.pos._[0] +    t * body.state.vel._[0], 
        y      = body.state.pos._[1] +    t * body.state.vel._[1],
        r      = CFG.Ball.radius,
        angle  = body.state.angular.pos + t * body.state.angular.vel,
        playerColor = body.player ? body.player.styles.fill : undefined;

      self.translate(x, y, angle);

      ctx.lineWidth = 3 / transform.scale;

      body.selected && self.strokeCircle(0, 0, r + 1.5, body.styles.mark);
      body.marked   && self.fillCircle(0, 0, r + 1.5, body.styles.select);
      body.hover    && self.fillCircle(0, 0, r + 1.5, body.styles.hover);

      ctx.lineWidth = 1 / transform.scale;
      ctx.fillStyle   = body.styles.fill;
      ctx.strokeStyle = body.styles.stroke;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU, false);
      ctx.stroke();
      ctx.fill();

      playerColor && self.fillCircle(0, 0, r/2, playerColor);

      ctx.strokeStyle = body.styles.angleIndicator;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r + r, 0);
      ctx.stroke();


    }, drawClock: function(){

      var h12 = days * Math.PI * 2 * 2, m60 = h12 * 12, len = 32;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.fillStyle = 'rgba(200, 128, 128, 0.9)';
      // ctx.translate(width/2, height/2);
      ctx.translate(width - 2 * len, 2 * len);
      ctx.rotate(h12 - Math.PI/2);
      ctx.fillRect(-1, -1, len-12, 3);
      ctx.rotate(m60-h12);
      ctx.fillRect(-1, -1, len-6, 3);
      ctx.restore();

    }

  };

}()).boot();