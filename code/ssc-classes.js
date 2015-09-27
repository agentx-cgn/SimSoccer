/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG, H, T, StateMachine */

'use strict';

function Actor (options) {

} 

Actor.prototype = {
  constructor: Actor,
};


function Player (options){

  Actor.call(this, options);
  H.extend(this, options);

}

Player.prototype = {
  constructor: Player,
};


function Team (options){

  Actor.call(this, options);
  H.extend(this, options);

  this.fsm = StateMachine.create({
    target:  this.prototype,
    initial: 'None',
    events:  CFG.States.team.map(T.readEvents),
    error:   T.logFsmError.bind(self),
  });

}

Team.prototype = {
  constructor: Team,

  onsetup: function      (name, from, to, data){

    SIM.message(this.name + ": " + to);

  }, ontrain: function      (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onpause: function      (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  

  }, onforkickoff: function (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onkikkickoff: function (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onforthrowin: function (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onkikthrowin: function (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onforcorner: function  (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onkikcorner: function  (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onforfreekick: function(name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onkikfreekick: function(name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onforpenalty: function (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, onkikpenalty: function (name, from, to, data){
    
    SIM.message(this.name + ": " + to);

  }, };

