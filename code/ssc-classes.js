/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG, H, T, SIM, StateMachine */

'use strict';

function Actor () {} 

Actor.prototype = {
  constructor: Actor,
};

StateMachine.create({
  target:  Actor.prototype,
  initial: 'None',
  events:  CFG.States.team.map(T.readEvents),
  error:   T.logFsmError,
});


function Player (options){
  Actor.call(this, options);
  H.extend(this, options);
}

Player.prototype = H.mixin (
  Actor.prototype, {
  constructor: Player,
});


function Team (config){

  Actor.call(this, config);
  H.extend(this, config);

  this.team = PHY.bodies['team' + config.index];

  H.extend(this, {
    //squad
    bank:  [],
    field: [],
  });

}

Team.prototype = H.mixin (
  Actor.prototype, {
  constructor: Team,

  updateBehaviors: function (state) {

    H.each(CFG.Behaviors.players, (bhv, states) => {

      if (H.contains(states, state)){
        BHV.behaviors[bhv].addBodies(this.team);

      } else {
        BHV.behaviors[bhv].subBodies(this.team);

      }

    });


    // F S M - S T A R T

  }, promise: function(event, data){

    var 
      now = this.current,
      err = 'TRY: %s can\'t "%s" now, but %s';

    return (
      new Promise((resolve, reject) => {
        if (event === this.current.toLowerCase()){
          resolve();
        } else if (this.can(event)){
          this[event](data, resolve);
        } else {
          reject(H.format(err, this.nick, event, this.transitions()));
        }
      })
      .then(() => SIM.msgFromTo(this.nick, now, this.current))
      .catch(reason => console.log(this.nick + '.promise.failed:', event, reason, data))
    );

  }, onsetup: function (name, from, to, data, resolve){

    this.updateBehaviors(to);

    setTimeout(() => {
      resolve();
    }, 2000);

  }, ontraining: function (name, from, to, data, resolve){
    
    this.updateBehaviors(to);

    setTimeout(() => {
      resolve();
    }, 2000);

  }, onpause: function (name, from, to, data, resolve){
    
    this.updateBehaviors(to);

    setTimeout(() => {
      resolve();
    }, 2000);

  }, onforkickoff: function (name, from, to, data){
    
    SIM.msgFromTo(this.nick, from, to);

  }, onkikkickoff: function (name, from, to, data){
    
    SIM.msgFromTo(this.nick, from, to);

  }, onforthrowin: function (name, from, to, data){
    
    SIM.msgFromTo(this.nick, from, to);

  }, onkikthrowin: function (name, from, to, data){
    
    SIM.msgFromTo(this.nick, from, to);

  }, onforcorner: function  (name, from, to, data){
    
    SIM.message(this.nick + ': ' + to);

  }, onkikcorner: function  (name, from, to, data){
    
    SIM.message(this.nick + ': ' + to);

  }, onforfreekick: function(name, from, to, data){
    
    SIM.message(this.nick + ': ' + to);

  }, onkikfreekick: function(name, from, to, data){
    
    SIM.message(this.nick + ': ' + to);

  }, onforpenalty: function (name, from, to, data){
    
    SIM.message(this.nick + ': ' + to);

  }, onkikpenalty: function (name, from, to, data){
    
    SIM.message(this.nick + ': ' + to);

  }, 

});

