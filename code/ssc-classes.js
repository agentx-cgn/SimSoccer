/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG, H, T, SIM, StateMachine */

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

}

Team.prototype = {
  constructor: Team,

  promise: function(event, data){

    var e = 'TRY: %s can\'t %s now, but %s';

    return (
      new Promise(function(resolve, reject) {
        if (event === this.current.toLowerCase()){
          resolve();
        } else if (this.can(event)){
          this[event](data, resolve);
        } else {
          reject(H.format(e, this.nick, event, this.transitions()));
        }
      }.bind(this))
      .then(function(){
        SIM.msgFromTo(this.nick, this.current, event);
      }.bind(this))
    );

  }, onsetup: function (name, from, to, data, resolve){

    setTimeout(function(){
      resolve();
    }.bind(this), 2000);

  }, ontrain: function (name, from, to, data, resolve){
    
    setTimeout(function(){
      resolve();
    }.bind(this), 2000);

  }, onpause: function (name, from, to, data, resolve){
    
    SIM.msgFromTo(this.nick, from, to);


  

  }, onforkickoff: function (name, from, to, data){
    
    SIM.msgFromTo(this.name, from, to);

  }, onkikkickoff: function (name, from, to, data){
    
    SIM.msgFromTo(this.name, from, to);

  }, onforthrowin: function (name, from, to, data){
    
    SIM.msgFromTo(this.name, from, to);

  }, onkikthrowin: function (name, from, to, data){
    
    SIM.msgFromTo(this.name, from, to);

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


StateMachine.create({
  target:  Team.prototype,
  initial: 'None',
  events:  CFG.States.team.map(T.readEvents),
  error:   T.logFsmError.bind(self),
});