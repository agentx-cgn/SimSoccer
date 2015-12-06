/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*jshint -W069 */
/*globals IFC, BHV, CFG, H, REN, PHY, GAM, SVC, Physics */

'use strict';

BHV = (function(){

  const 
    TAU = Math.PI * 2,
    PI  = Math.PI,
    DEGRAD = Math.PI/180;

  var 
    self,

    // lifted objects
    vector,
    vector1,
    vector2,
    target,  // vector
    forward, // vector
    avoidance, // vector
    ahead, // vector
    targets, // array
    force,
    force1,
    offset,
    position,
    distance,
    desired,
    speed;


  return {

    boot:   function () {return (self = this);

    }, cleanup: function(){
    }, init:    function(){
    }, reset:   function(){

      self.cleanup();
      self.init();



  // Behaves

  }, 'has-angular-friction': {
    
    behave: function (body) {
      body.state.angular.vel *= CFG.Physics.angularFriction; 
    }
  
  }, 'can-report-off-field': {

    flags: {},

    behave: function (body) {
      var
        x = body.state.pos._[0], 
        y = body.state.pos._[1], 
        wasOff = this.flags[body.uid] || false,
        isOff  = (
          x + body.radius < 0 ||
          y + body.radius < 0 ||
          x - body.radius > CFG.Field.length ||
          y - body.radius > CFG.Field.width
        );

      // got off now
      if (!wasOff && isOff) {
        this.flags[body.uid] = true;
        PHY.world.emit('game:body-off-field', body);
      
      // back in game
      } else if (wasOff  && !isOff) {
        this.flags[body.uid] = false;

      } 

    }

  }, 'can-orient-to-point': {

    targets: {},
    useScratch: true,
    
    behave: function (body) {
      var angle, target;
      if ((target = this.targets[body.uid])){
        angle = this.scratch.vector()
          .clone(body.state.pos)
          .vsub(target)
          .angle()
        ;
        body.state.angular.pos = (angle + PI) % TAU;
      }
    }

  }, 'can-be-forced-to-point': {

    targets: {},
    useScratch: true,
    
    behave: function (body) {
      const factor = 0.028;
      var target;
      if ((target = this.targets[body.uid])){
        force = this.scratch.vector()
          .clone(target)
          .vsub(body.state.pos)
          .mult(factor)
        ;
        body.applyForce(force);
        this.targets[body.uid] = null; // ??
      }
    }

  }, 'can-beam-to-point': {

    targets: {},
    
    behave: function (body) {
      var target;
      if ((target = this.targets[body.uid])){
        body.state.pos.clone(target);
      }
    }

  }, 'can-avoid-point': {

    targets: {},
    scratch: true,
    
    behave: function (body) {

      // http://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-collision-avoidance--gamedev-7777

      const 
        maxAhead = 8,
        maxVel = 0.02,
        maxForce = 0.03;

      var factor;

      if ((target = this.targets[body.uid])){

        distance = this.scratch.vector()
          .clone(target)
          .vsub(body.state.pos)
          .norm()
        ;

        factor = maxForce * ((maxAhead - distance) / maxAhead);

        forward = this.scratch.vector()
          .clone(body.state.vel)
          .normalize()
          .mult(maxAhead * body.state.vel.norm() / maxVel)
        ;

        ahead = this.scratch.vector()
          .clone(body.state.pos)
          .add(forward)
        ;

        avoidance = this.scratch.vector()
          .clone(ahead)
          .vsub(target)           // check
          .normalize()
          .mult( factor > 0 ? factor : 0)
        ;

        body.applyForce(avoidance);

      }
    }

  }, 'can-approach-point': {

    targets: {},
    useScratch: true,

    behave: function (body) {

      const 
        radius = 3,
        maxVel = 0.02;

      var targets = this.targets;

      if (targets[body.uid]){

        desired = this.scratch.vector()
          .clone(targets[body.uid])
          .vsub(body.state.pos)
        ;

        distance = desired.norm();

        body.applyForce(
          desired
            .normalize()
            .mult(maxVel * (distance <= radius ? distance/radius : 1))
            .vsub(body.state.vel)
        );

      }



    }


    }, 'player-all-avoid-players': function (body) {

      const 
        maxAhead = 8,
        maxVel = 0.02,
        maxForce = 0.03;

      var factor;

      target = SVC.Distance.toPlayers(body)[1].state.pos;

      distance = this.scratch.vector()
        .clone(target)
        .vsub(body.state.pos)
        .norm()
      ;

      factor = maxForce * ((maxAhead - distance) / maxAhead);

      forward = this.scratch.vector()
        .clone(body.state.vel)
        .normalize()
        .mult(maxAhead * body.state.vel.norm() / maxVel)
      ;

      ahead = this.scratch.vector()
        .clone(body.state.pos)
        .add(forward)
      ;

      avoidance = this.scratch.vector()
        .clone(ahead)
        .vsub(target)           // check
        .normalize()
        .mult( factor > 0 ? factor : 0)
      ;

      body.applyForce(avoidance);

      REN.effects.push(REN.strokeCircle.bind(null, target._[0], target._[1], maxAhead, factor > 0 ? 'orange' : 'violet'));
      REN.effects.push(REN.strokeVector.bind(null, body.state.pos.clone(), forward.clone().mult(2), 'yellow'));
      REN.effects.push(REN.strokeVector.bind(null, body.state.pos.clone(), avoidance.clone().mult(2), 'red'));
      REN.effects.push(REN.strokeVector.bind(null, body.state.pos.clone(), ahead.clone().mult(2), 'blue'));

    }, 'player-all-approach-point': function (body) {

      const 
        radius = 3,
        maxVel = 0.02;

      var targets = this.targets;

      if (targets[body.uid]){

        desired = this.scratch.vector()
          .clone(targets[body.uid])
          .vsub(body.state.pos)
        ;

        distance = desired.norm();

        body.applyForce(
          desired
            .normalize()
            .mult(maxVel * (distance <= radius ? distance/radius : 1))
            .vsub(body.state.vel)
        );

      }



  // configure

    }, createBehaviors: function(){

      function setVector (pos, vector){
        vector.set(pos.x, pos.y);
      }

      H.each(properties, function (name, behavior) {
        self.create(name, behavior);
      });

      // n bodies  => array
      // self.create('ball-all-basic');

      // n bodies by filter => array
      // self.create('player-all-focus-ball', {
      //   scratch: true
      // });

      // n bodies  => array
      // self.create('player-all-single-move-to-point', {
      //   scratch: true,
      //   targets: {},   // vectors
      //   resolve: null, // function
      // });

      // self.create('player-all-approach-point', {
      //   scratch: true,
      //   targets: {},   // vectors
      // });

      self.create('player-all-avoid-players', {
        scratch: true,
        target:  Physics.vector(),
      });

      self.create('player-all-follow-mouse', {
        scratch: true,
        behave:  'player-all-approach-point',
        targets: {},   // vectors
        listeners:  {
          'interact:move': function( e ){
            this.bodies().forEach(body => {
              !this.targets[body.uid] && (this.targets[body.uid] = Physics.vector());
              setVector(REN.toField(e), this.targets[body.uid]);
            });
          }, 
        }
      });


      // 1 bodies by filter
      self.create('body-selected-targeting-mouse', {
        scratch: true,
        active:  false,
        filter:  {selected: true},
        target:  Physics.vector(),
        force:   Physics.vector(),
        offset:  Physics.vector(),
        listeners: {
          'interact:poke': function( e ){
            if (e.button === 0 && !IFC.bodyUnderMouse){
              this.options.active = true;
              setVector(REN.toField(e), this.options.target);
            }
          }, 
          'interact:release': function(){
            this.options.active = false;
          }
        }
      });

      // 1 bodies by mouse
      self.create('body-all-grabbed-by-mouse', {
        listeners:  {
          'interact:poke': function( e ){
            if (e.button === 0 && IFC.bodyUnderMouse){
              this.bodies().push(IFC.bodyUnderMouse);
            }
          }, 
          'interact:move': function( e ){
            if (e.button === 0 && this.bodies().length){
              setVector(REN.toField(e), this.bodies()[0].state.pos);
              setVector(REN.toField(e), this.bodies()[0].state.old.pos);
            }
          }, 
          'interact:release': function(){
            H.empty(this.bodies());
          }
        }
      });


      // strength: How strong the attraction is (default: `1`)
      // order: The power of the inverse distance (default: `2` because that is newtonian gravity... inverse square)
      // max: The maximum distance in which to apply the attraction (default: Infinity)
      // min: The minimum distance above which to apply the attraction (default: very small non-zero)

      // n bodies by filter
      self.create('body-marked-attracted-by-mouse', {
        pos:      null,
        filter:   {marked: true},
        scratch:  true,
        strength: 0.00015,
        order:    0,
        min:      1,
        max:    200,
        listeners: {
          'interact:poke': function( e ){
            if (!IFC.bodyUnderMouse){
              this.options.pos = e.button === 0 ? REN.toField(e) : null;
            }
          }, 
          'interact:move': function(e){
            this.options.pos = this.options.pos ? REN.toField(e) : null;
          },
          'interact:release': function(){
            this.options.pos = null;
          }
        }
      });

      // 1 body by filter
      self.create('body-selected-steered-by-keys', {
        accel:     0.0,
        turn:      0.0,
        facAccel:  0.00001, 
        facTurn:   0.3, 
        scratch: true,
        filter:  {selected: true},
        listeners:  {
          'key:space': function(){
            this.options.accel = 0.0; this.options.turn = 0.0;
          },
          'key:up':    function(){
            this.options.accel = Math.min(this.options.accel + 5, +50);
          },
          'key:down':  function(){
            this.options.accel = Math.max(this.options.accel - 5, -50);
          },
          'key:right': function(){
            this.options.turn = Math.min(this.options.turn + 1, +4);
          },
          'key:left':  function(){
            this.options.turn = Math.max(this.options.turn - 1, -4);
          },
        }
      });


    }, create: function(name, defaults){

      var i, body, behave, bodies = [], config = {};

      defaults = defaults || {};
      behave   = self[defaults.behave] || self[name] || function () {};

      Physics.behavior (name, function ( parent ) {
        return {
          bodies: function () {return bodies;},
          init: function ( options ) {
            H.extend(config, defaults, options);
            parent.init.call( this, config );
          },
          setBodies: function(bodies){
            H.empty(bodies);
            bodies.forEach(body => bodies.push(body));
          },
          addBodies: H.arrayfy(function(body){
            if (!H.contains(bodies, body)) {
              bodies.push(body);
            }
          }),
          subBodies: H.arrayfy(function(body){
            H.remove(bodies, body);
          }),
          removeBodies: function(body){
            H.empty(bodies);
          },
          toggleBodies: H.arrayfy(function(body){
            if (H.contains(bodies, body)){
              H.remove(bodies, body);
            } else {
              bodies.push(body);
            }
          }),
          connect: function(world){
            world.on( 'integrate:positions', this.behave, this);
            H.each(config.listeners, (name, action) => {
              world.on(name, action, this);
            });
          },
          disconnect: function(world){
            world.off( 'integrate:positions', this.behave, this);
            H.each(config.listeners, (name, action) => {
              world.off(name, action, this);
            });
          },
          behave: function () {
            config.scratch && (this.scratch = Physics.scratchpad());
            for (i = 0; (body = bodies[i]); i++){
              behave.call(this, body);
            }
            config.scratch && this.scratch.done();
            config.scratch && (BHV.scratches = this.scratch._vectorStack.length);
          }

        };
      });


    },

  };

}()).boot();



