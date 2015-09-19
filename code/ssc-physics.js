/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*globals IFC, BHV, CFG, H, REN, PHY, Physics */

'use strict';

PHY = (function(){

  const 
    // FACTOR = 1;
    TAU = Math.PI * 2,
    PI  = Math.PI,
    DEGRAD = Math.PI/180;

  var 
    self, 
    world, renderer, sandbox, integrator, attractor,
    player, 
    collisions = [],

    // lifted, used in findat()
    vector = Physics.vector(),
    point  = {x: 0, y: 0},

    bodies = {
      ball:    [],
      balls:   [],
      players: [],
      team0:   [],
      team1:   [],
      posts:   [],
    },

    filters = {
      selected: {selected: true},
      marked:   {marked:   true},
    };

  return {

    world, 
    bodies, 
    collisions,

    boot:   function(){

      self = this;

      world = self.world = new Physics.world({
        timestep:      6,  // 6
        maxIPF:        4, // 4
        sleepDisabled: true,
      });

      Physics.renderer('soccer', function( parent ){
        return {
          init: function( options ){
            parent.init.call(this, options);
          },
          render: REN.render
        };
      });

      return this;

    }, tick:   function(time){world.step(time);
    }, resize: function(){self.updateSandbox();
    }, find:   function(conds){

      return (
        conds === 'selected' ? world.find(filters.selected) :
        conds === 'marked'   ? world.find(filters.marked)   :
          world.find(conds)
      );

    }, findAt: function(pos){

      return world.findOne({
        $at: vector.set(pos.x, pos.y)
      });
    
    }, init:   function(){

      H.extend(bodies, {
        ball:    [],
        balls:   [],
        players: [],
        team0:   [],
        team1:   [],
        posts:   [],
      });

      self.createBodies();
      self.prepareBodies();
      self.updateSandbox();

      BHV.createBehaviors();

      renderer = Physics.renderer('soccer', {
        el:     IFC.cvs,
        width:  CFG.Field.length,
        height: CFG.Field.width,
      });
      
      integrator = Physics.integrator('verlet', {
        drag: CFG.Physics.drag
      });

      // strength: How strong the attraction is (default: `1`)
      // order: The power of the inverse distance (default: `2` because that is newtonian gravity... inverse square)
      // max: The maximum distance in which to apply the attraction (default: Infinity)
      // min: The minimum distance above which to apply the attraction (default: very small non-zero)

      attractor  = Physics.behavior('player-marked-attractor', {
        strength: 0.0015,
        order:    0,
        min:      1
      });

      // add things to the world
      world.add([renderer, integrator, sandbox]);
      world.add(bodies.balls);
      world.add(bodies.players);
      world.add(bodies.posts);

      // prepare some queries
      H.extend(bodies, {
        ball:    world.find({name: 'ball'})[0],
        team0:   world.find({team: 0}),
        team1:   world.find({team: 1})
      });

      // add behaviors
      world.add([

        // enable mouse interaction
        Physics.behavior('interactive', { el: renderer.el }),

        // basic physics
        Physics.behavior('sweep-prune'),                // broad phase
        Physics.behavior('body-collision-detection'),   // narrow phase
        Physics.behavior('body-impulse-response'),      // applies impulses

        // custom
        Physics.behavior('players-focus-ball', {bodies: bodies.team0}),
        Physics.behavior('balls-basic', {bodies: bodies.balls}),
        
      ]);

      self.listen();


    }, listen:   function(){

      // lifted
      var 
        coll = null;

      world.on(

        {'interact:poke': function( e ){
          
          // patched behavior
          if (!IFC.mouseOverBody && e.button === 0){
            world.wakeUpAll();
            attractor.options({pos: REN.toField(e)});
            world.add( attractor );
          }

        }, 'interact:move': function( pos ){
          
          attractor.options({pos: REN.toField(pos)});
        
        }, 'interact:release': function(){
          
          world.wakeUpAll();
          world.remove( attractor );
        
        }, 'collisions:detected': function(data){

          var i;
          
          for (i=0; (coll = data.collisions[i]); i++){

            collisions.push({
              x: coll.bodyA.state.pos._[0] + coll.pos.x,
              y: coll.bodyA.state.pos._[1] + coll.pos.y,
            });

            if (collisions.length > CFG.Debug.maxCollisions){
              collisions.shift(); // consider splice
            }

          }
        }

      });


    }, prepBall:   function(){

      bodies.ball.player = bodies.team0[0];
      bodies.ball.marked = true;


    }, updateSandbox:   function(){

      var 
        m = CFG.Field.margin,
        l = CFG.Field.length,
        w = CFG.Field.width;

      world && world.removeBehavior(sandbox);

      sandbox = Physics.behavior('edge-collision-detection', {
        aabb: Physics.aabb(-m, -m, l + m, w + m), 
        restitution: 0.99, 
        cof:1,
        channel: 'sandbox-collision:detected'
      });

      world && world.addBehavior(sandbox);


    }, prepareBodies: function(){

      // add balls
      H.each(H.range(1), i => {
        bodies.balls.push(Physics.body('ball', {
          x:   55, 
          y:   35 + 2*i, 
          vx:   0, 
          vy:   0, 
        }));
      });

      // add posts
      H.each(H.range(4), (i, post) => {
        bodies.posts.push(Physics.body('post', {
          x: CFG.Posts.xcoords[post], 
          y: CFG.Posts.ycoords[post], 
        }));
      });

      // add players
      H.each([0, 1], (i, team) => {
        H.each(CFG.Teams[team].players, (i, player) => {
          bodies.players.push(Physics.body('player', {
            number:  i,
            team:    team,
            sign:    player.sign,
            mass:    player.mass,
            x:       player.x,
            y:       player.y, 
            angle:   player.angle,
            styles:  H.extend({}, CFG.Player.styles, CFG.Teams[team].styles, player.styles)
          }));
        });
      });

    },

    createBodies: function(){

      var bodies = {
        // new   , copy       , config
        post:   ['rectangle', CFG.Posts],
        player: ['rectangle', CFG.Player],
        ball:   ['circle',    CFG.Ball],
      };

      H.each(bodies, (org, body) => {
        Physics.body(org, body[0], function( parent ){
          return {
            init: function( options ){
              parent.init.call(this, H.extend({}, body[1], options));
              this.recalc();
            },
          };
        });
      });

    },

    stopBodies: function (bodies){
      bodies.forEach( body => {
        body.state.vel._[0]    = 0;
        body.state.vel._[1]    = 0;
        body.state.acc._[0]    = 0;
        body.state.acc._[1]    = 0;
        body.state.angular.vel = 0;
        body.state.angular.acc = 0;
      });
    },

  };

}()).boot();




