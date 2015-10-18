/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals H, T, IFC, REN, GAM, SIM, REN, PHY, Mousetrap, CFG, TWEEN */
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
    cvsFps, ctxFps, fps = 0, drawFps = CFG.Debug.draw.fps, msecFrame = 0, bufFps, 

    $menu, $submenu, 
    $menuList, $submenuList, 
    menuItems = [
      {label: 'Reload',     active: true,                       action: () => window.location.reload()},
      {label: 'Back',       active: true,                       action: () => window.history.back()},
      {label: 'Fullscreen', active: true,                       action: () => self.toggleFullScreen()},
      {label: 'Screenshot', active: true,                       action: () => self.shootScreen()},
      {label: 'Reset',      active: true,                       action: () => window.reset()},
      {label: 'Setup',      active: () => SIM.can('setup'),     action: () => SIM.promise('setup',    {test:1})},
      {label: 'Training',   active: () => SIM.can('training'),  action: () => SIM.promise('training', {test:2})},
      {label: 'Play',       active: () => SIM.can('play'),      action: () => SIM.promise('play',     {test:3}),      items: [
        {label: 'Pause',      active: () => GAM.can('pause'),     action: () => GAM.promise('pause',    {test:4})},
        {label: 'Half1',      active: () => GAM.can('half1'),     action: () => GAM.promise('half1',    {test:5})},
        {label: 'Half2',      active: () => GAM.can('half2'),     action: () => GAM.promise('half2',    {test:5})},
      ]},
    ],

    bodyMenuItems = function ( body ){
      
      var header = H.format('%s %s - T%s %s', body.name, body.number || '', body.team !== undefined ? body.team : '', body.sign || '');
      
      return [
        {label: header,       active: false,                      action: null},
        {label: 'Select',     active: true,                       action: () => GAM.toggleSelect(body)},
        {label: 'Mark',       active: true,                       action: () => GAM.toggleMark(body)},
      ];

    },

    interprete = function(val){return typeof val === 'function' ? val() : val;},
    eat = function(e){e.stopPropagation(); return false;};


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
      $menu         = $('.menu');
      $menuList     = $('.menu-list');
      $submenu      = $('.sub-menu');
      $submenuList  = $('.sub-menu-list');
      $messagesList = $('.messages-list');

      $('#btnToggle').onclick = function(){self.toggleTab();};
      $('#btnStop').onclick   = self.stop;
      $('#btnPause').onclick  = self.pause;
      $('#btnPlay').onclick   = self.play;
      $('#btnStep').onclick   = self.step;

      $menu.onmouseleave = function(){self.hideMenu();};

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
      self.listen();
      self.setKeys();


    }, listen: function(){

      function onmousemove (e) {
        var yOff = self.isFullScreen() ? 0 : marginTop;
        mouse.x = e.clientX - cvs.offsetLeft;
        mouse.y = e.clientY - cvs.offsetTop - yOff;
        REN.setMouse(mouse);
        bodyUnderMouse = self.bodyUnderMouse = PHY.findAtMouse(mouse);
      }

      function onmouseup ( /* e */ ) {
        mouse.down = null;
      }

      function onmousedown (e) {

        mouse.down = {x: mouse.x, y: mouse.y, b: e.button};
        
        // left leaves a mark on field
        if (e.button === 0 && !bodyUnderMouse){
          REN.tween(1.0, 0.0, 800, TWEEN.Easing.Quadratic.Out, function () {
            var x = mouse.fx, y = mouse.fy;
            return (alpha) => REN.alpha(alpha, REN.fillCircle.bind(null, x, y, 1, 'red'));
          });

        } else if (e.button === 1){
          // middle removes mark and select from bodies
          GAM.deMarkSelect();
        
        } else if (e.button === 2 && bodyUnderMouse){
          // right with body menu
          self.updateMenuList($menuList, bodyMenuItems(bodyUnderMouse));
          self.showMenu();
        
        } else if (e.button === 2 && !bodyUnderMouse){
          // right with field menu
          self.updateMenuList($menuList, menuItems);
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

      if (command === 'stop')  { cmd = command; SIM.reset(); return;}
      if (command === 'play')  { cmd = command; animate(); }
      if (command === 'pause') { cmd = command; animate(); }
      if (command === 'step' && cmd === 'play' ){ cmd = command; }
      if (command === 'step' && cmd !== 'play' ){ cmd = command; animate(); }

      function animate (newtime){

        fps = ~~(1000 / (newtime - lasttime));
        bufFps.push(fps);
        lasttime = newtime;

        msecTick = window.performance.now();
          SIM.tick();
          GAM.tick();
          PHY.tick();
        self.msecTick = window.performance.now() - msecTick;

        msecRend = window.performance.now();
          PHY.world.render();
        self.msecRend = window.performance.now() - msecRend;

        REN.info.fps = fps;
        drawFps && self.drawFps(fps);

        if (cmd === 'play'){
          window.requestAnimationFrame(animate);
        }

      }

    }, drawFps: function( fps ){

      var h = fps/2;
      ctxFps.fillStyle = h > 25 ? 'white' : 'red';
      ctxFps.fillRect(0, 32 - h, 1, h > 25 ? 2 : h);
      ctxFps.drawImage(cvsFps, 1, 0);
      ctxFps.fillStyle = '#AAA';
      ctxFps.fillRect(0, 0, 1, 32);

      // if (h <= 25){
        // ctxFps.font = '16px sans-serif'
        // ctxFps.fillStyle = '#e44';
        // ctxFps.fillText(2, 2, bufFps.avg().toFixed(1));
      // }

    }, message: function(message){

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

    }, clearMenu: function($el){

      while ($el.firstChild) {
        $el.onclick = undefined;
        $el.onmouseenter = undefined;
        $el.onmouseleave = undefined;
        self.clearMenu($el.firstChild);
        $el.removeChild($el.firstChild);
      }

    }, updateMenuList: function($el, list){

      var el, ul, li;

      self.clearMenu($el);

      H.each(list, (i, entry) => {

        el = document.createElement('li');
        el.className = interprete(entry.active) ? ' menu-item' : 'menu-item-disabled';
        el.innerHTML = entry.label;
        el.onclick = function(e){entry.action(); self.hideMenu(); return eat(e);};

        if (entry.items){

          ul = document.createElement('ul');
          ul.className = 'sub-menu-list none';
          el.appendChild(ul);

          H.each(entry.items, (i, subentry) => {
            li = document.createElement('li');
            li.className = interprete(subentry.active) ? ' sub-menu-item' : 'sub-menu-item-disabled';
            li.innerHTML = subentry.label;
            li.onclick = function(e){subentry.action(); self.hideMenu(); return eat(e);};
            ul.appendChild(li);
          });

          el.onmouseenter  = function(){
            ul.classList.remove('none');
            ul.classList.add('block');
          };

          el.onmouseleave = function(){
            ul.classList.add('none');
            ul.classList.remove('block');
          };

        }

        $el.appendChild(el);

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
          
          // animation          
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
