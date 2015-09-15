/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*globals REN, TWEEN, CFG, SIM, PHY, IFC, T, H */

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

    draw = {
      info:       CFG.Debug.draw.info,
      speed:      CFG.Debug.draw.speed,
      mouse:      CFG.Debug.draw.mouse,
      messages:   CFG.Debug.draw.messages,
      collisions: CFG.Debug.draw.collisions,
      corner:     false,
      spotkick:   false,
    },

    transform = {field: [0, 0, 0, 0], scale: 1},

    tweenWhistle,

    imgWhistle;

  return {

    info,
    draw,

    boot: function(){return (self = this);

    }, tick:     function(){PHY.world.render();
    }, init:     function(canvas, context){

      cvs = canvas; 
      ctx = context;

      imgWhistle = $('.img-whistle');


    }, resize: function(winWidth, winHeight){

      width  = winWidth; 
      height = winHeight;

      self.calcTransform();
      PHY.resize(transform);


    }, toField : function (point) {

      return {
        x: (point.x - transform.field[0]) / transform.scale, 
        y: (point.y - transform.field[1]) / transform.scale
      };

    
    }, whistle:  function(data){

      if (tweenWhistle){tweenWhistle.stop();}

      tweenWhistle = new TWEEN
        .Tween({alpha: 1.0})
        .to(   {alpha: 0.0}, 600)
        .easing(TWEEN.Easing.Quadratic.In)
        .onUpdate( () => self.drawWhistle(this.alpha, data.team) )
        .start()
      ;


    }, render: function(bodies, worldmeta){

      var i, body, name;

      PHY.world.emit('beforeRender', {
        renderer: this,
        bodies:   bodies,
        meta:     worldmeta
      });

      meta = worldmeta;
      meta.interpolateTime = worldmeta.interpolateTime || 0;

      ctx.fillStyle = CFG.Screen.backcolor;
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      // ctx.globalAlpha = SIM.gameruns ? 1.0 : 0.3;
      // ctx.strokeStyle = 'white';
      // ctx.strokeRect(10, 10, cvs.width -20, cvs.height -20);
      // ctx.drawImage(imgWhistle, 0, 0, 30, 30);

      // no transform
      draw.info        && self.drawDebug();
      draw.speed       && self.drawSpeed();
      draw.mouse       && self.drawMouse(IFC.mouse);
      draw.messages    && self.drawMessages(SIM.game.messages);

      // translate 0,0
      draw.corner      && self.drawCorner();
      draw.spotkick    && self.drawSpotkick();

      self.drawField();

      draw.collisions  && self.drawCollisions(PHY.collisions);

      // w/ translate x,y
      TWEEN.update();  // whistle
      self.drawTeamsResult(0.4);
      self.drawSimState(0.3);

      for (i = 0; (body = bodies[i]); i++){

        name = body.name;

        // transform w/ angle
        (name === 'ball')   && self.drawBall(body);
        (name === 'player') && self.drawPlayer(body);
        (name === 'post')   && self.drawPost(body);

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


    }, drawWhistle: function(alpha, team){

      var 
        size = 5,
        top  = 4,
        keep = ctx.globalAlpha,
        w2   = CFG.Field.length / 2,
        left = team === 0 ? w2 - size/2 : w2 + size/2;

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(left, top);

      ctx.globalAlpha = alpha;
      ctx.drawImage(imgWhistle, 0, 0, size, size);

      ctx.globalAlpha = keep;

      ctx.restore();


    }, drawSpotkick: function(){

      var 
        x = draw.spotkick.x,
        y = draw.spotkick.y,
        l = 0.5;

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);

      ctx.lineWidth = 3 / transform.scale;
      ctx.strokeStyle = 'rgba(250, 250, 250, 0.9)';

      ctx.beginPath();
      ctx.moveTo(x-l, y);
      ctx.lineTo(x+l, y);
      ctx.moveTo(x, y-l);
      ctx.lineTo(x, y+l);
      ctx.stroke();

      ctx.setLineDash([0.4, 0.8]);
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';

      ctx.beginPath();
      ctx.arc(x, y, 9.15, 0, TAU, false);
      ctx.stroke();

      ctx.restore();


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

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);

      ctx.lineWidth = 3 / transform.scale;
      ctx.setLineDash([0.4, 0.8]);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(220, 220, 220, 0.8)';
      ctx.arc(x, y, 9.15, start, end, false);
      ctx.stroke();

      ctx.restore();
      

    }, drawSimState: function(alpha){

      var 
        fill = 'rgba(0, 0, 0, ' + alpha + ')',
        font = '4px Cantarell',
        w2   = CFG.Field.length / 2, 
        top  = 0,
        topState = 64,
        diff = 2;

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(w2, top);

      ctx.textBaseline = 'top';
      ctx.fillStyle = fill;

      ctx.font = font;
      ctx.textAlign = 'right';
      ctx.fillText(SIM.game.stage, -diff, topState);

      ctx.textAlign = 'left';
      ctx.fillText(H.format('%s (%s)', T.fmtTime(SIM.game.time), SIM.game.state), diff, topState);

      ctx.restore();


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

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(w2, top);

      ctx.textBaseline = 'top';
      ctx.fillStyle = fill;

      ctx.font = fontTeams;
      ctx.textAlign = 'right';
      ctx.fillText(CFG.Teams[0].name, -diff, topNames);
      ctx.textAlign = 'left';
      ctx.fillText(CFG.Teams[1].name, diff, topNames);

      ctx.font = fontResults;
      ctx.textAlign = 'right';
      ctx.fillText(SIM.game.goals[0], -diff, topResults);
      ctx.textAlign = 'left';
      ctx.fillText(SIM.game.goals[1], diff, topResults);

      cardsLeft = - 3* diff - cardsSize;
      ctx.fillStyle = 'rgba(250, 250, 0, 0.4)',
      cards = SIM.game.yellows[0];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft -= diff;
      }
      ctx.fillStyle = 'rgba(250, 0, 0, 0.4)',
      cards = SIM.game.reds[0];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft -= diff;
      }

      cardsLeft = 3* diff;
      ctx.fillStyle = 'rgba(250, 250, 0, 0.4)',
      cards = SIM.game.yellows[1];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft += diff;
      }
      ctx.fillStyle = 'rgba(250, 0, 0, 0.4)',
      cards = SIM.game.reds[1];
      while (cards--){
        ctx.fillRect(cardsLeft, topResults, cardsSize, cardsSize * 2);
        cardsLeft += diff;
      }

      ctx.restore();


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

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 20, 0, Math.PI*2, true);
      // ctx.closePath();
      ctx.stroke();
    

    }, drawSpeed: function(){

      var left = cvs.width -260;

      ctx.font      = '16px Courier New';
      ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
      ctx.textAlign = 'left';

      ctx.fillText('fps/ipf    :  ' + ~~(meta.fps)              + '/' + meta.ipf, left, 20);
      ctx.fillText('frame/secs :  ' + SIM.game.frame            + '/' + SIM.game.time.toFixed(1), left, 40);
      ctx.fillText('tick/rend  :  ' + IFC.msecTick.toFixed(2)   + '/' + IFC.msecRend.toFixed(2), left, 60);


    }, drawDebug: function(){

      var body = PHY.findAt(self.toField(IFC.mouse));

      function toFieldInt(point){var p = self.toField(point); return {x: ~~p.x, y: ~~p.y };}
      function bodyShort (body){
        return ( !body ? 'none' :
          body.name === 'player' ? H.format('%s, %s [%s]', body.name, body.sign, body.team) :
          body.name === 'ball'   ? 'ball' :
          body.name === 'post'   ? 'post' :
            'wtf'
        );
      }

      ctx.font      = '24px Courier New';
      ctx.fillStyle = 'rgba(33, 33, 33, 0.2)';
      ctx.textAlign = 'left';

      ctx.fillText('meter :  ' + JSON.stringify(toFieldInt(IFC.mouse)) , 30,  40);
      ctx.fillText('mouse :  ' + JSON.stringify(IFC.mouse)             , 30,  70);
      ctx.fillText('body  :  ' + bodyShort(body)                       , 30, 100);
      ctx.fillText('info  :  ' + JSON.stringify(info)                  , 30, 130);
    

    }, drawCollisions: function(colls){

      // bodyA: // the first body
      // bodyB: // the second body
      // norm: // the normal vector (Vectorish)
      // mtv: // the minimum transit vector. (the direction and length needed to extract bodyB from bodyA)
      // pos: // the collision point relative to bodyA
      // overlap: // the amount bodyA overlaps bodyB

      var 
        coll, 
        i = colls.length,
        alpha = 1.0,
        alphaDiff = 1 / CFG.Debug.maxCollisions,
        size = 0.5;

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);

      while((coll = colls[--i])){
        ctx.fillStyle = H.format('rgba(250, 0, 0, %s)', alpha -= alphaDiff);
        ctx.fillRect(coll.x - size/2, coll.y - size/2, size, size);
      }

      ctx.restore();


    }, drawField: function(){

      var 
        scale        = transform.scale,
        [x, y, w, h] = transform.field,
        lineWidth = CFG.Field.lineWidth * scale,
        l2 = lineWidth / 2,
        rc = CFG.Field.cornerRadius * scale - l2,
        rm = CFG.Field.middleCircle * scale - l2,
        ls = CFG.Field.strafraum    * scale,
        gw = CFG.Goal.width         * scale,
        gl = CFG.Goal.length        * scale,
        pr = lineWidth * 0.6;

      // x, y, w, h include lines

      ctx.lineWidth   = lineWidth;
      ctx.strokeStyle = CFG.Field.lineColor;

      // outer, middle
      ctx.strokeRect(x + l2,  y + l2,        w - lineWidth, h - lineWidth);
      ctx.strokeRect(x + w/2, y + lineWidth, 0,             h - 2 * lineWidth);
      
      // corners
      ctx.beginPath();
      ctx.arc(x + l2, y + l2,         rc, 0, PI2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w - l2, y + l2,     rc, PI2, PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w - l2, y + h - l2, rc, PI, PI + PI2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + l2, y + h - l2,     rc, PI + PI2, TAU);
      ctx.stroke();

      // center
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2,     rm, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2,     pr, 0, TAU);
      ctx.stroke();

      // strafraum
      ctx.strokeRect(x + l2, y + h / 2 - ls + l2, ls - lineWidth, 2 * ls - lineWidth);

      // elfer
      ctx.beginPath();
      ctx.arc(x + 11 * scale, y + h / 2,     pr, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w - 11 * scale, y + h / 2, pr, 0, TAU);
      ctx.stroke();

      // tor
      ctx.fillStyle = CFG.Goal.fillColor;

      ctx.strokeRect(x - gw + 3 * l2, y + h / 2 - gw + l2, gw - 2 * l2, gl - 2 * l2);
      ctx.fillRect  (x - gw + 3 * l2, y + h / 2 - gw + l2, gw - 3 * l2, gl - 2 * l2);

      ctx.strokeRect(x + w - l2,      y + h / 2 - gw + l2, gw - 2 * l2, gl - 2 * l2);
      ctx.fillRect(  x + w,           y + h / 2 - gw + l2, gw - 3 * l2, gl - 2 * l2);

 
    }, drawPlayer:  function(body){

      var
        t      = meta.interpolateTime,
        x      = body.state.pos._[0]    + t * body.state.vel._[0], 
        y      = body.state.pos._[1]    + t * body.state.vel._[1],
        angle  = body.state.angular.pos + t * body.state.angular.vel,
        fill   = body.styles.fill,
        stroke = body.styles.stroke,
        radius = body.width +1.5;

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(x, y);
      ctx.rotate(angle);

      if (body.selected){
        ctx.lineWidth = 3 / transform.scale;
        ctx.beginPath();
        ctx.strokeStyle = body.styles.mark;
        ctx.arc(0, 0, radius, 0, TAU, false);
        // ctx.closePath();
        ctx.stroke();
      }

      if (body.marked){
        ctx.beginPath();
        ctx.fillStyle = body.styles.select;
        ctx.arc(0, 0, radius, 0, TAU, false);
        // ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle   = fill;
      ctx.strokeStyle = stroke;

      ctx.lineWidth = 1 / transform.scale;
      ctx.fillRect(-body.width/2, -body.height/2, body.width, body.height);
      ctx.strokeRect(-body.width/2, -body.height/2, body.width, body.height);

      ctx.beginPath();
      ctx.strokeStyle = body.styles.angleIndicator;
      ctx.moveTo(0, 0);
      ctx.lineTo(body.width *2, 0);
      ctx.stroke();

      ctx.restore();


    }, drawPost:  function(body){

      var
        x      = body.state.pos._[0], 
        y      = body.state.pos._[1],
        angle  = body.state.angular.pos;

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(x, y);
      
      // ctx.rotate(angle);

      ctx.fillStyle   = body.styles.fill;
      ctx.strokeStyle = body.styles.stroke;

      ctx.lineWidth = 1 / transform.scale;
      ctx.fillRect(0, 0, body.width, body.height);
      ctx.strokeRect(0, 0, body.width, body.height);

      ctx.restore();


    }, drawBall:  function(body){

      var
        t      = meta.interpolateTime,
        x      = body.state.pos._[0] +    t * body.state.vel._[0], 
        y      = body.state.pos._[1] +    t * body.state.vel._[1],
        r      = CFG.Ball.radius,
        angle  = body.state.angular.pos + t * body.state.angular.vel,
        fill   = body.styles.fill,
        stroke = body.styles.stroke,
        radius = r + 1.5,
        playerColor = body.player ? body.player.styles.fill : undefined;

      ctx.save();
      ctx.translate(transform.field[0], transform.field[1]);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(x, y);
      ctx.rotate(angle);

      if (body.selected){
        ctx.lineWidth = 3 / transform.scale;
        ctx.beginPath();
        ctx.strokeStyle = body.styles.mark;
        ctx.arc(0, 0, radius, 0, TAU, false);
        // ctx.closePath();
        ctx.stroke();
      }

      if (body.marked){
        ctx.beginPath();
        ctx.fillStyle = body.styles.select;
        ctx.arc(0, 0, radius, 0, TAU, false);
        // ctx.closePath();
        ctx.fill();
      }

      ctx.lineWidth = 1 / transform.scale;
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.arc(0, 0, r, 0, TAU, false);
      // ctx.closePath();
      ctx.stroke();
      ctx.fill();

      if (playerColor){
        ctx.beginPath();
        ctx.fillStyle = playerColor;
        ctx.arc(0, 0, r/2, 0, TAU, false);
        // ctx.closePath();
        ctx.fill();
      }

      ctx.beginPath();
      ctx.strokeStyle = body.styles.angleIndicator;
      ctx.moveTo(0, 0);
      ctx.lineTo(r + r, 0);
      ctx.stroke();

      ctx.restore();


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