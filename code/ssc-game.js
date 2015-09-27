/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals GAM, SIM, REN, BHV, IFC, CFG, H, PHY, StateMachine */

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

    boot:   function(){return (self = this);

    }, reset: function () {

      H.each(defaults, (key, val) => self[key] = val);
      self.init();

    }, init: function(){

      fsm = self.fsm = StateMachine.create({
        target:  self,
        initial: 'None',
        events:  CFG.States.game.map(T.readEvents),
        error:   T.logFsmError.bind(self),
      });

      team0 = self.team0 = new Team(CFG.Teams[0]);
      team1 = self.team1 = new Team(CFG.Teams[1]);

    }, tick: function () {

      if (self.current === 'Running'){
        self.frame += 1;
        self.time  += 1 / CFG.fps;
      }      

    }, onpause: function(name, from, to, data){
      
      SIM.message('gam: ' + to);
      SIM.fsm.can('play') && SIM.fsm.play();
      
    }, onrun:   function(name, from, to, data){
      
      SIM.message('gam: ' + to);
      SIM.fsm.can('play') && SIM.fsm.play();

      if (from === 'None'){

        console.log(team0.fsm.current, team0.fsm.can('kikkickoff'));
        team0.fsm.kikkickoff();
        team1.fsm.forkickoff();
        console.log(team0.fsm.current, team0.fsm.can('kikkickoff'));
      }

    }, onoff:   function(name, from, to, data){
      
      SIM.message('gam: ' + to);
      SIM.fsm.can('play') && SIM.fsm.play();

    }

  }; //return


}()).boot();
