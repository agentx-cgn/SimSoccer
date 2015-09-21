/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals H, T, SVC, REN, SIM, PHY, CFG */
/*jshint -W030 */

'use strict';

SVC = (function(){

  var 
    self,

    distances = {}

    ;



  return {

    boot:   function () {return (self = this);

    }, init: function(){

      self.Distance.listen();

    },

    Distance : {

      // returns scalar
      between : function(b1, b2){ return distances[b1.uid][b2.uid];

      // returns scalar
      }, toGoal: function(body, goal){

        return (
          goal === 0      ? Math.hypot(body.state.pos._[0], body.state.pos._[1] - CFG.Field.width / 2) :
          goal === 1      ? Math.hypot(body.state.pos._[0] - CFG.Field.length, body.state.pos._[1] - CFG.Field.width / 2) :
          body.team === 0 ? SVC.Distance.toGoal(body, 1) :
          body.team === 1 ? SVC.Distance.toGoal(body, 0) :
            console.log('wtf')
        );
        
      // returns scalar
      }, toKeeper: function(body){

        var keepers = body.team === 0 ? PHY.find({team: 0, role: 'TW'}) : PHY.find({team: 1, role: 'TW'});

        return SVC.Distance.between(body, keepers[0]);


      // returns array
      }, toTeam : function(body){

        return PHY.bodies['team' + body.team].sort((a, b) => {
          return SVC.Distance(body, a) < SVC.Distance(body, b) ? 1 : -1;
        });

      // returns array
      }, toOpponent : function(body){

        return PHY.bodies['team' + (body.team === 0 ? 1 :0)].sort((a, b) => {
          return SVC.Distance(body, a) < SVC.Distance(body, b) ? 1 : -1;
        });


      }, listen : function(){

        PHY.world.on({

          'integrate:positions': function(data){

            var i, j, b1, b2, dist, bodies = data.bodies, t0 = T.now();

            for (i=0; (b1 = bodies[i]); i++){

              !distances[b1.uid] && (distances[b1.uid] = {});

              for (j=i; (b2 = bodies[j]); j++){

                !distances[b2.uid] && (distances[b2.uid] = {});

                dist = Math.hypot(
                  b1.state.pos._[0] - b2.state.pos._[0],
                  b1.state.pos._[1] - b2.state.pos._[1]
                );

                distances[b1.uid][b2.uid] = dist;
                distances[b2.uid][b1.uid] = dist;

              }

            }

            REN.info.dist = ((T.now() - t0) / 1000).toFixed(5);


          }

        });

      }


    }

  };


}()).boot();