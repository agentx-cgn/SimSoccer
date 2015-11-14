/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals SIM, REN, BHV, IFC, CFG, H, T, PHY, GAM, StateMachine */
/*jshint -W030 */

'use strict';

SIM = (function(){

  var 
    self, 

    frame = 0,
    time  = 0,

    tasks = [];

  return {

    time,
    frame,
    tasks,
    name: 'sim',
    nick: 'SIM',

  // I N I T

    boot:   function(){

      StateMachine.create({
        target:  this,
        initial: 'None',
        events:  CFG.States.simulation.map(T.readEvents),
        error:   T.logFsmError.bind(this),
      });

      return (self = this);

    }, cleanup: function () {

      tasks = self.tasks = [];
      frame = time = self.frame = self.time = 0;

    }, reset: function () {

      self.cleanup();
      self.init();

      [SIM, GAM, GAM.team0, GAM.team1].forEach(fsm => {
        H.format('%s = %s', fsm.nick, fsm.current);
      });

    }, tick: function () {

        frame = self.frame += 1;
        time  = self.time  += 1 / CFG.fps;

        self.processTasks();

    }, init: function () {

      self.listen();

      // this.current = 'None'

      H.each(CFG.Controllers.simulation.None, (index, name) => {
        CTR.activate(name);
      });




  // F S M

    }, promise: function(event, data){

      var 
        now = this.current,
        err = 'TRY: %s can\'t "%s" now, but %s';

      return (
        new Promise(function(resolve, reject) {
          if (event === self.current.toLowerCase()){
            resolve();
          } else if (self.can(event)){
            self[event](data, resolve);
          } else {
            reject(H.format(err, self.nick, event, self.transitions()));
          }
        })
        .then(() => SIM.msgFromTo(self.nick, now, this.current))
        .catch(reason => console.log(this.nick + '.promise.failed:', event, reason, data))
      );

    }, onsetup: function(name, from, to, data){
      
      return (
        GAM.promise('pause', data)
          .then(Promise.all([
            GAM.team0.promise('setup', data),
            GAM.team1.promise('setup', data)
          ]))
      );

    }, ontraining: function(name, from, to, data){

      return (
        GAM.promise('pause', data)
          .then(Promise.all([
            GAM.team0.promise('training', data),
            GAM.team1.promise('training', data)
          ]))
      );

    }, onplay:  function(name, from, to, data){

      // SIM.msgFromTo('sim', from, to);
      // GAM.can('run') && GAM.run();


  // T A S K S 

    }, appendTask : function (task) {

      // task [frame, interval, action, resolve]; chrome :(

      if (task[0] > frame && !task[1]){
        // fixed frame
        // nothing to do here

      } else if (!task[0]){
        // next frame, recurring
        task[0] = frame +1;

      } else if (task[0] < 0) {
        // future frame
        task[0] = frame - task[0];

      } else {
        console.log('wtf');

      }
      
      tasks.push(task);



    }, processTasks : function () {

      // task [taskframe, interval, action, resolve]; chrome :(

      H.each(tasks, (index, task) => {

        // one time
        if (frame === task[0] && !task[1]){

          // run action, check and resolve, if avail.
          task[2]() && task[3] && task[3]();

        // recurring
        } else if (frame === task[0] && task[1]) {

          // check action
          if (task[2]()){
            
            // resolve, if avail.
            task[3] && task[3]();

          } else {

            // try again next interval
            task[0] += task[1];

          }

        }

      });

      // Delete outdated tasks
      H.delete(tasks, task => frame > task[0]);


    }, msgFromTo : function (what, from, to) {

      self.message(H.format('%s : %s -> %s', what.toUpperCase(), from, to));

    }, message : function (message) {

      var msg =  {msg: message, time: GAM.time};

      IFC.message(msg);

      GAM.messages.push(msg);

      if (GAM.messages.length > CFG.Debug.maxMessages){
        GAM.messages.shift();
      }


    }, listen: function () {

      PHY.world.on(

        // GAME STATES

        { 'game:start': function () {

          game.state = 'started';
          SIM.message('Game started');
          PHY.world.emit('game:run');
          PHY.prepBall();

        }, 'game:run': function () {

          game.state = 'running';
          SIM.message('Game runs');
          REN.draw.spotkick = false;
          REN.draw.corner = false;

        }, 'game:pause': function () {

          game.state = 'paused';
          SIM.message('Game paused');

        }, 'game:finish': function () {

          game.state = 'finished';
          SIM.message('Game finished');

        
        // CONTACTS

        }, 'game:foul': function (data) {

          SIM.message(H.format('FOUL: %s [%s] -> %s [%s]', data.off.sign, data.off.team, data.vic.sign, data.vic.team));
          PHY.world.emit('game:pause');
          REN.whistle(data);

        }, 'game:yellow': function (data) {

          SIM.message(H.format('YELLOW CARD: team [%s] player: %s (%s)', data.team, data.player.sign, data.player.number));
          game.yellows[data.team] += 1;

        }, 'game:red': function (data) {

          SIM.message(H.format('RED CARD: team [%s] player: %s (%s)', data.team, data.player.sign, data.player.number));
          game.reds[data.team] += 1;

        }, 'game:spotkick': function (data) {

          var 
            x  = data.x,
            y  = data.y,
            team = data.team;

          SIM.message(H.format('Spot-kick: team [%s] {%s, %s}', team, x.toFixed(1), y.toFixed(1)));
          REN.draw.spotkick = data;


        // OFF-FIELD

        }, 'game:goal': function (data) {

          SIM.message(H.format('GOAL: team [%s]', data.team));
          PHY.world.emit('game:pause');
          REN.whistle(data);
          game.goals[data.team] += 1;

        }, 'game:goalkick': function (data) {

          var 
            x  = data.x,
            y  = data.y,
            team = data.team;

          SIM.message(H.format('Goal-kick: team [%s] {%s, %s}', team, x.toFixed(1), y.toFixed(1)));
          PHY.world.emit('game:pause');
          REN.whistle(data);

        }, 'game:throw-in': function (data) {

          var 
            x  = data.x,
            y  = data.y,
            team = data.team;

          SIM.message(H.format('Throw-in: team [%s] {%s, %s}', team, x.toFixed(1), y.toFixed(1)));
          PHY.world.emit('game:pause');
          REN.whistle(data);

        }, 'game:corner': function (data) {

          var 
            x  = data.x,
            y  = data.y,
            team = data.team;

          SIM.message(H.format('Corner: team [%s] {%s, %s}', team, x.toFixed(1), y.toFixed(1)));
          PHY.world.emit('game:pause');
          REN.draw.corner = data;
          REN.whistle(data);


        }, 'game:contact': function (data) {

          // checks player / player collisions and decides on foul, red, yellow

          var 
            p1   = data.player1,
            p2   = data.player2,
            ke1  = 0.5 * p1.mass * p1.state.vel.norm() * p1.state.vel.norm(), 
            ke2  = 0.5 * p2.mass * p2.state.vel.norm() * p2.state.vel.norm(), 
            off  = ke1 > ke2 ? p1 : p2, // offender
            vic  = ke1 > ke2 ? p2 : p1, // victim
            keOff = off === p1 ? ke1 : ke2,
            keVic = vic === p1 ? ke1 : ke2,
            x    = off.state.pos._[0],
            y    = off.state.pos._[1];

          SIM.message(H.format('Contact: %s (%s) -> %s (%s)', off.sign, keOff.toFixed(1), vic.sign, keVic.toFixed(1)));

          if (keOff > CFG.Rules.momFoulRed) {
            PHY.world.emit('game:foul',     {x, y, vic, off});
            PHY.world.emit('game:red',      {player: off, team: off.team});
            PHY.world.emit('game:spotkick', {team: vic.team, x, y});

          } else if ( keOff > CFG.Rules.momFoulYellow) {
            PHY.world.emit('game:foul',     {x, y, vic, off});
            PHY.world.emit('game:yellow',   {player: off, team: off.team});
            PHY.world.emit('game:spotkick', {team: vic.team, x, y});

          } else if ( ke1 + ke2 > CFG.Rules.momFoul){
            PHY.world.emit('game:foul',     {x, y, vic, off});
            PHY.world.emit('game:spotkick', {team: vic.team, x, y});

          }


        }, 'game:ball-off-field': function (data) {

          var 
            x  = data.x,
            y  = data.y,
            w  = CFG.Field.length,
            h  = CFG.Field.width,
            h2 = CFG.Field.width / 2,
            g2 = CFG.Goal.length / 2,
            gs = CFG.Goal.space,
            team = data.player.team;

          SIM.message(H.format('Ball off: team [%s] {%s, %s}', team, x.toFixed(1), y.toFixed(1)));

          // checks for goal
          if (x < 0 && y > h2 - g2 && y < h2 + g2){
            PHY.world.emit('game:goal', {team: 1});

          } else if (x > w && y > h2 - g2 && y < h2 + g2){
            PHY.world.emit('game:goal', {team: 0});

          // checks for corner
          } else if (x < 0 && y < h2 && team === 0) {
            PHY.world.emit('game:corner', {team: 1, x: 0, y: 0});

          } else if (x < 0 && y > h2 && team === 0) {
            PHY.world.emit('game:corner', {team: 1, x: 0, y: h});

          } else if (x > w && y < h2 && team === 1) {
            PHY.world.emit('game:corner', {team: 0, x: w, y: 0});

          } else if (x > w && y > h2 && team === 1) {
            PHY.world.emit('game:corner', {team: 0, x: w, y: h});

          // checks for goalkick
          } else if (x < 0) {
            PHY.world.emit('game:goalkick', {team: 0, x: gs, y: h2});

          } else if (x > w) {
            PHY.world.emit('game:goalkick', {team: 1, x: w - gs, y: h2});

          // checks for throw-in
          } else if (y < 0 && team === 0) {
            PHY.world.emit('game:throw-in', {team: 1, x, y});

          } else if (y < 0 && team === 1) {
            PHY.world.emit('game:throw-in', {team: 0, x, y});

          } else if (y > h && team === 0) {
            PHY.world.emit('game:throw-in', {team: 1, x, y});

          } else if (y > h && team === 1) {
            PHY.world.emit('game:throw-in', {team: 0, x, y});

          } else {
            console.warn('game:ball-off-field.error', data);

          }


        }, 'collisions:detected': function (data) {

          var i, c, ball1, ball2, player1, player2;

          if (GAM.current !== 'run'){return;} // suppress until game restarted
          
          for (i=0; (c = data.collisions[i]); i++){

            // only interested in ball vs. player AND player vs player from different teams

            if (
                c.bodyA.name === 'ball' || c.bodyA.name === 'player'  && 
                c.bodyB.name === 'ball' || c.bodyB.name === 'player' 
              ){

              ball1 = (
                c.bodyA.name === 'ball' ? c.bodyA :
                c.bodyB.name === 'ball' ? c.bodyB :
                  undefined
              );

              ball2 = (
                c.bodyB.name === 'ball' && c.bodyB !== ball1 ? c.bodyB :
                  undefined
              );

              player1 = (
                c.bodyA.name === 'player' ? c.bodyA :
                c.bodyB.name === 'player' ? c.bodyB :
                  undefined
              );

              player2 = (
                c.bodyB.name === 'player' && c.bodyB !== player1 ? c.bodyB :
                  undefined
              );

              // player vs ball
              if (ball1 && player1){
                ball1.player = player1;  // remember hitter
              
              // player vs player
              } else  if (player1 && player2 && player1.team !== player2.team){
                PHY.world.emit('game:contact', {player1, player2}); // that might be a foul

              }


            }

          }

        }, 'sandbox-collision:detected': function(data){

          H.each(data.collisions, (i, coll) => {

            if (coll.bodyA.treatment !== 'static'){
              PHY.stopBodies([coll.bodyA]);
            }
            
            if (coll.bodyB.treatment !== 'static'){
              PHY.stopBodies([coll.bodyB]);
            }

          });

        }



      });


    }

  }; //return


}()).boot();
