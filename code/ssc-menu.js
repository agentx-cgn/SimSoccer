/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals H, MEN, IFC, GAM, CFG, PHY, SIM, CTR, BHV */
/*jshint -W030 */

'use strict';

MEN = (function(){

  var 
    self,

    marginTop = CFG.Screen.marginTop, 

    $ = document.querySelector.bind(document),

    $menu, $submenu, $menuList, $submenuList, 

    fieldMenuItems = function ( body ){

      return [
        {label: 'Reload',     enabled: true,                       action: () => window.location.reload()},
        {label: 'Back',       enabled: true,                       action: () => window.history.back()},
        {label: 'Fullscreen', enabled: true,                       action: () => IFC.toggleFullScreen()},
        {label: 'Screenshot', enabled: true,                       action: () => IFC.shootScreen()},
        {label: 'Reset',      enabled: true,                       action: () => window.reset()},
        
        {label: 'Mark All',   enabled: true,                       action: () => PHY.bodies.players.forEach(GAM.mark)},
        {label: 'Mark T0',    enabled: true,                       action: () => PHY.bodies.team0.forEach(GAM.mark)},
        {label: 'Mark T1',    enabled: true,                       action: () => PHY.bodies.team1.forEach(GAM.mark)},
        {label: 'Mark Ball',  enabled: true,                       action: () => PHY.bodies.balls.forEach(GAM.mark)},

        {label: 'Setup',      enabled: () => SIM.can('setup'),     action: () => SIM.promise('setup',    {test:1})},
    
        {label: 'Training',   enabled: () => SIM.can('training'),  action: () => SIM.promise('training', {test:2}),      items: [
          {label: 'Excercise',   enabled: SIM.can('excercise'),      action: () => SIM.promise('excercise',    {test:4})},
        ]},

        {label: 'Play',       enabled: () => SIM.can('play'),      action: () => SIM.promise('play',     {test:3}),      items: [
          {label: 'Pause',      enabled: () => GAM.can('pause'),     action: () => GAM.promise('pause',    {test:4})},
          {label: 'Half1',      enabled: () => GAM.can('half1'),     action: () => GAM.promise('half1',    {test:5})},
          {label: 'Half2',      enabled: () => GAM.can('half2'),     action: () => GAM.promise('half2',    {test:5})},
        ]},
      ]

    },

    bodyMenuItems = function ( body ){
      
      var 
        header = H.format('%s %s - T%s %s', body.name, body.number || '', body.team !== undefined ? body.team : '', body.sign || ''),
        items = CTR.ofBody(body).map(name => {
          return {label: name, active: CTR.hasBody(body, name), action: () => BHV.behaviors[name].toggleBodies(body)};
        });
      
      return [
        {label: header,       enabled: false,                      action: null},
        {label: 'Select',     enabled: true,                       action: () => GAM.toggleSelect(body)},
        {label: 'Mark',       enabled: true,                       action: () => GAM.toggleMark(body)},
        {label: 'Behaviors',  enabled: false,                      action: null,                             items: items },

      ];

    };


  return {

    boot:   function(){return (self = this);

    }, reset: function () { self.init();
    }, hide:  function () { $menu.style.display = 'none';
    }, init:  function () {

     $menu         = $('.menu');
     $menuList     = $('.menu-list');
     $submenu      = $('.sub-menu');
     $submenuList  = $('.sub-menu-list');
     $menu.onmouseleave = self.hide;

    }, show: function(){

      var yOff = IFC.isFullScreen() ? marginTop : 0;

      $menu.style.left = (IFC.mouse.x -8) + 'px';
      $menu.style.top  = (IFC.mouse.y + yOff -8) + 'px';
      $menu.style.display = 'block';

    }, clear: function($el){

      while ($el.firstChild) {
        $el.onclick = undefined;
        $el.onmouseenter = undefined;
        $el.onmouseleave = undefined;
        self.clear($el.firstChild);
        $el.removeChild($el.firstChild);
      }

    }, update: function(body){

      var list = body ? bodyMenuItems(body) : fieldMenuItems();
    
      function makeClass (entry, pre) {

        if (entry.enabled !== undefined) {return pre + (H.interprete(entry.enabled) ? 'menu-item' : 'menu-item-disabled');}
        if (entry.active  !== undefined) {return pre + (H.interprete(entry.active)  ? 'menu-item' : 'menu-item-inactive');}

      }

      self.clear($menuList);

      H.for(list, entry => {

        var li, el, ul;

        el = document.createElement('li');
        el.className = makeClass(entry, '');
        el.innerHTML = entry.label;
        el.onclick = entry.action ? 
          function(e){entry.action(); self.hide(); return H.eat(e);}:
          function(){}
        ;

        if (entry.items){

          ul = document.createElement('ul');
          ul.className = 'sub-menu-list none';
          el.appendChild(ul);

          H.for(entry.items, subentry => {
            li = document.createElement('li');
            li.className = makeClass(subentry, 'sub-');
            li.innerHTML = subentry.label;
            li.onclick = function(e){subentry.action(); self.hide(); return H.eat(e);};
            ul.appendChild(li);
          });

          el.onmouseenter = function(){
            ul.classList.remove('none');
            ul.classList.add('block');
          };

          el.onmouseleave = function(){
            ul.classList.add('none');
            ul.classList.remove('block');
          };

        }

        $menuList.appendChild(el);

      });

  }}; // method end/return

}()).boot();
