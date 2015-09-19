/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*globals IFC, BHV, CFG, H, REN, PHY, Physics */

'use strict';

BHV = (function(){

  const 
    TAU = Math.PI * 2,
    PI  = Math.PI,
    DEGRAD = Math.PI/180;

  var 
    self,
    world,
    behaviors = {},

    // lifted objects
    vector,
    options,
    position;


  return {

    boot:   function () {return (self = this);

    }, init: function(){

      world = PHY.world;

    }, add:    function(thing, options){

      behaviors[thing] =  Physics.behavior(thing, options || {}),
      world.add(behaviors[thing]);

    }, sub:    function(thing){

      world.remove(behaviors[thing]);      


    }, 'player-selected-interactive': function(body){

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


    }, 'players-focus-ball' : function (body) {

        position = this.scratch.vector().set(body.state.pos._[0], body.state.pos._[1]); 
        position.vsub( PHY.bodies.ball.state.pos );
        body.state.angular.pos = (position.angle() + PI) % TAU;


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

      if ( isOff ){
        world.emit('game:ball-off-field', {x, y, player: body.player});
        PHY.stopBodies([ body ]);
      }

      // slow rotation down
      body.state.angular.vel *= CFG.Physics.angularFriction; 


    }, 'player-marked-attractor': function (body) {

      var norm, options = this.options;
      
      vector = this.scratch.vector()
        .clone( options.pos )
        .vsub( body.state.pos )
      ;

      norm = vector.norm();  // get the distance

      if (norm > options.min && norm < options.max){
        body.accelerate( vector.normalize().mult( options.strength / Math.pow(norm, options.order) ) );
      }


    }, createBehaviors: function(){

      self.create('balls-basic', {});

      self.create('players-focus-ball', {scratch: true});

      self.create('player-marked-attractor', {
        filter:   {marked: true},
        scratch:  true,
        pos:      Physics.vector(),
        strength: 0.0015,
        order:    0,
        max:      200, // across whole field
        min:      1
      });

      self.create('player-selected-interactive', {
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
      });


    }, create: function(name, defaults){

      var i, body, bodies, config = {}, behave = self[name];

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

  };

}()).boot();



