/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals GAM, SIM, REN, BHV, IFC, CFG, H, T, PHY, StateMachine, Team */
/*jshint -W030 */

'use strict';

GAM = (function(){

  var 
    self, 
    fsm,

    team0, team1,

    defaults = {
      fsm:       null,
      start:     0,
      time:      0,
      frame:     0,
      stage:     '1st Half',
      goals:     [0, 0],
      yellows:   [0, 0],
      reds:      [0, 0],     
      messages:  [],
    };

  return {

    name: 'game',
    nick: 'GAM',

    boot:   function(){return (self = this);

    }, reset: function () {

      H.each(defaults, (key, val) => self[key] = val);
      self.init();

    }, init: function(){

      fsm = StateMachine.create({
        target:  self,
        initial: 'None',
        events:  CFG.States.game.map(T.readEvents),
        error:   T.logFsmError.bind(self),
      });

      team0 = self.team0 = new Team(CFG.Teams[0]);
      team1 = self.team1 = new Team(CFG.Teams[1]);

    }, tick: function () {

      var isRunning = (
        this.current === 'Half1' || 
        this.current === 'Half2' || 
        this.current === 'Half3' || 
        this.current === 'Half4'
      );

      if (isRunning){
        self.frame += 1;
        self.time  += 1 / CFG.fps;
      }      


    }, deMarkSelect: function (body) {

      H.each(PHY.find('selected'), (i, body) => body.selected = false);
      H.each(PHY.find('marked'), (i, body) => body.marked = false);


    }, toggleMark: function (body) {

      body.marked = !body.marked;

    }, toggleSelect: function (body) {

      var selected = body.selected;

      H.each(PHY.find('selected'), (i, body) => body.selected = false);
      body.selected = !selected;


    // F S M - S T A R T

    }, promise: function(event, data){

      var 
        now = this.current,
        err = 'TRY: %s can\'t "%s" now, but %s';

      return (
        new Promise((resolve, reject) => {
          if (event === self.current.toLowerCase()){
            resolve();
          } else if (self.can(event)){
            self[event](data, resolve);
          } else {
            reject(H.format(err, self.nick, event, self.transitions()));
          }
        })
        .then(() => SIM.msgFromTo(self.nick, now, this.current))
        .catch(reason => console.log('GAM.promise.failed:', event, reason, data))
      );

    }, onpause: function(name, from, to, data, resolve){
      
      return (
        SIM.promise('play', data)
          .then(Promise.all([
            GAM.team0.promise('pause', data),
            GAM.team1.promise('pause', data)
        ]))
      );
      
    }, onhalf1:   function(name, from, to, data, resolve){
      
      // TODO: inverse this
      return (
        SIM.promise('play', data)
          .then(Promise.all([
            GAM.team0.promise('kikkickoff', data),
            GAM.team1.promise('forkickoff', data)
        ]))
      );

    // F S M - E N D


    // }, onoff:   function(name, from, to, data){
      
    //   SIM.message('gam: ' + to);
    //   SIM.can('play') && SIM.play();

    }

  }; //return


}()).boot();
