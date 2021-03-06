/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals H, T, IFC, REN, MEN, GAM, SIM, REN, PHY, Mousetrap, BHV, CFG, CTR, TWEEN */
/*jshint -W030 */

'use strict';

IFC = (function(){

  var 
    self, width, height, w2, h2, 
    $content, $playground, $messages, $ticker, $errors, $code, $images, 
    cvs, ctx, 

    msecTick = 0, msecRend = 0, lasttime = 0.0,

    $ = document.querySelector.bind(document),

    curTab = 'playground', tabs = ['playground', 'images', 'errors', 'messages', 'ticker', 'code'],
    
    marginTop = CFG.Screen.marginTop, 

    mouse = {x: -1000, y: -1000, fx: -1000, fy: -1000, down: null},
    bodyUnderMouse,

    $messagesList,

    cmd, // animation
    cvsFps, ctxFps, fps = 0, drawFps = CFG.Debug.draw.fps, msecFrame = 0, bufFps;


  return {

    ctx,
    cvs,

    mouse,
    width,
    height,

    msecRend,   // to render
    msecTick,   // to tick
    msecFrame,  // between frame

    // menuItems,

    bodyUnderMouse,

    boot:   function () { return (self = this);

    }, throw: function(){

        var 
          msg = H.format.apply(null, H.toArray(arguments)),
          stack = new Error().stack.split('\n').slice(1);

        console.warn.apply(console, H.toArray(arguments));

        stack.forEach(line => console.log(line));   
        // throw "\n*\n" + msg;

    }, stop:  function ( ){SIM.reset(); self.animate('stop');
    }, play:  function ( ){self.animate('play');
    }, pause: function ( ){self.animate('pause');
    }, step:  function ( ){self.animate('step');
    }, error: function (e){console.log(e);
    }, show:  function ( ){$content.style.display = 'block';
    }, init:  function ( ){

      $content      = $('.content');
      $playground   = $('.playground');
      $messages     = $('.messages');
      $ticker       = $('.ticker');
      $errors       = $('.errors');
      $code         = $('.code');
      $images       = $('.images');

      $messagesList = $('.messages-list');

      $('#btnToggle').onclick = function(){self.toggleTab();};
      $('#btnStop').onclick   = self.stop;
      $('#btnPause').onclick  = self.pause;
      $('#btnPlay').onclick   = self.play;
      $('#btnStep').onclick   = self.step;

      cvs = self.cvs = document.createElement('canvas');
      // cvs.setAttribute('moz-opaque', 'moz-opaque');
      cvs.className = 'noselect';
      cvs.setAttribute('crossOrigin', 'Anonymous');
      cvs.style.backgroundColor = CFG.Screen.backcolor;
      ctx = self.ctx = cvs.getContext('2d');
      $playground.appendChild(cvs);

      cvsFps = $('.barCanvas');
      ctxFps = cvsFps.getContext('2d');
      bufFps = H.createRingBuffer(120);

      self.toggleTab(curTab);


    }, listen: function(){

      self.setKeys();

      cvs.addEventListener('mousemove',  onmousemove,  false);
      cvs.addEventListener('mouseup',    onmouseup,    false);
      cvs.addEventListener('mousedown',  onmousedown,  false);
      cvs.addEventListener('touchstart', ontouchstart, false);

      function onmousemove (e) {

        var yOff = self.isFullScreen() ? 0 : marginTop;

        mouse.x = e.clientX - cvs.offsetLeft;
        mouse.y = e.clientY - cvs.offsetTop - yOff;
        REN.updateMouse(mouse);
        bodyUnderMouse = self.bodyUnderMouse = PHY.findAtMouse(mouse);
        GAM.hover(bodyUnderMouse);

      }

      function onmouseup ( /* e */ ) {
        mouse.down = null;
      }

      function onmousedown (e) {

        mouse.down = {x: mouse.x, y: mouse.y, b: e.button};
        
        // left leaves a mark on field
        if (e.button === 0 && !bodyUnderMouse){
          REN.tween(1.0, 0.0, 800, TWEEN.Easing.Quadratic.Out, function () {
            var 
              x = mouse.fx, 
              y = mouse.fy,
              action = REN.fillCircle.bind(null, x, y, 1, 'red');
            return (alpha) => REN.alpha(alpha, action);
          });

        } else if (e.button === 1){
          // middle removes mark and select from bodies
          GAM.deMarkSelect();
        
        } else if (e.button === 2 && bodyUnderMouse){
          // right with body menu
          // self.updateMenuList();
          // self.showMenu();
          
          MEN.update(bodyUnderMouse);
          MEN.show();
        
        } else if (e.button === 2 && !bodyUnderMouse){
          // right with field menu
          // self.updateMenuList($menuList, menuItems);
          // self.showMenu();

          MEN.update();
          MEN.show();          

        }

      }

      function ontouchstart (e) {
        SIM.message('touch detected');
        console.log('touchstart', e);
      }

    }, resize: function(outerWidth, outerHeight){

      var yOff = self.isFullScreen() ? 0 : marginTop;
      
      width  = self.width  = cvs.width  = outerWidth;
      height = self.height = cvs.height = outerHeight - yOff;

      w2 = width  / 2;
      h2 = height / 2;

      // content absolute
      T.resizeElement($content, 0, yOff, width, height);

      // tabs + canvas
      [$playground, $images, $messages, $ticker, $errors, $code, cvs].forEach(ele => {
        T.resizeElement(ele, 0, 0, width, height);
      });

      REN.resize(width, height);

    }, animate: function animate (command){

      if (command === 'stop')  { cmd = command; SIM.reset(); return;}
      if (command === 'play')  { cmd = command; animation(); }
      if (command === 'pause') { cmd = command; animation(); }
      if (command === 'step' && cmd === 'play' ){ cmd = command; }
      if (command === 'step' && cmd !== 'play' ){ cmd = command; animation(); }

      function animation (newtime){

        fps = ~~(1000 / (newtime - lasttime));
        bufFps.push(fps);
        lasttime = newtime;

        msecTick = window.performance.now();
          SIM.tick();
          GAM.tick();
          PHY.tick(); // triggers CTR
        self.msecTick = window.performance.now() - msecTick;

        msecRend = window.performance.now();
          PHY.world.render();
        self.msecRend = window.performance.now() - msecRend;

        REN.info.fps = fps;
        drawFps && self.drawFps(fps);

        if (cmd === 'play'){
          window.requestAnimationFrame(animation);
        }

      }

    }, drawFps: function( fps ){

      var h = fps/2;

      // render fps as column
      ctxFps.fillStyle = h > 25 ? 'white' : 'red';
      ctxFps.fillRect(0, 32 - h, 1, h > 25 ? 2 : h);

      // copy blit one pixel right
      ctxFps.drawImage(cvsFps, 1, 0);

      // erase left most column
      ctxFps.fillStyle = '#AAA';
      ctxFps.fillRect(0, 0, 1, 32);

    }, message: function(message){

      var el;

      if (CFG.Debug.collectMessages){

        el = document.createElement('li');
        el.className = 'messages-item';
        el.innerHTML = H.format('%s %s', message.time.toFixed(1), message.msg);
        $messagesList.appendChild(el);

      }

    }, setKeys: function(){

      var 
        draw = REN.draw,
        keymap = {
          
          // meta
          '^' : self.shootScreen,
          
          // animation, top line       
          'q' : self.stop,
          'w' : self.play,
          'e' : self.pause,
          'r' : self.step,

          // toggle debug decoration, second line + space
          'a' : () => draw.info = !draw.info,
          's' : () => draw.speed = !draw.speed,
          'd' : () => draw.messages = !draw.messages,
          'f' : () => draw.collisions = !draw.collisions,
          'g' : () => draw.sandbox = !draw.sandbox,
          'h' : () => draw.fps = !draw.fps,
          'space' : () => {
            draw.info = false;
            draw.speed = false;
            draw.messages = false;
            draw.collisions = false;
            draw.sandbox = false;
            draw.fps = false;
          },
          
          // steer selected player
          'up'    : () => {PHY.world.emit('key:up');},
          'down'  : () => {PHY.world.emit('key:down');},
          'left'  : () => {PHY.world.emit('key:left');},
          'right' : () => {PHY.world.emit('key:right');},

        };

      Mousetrap.reset();

      H.each(keymap, function(keys, fn){
        Mousetrap.bind(keys.split(','), e => {fn(e); return false;}); // console.log("trapped: " + keys); 
      });

    }, shootScreen: function(){

      var state = H.deepcopy(REN.draw);

      // suppress debug decoration
      H.each(REN.draw, key => REN.draw[key] = false);

      window.setTimeout(function(){
        window.open(cvs.toDataURL('image/png'), 'toDataURL() image', 'width=' + cvs.width/2 + ', height=' + cvs.height/2);
        H.extend(REN.draw, state);
      }, 32);

    }, toggleTab: function(tab){

      function nextTab () {
        var index = tabs.indexOf(curTab);
        return index === tabs.length -1 ? tabs[0] : tabs[index +1];
      }

      if (tab === undefined) {
        self.toggleTab(nextTab());
        return;

      } else {
        curTab = tab;

      }

      tabs.forEach(function(tab){
        $('.' + tab).style.display = 'none';
      });

      $('.' + curTab).style.display = 'block';

      if(curTab === 'playground'){
        window.oncontextmenu = function(e){
          e.preventDefault();
          return false;
        };
      
      } else {
        window.oncontextmenu = function(){};

      }

    }, isFullScreen: function () {

      // return !(
      //   !document.fullscreenElement &&
      //   !document.mozFullScreenElement && 
      //   !document.webkitFullscreenElement && 
      //   !document.msFullscreenElement
      // );

      return !!(
        // document.mozFullScreenEnabled ||
        document.fullscreenElement ||
        document.mozFullScreenElement || 
        document.webkitFullscreenElement || 
        document.msFullscreenElement
      );

    }, toggleFullScreen: function () {

      if (!document.fullscreenElement &&    // alternative standard method
          !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
        if ($content.requestFullscreen) {
          $content.requestFullscreen();
        } else if ($content.msRequestFullscreen) {
          $content.msRequestFullscreen();
        } else if ($content.mozRequestFullScreen) {
          $content.mozRequestFullScreen();
        } else if ($content.webkitRequestFullscreen) {
          $content.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }

      // SIM.message('fullscreen: ' + IFC.isFullScreen());


  }}; // method end/return

}()).boot();
