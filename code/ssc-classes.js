/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG, H, T, SIM, PHY, BHV, StateMachine */

'use strict';

function Actor () {} 

Actor.prototype = {
  constructor: Actor,
};


function Player (options){
  Actor.call(this, options);
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

function Team (config){

  Actor.call(this, config);
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

  getDistanceTo: function (bodies, path){

    var 
      distance = 0,
      posBodies = bodies.map(body => [body.state.pos._[0], body.state.pos._[1]]);

    H.each(posBodies, (index, pos) => {

      distance += Math.hypot(
        pos[0] - path.path[index][0],
        pos[1] - path.path[index][1]
      );

    });

    return distance / bodies.length;


  }, arrangePlayers: function (path, resolve) {

    var 
      targets = BHV.behaviors['players-single-move-to-point'].options.targets,
      action  = () => {
        if (this.getDistanceTo(this.team, path) < 1){
          return true;
        } else {
          H.each(this.team, (index, player) => {
            targets[player.uid] = PHY.vector(path.path[index]);
          });
        }
      };

      // task [taskframe, interval, action, resolve];

    SIM.appendTask([null, 60, action, () => {
      resolve(); 
      console.log('resovled', this.index, SIM.tasks.length);
    }]);


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


  }, updateBehaviors: function (state) {

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
    this.arrangePlayers(this.paths.setup, resolve);

    // setTimeout(() => {
    //   resolve();
    // }, 2000);

  }, ontraining: function (name, from, to, data, resolve){
    
    this.updateBehaviors(to);
    this.arrangePlayers(this.paths.training, resolve);

    // setTimeout(() => {
    //   resolve();
    // }, 2000);

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

StateMachine.create({
  target:  Team.prototype,
  initial: 'None',
  events:  CFG.States.team.map(T.readEvents),
  error:   T.logFsmError,
});