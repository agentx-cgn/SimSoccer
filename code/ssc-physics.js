/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*globals IFC, CFG, H, REN, PHY, Physics */

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

    behaviors = {},

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

    }, add:    function(thing, options){

      behaviors[thing] =  Physics.behavior(thing, options || {}),
      world.add(behaviors[thing]);

    }, sub:    function(thing){

      world.remove(behaviors[thing]);

    }, findAt: function(pos){

      return world.findOne({
        $at: vector.set(pos.x, pos.y)
      });
    
    }, init:   function(){

      bodies = {
        ball:    [],
        balls:   [],
        players: [],
        team0:   [],
        team1:   [],
        posts:   [],
      };

      self.createBodies();
      self.createBehaviours();
      self.prepareBodies();
      self.updateSandbox();

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
        coll = null,
        options = {pos: null};

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

    createBehaviour: function(name, defaults, behave){

      var i, body, bodies, config = {};

      Physics.behavior (name, function ( parent ) {
        return {
          init: function ( options ) {
            H.extend(config, defaults, options);
            parent.init.call( this, config );
          },
          connect: function(world){
            world.on( 'integrate:positions', this.behave, this);
            if (config.listen){
              H.each(config.listen, (name, action) => {
                world.on(name, action, this);
              });
            }
          },
          disconnect: function(world){
            world.off( 'integrate:positions', this.behave, this);
            if (config.listen){
              H.each(config.listen, (name, action) => {
                world.off(name, action, this);
              });
            }
          },
          behave: function ( /* data(bodies, dt) */ ) {

            bodies = config.bodies || world.find(config.filter);

            config.scratch && (this.scratch = Physics.scratchpad());

            for (i = 0; (body = bodies[i]); i++){
              behave.call(this, body);
            }

            config.scratch && this.scratch.done();

          }

        };
      });

    },

    createBehaviours: function(){

      var 
        defaults0,
        defaults1;

      // lifted objects
      var 
        vector,
        options,
        position;

      defaults0 = {
        amount:  0.00001, 
        scratch: true,
        filter:  {selected: true},
        listen:  {
          'key:space': function(){this.accel = 0; this.turn = 0;},
          'key:up':    function(){
            this.accel = Math.round(Math.min(this.accel === undefined ? +0.5 : this.accel + 0.5, 5));
          },
          'key:down':  function(){
            this.accel = Math.round(Math.max(this.accel === undefined ? -0.5 : this.accel - 0.5, -5));
          },
          'key:right': function(){
            this.turn = Math.min(this.turn === undefined ? +0.1 : this.turn + 0.1, 0.4);
          },
          'key:left':  function(){
            this.turn = Math.max(this.turn === undefined ? -0.1 : this.turn - 0.1, -0.4);
          },
        }
      };

      self.createBehaviour('player-selected-interactive', defaults0, function (body) {

        var angle  = body.state.angular.pos;

        options = this.options,

        REN.info.acce = this.accel;
        REN.info.turn = this.turn;

        if (this.accel !== undefined){
          vector = this.scratch.vector();
          vector.set(
            this.accel * options.amount * Math.cos( angle ), 
            this.accel * options.amount * Math.sin( angle ) 
          );
          body.accelerate( vector );
        }

        if (this.turn !== undefined){
          body.state.angular.vel = 0.3 * this.turn * DEGRAD;
        }

      });

      self.createBehaviour('players-focus-ball', {scratch: true}, function (player) {

        position = this.scratch.vector().set(player.state.pos._[0], player.state.pos._[1]); 
        position.vsub( bodies.ball.state.pos );
        player.state.angular.pos = (position.angle() + PI) % TAU;

      });

      self.createBehaviour('balls-basic', {}, function (body) {

        var
          x = body.state.pos._[0], 
          y = body.state.pos._[1], 
          isOff = (
            x + body.radius < 0 ||
            y + body.radius < 0 ||
            x - body.radius > CFG.Field.length ||
            y - body.radius > CFG.Field.width
          );

        if ( isOff ){
          world.emit('game:ball-off-field', {x, y, player: body.player});
          self.stopBodies([ body ]);
        }

        // slow rotation down
        body.state.angular.vel *= CFG.Physics.angularFriction; 

      });

      defaults1 = {
        filter:   {marked: true},
        scratch:  true,
        pos:      Physics.vector(),
        strength: 0.0015,
        order:    0,
        max:      200, // across whole field
        min:      1
      };

      self.createBehaviour('player-marked-attractor', defaults1, function (body) {

        var norm, options = this.options;
        
        vector = this.scratch.vector()
          .clone( options.pos )
          .vsub( body.state.pos )
        ;

        norm = vector.norm();  // get the distance

        if (norm > options.min && norm < options.max){
          body.accelerate( vector.normalize().mult( options.strength / Math.pow(norm, options.order) ) );
        }

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