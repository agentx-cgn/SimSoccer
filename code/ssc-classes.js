/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG, H, T, SIM, PHY, BHV, StateMachine */
/*jshint -W030 */

'use strict';

function Actor () {} 

Actor.prototype = {
  constructor: Actor,
  updateControllers: function (state) {
    CTR.loadSet(CFG.Controllers[this.machine][state]);
  }
};

function Controller (config) {
  this.bodies = [];
  this.scratch = null;
  H.extend(this, config, BHV[config.behavior]);
} 

Controller.prototype = {
  constructor:  Controller,
  hasBody:      function(body){return H.contains(this.bodies, body);},
  addBody:      function(body){this.bodies.push(body);},
  addBodies:    function(bodies){bodies.forEach(this.addBody, this);},
  subBody:      function(body){H.remove(this.bodies, body);}, 
  subBodies:    function(bodies){bodies.forEach(this.subBody, this);},
  removeBodies: function(){while (this.bodies.length){this.bodies.shift();}},
  toggleBody:   function(body){this.hasBody(body) ? this.subBody(body) : this.addBody(body);},
  toggleBodies: function(bodies){bodies.forEach(this.toggleBody, this);},
  activate:     function(){
    H.each(this.listeners, (name, action) => {
      PHY.world.on(name, action, this);
    });
  },
  deactivate:  function(){
    H.each(this.listeners, (name, action) => {
      PHY.world.off(name, action, this);
    });
  },  
};


function Player (options){
  Actor.call(this, options);
  this.machine = 'player';
  H.extend(this, options);
}

Player.prototype = H.mixin (
  Actor.prototype, {
  constructor: Player,
});

StateMachine.create({
  target:  Player.prototype,
  initial: 'None',
  events:  CFG.States.player.map(T.readEvents),
  error:   T.logFsmError,
});

function Group (bodies){
  this.bodies = bodies;
}

Group.prototype = H.mixin (
  Actor.prototype, {
  constructor: Group,
});

function Team (config){

  Actor.call(this, config);
  this.machine = 'team';
  H.extend(this, config);

  this.team = PHY.bodies['team' + config.index];
  this.paths = {};

  H.extend(this, {
    //squad
    bank:  [],
    field: [],
  });

  this.updatePaths();

}

Team.prototype = H.mixin (
  Actor.prototype, {
  constructor: Team,

  toPath: function () {

    return new T.Path(this.team.map(player => [player.state.pos._[0], player.state.pos._[1]]));

  }, updatePaths: function () {

    var length = this.team.length;

    if (this.index === 0){ // left
      H.extend(this.paths, {
        setup:     new T.Path(length + '; translate 20 35; circle 5'),
        training:  new T.Path(length + '; translate 40 35; line 5'),
        pause:     new T.Path(length + '; translate 40 35; line 5; rotate 90'),
      });

    } else { // right 
      H.extend(this.paths, {
        setup:     new T.Path(length + '; translate 90 35; circle 5; rotate 180'),
        training:  new T.Path(length + '; translate 90 35; line 5'),
        pause:     new T.Path(length + '; translate 90 35; line 5; rotate 90'),
      });

    }


  }, arrangePlayers: function (path, resolve) {

    var 
      targets = CTR.controllers['all-players:can-approach-point'].targets,
      check   = () => this.toPath().getDistance(path) < 1;

    H.each(this.team, (index, player) => {
      targets[player.uid] = PHY.vector(path.path[index]);
    });

    // task [taskframe, interval, action, resolve];
    SIM.appendTask([null, 60, check, resolve]);


    // F S M - S T A R T

  }, promise: function(event, data){

    var 
      now = this.current,
      err = 'Promise.failed: %s %s can\'t "%s" now, but %s';

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
      .catch(reason => console.log(reason))
    );

  }, onsetup: function (name, from, to, data, resolve){

    this.updateControllers(to);
    this.arrangePlayers(this.paths.setup, resolve);

  }, ontraining: function (name, from, to, data, resolve){
    
    this.updateControllers(to);
    this.arrangePlayers(this.paths.training, resolve);

  }, onpause: function (name, from, to, data, resolve){
    
    this.updateControllers(to);

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

StateMachine.create({
  target:  Team.prototype,
  initial: 'None',
  events:  CFG.States.team.map(T.readEvents),
  error:   T.logFsmError,
});