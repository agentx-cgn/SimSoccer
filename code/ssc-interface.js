/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals H, T, IFC, REN, SIM, PHY, Mousetrap, CFG */

'use strict';

IFC = (function(){

  var 
    self, width, height, w2, h2, 
    $content, $playground, $messages, $ticker, $errors, $code, $images, 
    cvs, ctx,

    msecTick = 0, msecRend = 0, lasttime = 0.0, fps = 0.0, msecFrame = 0,

    $ = document.querySelector.bind(document),

    curTab = 'playground', tabs = ['playground', 'images', 'errors', 'messages', 'ticker', 'code'],
    
    marginTop = CFG.Screen.marginTop, 

    mouse = {x: -1000, y: -1000, down: null},
    mouseOverBody,

    $messagesList,

    $menu,
    $menuList,
    menuItems = [
      {label: 'Back',       action: () => window.history.back()},
      {label: 'Fullscreen', action: () => self.toggleFullScreen()},
      {label: 'Reload',     action: () => window.location.reload()},
      {label: 'Screenshot', action: () => self.shootScreen()},
      {label: 'Reset',      action: () => SIM.reset()},
      {label: 'Run',        action: () => PHY.world.emit('game:run')},
      {label: 'Training',   action: () => console.log(this.innerHTML), items: []},
      {label: 'Game',       action: () => console.log(this.innerHTML), items: []},
    ];


  return {

    ctx,
    cvs,

    mouse,
    width,
    height,

    msecRend,   // to render
    msecTick,   // to tick
    msecFrame,  // between frame

    menuItems,

    mouseOverBody,

    boot:   function () { return (self = this);

    }, stop:  function (){SIM.reset(); self.animate('stop');
    }, play:  function (){self.animate('play');
    }, pause: function (){self.animate('pause');
    }, step:  function (){self.animate('step');
    }, error: function (error) {console.log(error);
    }, show:  function () { $content.style.display = 'block';
    }, init:  function () {

      $content    = $('.content');

      $playground = $('.playground');
      $messages   = $('.messages');
      $ticker     = $('.ticker');
      $errors     = $('.errors');
      $code       = $('.code');
      $images     = $('.images');

      $menu       = $('.menu');
      $menuList   = $('.menu-list');

      $messagesList = $('.messages-list');


      $('#btnToggle').onclick = function () {self.toggleTab();};
      $('#btnStop').onclick   = self.stop;
      $('#btnPause').onclick  = self.pause;
      $('#btnPlay').onclick   = self.play;
      $('#btnStep').onclick   = self.step;

      cvs = self.cvs = document.createElement('canvas');
      ctx = self.ctx = cvs.getContext('2d');
      $playground.appendChild(cvs);

      IFC.toggleTab(curTab);

      function onmousemove (e) {
        var yOff = self.isFullScreen() ? 0 : marginTop;
        mouse.x = e.clientX - cvs.offsetLeft;
        mouse.y = e.clientY - cvs.offsetTop - yOff;
        self.mouseOverBody = mouseOverBody = PHY.findAt(REN.toField(mouse));
      }

      function onmouseup ( /* e */ ) {
        mouse.down = null;
        self.hideMenu(mouse);
      }

      function onmousedown (e) {

        var selected;

        mouse.down = {x: mouse.x, y: mouse.y, b: e.button};
        
        // left toggle select of body, unselects other
        if (e.button === 0){
          if (mouseOverBody){
            selected = mouseOverBody.selected;
            H.each(PHY.find({selected: true}), (i, body) => {
              body.selected = false;
            });
            mouseOverBody.selected = !selected;

            if (mouseOverBody.selected){
              PHY.add('player-selected-interactive');
            } else {
              PHY.sub('player-selected-interactive');
            }

          }
        }

        // middle removes mark and select
        if (e.button === 1){
          H.each(PHY.find({selected: true}), (i, body) => {
            body.selected = false;
          });
          H.each(PHY.find({marked: true}), (i, body) => {
            body.marked = false;
          });
        }

        // right marks/unmarks bodies
        if (e.button === 2 && mouseOverBody){
          mouseOverBody.marked = !mouseOverBody.marked;
        }

        // right marks/unmarks bodies
        if (e.button === 2 && !mouseOverBody){
          self.updateMenu();
          self.showMenu();
        }

      }

      function ontouchstart (e) {
        SIM.message('touch detected');
        console.log('touchstart', e);
      }

      cvs.addEventListener('mousemove',  onmousemove,  false);
      cvs.addEventListener('mouseup',    onmouseup,    false);
      cvs.addEventListener('mousedown',  onmousedown,  false);
      cvs.addEventListener('touchstart', ontouchstart, false);

      self.setKeys();
      self.updateMenu();


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


    }, animate: function (command){

      var cmd;

      if (command === 'stop')  { cmd = command; SIM.reset(); return;}
      if (command === 'play')  { cmd = command; animate(); }
      if (command === 'pause') { cmd = command; animate(); }
      if (command === 'step' && cmd === 'play' ){ cmd = command; }
      if (command === 'step' && cmd !== 'play' ){ cmd = command; animate(); }

      function animate (newtime){

        REN.info.fps = (1 / (newtime - lasttime) * 1000).toFixed(1);
        lasttime = newtime;

        msecTick = window.performance.now();
          SIM.tick();
          PHY.tick( SIM.time * 1000 );
        self.msecTick = window.performance.now() - msecTick;

        msecRend = window.performance.now();
          REN.tick();
        self.msecRend = window.performance.now() - msecRend;

        if (cmd === 'play'){
          window.requestAnimationFrame(animate);
        }

      }


    }, message: function( /* message */ ){

      var el;

      if (CFG.Debug.collectMessages){

        el = document.createElement('li');
        el.className = 'messages-item';
        el.innerHTML = H.format('%s %s', message.time.toFixed(1), message.msg);
        $messagesList.appendChild(el);

      }


    }, showMenu: function(){

      var yOff = self.isFullScreen() ? marginTop : 0;

      $menu.style.left = (mouse.x -8) + 'px';
      $menu.style.top  = (mouse.y + yOff -8) + 'px';
      $menu.style.display = 'block';


    }, hideMenu: function(){

      $menu.style.display = 'none';


    }, updateMenu: function(){

      var el;

      while ($menuList.firstChild) {
        $menuList.removeChild($menuList.firstChild);
      }

      H.each(menuItems, (i, item) => {
        el = document.createElement('li');
        el.className = 'menu-item';
        el.innerHTML = item.label;
        el.onclick = function(){item.action(); self.hideMenu();};
        $menuList.appendChild(el);
      });


    }, setKeys: function(){

      var 
        keymap = {
          
          // guess what
          's' : self.shootScreen,
          
          // toggle debug decoration
          'd' : () => {REN.draw.info = !REN.draw.info;},
          'f' : () => {REN.draw.speed = !REN.draw.speed;},
          'm' : () => {REN.draw.messages = !REN.draw.messages;},
          'c' : () => {REN.draw.collisions = !REN.draw.collisions;},
          
          // simulation          
          'q' : self.stop,
          'w' : self.play,
          'e' : self.pause,
          'r' : self.step,

          // steer selected player
          'up'    : () => {PHY.world.emit('key:up');},
          'down'  : () => {PHY.world.emit('key:down');},
          'left'  : () => {PHY.world.emit('key:left');},
          'right' : () => {PHY.world.emit('key:right');},
          'space' : () => {PHY.world.emit('key:space');},

        };

      Mousetrap.reset();

      H.each(keymap, function(keys, fn){
        Mousetrap.bind(keys.split(','), e => {fn(e); return false;}); // console.log("trapped: " + keys); 
      });


    }, shootScreen: function(){

      var 
        draw = CFG.Debug.draw.info,
        msgs = CFG.Debug.draw.messages;

      // suppress debug decoration
      CFG.Debug.draw = false;
      CFG.Debug.messages = false;

      window.setTimeout(function(){
        window.open(cvs.toDataURL('image/png'), 'toDataURL() image', 'width=' + cvs.width/2 + ', height=' + cvs.height/2);
        CFG.Debug.draw.info = draw;
        CFG.Debug.draw.messages = msgs;
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

      SIM.message('fullscreen: ' + IFC.isFullScreen());


  }}; // method end/return

}()).boot();
