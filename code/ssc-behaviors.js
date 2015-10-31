/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*jshint -W069 */
/*globals IFC, BHV, CFG, H, REN, PHY, GAM, Physics */

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

      // for actors
      H.each(CFG.Behaviors.actors, self.add);

    }, add:    function(name){

      behaviors[name] = Physics.behavior(name),
      PHY.world.add(behaviors[name]);

    }, sub:    function(name){

      PHY.world.remove(behaviors[name]);    
      behaviors[name] = null;  

    }, hasBody: function(body, behavior){

      return H.contains(behaviors[behavior].bodies(), body);

    }, forBody: function(body){

      var 
        list = [],
        names = ['body'];

      names.push(body.name);

      H.each(behaviors, (name, behavior) => {
        if (H.contains(names, name.split('-')[0])){
          list.push(name);
        }
      });

      return list;

    }, ofBody: function(body){

      var list = [];

      H.each(behaviors, (name, behavior) => {
        if (H.contains(behavior.bodies(), body)){
          list.push(name);
        }
      });

      return list;


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

      // slowdown rotation
      body.state.angular.vel *= CFG.Physics.angularFriction; 


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


    }, 'player-all-single-move-to-point': function(body){

      var targets = this.options.targets;

      if (targets[body.uid]){

        force = this.scratch.vector()
          .clone(targets[body.uid])
          .vsub(body.state.pos)
          .mult(0.028)
        ;

        body.applyForce(force);

        // remove target
        targets[body.uid] = null;

      }

    }, 'player-all-follow-mouse': function(body){

      var target = this.options.target;

      force = this.scratch.vector()
        .clone(target)
        .vsub(body.state.pos)
        .mult(0.010)
      ;

      body.applyForce(force);





    }, createBehaviors: function(){

      function setVector (pos, vector){
        vector.set(pos.x, pos.y);
      }

      // n bodies  => array
      self.create('ball-all-basic');

      // n bodies by filter => array
      self.create('player-all-focus-ball', {scratch: true});

      // n bodies  => array
      self.create('player-all-single-move-to-point', {
        scratch: true,
        targets: {},   // vector
        resolve: null, // function
      });

      self.create('player-all-follow-mouse', {
        scratch: true,
        target:  Physics.vector(),
        listeners:  {
          'interact:move': function( e ){
            setVector(REN.toField(e), this.options.target);
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

      var i, body, bodies = [], config = {}, behave = self[name] || function () {};

      defaults = defaults || {};
      // defaults.bodies = defaults.bodies || [];

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
          toggleBody: function(body){
            if (H.contains(bodies, body)){
              H.remove(bodies, body);
            } else {
              bodies.push(body);
            }
          },
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
            // bodies = bodies; //(config.filter ? PHY.world.find(config.filter) : data.bodies);
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



