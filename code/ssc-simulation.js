/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals SIM, REN, IFC, CFG, H, PHY, StateMachine */

'use strict';

SIM = (function(){

  var 
    self, 
    fsm,

    frame = 0,
    time  = 0,

    game = {
      start:     0,
      time:      0,
      frame:     0,
      stage:     '1st Half',
      state:     '',          // started, runs, paused, finished
      goals:     [0, 0],
      yellows:   [0, 0],
      reds:      [0, 0],     
      messages:  [],
    };

  return {

    fsm,
    game,

    time,
    frame,

    boot:   function(){return (self = this);

    }, reset: function () {

      SIM.message('Reset');

      frame = time = 0;
      game.frame = game.time = 0;

      PHY.init();
      BHV.init();
      self.listen();


    }, tick: function () {

        frame = self.frame += 1;
        time  = self.time  += 1 / CFG.fps;

      if (game.state === 'running'){
        game.frame += 1;
        game.time  += 1 / CFG.fps;
      }


    }, init: function(){

      fsm = self.fsm = StateMachine.create({
        initial: 'green',
        events: [
          { name: 'warn',  from: 'green',  to: 'yellow' },
          { name: 'panic', from: 'yellow', to: 'red'    },
          { name: 'calm',  from: 'red',    to: 'yellow' },
          { name: 'clear', from: 'yellow', to: 'green'  }
      ]});


    }, message : function (message) {

      var msg =  {msg: message, time: game.time};

      IFC.message(msg);

      game.messages.push(msg);

      if (game.messages.length > CFG.Debug.maxMessages){
        game.messages.shift();
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
            m1   = p1.mass * p1.state.vel.norm(), 
            m2   = p2.mass * p2.state.vel.norm(),
            off  = m1 > m2 ? p1 : p2, // offender
            vic  = m1 > m2 ? p2 : p1, // victim
            mOff = off === p1 ? m1 : m2,
            mVic = vic === p1 ? m1 : m2,
            x    = off.state.pos._[0],
            y    = off.state.pos._[1];

          SIM.message(H.format('Contact: %s (%s) -> %s (%s)', off.sign, mOff.toFixed(1), vic.sign, mVic.toFixed(1)));

          if (mOff > CFG.Rules.momFoulRed) {
            PHY.world.emit('game:foul',     {x, y, vic, off});
            PHY.world.emit('game:red',      {player: off, team: off.team});
            PHY.world.emit('game:spotkick', {team: vic.team, x, y});

          } else if ( mOff > CFG.Rules.momFoulYellow) {
            PHY.world.emit('game:foul',     {x, y, vic, off});
            PHY.world.emit('game:yellow',   {player: off, team: off.team});
            PHY.world.emit('game:spotkick', {team: vic.team, x, y});

          } else if ( m1 + m2 > CFG.Rules.momFoul){
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

          if (game.state !== 'running'){return;} // suppress until game restarted
          
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
