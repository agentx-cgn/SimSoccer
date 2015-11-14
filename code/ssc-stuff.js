


    }, 'player-all-focus-ball' : function (body) {

        vector = this.scratch.vector()
          .set(
            body.state.pos._[0], 
            body.state.pos._[1]
          )
          .vsub( PHY.bodies.ball.state.pos )
        ;

        body.state.angular.pos = (vector.angle() + PI) % TAU;


    }, 'ball-all-basic': function (body) {

      var
        x = body.state.pos._[0], 
        y = body.state.pos._[1], 
        isOff = (
          x + body.radius < 0 ||
          y + body.radius < 0 ||
          x - body.radius > CFG.Field.length ||
          y - body.radius > CFG.Field.width
        );

      if ( isOff && GAM.current === 'Running'){
        GAM.off({x, y, last: body.player});
        // PHY.world.emit('game:ball-off-field', );
        PHY.stopBodies([ body ]);
      }
    
    }, 'player-selected-steered-by-keys': function(body){

      var 
        angle = body.state.angular.pos,
        accel = this.options.accel / 10 * this.options.facAccel,
        turn  = this.options.turn  / 10 * this.options.facTurn * DEGRAD;

      // REN.info.acce = accel;
      // REN.info.turn = turn;

      vector = this.scratch.vector()
        .set(
          accel * Math.cos( angle ), 
          accel * Math.sin( angle ) 
        )
      ;

      body.accelerate( vector );
      body.state.angular.vel = turn;

    }, 'player-all-follow-mouse': function (body) {

      const 
        radius = 3,
        maxVel = 0.02;

      desired = this.scratch.vector()
        .clone(this.options.target)
        .vsub(body.state.pos)
      ;

      distance = desired.norm();
      desired  = desired.normalize();
      desired.mult(maxVel * (distance <= radius ? distance/radius : 1));
      force = desired.vsub(body.state.vel);
      body.applyForce(force);




    }, 'body-selected-targeting-mouse': function(body){

      if (this.options.active){

        offset = this.scratch.vector()
          .set(3, 0)
        ;

        force = this.scratch.vector()
          .clone(this.options.target)
          .vsub(body.state.pos)
          .mult(0.028)
        ;

        force1 = this.scratch.vector()
          .clone(body.state.vel)
          .vsub(body.state.pos)
          .mult(0.028)
        ;



        body.applyForce(force, offset);
        REN.info.force = force.norm().toFixed(1);          

        this.options.active = false;

      } else {

        var distance = this.scratch.vector()
          .clone(this.options.target)
          .vsub(body.state.pos)
          .norm()
        ;

        REN.info.dist = distance.toFixed(2);          

      }


    }, 'body-marked-attracted-by-mouse': function (body) {

      var 
        distance, color = 'yellow',
        options = this.options,
        range = 10;

      if (options.pos){

        body.sleep(false);
        
        // vector from point to position
        vector = this.scratch.vector()
          .clone( options.pos )
          .vsub( body.state.pos )
        ;

        distance = vector.norm();  // get the distance

        if (distance > options.min && distance < options.max){
          body.accelerate( vector.normalize().mult( options.strength / Math.pow(distance, options.order) ) );
        }

        if (distance < range){
          color = 'red';
          speed = this.scratch.vector()
            .clone( body.state.vel )
            .mult(distance - range)
          ;
          body.state.vel.vadd(speed);

        }

        REN.push(() => REN.strokeLine (
          options.pos.x, options.pos.y,
          body.state.pos._[0], body.state.pos._[1],
          color
        ));

      }

      Physics.behavior ('constant-friction', function ( parent ) {

        // https://gist.github.com/mizchi/c18d62ae894505d3801e

        var defaults = {f: 0.0005};

        return {

          init: function ( options ) {

            options = Physics.util.extend({}, defaults, options);
            parent.init.call( this, options );
            this._v = new Physics.vector();

          },

          behave: function ( /* data */ ) {
            
            var 
              i, ang, ax = 0.0, ay = 0.0, cof = 0.0, vel = 0.0,
              body, bodies = this.getTargets(),
              f = this.options.f;

            for (i = 0; (body = bodies[i]); i++){

              cof = body.cof;
              vel = body.state.vel;
              ang = body.state.angular;

              ax = (
                vel.x > 0 ? -f * cof :
                vel.x < 0 ? +f * cof :
                  0
              );

              ay = (
                vel.y > 0 ? -f * cof : 
                vel.y < 0 ? +f * cof : 
                  0
              );

              this._v.clone({x: ax, y: ay});
              body.accelerate( this._v );
              body.state.angular.vel *= 0.99; //f * cof;

            }

          }

        };

      });