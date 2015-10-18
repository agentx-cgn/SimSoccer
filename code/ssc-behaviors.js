/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*jshint -W069 */
/*globals IFC, SIM, BHV, CFG, H, REN, PHY, GAM, Physics */

'use strict';

BHV = (function(){

  const 
    TAU = Math.PI * 2,
    PI  = Math.PI,
    DEGRAD = Math.PI/180;

  var 
    self,
    behaviors = {},

    // lifted objects
    vector,
    vector1,
    vector2,
    target,
    force,
    force1,
    offset,
    position,
    distance,
    speed;


  return {

    behaviors,

    boot:   function () {return (self = this);

    }, reset: function(){

      self.cleanup();
      self.init();

    }, cleanup: function(){

      behaviors = self.behaviors = {};

    }, init: function(){

      self.createBehaviors();

      // always active
      self.add('balls-basic');      

      // for players
      H.each(CFG.Behaviors.players, behavior => {
        self.add(behavior);
      });

    }, add:    function(name){

      behaviors[name] = Physics.behavior(name),
      PHY.world.add(behaviors[name]);

    }, sub:    function(name){

      PHY.world.remove(behaviors[name]);    
      behaviors[name] = null;  


    }, 'players-selected-steering': function(body){

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


    }, 'players-focus-ball' : function (body) {

        vector = this.scratch.vector()
          .set(
            body.state.pos._[0], 
            body.state.pos._[1]
          )
          .vsub( PHY.bodies.ball.state.pos )
        ;

        body.state.angular.pos = (vector.angle() + PI) % TAU;


    }, 'balls-basic': function (body) {

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

      // slowdown rotation
      body.state.angular.vel *= CFG.Physics.angularFriction; 


    }, 'players-marked-attractor': function (body) {

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


    }, 'players-selected-targeting': function(body){

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



    }, 'players-move-to-point': function(body){

      var options = this.options;

      distance = this.scratch.vector()
        .clone( options.target )
        .vsub( body.state.pos )
        .norm()
      ;

      if (distance < options.range){

        // stop body ??
        options.resolve(body);

      } else {

        force = this.scratch.vector()
          .clone(this.options.target)
          .vsub(body.state.pos)
          .mult(0.028)
        ;

        body.applyForce(force);

      }


    }, createBehaviors: function(){

      function setVector (pos, vector){
        vector.set(pos.x, pos.y);
      }

      // n bodies  => array
      self.create('players-move-to-point', {
        scratch: true,
        target:  Physics.vector(),  // vector
        range:   0,                 // scalar
        resolve: function(/* body */){}
      });

      // n bodies  => array
      // self.create('balls-basic', {bodies: PHY.bodies.balls});
      self.create('balls-basic', {bodies: []});

      // n bodies by filter => array
      self.create('players-focus-ball', {scratch: true, bodies: []});

      // 1 bodies by filter
      self.create('players-selected-targeting', {
        scratch: true,
        active:  false,
        filter:  {selected: true},
        target:  Physics.vector(),
        force:   Physics.vector(),
        offset:  Physics.vector(),
        listen: {
          'interact:poke': function( e ){
            if (e.button === 0 && !IFC.mouseOverBody){
              this.options.active = true;
              setVector(REN.toField(e), this.options.target);
            }
          }, 
          'interact:release': function(){
            this.options.active = false;
          }
        }
      });


      // strength: How strong the attraction is (default: `1`)
      // order: The power of the inverse distance (default: `2` because that is newtonian gravity... inverse square)
      // max: The maximum distance in which to apply the attraction (default: Infinity)
      // min: The minimum distance above which to apply the attraction (default: very small non-zero)

      // n bodies by filter
      self.create('players-marked-attractor', {
        pos:      null,
        filter:   {marked: true},
        scratch:  true,
        strength: 0.00015,
        order:    0,
        min:      1,
        max:    200,
        listen: {
          'interact:poke': function( e ){
            if (!IFC.mouseOverBody){
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
      self.create('players-selected-steering', {
        accel:     0.0,
        turn:      0.0,
        facAccel:  0.00001, 
        facTurn:   0.3, 
        scratch: true,
        filter:  {selected: true},
        listen:  {
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

      var i, body, bodies, config = {}, behave = self[name];

      Physics.behavior (name, function ( parent ) {
        return {
          toString: function(){return name;},
          setBodies: function(bodies){
            if (config.bodies){
              H.empty(config.bodies);
              bodies.forEach(body => config.bodies.push(body));
            // } else {
            //   console.warn(name, 'can\'t set', bodies);
            }
          },
          addBodies: H.arrayfy(function(body){
            if (config.bodies){
              if (!H.contains(config.bodies, body)) {
                config.bodies.push(body);
              }
            // } else {
            //   console.warn(name, 'can\'t add', body);
            }
          }),
          subBodies: H.arrayfy(function(body){
            if (config.bodies){
              H.remove(config.bodies, body);
            // } else {
            //   console.warn(name, 'can\'t sub', body);
            }
          }),
          init: function ( options ) {
            H.extend(config, defaults, options);
            parent.init.call( this, config );
          },
          connect: function(world){
            world.on( 'integrate:positions', this.behave, this);
            H.each(config.listen, (name, action) => {
              world.on(name, action, this);
            });
          },
          disconnect: function(world){
            world.off( 'integrate:positions', this.behave, this);
            H.each(config.listen, (name, action) => {
              world.off(name, action, this);
            });
          },
          behave: function ( data ) {
            bodies = config.bodies || (config.filter ? PHY.world.find(config.filter) : data.bodies);
            config.scratch && (this.scratch = Physics.scratchpad());
            for (i = 0; (body = bodies[i]); i++){
              behave.call(this, body);
            }
            config.scratch && this.scratch.done();
          }

        };
      });


    },

  };

}()).boot();



