/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals TIM */

/*
  read later:
    http://applehelpwriter.com/2014/04/30/enable-trackpad-zoom-in-firefox/

*/

'use strict';

var      // globals
  H,     // JS Helper
  T,     // Domain Tools
  CFG,   // Configuration
  REN,   // Rendering
  SIM,   // Simulation
  PHY,   // Physics
  BHV,   // Behaviors
  IFC;   // Interface

window.onload = function(){

  var 
    $  = document.querySelector.bind(document),
    errors = 0, 
    bInitializes = true;

  window.onerror = function(e, f, l){

    var error = '';

    if (bInitializes){
      error += 'Browser not supported. Try this one ';
      error += '<a href="http://www.mozilla.org/en-US/firefox/channel/#aurora">Firefox</a>, ';
      error += '<a href="https://developer.mozilla.org/en-US/Firefox/Releases/30">why</a> ';
      error += 'and come back soon, thx.<br />';
      error += '<span style="font-weight: 400;">[' + e + ']<span>';
      $('.tab.errors').innerHTML = error;

    } else {
      error += 'Error occured.<br />';
      error += '<span style="font-weight: 400;">[' + e + ']<span><br />';
      error += '<span style="font-weight: 400;">[' + f + ':' + l + ']<span><br />';
      IFC.error(error);
      
    }

    console.log(e, f, l);
    errors += 1;

  };

  window.onresize = function () {

    IFC.resize(window.innerWidth, window.innerHeight);

  };

  IFC.init();
  IFC.resize(window.innerWidth, window.innerHeight);
  
  REN.init(IFC.cvs, IFC.ctx);

  SIM.reset();
  IFC.show();
  IFC.play();
  PHY.world.emit('game:start');

  SIM.message('fullscreen: ' + IFC.isFullScreen());

  bInitializes = false;

  TIM.step('ready');

};