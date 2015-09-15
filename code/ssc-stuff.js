

      // Physics.behavior ('constant-friction', function ( parent ) {

      //   // https://gist.github.com/mizchi/c18d62ae894505d3801e

      //   var defaults = {f: 0.0005};

      //   return {

      //     init: function ( options ) {

      //       options = Physics.util.extend({}, defaults, options);
      //       parent.init.call( this, options );
      //       this._v = new Physics.vector();

      //     },

      //     behave: function ( /* data */ ) {
            
      //       var 
      //         i, ang, ax = 0.0, ay = 0.0, cof = 0.0, vel = 0.0,
      //         body, bodies = this.getTargets(),
      //         f = this.options.f;

      //       for (i = 0; (body = bodies[i]); i++){

      //         cof = body.cof;
      //         vel = body.state.vel;
      //         ang = body.state.angular;

      //         ax = (
      //           vel.x > 0 ? -f * cof :
      //           vel.x < 0 ? +f * cof :
      //             0
      //         );

      //         ay = (
      //           vel.y > 0 ? -f * cof : 
      //           vel.y < 0 ? +f * cof : 
      //             0
      //         );

      //         this._v.clone({x: ax, y: ay});
      //         body.accelerate( this._v );
      //         body.state.angular.vel *= 0.99; //f * cof;

      //       }

      //     }

      //   };

      // });