// Physics.behavior('attractor', function( parent ){

//     var defaults = {

//         pos: null, // default to (0, 0)
//         // how strong the attraction is
//         strength: 1,
//         // power of the inverse distance (2 is inverse square)
//         order: 2,
//         // max distance to apply it to
//         max: false, // infinite
//         // min distance to apply it to
//         min: false // auto calc
//     };

//     return {

//         // extended
//         init: function( options ){

//             var self = this;
//             this._pos = new Physics.vector();
//             // call parent init method
//             parent.init.call( this );
//             this.options.defaults( defaults );
//             this.options.onChange(function( opts ){
//                 self._maxDist = opts.max === false ? Infinity : opts.max;
//                 self._minDist = opts.min ? opts.min : 10;
//                 self.position( opts.pos );
//             });
//             this.options( options );
//         },

//         *
//          * AttractorBehavior#position( [pos] ) -> this|Object
//          * - pos (Vectorish): The position to set
//          * + (Object): Returns the [[Vectorish]] position if no arguments provided
//          * + (this): For chaining
//          *
//          * Get or set the position of the attractor.
//          *
//         position: function( pos ){
            
//             var self = this;

//             if ( pos ){
//                 this._pos.clone( pos );
//                 return self;
//             }

//             return this._pos.values();
//         },
        
//         // extended
//         behave: function( data ){

//             var bodies = this.getTargets()
//                 ,body
//                 ,order = this.options.order
//                 ,strength = this.options.strength
//                 ,minDist = this._minDist
//                 ,maxDist = this._maxDist
//                 ,scratch = Physics.scratchpad()
//                 ,acc = scratch.vector()
//                 ,norm
//                 ,g
//                 ;

//             for ( var j = 0, l = bodies.length; j < l; j++ ){
                
//                 body = bodies[ j ];

//                 // clone the position
//                 acc.clone( this._pos );
//                 acc.vsub( body.state.pos );
//                 // get the distance
//                 norm = acc.norm();

//                 if (norm > minDist && norm < maxDist){

//                     g = strength / Math.pow(norm, order);

//                     body.accelerate( acc.normalize().mult( g ) );
//                 }
//             }

//             scratch.done();
//         }
//     };
// });